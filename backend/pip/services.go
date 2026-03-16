package pip

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"sync"
)

// OutdatedPackage represents a pip package that has a newer version available.
type OutdatedPackage struct {
	Name          string `json:"name"`
	Version       string `json:"version"`
	LatestVersion string `json:"latestVersion"`
	BumpType      string `json:"bumpType"`     // "major" | "minor" | "patch"
	ChangelogURL  string `json:"changelogUrl"` // URL to the package changelog, if available
}

// PipPackage represents an installed pip package with its metadata.
type PipPackage struct {
	Name          string `json:"name"`
	Version       string `json:"version"`
	LatestVersion string `json:"latestVersion"`
	Summary       string `json:"summary"`
	Status        string `json:"status"` // "up-to-date" | "update-available"
}

type pipListEntry struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type pipOutdatedEntry struct {
	Name           string `json:"name"`
	Version        string `json:"version"`
	LatestVersion  string `json:"latest_version"`
	LatestFileType string `json:"latest_filetype"`
}

// pip returns an exec.Cmd that runs the active environment's python -m pip with the given arguments.
// Using "python -m pip" ensures pip is found even when it is not on PATH directly.
// --disable-pip-version-check suppresses pip's self-update notification UI.
func pip(args ...string) *exec.Cmd {
	allArgs := append([]string{"-m", "pip", "--disable-pip-version-check"}, args...)
	cmd := exec.Command(getPythonExe(), allArgs...)
	hideWindow(cmd)
	return cmd
}

// python returns an exec.Cmd that runs the active environment's python with the given arguments.
func python(args ...string) *exec.Cmd {
	cmd := exec.Command(getPythonExe(), args...)
	hideWindow(cmd)
	return cmd
}

// pypiInfoResponse is used to parse the changelog URL from the PyPI JSON API.
type pypiInfoResponse struct {
	Info struct {
		ProjectURLs map[string]string `json:"project_urls"`
	} `json:"info"`
}

// fetchChangelogURL queries the PyPI JSON API for a package and returns the
// changelog URL from project_urls, or an empty string if not found.
func fetchChangelogURL(name string) string {
	resp, err := http.Get("https://pypi.org/pypi/" + name + "/json")
	if err != nil || resp.StatusCode != http.StatusOK {
		return ""
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}
	var info pypiInfoResponse
	if err := json.Unmarshal(body, &info); err != nil {
		return ""
	}
	for key, url := range info.Info.ProjectURLs {
		if strings.Contains(strings.ToLower(key), "changelog") ||
			strings.Contains(strings.ToLower(key), "change log") ||
			strings.Contains(strings.ToLower(key), "changes") ||
			strings.Contains(strings.ToLower(key), "release notes") {
			return url
		}
	}
	return ""
}

// GetOutdatedPackages returns packages that have a newer version available on PyPI.
func GetOutdatedPackages() ([]OutdatedPackage, error) {
	out, err := pip("list", "--outdated", "--format=json").Output()
	if err != nil {
		return nil, fmt.Errorf("pip list --outdated failed: %w", err)
	}
	var entries []pipOutdatedEntry
	if err := json.Unmarshal(out, &entries); err != nil {
		return nil, fmt.Errorf("failed to parse pip list --outdated output: %w", err)
	}
	packages := make([]OutdatedPackage, len(entries))
	for i, e := range entries {
		packages[i] = OutdatedPackage{
			Name:          e.Name,
			Version:       e.Version,
			LatestVersion: e.LatestVersion,
			BumpType:      classifyBump(e.Version, e.LatestVersion),
		}
	}
	// Fetch changelog URLs concurrently from PyPI.
	var wg sync.WaitGroup
	for i := range packages {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			packages[i].ChangelogURL = fetchChangelogURL(packages[i].Name)
		}(i)
	}
	wg.Wait()
	return packages, nil
}

// classifyBump returns "major", "minor", or "patch" based on semver segment changes.
func classifyBump(current, latest string) string {
	cp := strings.SplitN(current, ".", 3)
	lp := strings.SplitN(latest, ".", 3)
	if len(cp) > 0 && len(lp) > 0 && cp[0] != lp[0] {
		return "major"
	}
	if len(cp) > 1 && len(lp) > 1 && cp[1] != lp[1] {
		return "minor"
	}
	return "patch"
}

// GetInstalledPackages returns all installed pip packages with version and update status.
func GetInstalledPackages() ([]PipPackage, error) {
	installedOut, err := pip("list", "--format=json").Output()
	if err != nil {
		return nil, fmt.Errorf("pip list failed: %w", err)
	}

	var installed []pipListEntry
	if err := json.Unmarshal(installedOut, &installed); err != nil {
		return nil, fmt.Errorf("failed to parse pip list output: %w", err)
	}

	outdatedOut, _ := pip("list", "--outdated", "--format=json").Output()
	var outdated []pipOutdatedEntry
	json.Unmarshal(outdatedOut, &outdated)

	outdatedMap := make(map[string]string)
	for _, o := range outdated {
		outdatedMap[strings.ToLower(o.Name)] = o.LatestVersion
	}

	names := make([]string, len(installed))
	for i, pkg := range installed {
		names[i] = pkg.Name
	}
	summaryMap := batchGetSummaries(names)

	packages := make([]PipPackage, len(installed))
	for i, pkg := range installed {
		key := strings.ToLower(pkg.Name)
		latestVer, isOutdated := outdatedMap[key]
		if !isOutdated {
			latestVer = pkg.Version
		}
		status := "up-to-date"
		if isOutdated {
			status = "update-available"
		}
		packages[i] = PipPackage{
			Name:          pkg.Name,
			Version:       pkg.Version,
			LatestVersion: latestVer,
			Summary:       summaryMap[key],
			Status:        status,
		}
	}

	return packages, nil
}

// batchGetSummaries fetches package summaries in batches using pip show.
func batchGetSummaries(names []string) map[string]string {
	summaries := make(map[string]string)
	if len(names) == 0 {
		return summaries
	}

	const batchSize = 50
	for i := 0; i < len(names); i += batchSize {
		end := i + batchSize
		if end > len(names) {
			end = len(names)
		}
		batch := names[i:end]
		out, err := pip(append([]string{"show"}, batch...)...).Output()
		if err != nil {
			continue
		}
		for name, summary := range parsePipShow(string(out)) {
			summaries[name] = summary
		}
	}
	return summaries
}

// parsePipShow parses multi-package `pip show` output into a name→summary map.
func parsePipShow(output string) map[string]string {
	result := make(map[string]string)
	blocks := strings.Split(output, "---")
	for _, block := range blocks {
		var name, summary string
		for _, line := range strings.Split(block, "\n") {
			line = strings.TrimRight(line, "\r")
			if after, ok := strings.CutPrefix(line, "Name: "); ok {
				name = strings.TrimSpace(after)
			} else if after, ok := strings.CutPrefix(line, "Summary: "); ok {
				summary = strings.TrimSpace(after)
			}
		}
		if name != "" {
			result[strings.ToLower(name)] = summary
		}
	}
	return result
}

// LogEmitter is set by app.go to forward log lines to the frontend via Wails events.
var LogEmitter func(level, msg string)

// emitLog sends a log message to the frontend if LogEmitter is set.
func emitLog(level, msg string) {
	AppendLog(level, msg)
	if LogEmitter != nil {
		LogEmitter(level, msg)
	}
}

// InstallPackage installs a pip package by name.
func InstallPackage(name string) error {
	cmdStr := "pip install " + name
	emitLog("INFO", "Running: "+cmdStr)
	cmd := pip("install", name)
	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		emitLog("ERR", err.Error())
		return err
	}
	scanner := bufio.NewScanner(stdout)
	var outLines []string
	for scanner.Scan() {
		line := scanner.Text()
		outLines = append(outLines, line)
		emitLog("STREAM", line)
	}
	err := cmd.Wait()
	outStr := strings.Join(outLines, "\n")
	if err != nil {
		emitLog("ERR", "pip install failed: "+outStr)
		appendHistory(newEntry("install", name, "", cmdStr, "failed"))
		return fmt.Errorf("pip install failed: %s", outStr)
	}
	// Extract installed version from output.
	ver := extractInstalledVersion(outStr, name)
	appendHistory(newEntry("install", name, ver, cmdStr, "success"))
	return nil
}

// UninstallPackage removes a pip package by name.
func UninstallPackage(name string) error {
	cmdStr := "pip uninstall -y " + name
	emitLog("INFO", "Running: "+cmdStr)
	cmd := pip("uninstall", "-y", name)
	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		emitLog("ERR", err.Error())
		return err
	}
	scanner := bufio.NewScanner(stdout)
	var outLines []string
	for scanner.Scan() {
		line := scanner.Text()
		outLines = append(outLines, line)
		emitLog("STREAM", line)
	}
	err := cmd.Wait()
	outStr := strings.Join(outLines, "\n")
	if err != nil {
		emitLog("ERR", "pip uninstall failed: "+outStr)
		appendHistory(newEntry("uninstall", name, "", cmdStr, "failed"))
		return fmt.Errorf("pip uninstall failed: %s", outStr)
	}
	appendHistory(newEntry("uninstall", name, "", cmdStr, "success"))
	return nil
}

// UpgradePackage upgrades a pip package to its latest version.
func UpgradePackage(name string) error {
	cmdStr := "pip install --upgrade " + name
	emitLog("INFO", "Running: "+cmdStr)
	cmd := pip("install", "--upgrade", name)
	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		emitLog("ERR", err.Error())
		return err
	}
	scanner := bufio.NewScanner(stdout)
	var outLines []string
	for scanner.Scan() {
		line := scanner.Text()
		outLines = append(outLines, line)
		emitLog("STREAM", line)
	}
	err := cmd.Wait()
	outStr := strings.Join(outLines, "\n")
	if err != nil {
		emitLog("ERR", "pip upgrade failed: "+outStr)
		appendHistory(newEntry("upgrade", name, "", cmdStr, "failed"))
		return fmt.Errorf("pip upgrade failed: %s", outStr)
	}
	ver := extractInstalledVersion(outStr, name)
	appendHistory(newEntry("upgrade", name, ver, cmdStr, "success"))
	return nil
}

// extractInstalledVersion tries to parse "Successfully installed <name>-<ver>" from pip output.
func extractInstalledVersion(output, name string) string {
	prefix := "Successfully installed "
	for _, line := range strings.Split(output, "\n") {
		if strings.HasPrefix(line, prefix) {
			for _, tok := range strings.Fields(strings.TrimPrefix(line, prefix)) {
				if strings.HasPrefix(strings.ToLower(tok), strings.ToLower(name)+"-") {
					return strings.TrimPrefix(strings.ToLower(tok), strings.ToLower(name)+"-")
				}
			}
		}
	}
	return ""
}
