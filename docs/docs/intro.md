---
sidebar_position: 1
---

# Introduction

<div align="center">
  <img src={require('/img/appicon.png').default} alt="Cokpyt icon" width="96" />
</div>

<br />

**Cokpyt** is a desktop GUI over `pip` and the PyPI ecosystem — no command line.

<div align="center">
  <img src={require('/img/hero.png').default} alt="Cokpyt hero screenshot" style={{borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)'}} />
</div>

<br />

## Why Cokpyt?

`pip list` reports the packages of one interpreter and writes them to a terminal. The packages you actually want are usually in a project venv, not the base interpreter.

**Cokpyt is the GUI you always wished pip shipped with.**

Built with Go on top of the [Wails](https://wails.io) framework and a React frontend, it puts *every* Python environment on your machine on one dashboard: browse installed packages, search all of PyPI, install and upgrade and uninstall with a click, run an environment health check, and read a logged history of every pip action.

## Feature Overview

| Feature | What it does |
|---|---|
| [Environments](./features/environments) | Every Python environment on the machine — launcher runtimes, standalone installs, venvs, conda envs — with the packages each one holds |
| [Dashboard](./features/dashboard) | Environments, package counts, pending updates, recent activity |
| [Installed Packages](./features/installed-packages) | Browse, filter, install, uninstall, and bulk-manage the active environment |
| [Updates](./features/updates) | Every outdated package with version diffs; upgrade one or all |
| [Search](./features/search) | Query PyPI and install any result |
| [Doctor](./features/doctor) | Health check for the interpreter, its pip, and PyPI connectivity |
| [History](./features/history) | Record of every install, upgrade, and uninstall, with timestamps |
| [Cleanup](./features/cleanup) | Reclaim disk space: pip caches, `.egg-info` dirs, `__pycache__` folders |
| [Settings](./features/settings) | Light/dark theme, update check, active environment details |

Every pip operation streams into a console panel at the bottom of the window, so pip's own output is visible while it works.

## Tech Stack

- **[Wails v3](https://wails.io)** - Go backend, web frontend, one native binary per platform
- **React with Vite** - components and hooks, bundled into the binary by Vite
- **Generated ES module bindings** - `wails3 generate bindings -b` turns every public Go service method into a callable JavaScript function

## Next Steps

- **[Installation](./installation)** - download the binary or install via `pip`
- **[Dashboard](./features/dashboard)** - the first page you'll see
- **[Contributing](./contributing)** - set up a dev environment
