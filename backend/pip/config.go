package pip

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// AppConfig holds user-configurable application settings.
type AppConfig struct {
	Theme string `json:"theme"` // "light" | "dark"
}

func defaultConfig() AppConfig {
	return AppConfig{Theme: "light"}
}

func configPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "Cokpit", "config.json"), nil
}

// GetConfig reads config.json, creating it with defaults if it does not exist.
func GetConfig() (AppConfig, error) {
	path, err := configPath()
	if err != nil {
		return defaultConfig(), nil
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		cfg := defaultConfig()
		_ = SaveConfig(cfg)
		return cfg, nil
	}
	if err != nil {
		return defaultConfig(), nil
	}

	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return defaultConfig(), nil
	}
	if cfg.Theme != "dark" && cfg.Theme != "light" {
		cfg.Theme = "light"
	}
	return cfg, nil
}

// SaveConfig writes the config to disk.
func SaveConfig(cfg AppConfig) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
