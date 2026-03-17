---
sidebar_position: 1
---

# Introduction

<div align="center">
  <img src={require('/img/appicon.png').default} alt="Cokpyt icon" width="96" />
</div>

<br />

**Cokpyt** is a lightweight, fast desktop application that gives you a complete graphical interface over `pip` and the PyPI ecosystem - without ever touching the command line.

<div align="center">
  <img src={require('/img/hero.png').default} alt="Cokpyt hero screenshot" style={{borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)'}} />
</div>

<br />

## Why Cokpyt?

You work in Python. You use `pip`. But every time you need to manage your packages you are back in a terminal window, squinting at walls of text and trying to remember whether it was `pip list --outdated` or `pip list -o`.

**Cokpyt is the GUI you always wished pip shipped with.**

Built with Go and React on top of the [Wails](https://wails.io) framework, it puts your entire Python environment on a clear dashboard. Browse every installed package, search all of PyPI, install and upgrade and uninstall with a click, run a full environment health check, and see a logged history of every pip action you have ever taken.

## Feature Overview

| Feature | What it does |
|---|---|
| [Dashboard](./features/dashboard) | Real-time overview of your environment: total packages, pending updates, Python & pip versions, recent activity |
| [Installed Packages](./features/installed-packages) | Browse, filter, install, uninstall, and bulk-manage every package in your environment |
| [Updates](./features/updates) | See every outdated package with version diffs; upgrade one, a selection, or all at once |
| [Search](./features/search) | Query PyPI instantly and install any result with one click |
| [Doctor](./features/doctor) | Health check for Python, pip, and PyPI connectivity with actionable fix hints |
| [History](./features/history) | Permanent audit trail of every install, upgrade, and uninstall with timestamps |
| [Cleanup](./features/cleanup) | Reclaim disk space by clearing pip caches, `.egg-info` dirs, and `__pycache__` folders |
| [Logs](./features/logs) | Raw pip output streamed live; filterable by keyword and severity after the fact |
| [Environments](./features/environment) | Register, switch between, and manage Python virtual environments |
| [Settings](./features/settings) | Toggle light/dark theme and replay the guided tour |

## Tech Stack

Cokpyt is built on a modern, open-source stack:

- **[Wails v2](https://wails.io)** - Go backend, web frontend, one native binary per platform
- **[React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)** - frontend UI
- **[TanStack Query](https://tanstack.com/query)** - data fetching and cache invalidation
- **[Tailwind CSS](https://tailwindcss.com)** - utility-first styling

## Next Steps

- **[Installation](./installation)** - download the binary or install via `pip`
- **[Dashboard](./features/dashboard)** - first page you'll see when you open the app
- **[Contributing](./contributing)** - set up a dev environment and send a pull request
