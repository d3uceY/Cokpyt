---
sidebar_position: 3
---

# Updates

Every package in the active environment with a newer version on PyPI.

![Updates page](/img/updates.png)

---

## The Table

| Column | Description |
|---|---|
| **Package** | Package name |
| **Installed** | Version in this environment |
| **Latest** | Version on PyPI |
| **Bump** | **major**, **minor**, or **patch** |
| **Actions** | Changelog link (where one exists), and **Upgrade** |

The toolbar shows how many packages are behind and the count in each bump class.

### Bump Classification

- **major** - the first version number changed (`1.9.0 → 2.0.0`). May break things; read the changelog.
- **minor** - the second changed (`1.3.0 → 1.4.0`). Usually backward-compatible features.
- **patch** - the third changed (`1.3.2 → 1.3.3`). Usually bug and security fixes.

---

## Upgrading

**Upgrade** on a row runs `pip install --upgrade <package>`. **Upgrade all** in the toolbar runs every
package in the list, one at a time. Both stream into the console panel and refresh the table when they
finish; a row disappears once it is up to date.

:::caution
A major bump can introduce breaking changes. Review the **major** rows before **Upgrade all**.
:::

---

## Refreshing the List

The list is fetched each time you open the page. **Check again** in the header re-queries PyPI mid-session,
for example after upgrading something outside Cokpyt.
