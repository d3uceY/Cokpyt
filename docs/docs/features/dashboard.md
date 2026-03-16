---
sidebar_position: 1
---

# Dashboard

The **Dashboard** (labelled *Overview* inside the app) is the first page you see when Cokpyt opens. It gives you a real-time snapshot of your entire Python environment at a glance.

:::note Screenshot coming soon
A full-resolution screenshot of the Dashboard will be added here. In the meantime, see the hero image on the [Introduction](../intro) page for a preview of the overall UI.
:::

![Dashboard overview placeholder](/img/dashboard.png)

---

## Stat Cards

Three cards run across the top of the page:

| Card | What it shows |
|---|---|
| **Installed Packages** | Total number of packages currently in the active environment |
| **Outdated** | How many of those packages have a newer version available on PyPI |
| **Python / pip** | Active Python version and pip version, read from the environment at startup |

All three cards refresh each time you click the **Refresh** button in the page header.

---

## Recent Activity

Below the stat cards is a table of your **5 most recent pip actions** pulled straight from the [History](./history) log. Each row shows the package name, action type (Install / Upgrade / Uninstall), status badge (success / failed), and timestamp.

Click any row to jump to the full entry on the History page.

---

## Pending Updates Breakdown

On the right side of the page is a breakdown of outdated packages grouped by **bump type**:

- **Major** — packages where the next version increments the first digit (e.g. `1.x.x → 2.0.0`)
- **Minor** — second-digit bumps (e.g. `1.3.x → 1.4.0`)
- **Patch** — third-digit bumps (e.g. `1.3.2 → 1.3.3`)

This makes it easy to decide which upgrades are safe to apply right now versus which ones deserve a closer look.

---

## Actions

### Refresh

Click **Refresh** (top-right of the page header) to re-query your live environment. This re-fetches:

- The full installed-package list
- The outdated-package list
- Python / pip version information
- The recent history log

### Update All

Click **Update All** to run `pip install --upgrade` on every package in the outdated list in one shot. A live terminal panel slides in at the bottom of the screen so you can watch the output. When the upgrades complete, the stat cards and pending-updates breakdown refresh automatically.

---

## Navigation Shortcuts

Each stat card is clickable:

- **Installed Packages** card → jumps to the [Installed Packages](./installed-packages) page
- **Outdated** card → jumps to the [Updates](./updates) page
