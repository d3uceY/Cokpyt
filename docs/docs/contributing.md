---
sidebar_position: 4
---

# Contributing

Contributions to Cokpyt are very welcome — whether that is a bug report, a feature suggestion, a documentation fix, or a pull request.

---

## Reporting Bugs

Before opening an issue, check whether it has already been reported on the [Issues page](https://github.com/d3uceY/Cokpyt/issues).

When filing a new bug report, please include:

1. Your operating system and version
2. Your Python version (`python --version`)
3. Your pip version (`pip --version`)
4. The Cokpyt version (shown in **Settings**)
5. Exact steps to reproduce the problem
6. What you expected to happen
7. What actually happened
8. Any relevant output from the **[Logs](./features/logs)** page inside Cokpyt

---

## Suggesting Features

Open a GitHub issue and prefix the title with `[Feature]`. Describe the problem you are trying to solve and how your proposed feature would address it. Screenshots, mockups, or references to how other tools handle it are always helpful.

---

## Setting Up the Dev Environment

### Prerequisites

| Tool | Version |
|---|---|
| [Go](https://go.dev/dl/) | 1.21 or later |
| [Node.js](https://nodejs.org/) | 18 or later |
| [Wails CLI](https://wails.io/docs/gettingstarted/installation) | v2 |

Install the Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Clone and Run

```bash
git clone https://github.com/d3uceY/Cokpyt.git
cd Cokpyt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start the dev server (hot reload on both Go and React changes)
wails dev
```

### Build a Production Binary

```bash
# Windows
wails build --target windows/amd64 --nsis

# macOS (universal binary)
wails build --target darwin/universal

# Linux
wails build --target linux/amd64
```

---

## Project Structure

```
Cokpyt/
  app.go                  — Wails app lifecycle and method bindings
  main.go                 — Entry point
  backend/
    pip/                  — All Go logic: package management, doctor, history, cleanup, search
  frontend/
    src/
      pages/              — One file per page (Dashboard, InstalledPackages, Search, …)
      components/         — Shared UI components (layout, sidebar, terminal panel)
      lib/                — Utility functions
    wailsjs/              — Auto-generated Go bindings (do not edit by hand)
  build/
    windows/installer/    — NSIS installer script
```

The Go backend exposes functions through Wails bindings. The React frontend calls them via `wailsjs/go/main/App`. If you add a new Go method to `App`, regenerate the bindings:

```bash
wails generate module
```

---

## Making a Pull Request

1. Fork the repo and create a branch from `main`:
   ```bash
   git checkout -b fix/your-branch-name
   ```
2. Make your changes and confirm the project still builds:
   ```bash
   wails build
   ```
3. If you changed frontend code, verify TypeScript is clean:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
4. Commit with a clear message describing what changed and why.
5. Push your branch and open a pull request against `main`. Link any related issues in the PR description.

Keep pull requests focused — one fix or feature per PR is much easier to review.

---

## Style Guidelines

### Go

- Follow standard Go formatting — run `gofmt` before committing.
- Return errors rather than panicking in library code.

### TypeScript / React

- Use explicit types; avoid `any` where a proper type exists.
- Components live in `frontend/src/components/` or `frontend/src/pages/`.
- Keep page components focused on layout and data wiring. Move logic into hooks or utility functions.

### CSS / Tailwind

- Stick to the existing design conventions: the `#0048ad` blue accent, the monochrome border palette, and the `font-black uppercase tracking-widest` heading style.
- Do not introduce new third-party UI libraries without first discussing in an issue.

---

## Code of Conduct

Be respectful. Everyone contributing here is doing so voluntarily. Constructive criticism is always welcome; personal attacks are not.
