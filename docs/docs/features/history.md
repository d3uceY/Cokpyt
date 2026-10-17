---
sidebar_position: 7
---

# History

Every install, upgrade, and uninstall Cokpyt has run, newest first. It survives restarts.

![The History page](/img/history.png)

| Column | Shows |
|---|---|
| **Package** | What was acted on |
| **Version** | The version targeted |
| **Action** | `install`, `upgrade`, or `uninstall` |
| **Result** | `success` or `failed` |
| **When** | Relative time; hover for the exact one |

Hovering a row also shows the pip command that ran, so you can repeat it by hand.

## Filtering

The tabs filter by action (**All**, **install**, **upgrade**, **uninstall**), each with its own count.

## Exporting

**Export CSV** downloads the rows currently shown, including the command.

## Clearing

**Clear** wipes the log after a confirmation. It cannot be undone; export first if you want a copy.

:::caution
Only actions run from Cokpyt are listed. Anything you did in a terminal lives only in that terminal.
:::
