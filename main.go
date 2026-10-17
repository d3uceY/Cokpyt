package main

import (
	"embed"
	"io/fs"
	"log/slog"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Version is shown in the UI and compared against the latest GitHub release.
//
// The release workflow rewrites this line from the pushed tag before building
// (scripts/set-version), so the value committed here is only the local-build
// default. It is a var rather than a const so a build can override it too:
// go build -ldflags "-X main.Version=v0.4.0".
var Version = "v0.3.0"

// The built frontend is embedded. Vite writes it to frontend/dist, including
// the hashed JS and CSS bundles, the assets in frontend/public, and nothing
// from src/ or node_modules. `wails3 build` produces it before compiling Go.
//
//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name:        "Cokpyt",
		Description: "A desktop GUI for pip",
		LogLevel:    slog.LevelWarn,
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(frontend()),
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Cokpyt",
		Width:            800,
		Height:           600,
		MinWidth:         700,
		MinHeight:        640,
		InitialPosition:  application.WindowCentered,
		BackgroundColour: application.NewRGBA(245, 247, 248, 255),
		URL:              "/",
	})

	app.RegisterService(application.NewService(NewApp(app)))

	if err := app.Run(); err != nil {
		panic(err)
	}
}

// frontend roots the embedded filesystem at the build output, so index.html is
// served at / rather than at /frontend/dist/index.html.
func frontend() fs.FS {
	sub, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		panic(err)
	}
	return sub
}
