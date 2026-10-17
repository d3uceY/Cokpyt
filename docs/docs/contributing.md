---
sidebar_position: 4
---

# Contributing

Bug reports, feature ideas, documentation fixes, and pull requests are welcome.

## Reporting a bug

Check the [issues](https://github.com/d3uceY/Cokpyt/issues) first. A useful report includes:

1. OS and version
2. Python and pip versions (`python --version`, `pip --version`)
3. Cokpyt version, from **Settings**
4. Steps to reproduce
5. What you expected, and what happened
6. Console output: **copy** in the console header, or **Settings → View the log**

## Suggesting a feature

Open an issue prefixed `[Feature]`. Describe the problem you are trying to solve, and how the change would solve it. Screenshots and examples from other tools help.

## Development

| Tool | Version |
|---|---|
| [Go](https://go.dev/dl/) | 1.23 or later |
| [Wails CLI](https://wails.io/docs/gettingstarted/installation) | v3 |
| Node.js | 20 or later |

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

```bash
git clone https://github.com/d3uceY/Cokpyt.git
cd Cokpyt
wails3 dev
```

| Command | Does |
|---|---|
| `wails3 task test` | build the frontend, then run `go test ./...` |
| `wails3 task build` | regenerate bindings, build the frontend, build Go |
| `wails3 task run` | run the binary that is already built |
| `wails3 task frontend` | Vite dev server on its own |
| `wails3 build` | build for the current OS |
| `wails3 package` | NSIS installer on Windows, `.app` bundle on macOS |

Cross-compiling means setting `GOOS` and `GOARCH`. Linux and macOS builds need `CGO_ENABLED=1` and a platform toolchain; Windows does not.

On Linux, install `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`.

## Pull requests

1. Branch from `main`.
2. Make the change and confirm `wails3 build` passes.
3. Run `wails3 task test`, and add a Go test for any non-trivial logic.
4. Describe what changed and why.
5. Open the pull request against `main`, linking related issues.

One fix or feature per pull request.

## Code of conduct

Be respectful. Everyone here contributes voluntarily. Constructive criticism is welcome; personal attacks are not.
