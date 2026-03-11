package pip

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

// OutdatedPackage represents a pip package that has a newer version available.
type OutdatedPackage struct {
	Name          string `json:"name"`
	Version       string `json:"version"`
	LatestVersion string `json:"latestVersion"`
	BumpType      string `json:"bumpType"` // "major" | "minor" | "patch"
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

// pip returns an exec.Cmd that runs python -m pip with the given arguments.
// Using "python -m pip" ensures pip is found even when it is not on PATH directly.
func pip(args ...string) *exec.Cmd {
	return exec.Command("python", append([]string{"-m", "pip"}, args...)...)
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

func emitLog(level, msg string) {
	if LogEmitter != nil {
		LogEmitter(level, msg)
	}
}

// InstallPackage installs a pip package by name.
func InstallPackage(name string) error {
	cmd := "pip install " + name
	emitLog("INFO", "Running: "+cmd)
	out, err := pip("install", name).CombinedOutput()
	outStr := strings.TrimSpace(string(out))
	if err != nil {
		emitLog("ERR", outStr)
		appendHistory(newEntry("install", name, "", cmd, "failed"))
		return fmt.Errorf("pip install failed: %s", outStr)
	}
	emitLog("INFO", outStr)
	// Extract installed version from output.
	ver := extractInstalledVersion(outStr, name)
	appendHistory(newEntry("install", name, ver, cmd, "success"))
	return nil
}

// UninstallPackage removes a pip package by name.
func UninstallPackage(name string) error {
	cmd := "pip uninstall -y " + name
	emitLog("INFO", "Running: "+cmd)
	out, err := pip("uninstall", "-y", name).CombinedOutput()
	outStr := strings.TrimSpace(string(out))
	if err != nil {
		emitLog("ERR", outStr)
		appendHistory(newEntry("uninstall", name, "", cmd, "failed"))
		return fmt.Errorf("pip uninstall failed: %s", outStr)
	}
	emitLog("INFO", outStr)
	appendHistory(newEntry("uninstall", name, "", cmd, "success"))
	return nil
}

// UpgradePackage upgrades a pip package to its latest version.
func UpgradePackage(name string) error {
	cmd := "pip install --upgrade " + name
	emitLog("INFO", "Running: "+cmd)
	out, err := pip("install", "--upgrade", name).CombinedOutput()
	outStr := strings.TrimSpace(string(out))
	if err != nil {
		emitLog("ERR", outStr)
		appendHistory(newEntry("upgrade", name, "", cmd, "failed"))
		return fmt.Errorf("pip upgrade failed: %s", outStr)
	}
	emitLog("INFO", outStr)
	ver := extractInstalledVersion(outStr, name)
	appendHistory(newEntry("upgrade", name, ver, cmd, "success"))
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
