# Contributing to Cokpyt

Thanks for taking the time. Every bug report, feature idea, and pull request makes Cokpyt better for everyone in the pip ecosystem. Here is everything you need to know to get involved.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Setting Up the Dev Environment](#setting-up-the-dev-environment)
- [Project Structure](#project-structure)
- [Making a Pull Request](#making-a-pull-request)
- [Style Guidelines](#style-guidelines)

---

## Code of Conduct

Be respectful. Everyone contributing here is doing so voluntarily. Constructive criticism is welcome; personal attacks are not.

---

## Reporting Bugs

Before opening an issue, check whether it has already been reported on the [Issues page](https://github.com/d3uceY/Cokpyt/issues).

When filing a new bug report, include:

1. Your operating system and version
2. Your Python version (`python --version`)
3. Your pip version (`pip --version`)
4. The Cokpyt version (shown in Settings)
5. Exact steps to reproduce the problem
6. What you expected to happen
7. What actually happened
8. Any relevant output from the **Logs** page inside Cokpyt

---

## Suggesting Features

Open an issue and prefix the title with `[Feature]`. Describe the problem you are trying to solve and how your proposed feature would address it. Screenshots, mockups, or references to how other tools handle it are always helpful.

---

## Setting Up the Dev Environment

### Prerequisites

| Tool | Version |
|------|---------|
| [Go](https://go.dev/dl/) | 1.21 or later |
| [Node.js](https://nodejs.org/) | 18 or later |
| [Wails CLI](https://wails.io/docs/gettingstarted/installation) | v2 |

Install the Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Clone and run

```bash
git clone https://github.com/d3uceY/Cokpyt.git
cd Cokpyt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start the dev server (hot reload on both Go and React changes)
wails dev
```

### Build a production binary

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
  app.go                  -- Wails app lifecycle and method bindings
  main.go                 -- Entry point
  backend/
    pip/                  -- All Go logic: package management, doctor, history, cleanup, search
  frontend/
    src/
      pages/              -- One file per page (Dashboard, InstalledPackages, Search, ...)
      components/         -- Shared UI components (layout, sidebar, terminal panel)
      lib/                -- Utility functions
    wailsjs/              -- Auto-generated Go bindings (do not edit by hand)
  build/
    windows/installer/    -- NSIS installer script
```

The Go backend exposes functions through Wails bindings. The React frontend calls them via `wailsjs/go/main/App`. If you add a new Go method to `App`, regenerate the bindings by running `wails generate module` or by doing a full `wails build`.

---

## Making a Pull Request

1. Fork the repo and create a branch from `main`:
   ```bash
   git checkout -b fix/your-branch-name
   ```
2. Make your changes and make sure the project still builds (`wails build`).
3. If you changed frontend code, make sure TypeScript is clean:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
4. Commit with a clear message describing what changed and why.
5. Push your branch and open a pull request against `main`.
6. Fill out the PR description -- link to any related issues and explain what the change does.

Keep pull requests focused. One fix or feature per PR is much easier to review than a large multi-purpose change.

---

## Style Guidelines

**Go**
- Follow standard Go formatting. Run `gofmt` before committing.
- Error handling: return errors, do not panic in library code.

**TypeScript / React**
- Use explicit types. Avoid `any` where a proper type exists.
- Components live in `frontend/src/components/` or `frontend/src/pages/`.
- Keep page components focused on layout and data wiring. Move logic into hooks or utility functions.

**CSS / Tailwind**
- Stick to the existing design conventions: the `#0048ad` blue accent, the monochrome border palette, and the `font-black uppercase tracking-widest` heading style.
- Do not introduce new third-party UI libraries without discussing it in an issue first.

---

## Questions?

Open an issue or start a discussion on the [GitHub repo](https://github.com/d3uceY/Cokpyt). Happy to help.
