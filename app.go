package main

import (
	"context"
	"fmt"

	"Cokpit/backend/pip"
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
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetInstalledPackages returns all installed pip packages with version and update status.
func (a *App) GetInstalledPackages() ([]pip.Package, error) {
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
