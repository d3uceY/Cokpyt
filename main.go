package main

import (
	"embed"
	"io/fs"
	"log/slog"
	"os"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Version is shown in the UI and compared against the latest GitHub release.
//
// The release workflow rewrites this line from the pushed tag before building
// (scripts/set-version), so the value committed here is only the local-build
// default. It is a var rather than a const so a build can override it too:
// go build -ldflags "-X main.Version=v0.4.0".
var Version = "v0.3.0"

// The whole frontend is embedded, bindings included. There is no build step:
// the page is plain HTML, CSS and ES modules, and the bindings the CLI
// generates are plain ES modules too, so what is served is what is on disk.
//
//go:embed all:frontend
var assets embed.FS

func main() {
	// `wails3 dev` exports FRONTEND_DEVSERVER_URL for a Vite dev server, and
	// builds with the `dev` tag, whose asset handler proxies every request to
	// that URL and aborts the app when nothing answers there. This frontend has
	// no build step and therefore no dev server: the files in frontend/ are
	// already what ships.
	//
	// Clearing the variable before the app is built makes the dev build serve
	// its own embedded assets. `wails3 dev` still watches, rebuilds and reruns
	// on every change, which is the whole of what dev mode means here.
	os.Unsetenv("FRONTEND_DEVSERVER_URL")

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

// frontend roots the embedded filesystem at the frontend directory, so
// index.html is served at / rather than at /frontend/index.html.
func frontend() fs.FS {
	sub, err := fs.Sub(assets, "frontend")
	if err != nil {
		panic(err)
	}
	return sub
}
