/* Packages — what is installed in the active environment, and the buttons that
   change it.

   `pip list --outdated` is deliberately not part of loading this page. It
   queries PyPI and can take half a minute, so the list renders immediately and
   the "latest" column fills in behind it. */

import { api } from "../api.js";
import * as store from "../store.js";
import { actionCell, confirmDialog, h, icon, panel, promptDialog, replace, toast } from "../ui.js";

const RENDER_LIMIT = 400;

export const meta = { eyebrow: "Active environment", title: "Packages" };

export function actions(ctx) {
  return [
    h("button", { class: "btn btn-primary", type: "button", onclick: () => install(ctx) }, icon("add", 14), "Install"),
  ];
}

async function install(ctx) {
  const spec = await promptDialog({
    title: "Install a package",
    label: "A name, a pinned version, a path or a URL. pip decides what counts as valid.",
    placeholder: "requests==2.32.0",
  });
  if (!spec) return;

  ctx.setBusy(true);
  const ok = await store.operate(ctx.env.python, `Installing ${spec}`, () => api.install(ctx.env.python, spec));
  ctx.setBusy(false);
  if (ok) ctx.refresh();
}

export async function render(ctx) {
  const python = ctx.env.python;
  meta.subtitle = `Everything installed in ${store.envName(ctx.env)}.`;

  const packages = await store.packages(python);

  const selection = new Set();
  const latestCells = new Map();
  const outdated = store.outdatedMap(python);

  /* ── toolbar ────────────────────────────────────────────────────────────── */

  const selectAll = h("input", {
    class: "checkbox",
    type: "checkbox",
    "aria-label": "Select every visible package",
    onchange: (event) => {
      for (const row of tbody.children) {
        const box = row.querySelector(".checkbox");
        box.checked = event.target.checked;
        if (event.target.checked) selection.add(box.dataset.package);
        else selection.delete(box.dataset.package);
      }
      paintSelection();
    },
  });

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

    return h(
      "tr",
      { dataset: { search: `${pkg.name} ${pkg.summary || ""}`.toLowerCase() } },
      h("td", { class: "cell-tight" }, checkbox),
      h(
        "td",
        { class: "cell-flex" },
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
      h("td", { class: "mono cell-num", text: pkg.version }),
      h("td", { class: "cell-num" }, latest),
      actionCell(
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            onclick: async () => {
              const ok = await store.operate(python, `Upgrading ${pkg.name}`, () => api.upgrade(python, pkg.name));
              if (ok) ctx.refresh();
            },
          },
          "Upgrade",
        ),
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            onclick: async () => {
              const yes = await confirmDialog({
                title: `Uninstall ${pkg.name}?`,
                text: `${pkg.version} will be removed from ${ctx.env.label}. Anything depending on it will break.`,
                confirm: "Uninstall",
                danger: true,
              });
              if (!yes) return;
              const ok = await store.operate(python, `Uninstalling ${pkg.name}`, () =>
                api.uninstall(python, pkg.name),
              );
              if (ok) ctx.refresh();
            },
          },
          "Uninstall",
        ),
      ),
    );
  });

  function paint() {
    const needle = filter.value.trim().toLowerCase();
    const matching = needle ? rows.filter((row) => row.dataset.search.includes(needle)) : rows;
    replace(tbody, matching.slice(0, RENDER_LIMIT));
    countLabel.textContent =
      matching.length > RENDER_LIMIT
        ? `first ${RENDER_LIMIT} of ${matching.length} shown`
        : `${matching.length} of ${packages.length}`;
    selectAll.checked = false;
    paintSelection();
  }

  function paintSelection() {
    bulkButton.hidden = selection.size === 0;
    bulkButton.textContent = `Uninstall ${selection.size} selected`;
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
        toast("PyPI could not be reached, so the latest versions are unknown.", "warn");
      });
  }

  paint();

  const body =
    packages.length === 0
      ? h(
          "div",
          { class: "empty" },
          h("span", { class: "empty-title", text: "This environment has no packages" }),
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

  return panel("Installed", body, { toolbar });
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

  selection.clear();
  paintSelection();

  ctx.setBusy(true);
  let failures = [];
  const ok = await store.operate(ctx.env.python, `Uninstalling ${names.length} packages`, async () => {
    failures = (await api.uninstallMany(ctx.env.python, names)) || [];
  });
  ctx.setBusy(false);

  if (ok && failures.length > 0) {
    toast(`${failures.length} could not be removed. ${failures[0]}`, "warn");
  }
  ctx.refresh();
}
