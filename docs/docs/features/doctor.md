---
sidebar_position: 5
---

# Doctor

Three checks against the active environment, each with a plain answer.

![Doctor page](/img/doctor.png)

---

## What Gets Checked

| Check | What it verifies |
|---|---|
| **Interpreter** | The interpreter runs, and reports its version |
| **pip** | `python -m pip` works in this environment, and which version it is |
| **PyPI** | `https://pypi.org` is reachable - catches firewall and proxy problems |

---

## Results

| Badge | Meaning |
|---|---|
| **passed** | In order. |
| **warn** | Worth noting; pip still works. |
| **fail** | Broken; pip operations will likely fail. |

A warn or fail check adds a hint - what went wrong, and the command or setting that fixes it. Where
there is a documentation page for the fix, **Fix** opens it.

---

## When to Use Doctor

- **First run** - confirm the environment is set up correctly.
- **After switching environments** - verify the new one is healthy.
- **Debugging** - an install or search that fails unexpectedly. The PyPI check rules out the network.

---

## Manual Verification

Doctor is read-only; it never modifies the environment. If a check suggests a command, run it in a
terminal and re-check.
