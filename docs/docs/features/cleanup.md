---
sidebar_position: 8
---

# Cleanup

Reclaims space from what pip and Python leave behind. Sizes are measured before anything is deleted.

![The Cleanup page](/img/cleanup.png)

| Target | What it is |
|---|---|
| **pip download cache** | Cached wheels and sdists, shared by every environment |
| **`.egg-info` directories** | Build metadata left by editable installs and older setuptools builds |
| **`__pycache__` folders** | Compiled bytecode, rebuilt on demand |

## Running a cleanup

Tick the categories to remove, then click **Run cleanup** and confirm. Cokpyt reports how much was freed.

## Safety

- **pip cache** — safe at any time. You lose the offline speedup; pip downloads again when it needs to.
- **`.egg-info`** — safe for packages you are no longer developing. Editable installs may recreate theirs.
- **`__pycache__`** — safe at any time. The first run afterwards is a little slower.

:::tip
Cleanup pays off most after removing a lot of packages.
:::
