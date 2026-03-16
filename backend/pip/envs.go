package pip

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// venvPythonExe returns the path to the python executable inside a venv.
func venvPythonExe(venvPath string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(venvPath, "Scripts", "python.exe")
	}
	return filepath.Join(venvPath, "bin", "python")
}

// getPythonExe returns the python executable for the currently active environment.
// Falls back to the plain "python" command when no venv is active.
func getPythonExe() string {
	cfg, err := GetConfig()
	if err != nil || cfg.ActiveEnv == "" {
		return "python"
	}
	return venvPythonExe(cfg.ActiveEnv)
}

// isValidVenv returns true if the given directory contains a Python executable,
// which is the minimal indicator of a valid venv.
func isValidVenv(path string) bool {
	_, err := os.Stat(venvPythonExe(path))
	return err == nil
}

// ListEnvironments returns all saved venv entries stored in config.
func ListEnvironments() ([]VenvEntry, error) {
	cfg, err := GetConfig()
	if err != nil {
		return nil, err
	}
	if cfg.Environments == nil {
		return []VenvEntry{}, nil
	}
	return cfg.Environments, nil
}

// AddEnvironment validates that path is a venv and saves it with the given name.
// If name is empty the directory name is used.
func AddEnvironment(name, path string) error {
	path = filepath.Clean(path)
	if !isValidVenv(path) {
		return fmt.Errorf("no Python executable found in %q — is this a valid venv?", path)
	}
	cfg, err := GetConfig()
	if err != nil {
		return err
	}
	for _, e := range cfg.Environments {
		if e.Path == path {
			return fmt.Errorf("environment %q is already saved", path)
		}
	}
	if name == "" {
		name = filepath.Base(path)
	}
	cfg.Environments = append(cfg.Environments, VenvEntry{Name: name, Path: path})
	return SaveConfig(cfg)
}

// RemoveEnvironment removes the saved entry with the given path.
// If it was the active environment the active env is cleared (system python is used instead).
func RemoveEnvironment(path string) error {
	path = filepath.Clean(path)
	cfg, err := GetConfig()
	if err != nil {
		return err
	}
	var updated []VenvEntry
	found := false

	for _, e := range cfg.Environments {
		if e.Path == path {
			found = true
		} else {
			updated = append(updated, e)
		}
	}
	if !found {
		return fmt.Errorf("environment %q not found", path)
	}
	cfg.Environments = updated
	if cfg.ActiveEnv == path {
		cfg.ActiveEnv = ""
	}
	return SaveConfig(cfg)
}

// SetActiveEnvironment switches the active environment to the given venv path.
// Pass an empty string to fall back to the system python.
func SetActiveEnvironment(path string) error {
	if path != "" {
		path = filepath.Clean(path)
		if !isValidVenv(path) {
			return fmt.Errorf("no Python executable found in %q — is this a valid venv?", path)
		}
	}
	cfg, err := GetConfig()
	if err != nil {
		return err
	}
	cfg.ActiveEnv = path
	return SaveConfig(cfg)
}

// ScanForVenvs scans one level deep inside searchDir for sub-directories that
// look like Python virtual environments (i.e. contain the expected python binary).
func ScanForVenvs(searchDir string) ([]VenvEntry, error) {
	entries, err := os.ReadDir(searchDir)
	if err != nil {
		return nil, fmt.Errorf("cannot read directory: %w", err)
	}
	var results []VenvEntry
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dirPath := filepath.Join(searchDir, e.Name())
		if isValidVenv(dirPath) {
			results = append(results, VenvEntry{Name: e.Name(), Path: dirPath})
		}
	}
	if results == nil {
		results = []VenvEntry{}
	}
	return results, nil
}
