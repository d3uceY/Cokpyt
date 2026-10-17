---
sidebar_position: 6
---

# Doctor

Three checks against the active environment.

![The Doctor page](/img/doctor.png)

| Check | What it verifies |
|---|---|
| **Interpreter** | Python runs, and which version |
| **pip** | `python -m pip` works here, and which version it is |
| **PyPI** | `https://pypi.org` is reachable (catches firewall and proxy problems) |

| Badge | Meaning |
|---|---|
| **passed** | In order |
| **warn** | Worth noting; pip still works |
| **fail** | Broken; pip operations will likely fail |

A warn or fail adds a hint: what went wrong and what fixes it.

Doctor is read-only. When it suggests a command, run it in a terminal and check again.

Use it on first run, after switching environments, or when an install fails and you need to know whether the network is at fault.
