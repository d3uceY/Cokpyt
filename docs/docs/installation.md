---
sidebar_position: 2
toc_max_heading_level: 2
---

# Installation

Cokpyt ships as a self-contained binary. The PyPI package launches the same app but is experimental. Use the binary.

## Download

| Platform | Download |
|---|---|
| **Windows** (x64) | [Installer](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-windows-installer.exe) |
| **macOS** (universal) | [.zip](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-macos-amd64.zip) |
| **Linux** (x64) | [Binary](https://github.com/d3uceY/Cokpyt/releases/latest/download/Cokpyt-linux-amd64) |

Older versions are on the [releases page](https://github.com/d3uceY/Cokpyt/releases).

### Windows

Run the installer. Nothing else to install; the Go runtime is compiled in.

### macOS

Unzip, then move `Cokpyt.app` to **Applications**. On first launch, right-click → **Open**: the build is unsigned, so Gatekeeper needs that one confirmation.

### Linux

```bash
chmod +x Cokpyt-linux-amd64
./Cokpyt-linux-amd64
```

To run it from anywhere:

```bash
sudo mv Cokpyt-linux-amd64 /usr/local/bin/cokpyt
```

## Install via pip

```bash
python -m pip install cokpyt
python -m cokpyt
```

## Requirements

| | |
|---|---|
| **OS** | Windows 10, macOS 11, or a recent Linux distribution |
| **Python** | 3.8 or later, on `PATH` |
| **Internet** | PyPI search and the Doctor connectivity check |

Cokpyt manages whichever environment is active in the sidebar. See [Environments](./features/environments) for how one is chosen.

## Next

Open [Doctor](./features/doctor) after the first launch. Three green checks mean Python, pip, and PyPI are all reachable.
