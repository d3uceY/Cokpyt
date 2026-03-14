import os
import platform
import stat
import subprocess
import sys
import urllib.request
import zipfile

BASE_URL = "https://github.com/d3uceY/Cokpyt/releases/latest/download"

# Asset filenames match the GitHub release artifacts exactly.
ASSETS = {
    "Windows": {"file": "Cokpyt-windows-installer.exe", "kind": "exe"},
    "Darwin":  {"file": "Cokpyt-macos-amd64.zip",        "kind": "zip"},
    "Linux":   {"file": "Cokpyt-linux-amd64",             "kind": "bin"},
}


def _progress(block_count, block_size, total_size):
    if total_size > 0:
        downloaded = min(block_count * block_size, total_size)
        pct = downloaded * 100 // total_size
        print(f"\r  Downloading… {pct}%", end="", flush=True)


def main():
    system = platform.system()
    if system not in ASSETS:
        print(f"Unsupported OS: {system}")
        sys.exit(1)

    asset = ASSETS[system]
    filename = asset["file"]
    kind = asset["kind"]
    url = f"{BASE_URL}/{filename}"
    dest = os.path.join(os.path.expanduser("~"), filename)

    print(f"Downloading Cokpyt from:\n  {url}")
    urllib.request.urlretrieve(url, dest, reporthook=_progress)
    print()  # newline after progress bar

    if kind == "exe":
        print("Launching Cokpyt installer…")
        proc = subprocess.Popen([dest])
        print(f"Installer is running (PID {proc.pid}).")
        print("Complete the installation wizard, then press Enter here to close this window.")
        input()
        os.remove(dest)

    elif kind == "zip":
        extract_dir = os.path.join(os.path.expanduser("~"), "Cokpyt")
        print(f"Extracting to {extract_dir} …")
        with zipfile.ZipFile(dest, "r") as zf:
            zf.extractall(extract_dir)
        os.remove(dest)
        print(f"Cokpyt extracted to {extract_dir}")
        print("Move Cokpyt.app to /Applications to complete installation.")

    elif kind == "bin":
        install_dir = os.path.join(os.path.expanduser("~"), ".local", "bin")
        os.makedirs(install_dir, exist_ok=True)
        install_path = os.path.join(install_dir, "cokpyt")
        os.replace(dest, install_path)
        st = os.stat(install_path)
        os.chmod(install_path, st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        print(f"Cokpyt installed to {install_path}")
        print(f"Ensure {install_dir} is on your PATH.")

    print("Done!")