package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"

	"Cokpyt/backend/pip"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// preReleasePattern matches version tags that contain pre-release identifiers.
var preReleasePattern = regexp.MustCompile(`(?i)(alpha|beta|rc|dev|preview|pre|snapshot|nightly)`)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	pip.LogEmitter = func(level, msg string) {
		wailsruntime.EventsEmit(ctx, "pip:log", level, msg)
		if level == "STREAM" {
			wailsruntime.EventsEmit(ctx, "pip:stream", msg)
		}
	}
	// Pre-warm the PyPI Simple index in the background so the first search is fast.
	go pip.WarmSimpleIndex()
}

// GetVersion returns the application version string.
func (a *App) GetVersion() string {
	return Version
}

// UpdateInfo describes the result of a GitHub release check.
type UpdateInfo struct {
	HasUpdate     bool   `json:"hasUpdate"`
	LatestVersion string `json:"latestVersion"`
	ReleaseURL    string `json:"releaseURL"`
}

// CheckForUpdate queries the GitHub releases API and reports whether a newer
// version of Cokpyt is available.
func (a *App) CheckForUpdate() (UpdateInfo, error) {
	const apiURL = "https://api.github.com/repos/d3ucey/Cokpyt/releases/latest"
	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		return UpdateInfo{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "Cokpyt-app")

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

	hasUpdate := release.TagName != "" && release.TagName != Version && !preReleasePattern.MatchString(release.TagName)
	return UpdateInfo{
		HasUpdate:     hasUpdate,
		LatestVersion: release.TagName,
		ReleaseURL:    release.HTMLURL,
	}, nil
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// SearchPackages queries PyPI for packages matching the given query.
func (a *App) SearchPackages(query string) ([]pip.SearchResult, error) {
	return pip.SearchPackages(query)
}

// GetPythonInfo returns the active Python and pip versions.
func (a *App) GetPythonInfo() (pip.PythonInfo, error) {
	return pip.GetPythonInfo()
}

// GetOutdatedPackages returns packages that have a newer version available.
func (a *App) GetOutdatedPackages() ([]pip.OutdatedPackage, error) {
	return pip.GetOutdatedPackages()
}

// GetInstalledPackages returns all installed pip packages with version and update status.
func (a *App) GetInstalledPackages() ([]pip.PipPackage, error) {
	return pip.GetInstalledPackages()
}

// InstallPackage installs a pip package by name.
func (a *App) InstallPackage(name string) error {
	return pip.InstallPackage(name)
}

// UninstallPackage removes a pip package by name.
func (a *App) UninstallPackage(name string) error {
	return pip.UninstallPackage(name)
}

// UpgradePackage upgrades a pip package to its latest version.
func (a *App) UpgradePackage(name string) error {
	return pip.UpgradePackage(name)
}

// GetCleanupInfo returns the reclaimable disk space for each cleanup category.
func (a *App) GetCleanupInfo() (pip.CleanupInfo, error) {
	return pip.GetCleanupInfo()
}

// RunCleanup performs the requested cleanup operations.
// types may contain "cache", "orphan", and/or "temp".
func (a *App) RunCleanup(types []string) error {
	return pip.RunCleanup(types)
}

// GetHistory returns all recorded pip operation history, newest first.
func (a *App) GetHistory() ([]pip.HistoryEntry, error) {
	return pip.GetHistory()
}

// ClearHistory deletes all recorded pip operation history.
func (a *App) ClearHistory() error {
	return pip.ClearHistory()
}

// GetPipEnvironmentInfo returns the full Python runtime environment details.
func (a *App) GetPipEnvironmentInfo() (pip.PipEnvironmentInfo, error) {
	return pip.GetPipEnvironmentInfo()
}

// RunDoctor runs all diagnostic checks and returns a report.
func (a *App) RunDoctor() pip.DoctorReport {
	return pip.RunDoctor()
}

// GetConfig returns the user configuration.
func (a *App) GetConfig() (pip.AppConfig, error) {
	return pip.GetConfig()
}

// SetTheme saves the theme preference ("light" or "dark").
func (a *App) SetTheme(theme string) error {
	cfg, _ := pip.GetConfig()
	cfg.Theme = theme
	return pip.SaveConfig(cfg)
}

// MarkTourSeen marks the intro tour as completed so it does not auto-start again.
func (a *App) MarkTourSeen() error {
	cfg, _ := pip.GetConfig()
	cfg.TourSeen = true
	return pip.SaveConfig(cfg)
}

// GetLogs returns all persisted log entries.
func (a *App) GetLogs() ([]pip.LogEntry, error) {
	return pip.GetLogs()
}

// BatchUninstall removes multiple pip packages and returns a map of name→error.
func (a *App) BatchUninstall(names []string) map[string]string {
	errs := make(map[string]string)
	for _, name := range names {
		if err := pip.UninstallPackage(name); err != nil {
			errs[name] = err.Error()
		}
	}
	return errs
}

// ListEnvironments returns all saved virtual environments from config.
func (a *App) ListEnvironments() ([]pip.VenvEntry, error) {
	return pip.ListEnvironments()
}

// AddEnvironment validates and saves a new virtual environment entry.
func (a *App) AddEnvironment(name, path string) error {
	return pip.AddEnvironment(name, path)
}

// RemoveEnvironment removes a saved virtual environment entry by path.
func (a *App) RemoveEnvironment(path string) error {
	return pip.RemoveEnvironment(path)
}

// SetActiveEnvironment switches the active environment to the given venv path.
// Pass an empty string to fall back to the system python.
func (a *App) SetActiveEnvironment(path string) error {
	return pip.SetActiveEnvironment(path)
}

// ScanForVenvs scans the given directory for virtual environment sub-directories.
func (a *App) ScanForVenvs(dir string) ([]pip.VenvEntry, error) {
	return pip.ScanForVenvs(dir)
}

// BrowseForDirectory opens a native directory picker and returns the chosen path.
func (a *App) BrowseForDirectory() (string, error) {
	path, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Select virtual environment directory",
	})
	return path, err
}
