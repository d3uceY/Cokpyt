---
sidebar_position: 4
---

# Search

Query the PyPI index and install a result without leaving the app.

![Search page](/img/search.png)

---

## Searching PyPI

Type a name in the search box and press **Enter**. Matching runs against the PyPI name index, so
results are the projects whose names contain what you typed.

Each result shows the package name, its summary, the latest version, and an install button. A package
already in the active environment is marked **installed**, and its button reads **Reinstall**.

---

## Installing a Search Result

Click the button on a result. Cokpyt runs `pip install <package>`, streams the output to the console
panel, and marks the row installed when it finishes.

Search always installs the latest version. For a specific one, use [Installed
Packages](./installed-packages) and pin it (`requests==2.32.0`).
