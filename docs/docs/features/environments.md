---
sidebar_position: 3
---

# Environments

This is the page the rest of the app is built around, and the reason Cokpyt exists.

`pip list` reports the packages of **one** interpreter. On a machine with a launcher, a couple of
runtimes and a few project virtual environments, that is a fraction of the answer — and the fraction
it misses is usually the one you wanted, because the packages a project needs live in its own
environment, not in the base interpreter.

Cokpyt inventories all of them.

---

## What gets found

Four different things hold packages independently, and each needs its own way of being found.

| Holder | How Cokpyt finds it |
|---|---|
| A runtime the `py` launcher installed | `py -0p` |
| A runtime a python.org installer dropped | scanning the usual install directories, including `%LOCALAPPDATA%\Programs\Python` and `C:\Python*` |
| A virtual environment | a `pyvenv.cfg` file at the environment root |
| A conda environment | a `conda-meta` directory at the environment root |

The `pyvenv.cfg` and `conda-meta` markers are what matter. A venv's packages are in no other list:
not the base interpreter's, not another venv's, and `py --list` will not mention the venv at all. A
conda environment is the mirror case — it carries `conda-meta` and no `pyvenv.cfg`, so it has to be
found separately.

Searching is deliberately unbounded in depth. A venv five levels down is normal, and a depth cap is
how you get a clean-looking empty result that is simply wrong. The scan is bounded in *work*
instead, and says so if a bound was hit.

---

## Reading the list

Each row shows the environment's name, how it was found, its Python version, how many packages it
holds, and where it lives.

The **kind** badge tells you what you are looking at:

| Badge | Meaning |
|---|---|
| `launcher` | Installed and tracked by the Python Install Manager. `py -0p` lists these. |
| `standalone` | Found by scanning the usual install locations. `py --list` does not know about this one. |
| `venv` | A virtual environment. Its packages are in no other list anywhere on this machine. |
| `conda` | A conda environment. It carries `conda-meta`, not `pyvenv.cfg`. |

`default` marks the runtime the `py` launcher would pick, and `active` marks the one every other
page is currently working in.

### Why a row can have zero packages

A freshly created venv has no packages. So does a runtime that exists only to be a base for venvs.
Zero is a fact, not a failure.

### Why some things are not listed

- **The Microsoft Store stub.** On a machine with no real Python on `PATH`, `python` resolves to a
  `WindowsApps` shim that opens the Store or fails with "Python was not found". A stub on `PATH`
  says nothing about what is installed, so Cokpyt says so in a banner and uses the environments it
  found instead.
- **Launcher shims.** The Python Install Manager keeps redirecting `python.exe` files in its `bin`
  directory. They answer `--version` correctly — because they exec the real interpreter — but they
  own no packages. Cokpyt asks each interpreter where it really lives and folds the shim onto the
  runtime it forwards to, so you get one row per runtime rather than two.
- **The standard library.** `json`, `sqlite3`, `tkinter` and the rest ship inside the runtime. They
  are not "installed packages" and pip cannot report or fix them.

---

## Switching environment

Pick one in the sidebar, or click **Use** on its row. Every page follows: Packages, Updates,
Search, Cleanup and Doctor all operate on the active environment, and the status bar always names it.

The choice is remembered between runs. If the environment is later deleted, Cokpyt falls back to the
launcher's default runtime rather than leaving every page pointed at nothing.

---

## Scan a folder

The home directory is where most environments live, but projects on another drive are exactly where
a venv is most likely to be hiding. **Scan a folder** walks a directory you choose for `pyvenv.cfg`
and `conda-meta` markers and adds anything it finds to the list.

---

## Rescan

**Rescan** re-inventories the machine. You should rarely need it — an environment created outside
Cokpyt is picked up on the next launch, and Cokpyt rescans on its own before reporting that an
environment is missing. Use it after creating a venv while the app is open.
