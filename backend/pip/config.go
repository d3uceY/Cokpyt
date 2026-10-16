package pip

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config is the app's own state, as opposed to anything about Python.
//
// It deliberately does not list environments: those are discovered from the
// machine every run, so a venv created outside the app shows up without being
// registered, and one that has been deleted stops appearing instead of
// lingering as a broken entry.
type Config struct {
	Theme    string `json:"theme"`    // "light" | "dark"
	Active   string `json:"active"`   // interpreter path of the selected environment
	TourSeen bool   `json:"tourSeen"` // the intro note has been dismissed
}

func defaultConfig() Config {
	return Config{Theme: "light"}
}

// ConfigDir is where Cokpyt keeps its own files.
func ConfigDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "Cokpyt")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func statePath(name string) (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, name), nil
}

// GetConfig reads config.json, falling back to defaults for anything missing
// or unreadable. A corrupt config should cost the user their theme, not the app.
func GetConfig() Config {
	path, err := statePath("config.json")
	if err != nil {
		return defaultConfig()
	}
	data, err := os.ReadFile(path)
	if err != nil {
		cfg := defaultConfig()
		_ = SaveConfig(cfg)
		return cfg
	}
	var cfg Config
	if json.Unmarshal(data, &cfg) != nil {
		return defaultConfig()
	}
	if cfg.Theme != "dark" && cfg.Theme != "light" {
		cfg.Theme = "light"
	}
	return cfg
}

// SaveConfig writes the config to disk.
func SaveConfig(cfg Config) error {
	path, err := statePath("config.json")
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// UpdateConfig applies a change to the stored config and saves it.
func UpdateConfig(change func(*Config)) error {
	cfg := GetConfig()
	change(&cfg)
	return SaveConfig(cfg)
}
