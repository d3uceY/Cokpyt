---
sidebar_position: 3
---

# Environments

The page the rest of the app is built around.

`pip list` reports the packages of **one** interpreter. On a machine with a launcher, a couple of
runtimes and a few project virtual environments, the packages a project needs live in its own venv,
not in the base interpreter. Cokpyt inventories all of them.

---

## What gets found

| Holder | How Cokpyt finds it |
|---|---|
| A runtime the `py` launcher installed | `py -0p` |
| A runtime a python.org installer dropped | scanning the usual install directories, including `%LOCALAPPDATA%\Programs\Python` and `C:\Python*` |
| A virtual environment | a `pyvenv.cfg` file at the environment root |
| A conda environment | a `conda-meta` directory at the environment root |

A venv's packages are in no other list: not the base interpreter's, not another venv's. A conda
environment carries `conda-meta` and no `pyvenv.cfg`, so it needs its own pass.

Searching has no depth limit. A venv five levels down is normal, and a depth cap is how you get a
clean-looking empty result that is simply wrong. The scan is bounded in *work* instead, and says so
if a bound was hit.

---

## Reading the list

Each row shows the environment's name, how it was found, its Python version, how many packages it
holds, and where it lives.

The **kind** badge:

| Badge | Meaning |
|---|---|
| `launcher` | Tracked by the Python Install Manager (`py`). |
| `standalone` | Found in an install directory; `py` does not know about it. |
| `venv` | Virtual environment. Its packages appear in no other list. |
| `conda` | Conda environment. Marked by `conda-meta`, not `pyvenv.cfg`. |

`default` marks the runtime the `py` launcher would pick; `active` marks the one every other page is
working in.

### Why a row can have zero packages

A freshly created venv has no packages. So does a runtime that exists only to be a base for venvs.
Zero is a fact, not a failure.

### Why some things are not listed

- **The Microsoft Store stub.** With no real Python on `PATH`, `python` resolves to a `WindowsApps`
  shim that opens the Store or fails with "Python was not found". A stub says nothing about what is
  installed, so Cokpyt says so in a banner and uses the environments it found.
- **Launcher shims.** The Python Install Manager keeps redirecting `python.exe` files in its `bin`
  directory. They answer `--version` correctly because they exec the real interpreter, but they own
  no packages. Cokpyt folds each shim onto its target, so you get one row per runtime.
- **The standard library.** `json`, `sqlite3`, `tkinter` and the rest ship inside the runtime. pip
  cannot report or fix them.

---

## Switching environment

Pick one in the sidebar, or click **Use** on its row. The choice is remembered between runs. If the
environment is later deleted, Cokpyt falls back to the launcher's default runtime rather than leaving
every page pointed at nothing.

---

## Scan a folder

Projects on another drive are exactly where a venv is most likely to be hiding. **Scan a folder**
walks a directory you choose for `pyvenv.cfg` and `conda-meta` markers and adds what it finds.

---

## Rescan

**Rescan** re-inventories the machine. An environment created outside Cokpyt is picked up on the next
launch, and Cokpyt rescans on its own before reporting that an environment is missing, so you rarely
need this. Use it after creating a venv while the app is open.
