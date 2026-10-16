---
sidebar_position: 2
---

# Installation

Cokpyt ships as a self-contained native binary and as a companion `pip` package. Use the binary; the `pip` package is buggy.

---

## Download a Pre-Built Binary

| Platform | Download |
|----------|----------|
| **Windows** (x64) | [Download Windows Installer](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-windows-installer.exe) |
| **macOS** (Universal) | [Download macOS .zip](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-macos-amd64.zip) |
| **Linux** (x64) | [Download Linux binary](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-linux-amd64) |

Browse older versions on the [Releases page](https://github.com/d3uceY/Cokpyt/releases).

### Windows

Run the `.exe` installer. No other dependencies — the Go runtime is compiled in.

### macOS

Unzip and move `Cokpyt.app` to **Applications**. On first launch, right-click → **Open** to bypass Gatekeeper (the binary is unsigned).

### Linux

Make the binary executable and run it:

```bash
chmod +x Cokpyt-linux-amd64
./Cokpyt-linux-amd64
```

For system-wide access, move it to a directory on your `$PATH`:

```bash
sudo mv Cokpyt-linux-amd64 /usr/local/bin/cokpyt
```

---

## Install via pip

The companion package on PyPI launches the same app:

```bash
python -m pip install cokpyt
```

Start it with:

```bash
python -m cokpyt
```

---

## System Requirements

| Requirement | Minimum |
|---|---|
| **OS** | Windows 10 (x64), macOS 11, or a modern Linux distro |
| **Python** | 3.8 or later (must be on `$PATH`) |
| **pip** | Any version supported by your Python installation |
| **Internet** | Required for PyPI search and Doctor's connectivity check |

> **Note:** Cokpyt manages whichever `python` and `pip` executables are on your system `$PATH`. If you use virtual environments, activate the one you want to manage before launching Cokpyt.

---

## Verifying Your Installation

Open the **[Doctor](./features/doctor)** page and click **Re-run checks**. A fully green report means Python, pip, and PyPI connectivity are all working.
