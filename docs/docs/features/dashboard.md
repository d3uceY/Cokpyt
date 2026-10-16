---
sidebar_position: 1
---

# Dashboard

The **Dashboard** (labelled *Overview* in the app) is the first page you see.

![Dashboard overview](/img/dashboard.png)

---

## Stat Cards

Four cards at the top:

| Card | What it shows |
|---|---|
| **Environments** | How many environments exist, and how many hold packages |
| **Packages in total** | Packages across all environments |
| **Updates available** | Packages behind PyPI in the active environment |
| **Active interpreter** | Version and name of the environment every page is working in |

---

## Environments

Every environment on the machine, with its kind, Python version, and package count. Click a row to make it active, or **Manage** to open the [Environments](./environments) page.

---

## Recent Activity

The six most recent pip actions Cokpyt has run, from the [History](./history) log: package, version, action, result, and timestamp. **All history** opens the full page.

---

## Footer Status Bar

The bar at the bottom shows environment and package counts, the active environment's pip version, and the active environment's name.
