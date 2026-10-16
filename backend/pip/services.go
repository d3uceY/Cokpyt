// Package pip runs package operations against one specific Python
// environment.
//
// Every function takes the environment it should act on, and none of them
// consult the config for "the" interpreter. That is deliberate: on a machine
// with several environments there is no such thing as the interpreter, and the
// bug this avoids is silently reporting one environment's packages as if they
// were the machine's.
package pip

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"Cokpyt/backend/environments"
)

// Package is one installed distribution.
type Package struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Summary string `json:"summary"`
}

// Outdated is a package with a newer version on PyPI. Working this out needs
// the network, so it is kept out of List and fetched on its own.
type Outdated struct {
	Name          string `json:"name"`
	Version       string `json:"version"`
	LatestVersion string `json:"latestVersion"`
	BumpType      string `json:"bumpType"` // "major" | "minor" | "patch"
	ChangelogURL  string `json:"changelogUrl"`
}

// EnvInfo describes an interpreter.
type EnvInfo struct {
	PythonVersion string `json:"pythonVersion"`
	PipVersion    string `json:"pipVersion"`
	PythonPath    string `json:"pythonPath"`
	Prefix        string `json:"prefix"`
	BasePrefix    string `json:"basePrefix"`
	SitePackages  string `json:"sitePackages"`
	Virtual       bool   `json:"virtual"`
}

// LogEmitter is set by the app so log lines reach the frontend as they happen.
var LogEmitter func(level, msg string)

func emitLog(level, msg string) {
	AppendLog(level, msg)
	if LogEmitter != nil {
		LogEmitter(level, msg)
	}
}

// ── reading what is installed ────────────────────────────────────────────────

type listEntry struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// List returns every distribution the environment's pip reports.
//
// Summaries come from a single interpreter call rather than batched `pip show`
// runs: the metadata is already on disk in the .dist-info directories, so
// asking Python for all of it at once costs one process instead of one per
// fifty packages.
func List(env environments.Env) ([]Package, error) {
	out, err := env.Pip("list", "--format=json").Output()
	if err != nil {
		return nil, fmt.Errorf("pip list failed in %s: %s", env.Label, failureReason(out, err))
	}

	var entries []listEntry
	if err := json.Unmarshal(out, &entries); err != nil {
		return nil, fmt.Errorf("could not parse pip list output from %s: %w", env.Label, err)
	}

	summaries := summaries(env)

	packages := make([]Package, 0, len(entries))
	for _, entry := range entries {
		packages = append(packages, Package{
			Name:    entry.Name,
			Version: entry.Version,
			Summary: summaries[normalise(entry.Name)],
		})
	}
	sort.Slice(packages, func(i, j int) bool {
		return strings.ToLower(packages[i].Name) < strings.ToLower(packages[j].Name)
	})
	return packages, nil
}

const summaryScript = `import json,importlib.metadata as m
out={}
for d in m.distributions():
    try:
        n=d.metadata["Name"]
        if n and n not in out: out[n]=d.metadata.get("Summary","")
    except Exception: pass
print(json.dumps(out))`

// summaries maps a normalised distribution name to its one-line description.
// A failure is not worth reporting: the list is still useful without summaries.
func summaries(env environments.Env) map[string]string {
	out, err := env.Cmd("-c", summaryScript).Output()
	if err != nil {
		return map[string]string{}
	}
	var raw map[string]string
	if json.Unmarshal(out, &raw) != nil {
		return map[string]string{}
	}
	clean := make(map[string]string, len(raw))
	for name, summary := range raw {
		clean[normalise(name)] = strings.TrimSpace(summary)
	}
	return clean
}

// ListOutdated returns packages with a newer version available on PyPI. It is
// the one call that needs the network, so it is fetched separately from List
// and cached by the frontend.
func ListOutdated(env environments.Env) ([]Outdated, error) {
	out, err := env.Pip("list", "--outdated", "--format=json").Output()
	if err != nil {
		return nil, fmt.Errorf("pip list --outdated failed in %s: %s", env.Label, failureReason(out, err))
	}
	var entries []struct {
		Name          string `json:"name"`
		Version       string `json:"version"`
		LatestVersion string `json:"latest_version"`
	}
	if err := json.Unmarshal(out, &entries); err != nil {
		return nil, fmt.Errorf("could not parse outdated list from %s: %w", env.Label, err)
	}

	packages := make([]Outdated, len(entries))
	var wg sync.WaitGroup
	for i, entry := range entries {
		packages[i] = Outdated{
			Name:          entry.Name,
			Version:       entry.Version,
			LatestVersion: entry.LatestVersion,
			BumpType:      classifyBump(entry.Version, entry.LatestVersion),
		}
		wg.Add(1)
		go func(i int, name string) {
			defer wg.Done()
			packages[i].ChangelogURL = changelogURL(name)
		}(i, entry.Name)
	}
	wg.Wait()
	sort.Slice(packages, func(i, j int) bool {
		return strings.ToLower(packages[i].Name) < strings.ToLower(packages[j].Name)
	})
	return packages, nil
}

// classifyBump names the size of a version jump so the UI can colour it.
func classifyBump(current, latest string) string {
	currentParts := strings.SplitN(current, ".", 3)
	latestParts := strings.SplitN(latest, ".", 3)
	if len(currentParts) > 0 && len(latestParts) > 0 && currentParts[0] != latestParts[0] {
		return "major"
	}
	if len(currentParts) > 1 && len(latestParts) > 1 && currentParts[1] != latestParts[1] {
		return "minor"
	}
	return "patch"
}

// Count is how many distributions the environment appears to hold.
//
// It counts *.dist-info directories instead of running `pip list`, because the
// environments page wants a number for every environment on the machine, and
// one pip process per environment is the difference between a list that appears
// and a list that hangs. A venv built with --system-site-packages reports only
// its own packages — a hint worth showing, not a claim to be right.
func Count(env environments.Env) int {
	total := 0
	for _, dir := range sitePackagesDirs(env) {
		matches, _ := filepath.Glob(filepath.Join(dir, "*.dist-info"))
		total += len(matches)
	}
	return total
}

// sitePackagesDirs lists the places this environment's distributions can live.
func sitePackagesDirs(env environments.Env) []string {
	root := env.Root
	if root == "" {
		root = filepath.Dir(env.Python)
		if env.IsVirtual() {
			root = filepath.Dir(root)
		}
	}
	var dirs []string
	if runtime.GOOS == "windows" {
		dirs = append(dirs, filepath.Join(root, "Lib", "site-packages"))
	} else {
		dirs = append(dirs, glob(filepath.Join(root, "lib", "python3*", "site-packages"))...)
	}
	// A base interpreter can also hold packages in a per-user site directory.
	if !env.IsVirtual() {
		if appData := os.Getenv("APPDATA"); appData != "" {
			dirs = append(dirs, glob(filepath.Join(appData, "Python", "Python3*", "site-packages"))...)
		}
		if home, err := os.UserHomeDir(); err == nil {
			dirs = append(dirs, glob(filepath.Join(home, ".local", "lib", "python3*", "site-packages"))...)
		}
	}
	return existingDirs(dirs)
}

// ── describing an interpreter ────────────────────────────────────────────────

const metaScript = `import json,sys,site
print(json.dumps({
 "v":"%d.%d.%d"%sys.version_info[:3],
 "exe":sys.executable,
 "prefix":sys.prefix,
 "base":sys.base_prefix,
 "site":list(site.getsitepackages())}))`

// Info describes an environment in two processes instead of the four the
// individual questions would take.
func Info(env environments.Env) (EnvInfo, error) {
	info := EnvInfo{PythonPath: env.Python, Virtual: env.IsVirtual()}

	out, err := env.Cmd("-c", metaScript).CombinedOutput()
	if err != nil {
		return info, fmt.Errorf("could not run %s: %s", env.Python, failureReason(out, err))
	}
	var meta struct {
		V      string   `json:"v"`
		Exe    string   `json:"exe"`
		Prefix string   `json:"prefix"`
		Base   string   `json:"base"`
		Site   []string `json:"site"`
	}
	if err := json.Unmarshal(out, &meta); err != nil {
		return info, fmt.Errorf("could not parse interpreter details from %s: %w", env.Label, err)
	}
	info.PythonVersion = meta.V
	info.PythonPath = meta.Exe
	info.Prefix = meta.Prefix
	info.BasePrefix = meta.Base
	info.SitePackages = pickSitePackages(meta.Site)

	if pipOut, err := env.Pip("--version").Output(); err == nil {
		if fields := strings.Fields(string(pipOut)); len(fields) >= 2 {
			info.PipVersion = fields[1]
		}
	}
	return info, nil
}

// pickSitePackages chooses the directory distributions actually live in.
//
// `site.getsitepackages()` is not ordered the way the name suggests: under the
// Python Install Manager it returns the prefix first and the real
// site-packages second, so taking the first entry reports the interpreter's own
// directory and looks like a bug in the count beside it.
func pickSitePackages(candidates []string) string {
	for _, dir := range candidates {
		if filepath.Base(dir) == "site-packages" {
			return dir
		}
	}
	if len(candidates) > 0 {
		return candidates[len(candidates)-1]
	}
	return ""
}

// ── changing what is installed ───────────────────────────────────────────────

// Install installs spec. It may pin a version ("requests==2.32.0") or point at
// a path or a URL, because pip accepts all of those and there is no reason for
// the app to accept less. A version chosen from the version picker goes through
// InstallVersion instead, so the two are recorded in History differently: this
// one keeps whatever the user typed, that one reports the bare package name.
func Install(env environments.Env, spec string) error {
	return runStreaming(env, "install", "install", spec)
}

// InstallVersion pins an installed package to one exact version.
//
// There is no "downgrade" command in pip and none here: asking for a version
// the environment does not have makes pip uninstall the current one and
// install the requested one, which is the same operation in either direction.
func InstallVersion(env environments.Env, name, version string) error {
	return runStreamingFor(env, name, "install", "install", name+"=="+version)
}

// Upgrade upgrades one package to the newest version its metadata allows.
func Upgrade(env environments.Env, name string) error {
	return runStreaming(env, "upgrade", "install", "--upgrade", name)
}

// Uninstall removes a package and the files it owns.
func Uninstall(env environments.Env, name string) error {
	return runStreaming(env, "uninstall", "uninstall", "--yes", name)
}

// runStreaming runs a pip command, forwards every output line to the log, and
// records the outcome in History.
func runStreaming(env environments.Env, action string, args ...string) error {
	return runStreamingFor(env, nameFrom(args), action, args...)
}

// runStreamingFor is runStreaming with the name recorded in History given
// explicitly. A pinned requirement ("requests==2.32.5") is not a package name:
// it reads badly in History, and the "Successfully installed" lookup matches on
// "requests-", so it would fail to find the version it just installed.
func runStreamingFor(env environments.Env, target, action string, args ...string) error {
	command := fmt.Sprintf("%s -m pip %s", env.Python, strings.Join(args, " "))
	emitLog("INFO", fmt.Sprintf("[%s] pip %s", env.Label, strings.Join(args, " ")))

	cmd := env.Pip(args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		emitLog("ERR", err.Error())
		appendHistory(newEntry(action, target, "", command, "failed"))
		return err
	}

	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	var lines []string
	for scanner.Scan() {
		line := scanner.Text()
		lines = append(lines, line)
		emitLog("STREAM", line)
	}
	waitErr := cmd.Wait()
	output := strings.Join(lines, "\n")

	if waitErr != nil {
		reason := lastNonEmptyLine(output)
		emitLog("ERR", fmt.Sprintf("pip %s failed: %s", action, reason))
		appendHistory(newEntry(action, target, "", command, "failed"))
		return fmt.Errorf("pip %s failed: %s", action, reason)
	}

	appendHistory(newEntry(action, target, installedVersion(output, target), command, "success"))
	return nil
}

// nameFrom is the package being acted on: the last argument that is not a flag.
func nameFrom(args []string) string {
	for i := len(args) - 1; i >= 0; i-- {
		if !strings.HasPrefix(args[i], "-") {
			return args[i]
		}
	}
	return ""
}

// installedVersion reads "Successfully installed x-1.2.3" out of pip's output.
func installedVersion(output, name string) string {
	const marker = "Successfully installed "
	lowerName := strings.ToLower(name)
	for _, line := range strings.Split(output, "\n") {
		rest, ok := strings.CutPrefix(line, marker)
		if !ok {
			continue
		}
		for _, token := range strings.Fields(rest) {
			if strings.HasPrefix(strings.ToLower(token), lowerName+"-") {
				return token[len(name)+1:]
			}
		}
	}
	return ""
}

// ── PyPI metadata ────────────────────────────────────────────────────────────

var httpClient = &http.Client{Timeout: 30 * time.Second}

// Versions lists every version of a package that could be installed into this
// environment, newest first.
//
// "Which versions exist?" has two answers on PyPI and only one of them is
// useful here. The JSON API's releases map holds every file ever uploaded,
// including prereleases, yanked releases, and versions with no build for this
// platform; asking pip answers with the set an install would actually be able
// to resolve, so a version offered in the picker is a version that installs.
// That filtering is also why this shells out to pip rather than reading PyPI
// directly, and why the list arrives in the order the picker wants: pip sorts
// by PEP 440, which no string comparison gets right — "0.12.01" sorts above
// "0.12.1", and "2.34.0.dev1" lands wherever the alphabet puts it.
func Versions(env environments.Env, name string) ([]string, error) {
	// CombinedOutput, not Output: "no matching distribution" is pip's last word
	// on stderr and failureReason is what turns it into the error message.
	out, err := env.Pip("index", "versions", name).CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("could not list versions of %s: %s", name, failureReason(out, err))
	}
	if versions, ok := parseVersions(string(out)); ok {
		return versions, nil
	}
	return nil, fmt.Errorf("pip reported no versions of %s", name)
}

// parseVersions reads the "Available versions: a, b, c" line out of `pip index
// versions` output.
//
// The output carries lines this does not want — the package and its latest
// version on the first line, the installed and latest version indented at the
// end, and pip's upgrade notice on stderr, which CombinedOutput folds in.
// Only the one line that names the marker is read, and only its right-hand
// side, so none of those can be mistaken for a version.
func parseVersions(output string) ([]string, bool) {
	const marker = "Available versions:"
	for _, line := range strings.Split(output, "\n") {
		rest, ok := strings.CutPrefix(strings.TrimSpace(line), marker)
		if !ok {
			continue
		}
		versions := []string{}
		for _, version := range strings.Split(rest, ",") {
			if version = strings.TrimSpace(version); version != "" {
				versions = append(versions, version)
			}
		}
		return versions, len(versions) > 0
	}
	return nil, false
}

// changelogURL looks for a changelog link in a package's PyPI metadata so the
// Updates page can offer "what changed" before an upgrade.
func changelogURL(name string) string {
	resp, err := httpClient.Get("https://pypi.org/pypi/" + name + "/json")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	var payload struct {
		Info struct {
			ProjectURLs map[string]string `json:"project_urls"`
		} `json:"info"`
	}
	if json.NewDecoder(resp.Body).Decode(&payload) != nil {
		return ""
	}
	for key, url := range payload.Info.ProjectURLs {
		lower := strings.ToLower(key)
		for _, word := range []string{"changelog", "change log", "changes", "release notes", "releases"} {
			if strings.Contains(lower, word) {
				return url
			}
		}
	}
	return ""
}

// ── small helpers ────────────────────────────────────────────────────────────

// separatorRun matches the PEP 503 separator class, which is collapsed rather
// than replaced one character at a time: "zope..if" is the project "zope-if",
// not "zope--if".
var separatorRun = regexp.MustCompile(`[-_.]+`)

// normalise applies the PEP 503 name rules, so "PyYAML" and "pyyaml" collapse
// to one key. It runs on both sides of every name comparison in this package,
// so a mismatch here is a package that silently loses its summary.
func normalise(s string) string {
	return separatorRun.ReplaceAllString(strings.ToLower(s), "-")
}

func glob(pattern string) []string {
	matches, _ := filepath.Glob(pattern)
	return matches
}

func existingDirs(paths []string) []string {
	kept := make([]string, 0, len(paths))
	for _, path := range paths {
		if fi, err := os.Stat(path); err == nil && fi.IsDir() {
			kept = append(kept, path)
		}
	}
	return kept
}

// failureReason prefers pip's own last line over Go's bare "exit status 1",
// because pip says what went wrong and exit status 1 does not.
func failureReason(output []byte, err error) string {
	if reason := lastNonEmptyLine(string(output)); reason != "" {
		return reason
	}
	return err.Error()
}

func lastNonEmptyLine(s string) string {
	lines := strings.Split(s, "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if line := strings.TrimSpace(lines[i]); line != "" {
			return line
		}
	}
	return ""
}
