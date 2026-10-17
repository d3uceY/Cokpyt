/* Packages — what is installed in the active environment, and the buttons that
   change it.

   `pip list --outdated` is deliberately not part of loading this page. It
   queries PyPI and can take half a minute, so the list renders immediately and
   the "latest" column fills in behind it. */

import { api } from "../api.js";
import * as store from "../store.js";
import {
  actionCell,
  chooseDialog,
  confirmDialog,
  h,
  icon,
  panel,
  promptDialog,
  replace,
  setWorking,
  toast,
} from "../ui.js";

const RENDER_LIMIT = 400;

let unsubscribe = null;
let installButton = null;

export function cleanup() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

export const meta = { eyebrow: "Active environment", title: "Packages" };

export function actions(ctx) {
  installButton = h(
    "button",
    { class: "btn btn-primary", type: "button", onclick: () => install(ctx) },
    icon("add", 14),
    "Install",
  );
  return [installButton];
}

async function install(ctx) {
  const spec = await promptDialog({
    title: "Install a package",
    label: "Name, pinned version, path, or URL.",
    placeholder: "requests==2.32.0",
  });
  if (!spec) return;

  await store.start(() => api.install(ctx.env.python, spec), {
    kind: "install",
    env: ctx.env.python,
    name: spec,
  });
}

export async function render(ctx) {
  const python = ctx.env.python;
  meta.subtitle = `Installed in ${store.envName(ctx.env)}.`;

  const packages = await store.packages(python);

  const selection = new Set();
  const latestCells = new Map();
  const rowButtons = new Map();
  const outdated = store.outdatedMap(python);

  const opsBanner = h("div", { class: "op-banner", hidden: true });

  /* ── toolbar ────────────────────────────────────────────────────────────── */

  function selectAllRows(checked) {
    for (const row of tbody.children) {
      const box = row.querySelector(".checkbox");
      box.checked = checked;
      if (checked) selection.add(box.dataset.package);
      else selection.delete(box.dataset.package);
    }
    paintSelection();
  }

  const selectAll = h("input", {
    class: "checkbox",
    type: "checkbox",
    "aria-label": "Select every visible package",
    onchange: (event) => selectAllRows(event.target.checked),
  });

  /* The header row is gone once the table has folded into cards, and with it
     the only way to select every row, so the same control is offered here for
     that layout. */
  const selectAllNarrow = h(
    "label",
    { class: "narrow-only eyebrow", title: "Select every visible package" },
    h("input", {
      class: "checkbox",
      type: "checkbox",
      "aria-label": "Select every visible package",
      onchange: (event) => {
        selectAll.checked = event.target.checked;
        selectAllRows(event.target.checked);
      },
    }),
    "All",
  );

  const filter = h("input", {
    class: "input",
    type: "search",
    placeholder: "Filter by name or description…",
    spellcheck: "false",
    oninput: () => paint(),
  });

  const countLabel = h("span", { class: "eyebrow" });
  const bulkButton = h("button", {
    class: "btn btn-sm btn-danger",
    type: "button",
    hidden: true,
    onclick: () => bulkUninstall(ctx, selection, paintSelection),
  });

  const toolbar = h(
    "div",
    { class: "panel-toolbar" },
    selectAllNarrow,
    h(
      "div",
      { class: "field grow", style: "max-width:430px" },
      h("span", { class: "field-icon" }, icon("search", 16)),
      filter,
    ),
    countLabel,
    bulkButton,
  );

  /* ── rows ───────────────────────────────────────────────────────────────── */

  const tbody = h("tbody");

  const rows = packages.map((pkg) => {
    const latest = h("span", { class: "mono muted", text: "…" });
    latestCells.set(store.normalise(pkg.name), latest);

    const checkbox = h("input", {
      class: "checkbox",
      type: "checkbox",
      "aria-label": `Select ${pkg.name}`,
      onchange: (event) => {
        if (event.target.checked) selection.add(pkg.name);
        else selection.delete(pkg.name);
        paintSelection();
      },
    });
    checkbox.dataset.package = pkg.name;

    const upgradeButton = h(
      "button",
      {
        class: "btn btn-sm btn-ghost",
        type: "button",
        onclick: () =>
          store.start(() => api.upgrade(python, pkg.name), { kind: "upgrade", env: python, name: pkg.name }),
      },
      icon("arrow_upward", 13),
      "Upgrade",
    );
    const versionsButton = h(
      "button",
      {
        class: "btn btn-sm btn-ghost",
        type: "button",
        title: `Install a different version of ${pkg.name}`,
        onclick: () => chooseVersion(ctx, pkg),
      },
      icon("history", 13),
      "Versions",
    );
    const uninstallButton = h(
      "button",
      {
        class: "btn btn-sm btn-ghost",
        type: "button",
        onclick: async () => {
          const yes = await confirmDialog({
            title: `Uninstall ${pkg.name}?`,
            text: `${pkg.version} will be removed from ${ctx.env.label}. Anything depending on it will break.`,
            confirm: "Uninstall",
            danger: true,
          });
          if (!yes) return;
          await store.start(() => api.uninstall(python, pkg.name), {
            kind: "uninstall",
            env: python,
            name: pkg.name,
          });
        },
      },
      icon("delete", 13),
      "Uninstall",
    );

    const row = h(
      "tr",
      { dataset: { search: `${pkg.name} ${pkg.summary || ""}`.toLowerCase() } },
      h("td", { class: "cell-tight" }, checkbox),
      h(
        "td",
        { class: "cell-flex cell-title" },
        h(
          "div",
          { class: "cell-main" },
          h("span", { class: "cell-icon" }, icon("inventory_2", 15)),
          h(
            "span",
            { class: "cell-stack" },
            h("span", { class: "cell-name", text: pkg.name }),
            pkg.summary
              ? h("span", { class: "cell-desc truncate", title: pkg.summary, text: pkg.summary })
              : null,
          ),
        ),
      ),
      h("td", { class: "mono cell-num", dataset: { label: "Installed" }, text: pkg.version }),
      h("td", { class: "cell-num", dataset: { label: "Latest" } }, latest),
      actionCell(upgradeButton, versionsButton, uninstallButton),
    );

    rowButtons.set(store.normalise(pkg.name), { upgradeButton, versionsButton, uninstallButton });
    return row;
  });

  function paint() {
    const needle = filter.value.trim().toLowerCase();
    const matching = needle ? rows.filter((row) => row.dataset.search.includes(needle)) : rows;
    replace(tbody, matching.slice(0, RENDER_LIMIT));
    countLabel.textContent =
      matching.length > RENDER_LIMIT
        ? `first ${RENDER_LIMIT} of ${matching.length}`
        : `${matching.length} of ${packages.length}`;
    selectAll.checked = false;
    paintSelection();
  }

  function paintSelection() {
    bulkButton.hidden = selection.size === 0;
    bulkButton.textContent = `Uninstall ${selection.size} selected`;
  }

  function paintOperations() {
    const running = store.runningOperations(python);
    const busyNow = running.length > 0;

    if (busyNow) {
      opsBanner.hidden = false;
      replace(
        opsBanner,
        h("span", { class: "spinner" }),
        h("span", { class: "op-text", text: store.describeOperation(running[0]) }),
        running.length > 1 ? h("span", { class: "eyebrow", text: `+${running.length - 1} more` }) : null,
      );
    } else {
      opsBanner.hidden = true;
      replace(opsBanner);
    }

    /* The row whose package is being changed wears the spinner on the button
       that would start that work again. A version picked from a row's list is
       that row's work; the page's Install button is for a requirement typed
       into its prompt. */
    for (const [key, buttons] of rowButtons) {
      const op = running.find((item) => item.name && store.normalise(item.name) === key) || null;
      setWorking(buttons.upgradeButton, op?.kind === "upgrade");
      setWorking(buttons.uninstallButton, op?.kind === "uninstall");
      setWorking(buttons.versionsButton, op?.kind === "install" && op.target !== op.name);
      for (const button of Object.values(buttons)) button.disabled = busyNow;
    }

    const installs = running.filter((op) => op.kind === "install");
    setWorking(installButton, installs.some((op) => !op.name || op.target === op.name));
    bulkButton.disabled = busyNow;
  }

  /* ── fill in the latest versions once PyPI answers ──────────────────────── */

  function fill() {
    for (const [key, cell] of latestCells) {
      const item = outdated.get(key);
      cell.className = "mono muted";
      cell.title = "";
      if (!item) {
        cell.textContent = "up to date";
        continue;
      }
      /* One tone for "there is a newer version". How big the jump is belongs in
         a word, and the Updates page has a column for exactly that. */
      cell.className = "badge badge-warn";
      cell.textContent = item.latestVersion;
      cell.title = `${item.bumpType} update`;
    }
  }

  if (outdated.size > 0) {
    fill();
  } else {
    store
      .outdated(python)
      .then((list) => {
        for (const item of list) outdated.set(store.normalise(item.name), item);
        fill();
      })
      .catch(() => {
        for (const cell of latestCells.values()) cell.textContent = "unavailable";
        toast("PyPI unreachable, so the latest versions are unknown.", "warn");
      });
  }

  paint();

  const body =
    packages.length === 0
      ? h(
          "div",
          { class: "empty" },
          h("span", { class: "empty-title", text: "No packages in this environment" }),
          h("span", { class: "empty-sub", text: "Use Install to add the first one." }),
        )
      : h(
          "div",
          { class: "table-wrap" },
          h(
            "table",
            { class: "table" },
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                h("th", { class: "cell-tight" }, selectAll),
                h("th", { class: "cell-flex" }, "Package"),
                h("th", { class: "cell-num" }, "Installed"),
                h("th", { class: "cell-num" }, "Latest"),
                h("th", { class: "cell-right" }, ""),
              ),
            ),
            tbody,
          ),
        );

  paintOperations();
  cleanup();
  unsubscribe = store.subscribe(paintOperations);

  return h("div", { class: "stack" }, opsBanner, panel("Installed", body, { toolbar }));
}

async function chooseVersion(ctx, pkg) {
  const version = await chooseDialog({
    title: `Choose a version of ${pkg.name}`,
    label: `Versions pip can install here.`,
    confirm: "Install",
    load: async () => {
      const versions = (await api.versions(ctx.env.python, pkg.name)) || [];
      return versions.map((value) => ({
        value,
        label: value,
        selected: value === pkg.version,
        badge: value === pkg.version ? "installed" : null,
      }));
    },
  });
  if (!version || version === pkg.version) return;

  await store.start(() => api.installVersion(ctx.env.python, pkg.name, version), {
    kind: "install",
    env: ctx.env.python,
    name: pkg.name,
    target: `${pkg.name} ${version}`,
  });
}

async function bulkUninstall(ctx, selection, paintSelection) {
  const names = [...selection];
  if (names.length === 0) return;

  const yes = await confirmDialog({
    title: `Uninstall ${names.length} package${names.length === 1 ? "" : "s"}?`,
    text: `They will be removed from ${ctx.env.label}. Anything depending on them will break.`,
    confirm: "Uninstall all",
    danger: true,
  });
  if (!yes) return;

  await store.start(() => api.uninstallMany(ctx.env.python, names), {
    kind: "uninstall",
    env: ctx.env.python,
    name: names[0],
    target: names.length === 1 ? names[0] : `${names.length} packages`,
    total: names.length,
  });

  selection.clear();
  paintSelection();
}
