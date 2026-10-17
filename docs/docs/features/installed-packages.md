---
sidebar_position: 2
---

# Installed Packages

Everything in the active environment, with the controls that change it.

![The Packages page](/img/installed_packages.png)

## The table

| Column | Shows |
|---|---|
| **Package** | Name, with the summary underneath |
| **Installed** | Version in this environment |
| **Latest** | Newest version on PyPI, or **up to date** |
| **Actions** | **Upgrade**, **Versions**, **Uninstall** |

The checkbox column selects rows for a bulk uninstall.

## Filtering

The filter box matches names and descriptions as you type. The count beside it shows how many rows are visible out of how many exist.

## Installing a package

Click **Install** in the page header, then type a requirement. pip's syntax applies:

- `requests` — the latest version
- `requests==2.32.0` — exactly that version
- `requests>=2.28,<3` — the latest version inside the constraint

The console panel opens and streams pip's output. The table refreshes when the install finishes.

## Upgrading

**Upgrade** on a row runs `pip install --upgrade <package>`. To upgrade everything at once, use [Updates](./updates).

## Choosing a version

**Versions** lists every version pip could install here, newest first. The installed version is marked and preselected.

Prereleases, yanked releases, and releases without a build for your platform are filtered out, so everything offered will install. The list is fetched when you open it, not when the page loads.

## Uninstalling

**Uninstall** on a row confirms first, then runs pip.

To remove several at once, tick their checkboxes and use the button that appears in the toolbar. Cokpyt runs `pip uninstall -y` on the selection.

## Console panel

Every install, upgrade, and uninstall streams pip's raw output into the panel at the bottom of the window. **copy** takes the transcript, **clear** empties it, and **×** hides it.
