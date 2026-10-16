---
sidebar_position: 6
---

# History

Every install, upgrade and uninstall Cokpyt has run, newest first. It persists across restarts.

![History page](/img/history.png)

---

## The Table

| Column | Description |
|---|---|
| **Package** | Package acted on |
| **Version** | Version the action targeted |
| **Action** | `install`, `upgrade`, or `uninstall` |
| **Result** | `success` or `failed` |
| **When** | Relative time; hover for the exact timestamp |

Hovering a row also shows the pip command that was run, for reproducing it by hand.

---

## Filtering

The tabs at the top filter by action: **All**, **install**, **upgrade**, or **uninstall**. Each shows
its own count.

---

## Exporting to CSV

**Export CSV** downloads the currently filtered rows, with every column including the command.

---

## Clearing the History

**Clear** wipes the log after a confirmation. It cannot be undone; export first if you want a copy.

:::caution
Only actions run from Cokpyt are listed. Anything you did in a terminal lives only in that terminal.
:::
