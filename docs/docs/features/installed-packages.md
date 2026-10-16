---
sidebar_position: 2
---

# Installed Packages

Every package in the active environment, with the buttons that change it.

![Installed Packages page](/img/installed_packages.png)

---

## The Package Table

| Column | Description |
|---|---|
| **Package** | Name, with the package summary beneath it |
| **Installed** | Currently installed version |
| **Latest** | Newest version on PyPI, or **up to date** |
| **Actions** | Per-row **Upgrade**, **Versions** and **Uninstall** buttons |

A checkbox column on the left selects rows for a bulk uninstall.

---

## Filtering the List

The filter box at the top narrows the table as you type. It matches names and descriptions, so a
keyword is enough when you don't know the exact name. The label beside it shows how many rows are
shown out of how many exist.

---

## Installing a Package

Click **Install** in the page header.

1. Type a requirement. pip's syntax applies:
   - `requests` - the latest version
   - `requests==2.32.0` - exactly that version
   - `requests>=2.28,<3` - the latest matching the constraint
2. Press **Enter** or click **Install**.

The console panel opens at the bottom of the window and streams pip's output. The table refreshes
when the install finishes.

---

## Upgrading a Package

**Upgrade** on a row runs `pip install --upgrade <package>`. To upgrade everything at once, use the
[Updates](./updates) page.

---

## Choosing a Specific Version

**Versions** on a row lists every version pip could install into this environment, newest first. The
installed version is marked and preselected, so the dialog opens where you already are.

The list is fetched when you press the button, not when the page loads, because it is a network
lookup per package. Prereleases, yanked releases, and releases with no build for your platform are
already filtered out, so every version offered will install. Picking the installed version does
nothing.

The install runs as `pip install <package>==<version>`, and the result is recorded in
[History](./history) under the package's own name rather than the pinned requirement.

---

## Uninstalling a Package

**Uninstall** on a row asks for confirmation first, then runs pip. The table refreshes when it
finishes.

---

## Bulk Uninstall

Tick the checkboxes on the rows you want gone. A button appears in the toolbar; click it and confirm.
Cokpyt runs `pip uninstall -y` on the selected packages and refreshes the table when it finishes.

---

## Console Panel

Every install, upgrade, or uninstall streams pip's raw output into the console panel, which stays
open so you can read what happened. **copy** takes the transcript; **clear** empties it; the × hides
the panel.
