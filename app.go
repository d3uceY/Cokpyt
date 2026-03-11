package main

import (
	"context"
	"fmt"

	"Cokpit/backend/pip"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

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
	}
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

// GetPipEnvironmentInfo returns the full Python runtime environment details.
func (a *App) GetPipEnvironmentInfo() (pip.PipEnvironmentInfo, error) {
	return pip.GetPipEnvironmentInfo()
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
