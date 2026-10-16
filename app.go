package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"Cokpyt/backend/environments"
	"Cokpyt/backend/pip"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// App is the service the frontend talks to. Every exported method is callable
// from the webview, so they are the whole API surface.
//
// It caches the last inventory because discovery is the expensive part of the
// app and every page needs the answer. Nothing else is cached: a package list
// goes stale the moment another tool touches the environment.
type App struct {
	app *application.App

	mu       sync.RWMutex
	envs     []environments.Env
	notes    []string
	scanned  bool          // at least one scan has finished
	inflight chan struct{} // closed when the running scan finishes, nil when idle
}

// NewApp wires the service to the application so it can emit events.
func NewApp(app *application.App) *App {
	return &App{app: app}
}

// emit forwards an event to the webview. The nil check is what lets the scan
// path be tested without a running application.
func (a *App) emit(name string, data ...any) {
	if a.app != nil {
		a.app.Event.Emit(name, data...)
	}
}

// Bootstrap is everything the shell needs to draw itself, in one round trip.
type Bootstrap struct {
	Version  string             `json:"version"`
	Theme    string             `json:"theme"`
	Active   string             `json:"active"`
	Platform string             `json:"platform"`
	Envs     []environments.Env `json:"envs"`
	Notes    []string           `json:"notes"`
	Scanned  bool               `json:"scanned"`
	Scanning bool               `json:"scanning"`
}

// ServiceStartup runs when the app starts. Discovery is kicked off in the
// background here so the first paint is not waiting on a profile sweep.
func (a *App) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	environments.Progress = func(msg string) {
		a.emit("scan:progress", msg)
	}
	pip.LogEmitter = func(level, msg string) {
		a.emit("log", level, msg)
	}

	go func() {
		a.mu.Lock()
		a.startScanLocked()
		a.mu.Unlock()
	}()
	go pip.WarmIndex()
	return nil
}

// Bootstrap returns the shell state. It never waits for discovery: a profile
// sweep takes seconds, and a blank window for seconds is worse than a window
// that says it is still looking. The shell draws what is known, then redraws
// when the scan:done event arrives.
func (a *App) Bootstrap() Bootstrap {
	a.mu.Lock()
	if !a.scanned && a.inflight == nil {
		a.startScanLocked()
	}
	envs, notes, scanned, scanning := a.envs, a.notes, a.scanned, a.inflight != nil
	a.mu.Unlock()

	cfg := pip.GetConfig()
	active := a.pick(cfg.Active, envs)
	if active != "" && active != cfg.Active {
		_ = pip.UpdateConfig(func(c *pip.Config) { c.Active = active })
	}

	return Bootstrap{
		Version:  Version,
		Theme:    cfg.Theme,
		Active:   active,
		Platform: runtime.GOOS,
		Envs:     envs,
		Notes:    notes,
		Scanned:  scanned,
		Scanning: scanning,
	}
}

// Scan re-inventories the machine and waits for the result. The user-facing
// "Rescan" action calls this, because someone who clicked Rescan wants to be
// told when it is finished.
func (a *App) Scan() Bootstrap {
	a.scan()
	return a.Bootstrap()
}

// ScanFolder inventories one directory the user chose, for the projects that
// live on a drive the profile sweep never visits.
func (a *App) ScanFolder(dir string) ([]environments.Env, error) {
	if fi, err := os.Stat(dir); err != nil || !fi.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", dir)
	}
	found := environments.ScanFolder(dir)

	// Fold them in next to what was already known, so they are selectable
	// without waiting for a full rescan.
	a.mu.Lock()
	known := make(map[string]bool, len(a.envs))
	for _, env := range a.envs {
		known[strings.ToLower(env.Python)] = true
	}
	for _, env := range found {
		if !known[strings.ToLower(env.Python)] {
			a.envs = append(a.envs, env)
		}
	}
	a.mu.Unlock()
	return found, nil
}

// ChooseFolder opens the native directory picker.
func (a *App) ChooseFolder() (string, error) {
	return a.app.Dialog.OpenFile().
		SetTitle("Choose a folder to look for environments in").
		CanChooseFiles(false).
		CanChooseDirectories(true).
		PromptForSingleSelection()
}

// SelectEnvironment makes an environment the one every page acts on.
func (a *App) SelectEnvironment(python string) error {
	a.mu.RLock()
	_, ok := a.find(python)
	a.mu.RUnlock()
	if !ok {
		return fmt.Errorf("no environment with the interpreter %s", python)
	}
	return pip.UpdateConfig(func(c *pip.Config) { c.Active = python })
}

// SetTheme stores the theme preference.
func (a *App) SetTheme(theme string) error {
	if theme != "dark" && theme != "light" {
		return fmt.Errorf("unknown theme %q", theme)
	}
	return pip.UpdateConfig(func(c *pip.Config) { c.Theme = theme })
}

// MarkIntroSeen records that the first-run note has been dismissed.
func (a *App) MarkIntroSeen() error {
	return pip.UpdateConfig(func(c *pip.Config) { c.TourSeen = true })
}

// IntroSeen reports whether the first-run note should be shown.
func (a *App) IntroSeen() bool { return pip.GetConfig().TourSeen }

// ── environment detail ───────────────────────────────────────────────────────

// PackageCounts is how many distributions each environment holds, keyed by
// interpreter path. Counted from the filesystem rather than by running pip once
// per environment.
func (a *App) PackageCounts() map[string]int {
	a.mu.RLock()
	envs := a.envs
	a.mu.RUnlock()

	counts := make(map[string]int, len(envs))
	for _, env := range envs {
		counts[env.Python] = pip.Count(env)
	}
	return counts
}

// EnvironmentInfo describes one interpreter.
func (a *App) EnvironmentInfo(python string) (pip.EnvInfo, error) {
	env, ok := a.resolve(python)
	if !ok {
		return pip.EnvInfo{}, unknown(python)
	}
	return pip.Info(env)
}

// ── packages ─────────────────────────────────────────────────────────────────

// Packages lists what is installed in an environment.
func (a *App) Packages(python string) ([]pip.Package, error) {
	env, ok := a.resolve(python)
	if !ok {
		return nil, unknown(python)
	}
	return pip.List(env)
}

// Outdated lists packages with a newer version on PyPI. It needs the network,
// which is why it is separate from Packages.
func (a *App) Outdated(python string) ([]pip.Outdated, error) {
	env, ok := a.resolve(python)
	if !ok {
		return nil, unknown(python)
	}
	return pip.ListOutdated(env)
}

// Versions lists the versions of one package that pip could install into an
// environment, newest first. It is the only call the frontend makes for a
// single row rather than for a page: it costs a network round trip, and the
// Packages page has hundreds of rows.
func (a *App) Versions(python, name string) ([]string, error) {
	env, ok := a.resolve(python)
	if !ok {
		return nil, unknown(python)
	}
	return pip.Versions(env, strings.TrimSpace(name))
}

// Install installs a requirement into an environment.
func (a *App) Install(python, spec string) error {
	env, ok := a.resolve(python)
	if !ok {
		return unknown(python)
	}
	return pip.Install(env, strings.TrimSpace(spec))
}

// InstallVersion pins a package to one exact version.
func (a *App) InstallVersion(python, name, version string) error {
	env, ok := a.resolve(python)
	if !ok {
		return unknown(python)
	}
	return pip.InstallVersion(env, strings.TrimSpace(name), strings.TrimSpace(version))
}

// Upgrade upgrades one package.
func (a *App) Upgrade(python, name string) error {
	env, ok := a.resolve(python)
	if !ok {
		return unknown(python)
	}
	return pip.Upgrade(env, name)
}

// Uninstall removes one package.
func (a *App) Uninstall(python, name string) error {
	env, ok := a.resolve(python)
	if !ok {
		return unknown(python)
	}
	return pip.Uninstall(env, name)
}

// UpgradeMany upgrades several packages and returns the ones that failed, with
// a reason. One failure should not abandon the rest of the batch.
func (a *App) UpgradeMany(python string, names []string) ([]string, error) {
	env, ok := a.resolve(python)
	if !ok {
		return nil, unknown(python)
	}
	return each(names, func(name string) error { return pip.Upgrade(env, name) }), nil
}

// UninstallMany removes several packages and returns the ones that failed.
func (a *App) UninstallMany(python string, names []string) ([]string, error) {
	env, ok := a.resolve(python)
	if !ok {
		return nil, unknown(python)
	}
	return each(names, func(name string) error { return pip.Uninstall(env, name) }), nil
}

// each runs work for every name and collects "name: reason" for the failures.
func each(names []string, work func(string) error) []string {
	failures := []string{}
	for _, name := range names {
		if err := work(name); err != nil {
			failures = append(failures, fmt.Sprintf("%s — %s", name, strings.TrimPrefix(err.Error(), "pip ")))
		}
	}
	return failures
}

// ── maintenance ──────────────────────────────────────────────────────────────

// Doctor checks an environment and the network it depends on.
func (a *App) Doctor(python string) (pip.Report, error) {
	env, ok := a.resolve(python)
	if !ok {
		return pip.Report{}, unknown(python)
	}
	return pip.Doctor(env), nil
}

// CleanupScan measures what could be reclaimed. Sizes come back in bytes and
// are formatted by the frontend.
func (a *App) CleanupScan(python string) ([]pip.Reclaim, error) {
	env, ok := a.resolve(python)
	if !ok {
		return nil, unknown(python)
	}
	return pip.CleanupInfo(env), nil
}

// CleanupRun removes the requested categories.
func (a *App) CleanupRun(python string, kinds []string) error {
	env, ok := a.resolve(python)
	if !ok {
		return unknown(python)
	}
	return pip.Cleanup(env, kinds)
}

// Search looks for packages on PyPI.
func (a *App) Search(query string) ([]pip.SearchResult, error) { return pip.Search(query) }

// IndexStatus reports the stored PyPI name index.
func (a *App) IndexStatus() pip.IndexStatus { return pip.CachedIndex() }

// RefreshIndex downloads the PyPI name index again and stores it.
func (a *App) RefreshIndex() (pip.IndexStatus, error) { return pip.RefreshIndex() }

// History returns the recorded pip operations, newest first.
func (a *App) History() ([]pip.HistoryEntry, error) { return pip.GetHistory() }

// ClearHistory wipes the operation log.
func (a *App) ClearHistory() error { return pip.ClearHistory() }

// Logs returns the persisted log lines, oldest first.
func (a *App) Logs() ([]pip.LogEntry, error) { return pip.GetLogs() }

// ClearLogs wipes the persisted log.
func (a *App) ClearLogs() error { return pip.ClearLogs() }

// ── shell odds and ends ──────────────────────────────────────────────────────

// UpdateInfo describes the result of a GitHub release check.
type UpdateInfo struct {
	HasUpdate     bool   `json:"hasUpdate"`
	LatestVersion string `json:"latestVersion"`
	ReleaseURL    string `json:"releaseURL"`
}

var (
	preReleasePattern = regexp.MustCompile(`(?i)(alpha|beta|rc|dev|preview|pre|snapshot|nightly)`)
	digitsPattern     = regexp.MustCompile(`\d+`)
)

// CheckForUpdate asks GitHub whether a newer release exists.
func (a *App) CheckForUpdate() (UpdateInfo, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/repos/d3uceY/Cokpyt/releases/latest", nil)
	if err != nil {
		return UpdateInfo{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "Cokpyt")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return UpdateInfo{}, err
	}
	defer resp.Body.Close()

	var release struct {
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return UpdateInfo{}, err
	}
	if release.TagName == "" || preReleasePattern.MatchString(release.TagName) {
		return UpdateInfo{LatestVersion: release.TagName, ReleaseURL: release.HTMLURL}, nil
	}
	return UpdateInfo{
		HasUpdate:     Newer(release.TagName, Version),
		LatestVersion: release.TagName,
		ReleaseURL:    release.HTMLURL,
	}, nil
}

// Newer reports whether candidate is a later vMAJOR.MINOR.PATCH than current.
// Plain string comparison gets this wrong: "v0.10.0" sorts before "v0.9.0".
func Newer(candidate, current string) bool {
	want, have := VersionNumbers(candidate), VersionNumbers(current)
	for i := 0; i < len(want) && i < len(have); i++ {
		if want[i] != have[i] {
			return want[i] > have[i]
		}
	}
	return len(want) > len(have)
}

// VersionNumbers pulls the numeric components out of a version string.
func VersionNumbers(v string) []int {
	parts := digitsPattern.FindAllString(v, -1)
	numbers := make([]int, 0, len(parts))
	for _, part := range parts {
		n, _ := strconv.Atoi(part)
		numbers = append(numbers, n)
	}
	return numbers
}

// OpenURL opens a link in the user's browser.
func (a *App) OpenURL(url string) error {
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return errors.New("only http and https links can be opened")
	}
	return a.app.Browser.OpenURL(url)
}

// RevealPath shows a directory in the platform's file manager.
func (a *App) RevealPath(path string) error {
	if path == "" {
		return errors.New("nothing to reveal")
	}
	cleaned := filepath.Clean(path)
	if fi, err := os.Stat(cleaned); err != nil || !fi.IsDir() {
		return fmt.Errorf("%s is not a directory", cleaned)
	}
	return a.app.Env.OpenFileManager(cleaned, false)
}

// ── internals ────────────────────────────────────────────────────────────────

// scan runs discovery, at most one at a time. Two concurrent scans would walk
// the whole profile twice for the same answer, and the answer that arrived
// first is the one that would be thrown away.
func (a *App) scan() ([]environments.Env, []string) {
	a.mu.Lock()
	if running := a.inflight; running != nil {
		a.mu.Unlock()
		<-running
		a.mu.RLock()
		defer a.mu.RUnlock()
		return a.envs, a.notes
	}
	done := a.startScanLocked()
	a.mu.Unlock()

	<-done
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.envs, a.notes
}

// startScanLocked launches a scan and returns the channel that closes when it
// finishes. The caller must hold a.mu.
func (a *App) startScanLocked() chan struct{} {
	done := make(chan struct{})
	a.inflight = done

	go func() {
		result := environments.Discover()

		a.mu.Lock()
		a.envs, a.notes, a.scanned = result.Envs, result.Notes, true
		a.inflight = nil

		// A stale selection — the venv was deleted since last run — falls back
		// to the best default rather than leaving every page pointed at
		// nothing. It is handled under the same lock that installs the result,
		// so a concurrent find() cannot see the two halves disagree.
		if active := pip.GetConfig().Active; active != "" {
			if _, ok := a.find(active); !ok {
				_ = pip.UpdateConfig(func(c *pip.Config) { c.Active = a.pick("", result.Envs) })
			}
		}
		a.mu.Unlock()

		close(done)
		a.emit("scan:done")
	}()

	return done
}

// pick returns the chosen interpreter, or the one a new project would want when
// there is no valid choice: the launcher's default runtime, then any base
// interpreter, then anything at all.
func (a *App) pick(preferred string, envs []environments.Env) string {
	for _, env := range envs {
		if env.Python == preferred {
			return preferred
		}
	}
	for _, env := range envs {
		if env.Default {
			return env.Python
		}
	}
	for _, env := range envs {
		if !env.IsVirtual() {
			return env.Python
		}
	}
	if len(envs) > 0 {
		return envs[0].Python
	}
	return ""
}

func (a *App) find(python string) (environments.Env, bool) {
	for _, env := range a.envs {
		if env.Python == python {
			return env, true
		}
	}
	return environments.Env{}, false
}

// resolve looks up an environment, rescanning once if the id is unknown. The
// rescan earns its keep because an environment can be created between the
// startup scan and the click.
func (a *App) resolve(python string) (environments.Env, bool) {
	a.mu.RLock()
	env, ok := a.find(python)
	a.mu.RUnlock()
	if ok {
		return env, true
	}
	a.scan()
	a.mu.RLock()
	env, ok = a.find(python)
	a.mu.RUnlock()
	return env, ok
}

func unknown(python string) error {
	if python == "" {
		return errors.New("no Python environment is selected")
	}
	return fmt.Errorf("no environment is using %s any more", python)
}
