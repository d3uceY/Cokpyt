---
sidebar_position: 4
---

# Updates

Every package in the active environment with something newer on PyPI.

![The Updates page](/img/updates.png)

## The table

| Column | Shows |
|---|---|
| **Package** | Package name |
| **Installed** | Version in this environment |
| **Latest** | Version on PyPI |
| **Bump** | `major`, `minor`, or `patch` |
| **Actions** | Changelog, where one exists, and **Upgrade** |

The toolbar counts what is behind, split by bump size.

- **major** — the first number changed (`1.9.0 → 2.0.0`). May break things.
- **minor** — the second changed (`1.3.0 → 1.4.0`). Usually new features.
- **patch** — the third changed (`1.3.2 → 1.3.3`). Usually fixes.

## Upgrading

**Upgrade** runs `pip install --upgrade <package>`. **Upgrade all** runs every row, one at a time. Both stream into the console panel, and a row disappears once it is up to date.

:::caution
A major bump can break things. Review the `major` rows before **Upgrade all**.
:::

## Refreshing

The list is fetched each time you open the page. **Check again** re-queries PyPI mid-session, for example after upgrading something in a terminal.
