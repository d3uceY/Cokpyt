package pip

import (
	"os"
	"strings"
)

// PipEnvironmentInfo holds Python runtime and environment details.
type PipEnvironmentInfo struct {
	PythonVersion string `json:"pythonVersion"`
	PipVersion    string `json:"pipVersion"`
	PythonPath    string `json:"pythonPath"`
	SitePackages  string `json:"sitePackages"`
	VenvActive    bool   `json:"venvActive"`
	VenvPath      string `json:"venvPath"`
}

// GetPipEnvironmentInfo returns the full Python environment details.
func GetPipEnvironmentInfo() (PipEnvironmentInfo, error) {
	var info PipEnvironmentInfo

	// Python version
	pyOut, err := python("--version").CombinedOutput()
	if err == nil {
		info.PythonVersion = strings.TrimSpace(strings.TrimPrefix(string(pyOut), "Python "))
	} else {
		info.PythonVersion = "unknown"
	}

	// pip version
	pipOut, _ := pip("--version").Output()
	parts := strings.Fields(string(pipOut))
	if len(parts) >= 2 {
		info.PipVersion = parts[1]
	}

	// Python executable path
	pathOut, _ := python("-c", "import sys; print(sys.executable)").Output()
	info.PythonPath = strings.TrimSpace(string(pathOut))

	// Site-packages
	sp, _ := getSitePackages()
	info.SitePackages = sp

	// Virtual environment — prefer the app's own active-env setting over the VIRTUAL_ENV var.
	if cfg, err := GetConfig(); err == nil && cfg.ActiveEnv != "" {
		info.VenvActive = true
		info.VenvPath = cfg.ActiveEnv
	} else if venv := os.Getenv("VIRTUAL_ENV"); venv != "" {
		info.VenvActive = true
		info.VenvPath = venv
	}

	return info, nil
}
