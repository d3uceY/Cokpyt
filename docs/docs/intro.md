---
sidebar_position: 1
---

# Introduction

Cokpyt is a desktop app for pip. Every Python environment on your machine, in one window.

![The Cokpyt Overview page](/img/hero.png)

## What it does

- Finds every interpreter, venv, and conda environment on the machine.
- Installs, upgrades, pins, and uninstalls packages in the one you are working in.
- Searches all of PyPI and installs a result without leaving the app.
- Records what ran, when, and whether it worked.
- Frees the space pip and Python leave behind.

Operations run in the background. pip's own output streams into a console panel at the bottom of the window while it works.

## Pages

| Page | What it does |
|---|---|
| [Overview](./features/dashboard) | Environments, package counts, pending updates, recent activity |
| [Environments](./features/environments) | Every Python environment on the machine, and which one is active |
| [Packages](./features/installed-packages) | Install, upgrade, pin a version, uninstall |
| [Search PyPI](./features/search) | Find a project and install it |
| [Updates](./features/updates) | Everything outdated, with the size of each bump |
| [Cleanup](./features/cleanup) | pip cache, `.egg-info` directories, `__pycache__` folders |
| [History](./features/history) | Record of every action Cokpyt ran |
| [Doctor](./features/doctor) | Interpreter, pip, and PyPI connectivity |
| [Settings](./features/settings) | Theme, updates, active environment, stored files |

## Next

- [Installation](./installation) — download a binary or install from PyPI
- [Overview](./features/dashboard) — the first page you see
- [Contributing](./contributing) — build it yourself
