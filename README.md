<div align="center">
<img src="readme/asssets/appicon.png" alt="Cokpyt icon" width="96" />
<h1><strong>Cokpyt</strong></h1>
<p><em>A desktop GUI for pip. Because life is too short for the terminal.</em></p>

[![Latest Release](https://img.shields.io/github/v/release/d3uceY/Cokpit?label=latest&style=for-the-badge&color=0048ad)](https://github.com/d3uceY/Cokpit/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/d3uceY/Cokpit/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/d3uceY/Cokpit/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/d3uceY/Cokpit/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br />

<img src="readme/asssets/hero.png" alt="Cokpyt hero screenshot" width="100%" />

</div>

---

## What is Cokpyt?

You work in Python. You use pip. You know your way around the PyPI ecosystem. But every time you need to manage your packages you are back in a terminal window, squinting at walls of text and trying to remember whether it was `pip list --outdated` or `pip list -o`.

**Cokpyt is the GUI you always wished pip shipped with.**

It is a lightweight, fast desktop app built with Go and React that puts your entire Python environment on a clear dashboard. Browse every installed package, search all of PyPI, install and upgrade and uninstall with a click, run a full environment health check, and see a logged history of every pip action you have ever taken -- all without touching the command line once.

If you live in the pip and PyPI ecosystem and the CLI is not your thing, Cokpyt was built for you.

---

## Download

Grab the latest installer for your platform below.

| Platform | Download |
|----------|----------|
| **Windows** (x64) | [![Download for Windows](https://img.shields.io/badge/Download-Windows%20Installer-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/d3uceY/Cokpit/releases/latest/download/Cokpyt-windows-amd64-installer.exe) |
| **macOS** (Universal) | [![Download for macOS](https://img.shields.io/badge/Download-macOS%20dmg-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/d3uceY/Cokpit/releases/latest/download/Cokpyt-darwin-universal.dmg) |
| **Linux** (x64) | [![Download for Linux](https://img.shields.io/badge/Download-Linux%20AppImage-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/d3uceY/Cokpit/releases/latest/download/Cokpyt-linux-amd64.AppImage) |

Or browse all releases and release notes on the [Releases page](https://github.com/d3uceY/Cokpit/releases).

---

## Features at a Glance

- **Dashboard** -- a real-time overview of your Python environment, installed packages, and pending updates
- **Installed Packages** -- browse, filter, install, uninstall, and bulk-manage every package in your active environment
- **Updates** -- see every package that is behind and upgrade them one by one or all at once
- **Search** -- query PyPI instantly and install any package directly from the results
- **Doctor** -- a full health check that verifies Python, pip, and PyPI connectivity with actionable fix hints
- **History** -- a permanent audit trail of every install, upgrade, and uninstall action
- **Logs** -- raw pip output, streamed live to the app as commands run
- **Cleanup** -- find and remove pip caches, `.egg-info` directories, and `__pycache__` to reclaim disk space

---

## How to Use Cokpyt

### 1. Dashboard

When you open Cokpyt you land on the **Overview** page. It shows three stat cards at the top -- total installed packages, how many are outdated, and your active Python and pip versions. Below that is a grid showing recent activity and a breakdown of pending updates by bump type (major, minor, patch).

Click **Refresh** in the top-right to re-fetch all data from your live environment. Click **Update All** to upgrade every outdated package in one shot.

---

### 2. Installed Packages

Go to **Installed Packages** in the sidebar to see a full table of every package in your active Python environment.

- **Search / filter** -- type in the filter box to narrow the list down by name or description
- **Install** -- click the blue **pip install** button, type a package name (you can include a version like `requests==2.32.0`), and press Enter or click Install
- **Upgrade** a single package -- click the **Upgrade** button on any row
- **Uninstall** a single package -- click **Uninstall** on any row, confirm the dialog
- **Bulk uninstall** -- check the checkboxes next to multiple packages, then click **Bulk Uninstall**

A live terminal panel slides in at the bottom of the screen when any operation is running so you can follow the pip output in real time.

<div align="center"><img src="readme/asssets/installed_packages.png" alt="Installed Packages page" width="100%" /></div>

---

### 3. Updates

Go to **Updates** to see every package that has a newer version available on PyPI. Each row shows the current version, the latest version, and whether the jump is a major, minor, or patch bump.

Click **Upgrade** on a single row to update that package. Click **Update All** in the header to upgrade everything at once.

<div align="center"><img src="readme/asssets/updates.png" alt="Updates page" width="100%" /></div>

---

### 4. Search

Go to **Search** and type any package name or keyword. Cokpyt queries the PyPI index and shows results with the package name, version, and description. Click **Install** on any result to add it to your environment immediately.

<div align="center"><img src="readme/asssets/search.png" alt="Search page" width="100%" /></div>

---

### 5. Doctor

Go to **Doctor** and click **Re-run checks**. Cokpyt runs a suite of diagnostics against your environment:

- Is Python reachable and executable?
- Is pip installed and up to date?
- Can the machine reach PyPI?
- Is there a virtual environment active?

Each check comes back as **Passed**, **Warning**, or **Failed**. Warnings and failures include a plain-English explanation of the problem and a concrete suggestion for how to fix it.

<div align="center"><img src="readme/asssets/doctor.png" alt="Doctor page" width="100%" /></div>

---

### 6. History

Every install, upgrade, and uninstall that Cokpyt runs is logged to the **History** page with the package name, version, action type, exit status, and timestamp.

- **Filter by action** -- click the All / Install / Upgrade / Uninstall tabs to narrow the view
- **Expand a row** -- click any row to see the full pip command that was run
- **Export CSV** -- download the full history as a CSV file for your own records
- **Clear All** -- wipe the history log (two-step confirmation required)

<div align="center"><img src="readme/asssets/history.png" alt="History page" width="100%" /></div>

---

### 7. Cleanup

Go to **Cleanup** to scan for space wasted by pip internals. Cokpyt checks the size of:

- the pip download cache
- leftover `.egg-info` directories
- stale `__pycache__` folders

Select what you want to remove and click **Run Cleanup**. Cokpyt deletes the selected artefacts and shows you how much space was recovered.

<div align="center"><img src="readme/asssets/cleanup.png" alt="Cleanup page" width="100%" /></div>

---

### 8. Logs

The **Logs** page shows raw application logs from the current session -- useful if something behaves unexpectedly and you want to see exactly what pip returned. Logs are tagged by severity level (INFO, WARN, ERROR).

<div align="center"><img src="readme/asssets/logs.png" alt="Logs page" width="100%" /></div>

---

## Built With

- [Wails](https://wails.io) -- Go backend, web frontend, one binary
- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [TanStack Query](https://tanstack.com/query) for data fetching
- [Tailwind CSS](https://tailwindcss.com)

---

## Contributing

Have an idea? Found a bug? Contributions are welcome and appreciated. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## License

Cokpyt is released under the [MIT License](LICENSE).
