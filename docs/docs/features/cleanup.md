---
sidebar_position: 7
---

# Cleanup

Reclaim disk space from pip's and Python's leftovers. Sizes are measured before anything is deleted.

![Cleanup page](/img/cleanup.png)

---

## What Gets Scanned

| Target | What it is |
|---|---|
| **pip download cache** | Cached wheels and sdists. Global: shared by every environment |
| **leftover `.egg-info` directories** | Build metadata left by editable installs and older setuptools builds |
| **`__pycache__` folders** | Compiled bytecode, regenerated on demand |

---

## Running a Cleanup

1. Tick the categories to remove. The panel header shows the total selected, or what is available when
   nothing is ticked.
2. Click **Run cleanup** and confirm.

Cokpyt reports how much was freed.

---

## Safety

- **pip cache** - safe at any time. pip re-downloads what it needs; you lose the offline speedup.
- **`.egg-info`** - safe for packages no longer under active development here. Editable installs may
  regenerate them.
- **`__pycache__`** - safe at any time. Python recompiles on demand, with a one-time slowdown.

:::tip
Running Cleanup occasionally, especially after removing many packages, reclaims a lot on developer
machines.
:::
