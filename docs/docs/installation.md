---
sidebar_position: 2
---

# Installation

Cokpyt ships as a self-contained native binary and also as a companion `pip` package.  
I would recommend the native binary for most users because the `pip` package option is a little bit buggy

---

## Download a Pre-Built Binary

Grab the latest release for your platform from the table below.

| Platform | Download |
|----------|----------|
| **Windows** (x64) | [Download Windows Installer](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-windows-installer.exe) |
| **macOS** (Universal) | [Download macOS .zip](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-macos-amd64.zip) |
| **Linux** (x64) | [Download Linux binary](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-linux-amd64) |

Browse all release notes and older versions on the [Releases page](https://github.com/d3uceY/Cokpyt/releases).

### Windows

Run the `.exe` installer and follow the on-screen steps. No additional dependencies are required — the Go runtime is compiled in.

### macOS

Unzip the downloaded archive and move `Cokpyt.app` to your **Applications** folder. On first launch, right-click → **Open** to bypass the Gatekeeper prompt (the binary is unsigned at the moment).

### Linux

Make the downloaded binary executable and run it:

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

The companion package on PyPI launches the same app and can optionally bootstrap pip environments:

```bash
python -m pip install cokpyt
```

Once installed, start Cokpyt with:

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

> **Note:** Cokpyt manages whichever `python` and `pip` executables are currently on your system `$PATH`. If you use virtual environments, activate the one you want to manage before launching Cokpyt.

---

## Verifying Your Installation

After launching Cokpyt, open the **[Doctor](./features/doctor)** page and click **Re-run checks**. A fully green report confirms that Python, pip, and PyPI connectivity are all working correctly.
