<div align="center">
<img src="readme/asssets/appicon.png" alt="Cokpyt icon" width="96" />
<h1><strong>Cokpyt</strong></h1>
<p><em>A desktop GUI for pip. Because life is too short for the terminal.</em></p>

[![Latest Release](https://img.shields.io/github/v/release/d3uceY/Cokpyt?label=latest&style=for-the-badge&color=0048ad)](https://github.com/d3uceY/Cokpyt/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/d3uceY/Cokpyt/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/d3uceY/Cokpyt/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/d3uceY/Cokpyt/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br />

<img src="readme/asssets/hero.png" alt="Cokpyt hero screenshot" width="100%" />

</div>

---

## What is Cokpyt?

You work in Python. You use pip. You know your way around the PyPI ecosystem. But every time you need to manage your packages you are back in a terminal window, squinting at walls of text and trying to remember whether it was `pip list --outdated` or `pip list -o`.

**Cokpyt is the GUI you always wished pip shipped with.**

It is a lightweight desktop app, built with Go and a plain HTML/CSS/JavaScript frontend, that finds *every* Python environment on your machine and puts all of them on one dashboard. Browse the packages in each one, search all of PyPI, install and upgrade and uninstall with a click, run an environment health check, and read a logged history of every pip action you have taken — all without touching the command line once.

---

## Why "every environment" matters

`pip list` answers a narrower question than it looks like it does. It reports the packages of **one** interpreter. On a machine with a launcher, a couple of runtimes and a few project venvs, that is a fraction of the answer — and the fraction it misses is usually the one you wanted, because the packages a project actually needs live in its own environment, not in the base interpreter.

Cokpyt inventories all of them, using the only reliable source for each:

| Holder | How it is found |
|---|---|
| A runtime the `py` launcher installed | `py -0p` |
| A runtime a python.org installer dropped somewhere | scanning the usual install directories, including `%LOCALAPPDATA%\Programs\Python` and `C:\Python*` |
| A virtual environment | a `pyvenv.cfg` file at the environment root |
| A conda environment | a `conda-meta` directory at the environment root |

The sweep has **no depth limit on purpose**. A venv five levels down is normal, and a depth cap is how you get a clean-looking empty result that is simply wrong. It is bounded in *work* instead, and says so if it had to stop early.

Two traps are handled explicitly:

- **The Microsoft Store stub.** On a machine with no real Python on `PATH`, `python` resolves to a `WindowsApps` shim that opens the Store or fails with "Python was not found". A stub on `PATH` says nothing about what is installed, so Cokpyt says so and uses the environments it found.
- **Launcher shims.** The Python Install Manager keeps redirecting `python.exe` files in its `bin` directory. They answer `--version` correctly because they exec the real interpreter, but they own no packages. Cokpyt asks every interpreter where it *actually* lives and folds the shim onto its target, so you get one row per runtime instead of two.

On the machine this was written on, that difference is four environments and 57 packages, against the one environment and 39 packages a bare `pip list` reports.

---

## Download

Grab the latest installer for your platform below.

| Platform | Download |
|----------|----------|
| **Windows** (x64) | [![Download for Windows](https://img.shields.io/badge/Download-Windows%20Installer-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-windows-installer.exe) |
| **macOS** (Universal) | [![Download for macOS](https://img.shields.io/badge/Download-macOS%20zip-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-macos-amd64.zip) |
| **Linux** (x64) | [![Download for Linux](https://img.shields.io/badge/Download-Linux%20binary-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-linux-amd64) |

Or browse all releases and release notes on the [Releases page](https://github.com/d3uceY/Cokpyt/releases).

---

## Features at a Glance

- **Environments** — every interpreter and virtual environment on the machine, with the package count each one holds
- **Overview** — a real-time summary of the machine, plus recent activity
- **Installed Packages** — browse, filter, install, uninstall, and bulk-manage the active environment
- **Updates** — every package that is behind, with the size of the version jump, upgradeable one at a time or all at once
- **Search** — query PyPI and install anything directly from the results
- **Doctor** — checks the interpreter, its pip, and PyPI connectivity, with concrete fix hints
- **History** — a permanent audit trail of every install, upgrade, and uninstall
- **Cleanup** — measure and then remove pip caches, `.egg-info` directories, and `__pycache__` folders
- **Console** — pip's own output, streamed live while it works

---

## How to Use Cokpyt

### 1. Environments

The sidebar picker names the environment every other page is working in. Click it to switch, or open the **Environments** page for the full list.

Each row shows how the environment was found (`launcher`, `standalone`, `venv`, `conda`), its Python version, how many packages it holds, and where it lives. Click a row or its **Use** button to make it active; **Open** reveals it in your file manager.

Use **Scan a folder** if your projects live on another drive. **Rescan** re-inventories the machine — you should rarely need it, since Cokpyt notices new environments on its own.

---

### 2. Overview

Three stat cards at the top: how many environments exist, how many packages they hold between them, and how many updates are waiting in the active environment. Below that is the environment list and your recent activity.

The numbers are deliberately about the *machine*. "39 installed packages" is a true sentence about one interpreter and a misleading sentence about your computer, and that confusion is what Cokpyt exists to remove.

---

### 3. Installed Packages

A full table of everything in the active environment.

- **Filter** by name or description
- **Install** — click the blue **Install** button and type a package name; a version pin, a path or a URL all work, because pip accepts them
- **Upgrade** or **Uninstall** a single package from its row
- **Bulk uninstall** — tick several rows and use the button that appears

The **Latest** column fills in behind the list while PyPI is queried, so the page never waits on the network to render.

<div align="center"><img src="readme/asssets/installed_packages.png" alt="Installed Packages page" width="100%" /></div>

---

### 4. Updates

Every package in the active environment with a newer version on PyPI, showing the installed version, the latest version, and whether the jump is a major, minor or patch bump. **Upgrade** a single row, or **Upgrade all**.

Where a package publishes one, a link opens its changelog so you can see what changed before you commit.

<div align="center"><img src="readme/asssets/updates.png" alt="Updates page" width="100%" /></div>

---

### 5. Search

Type a package name and Cokpyt queries the PyPI index, with real descriptions pulled from package metadata. Anything already installed is marked, and a click installs it into the active environment.

<div align="center"><img src="readme/asssets/search.png" alt="Search page" width="100%" /></div>

---

### 6. Doctor

Three checks for the active environment: can the interpreter run, does it have a working pip, and is PyPI reachable. Each result is **passed**, a **warning**, or a **failure**, and anything wrong comes with a concrete next step.

<div align="center"><img src="readme/asssets/doctor.png" alt="Doctor page" width="100%" /></div>

---

### 7. History

Every install, upgrade and uninstall Cokpyt has run, with the package, version, result and timestamp. Hover a row for the exact command. Filter by action, export the lot as CSV, or clear the record.

Only actions run from this app are listed — anything you did in a terminal lives only in that terminal.

<div align="center"><img src="readme/asssets/history.png" alt="History page" width="100%" /></div>

---

### 8. Cleanup

Cokpyt measures the pip download cache, leftover `.egg-info` directories and `__pycache__` folders, and tells you what removing them would free before it deletes anything. Select what you want gone and run it.

<div align="center"><img src="readme/asssets/cleanup.png" alt="Cleanup page" width="100%" /></div>

---

### 9. Console

Any pip operation opens a console panel at the bottom of the window and streams pip's own output as it runs. **copy** puts the whole transcript on your clipboard, which is the fastest thing to paste into a bug report.

---

## Built With

- [Wails v3](https://wails.io) — Go backend, web frontend, one binary
- Plain HTML, CSS and ES modules — no framework, no bundler, no build step
- ES module bindings generated from the Go services by `wails3 generate bindings -b`

---

## Contributing

Have an idea? Found a bug? Contributions are welcome and appreciated. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Quick version:

```bash
git clone https://github.com/d3uceY/Cokpyt.git
cd Cokpyt
wails3 dev
```

```bash
go test ./...                     # Go tests
node scripts/check-frontend.mjs   # parse every frontend module
```

---

## License

Cokpyt is released under the [MIT License](LICENSE).
