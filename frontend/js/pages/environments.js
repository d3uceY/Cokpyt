/* Environments — the page the rest of the app is built around.

   `pip list` answers for one interpreter. A machine with a launcher, a couple
   of runtimes and a few project venvs has several answers, and the one pip
   happens to give you is usually the least interesting. This page is that list. */

import { api } from "../api.js";
import * as store from "../store.js";
import { actionCell, empty, h, icon, note, panel, scanningBlock, shortPath, table, toast } from "../ui.js";

export const meta = {
  eyebrow: "Machine",
  title: "Environments",
  subtitle:
    "Every Python environment Cokpyt could find, and how many packages each one holds. Pick one and the rest of the app works inside it.",
};

export let needsEnvironment = false;

const KIND_LABEL = {
  launcher: "launcher",
  standalone: "standalone",
  venv: "venv",
  conda: "conda",
};

const KIND_HINT = {
  launcher: "Installed and tracked by the Python Install Manager. `py -0p` lists these.",
  standalone: "Found by scanning the usual install locations. `py --list` does not know about this one.",
  venv: "A virtual environment. Its packages are in no other list anywhere on this machine.",
  conda: "A conda environment. It carries conda-meta, not pyvenv.cfg, so it has to be found separately.",
};

export function actions(ctx) {
  return [
    h(
      "button",
      {
        class: "btn",
        type: "button",
        onclick: async () => {
          const folder = await api.chooseFolder().catch(() => "");
          if (!folder) return;
          ctx.setBusy(true);
          try {
            const found = await api.scanFolder(folder);
            await store.packageCounts();
            ctx.refresh();
            toast(
              found.length
                ? `Found ${found.length} environment${found.length === 1 ? "" : "s"} in ${folder}.`
                : `No environments in ${folder}.`,
              found.length ? "ok" : "warn",
            );
          } catch (error) {
            toast(error.message, "danger");
          } finally {
            ctx.setBusy(false);
          }
        },
      },
      icon("folder_open", 14),
      "Scan a folder",
    ),
  ];
}

export async function render(ctx) {
  const counts = store.state.counts;

  return h(
    "div",
    { class: "stack" },
    store.state.notes.length ? h("div", { class: "stack" }, store.state.notes.map((text) => note(text, "warn"))) : null,
    note(
      "Cokpyt looks in the py launcher, the usual install directories, and every pyvenv.cfg and conda-meta marker under your home folder. Projects on another drive are found with “Scan a folder”.",
      "info",
    ),
    panel(
      "Found on this machine",
      environmentsTable(ctx, counts, { expand: true }),
      {
        actions: [
          h(
            "span",
            { class: "eyebrow" },
            `${store.state.envs.length} environments · ${store.totalPackages()} packages`,
          ),
        ],
      },
    ),
  );
}

/* environmentsTable is shared with the Overview page. */
export function environmentsTable(ctx, counts, { expand = false } = {}) {
  if (store.state.scanning && store.state.envs.length === 0) {
    return scanningBlock();
  }

  if (store.state.envs.length === 0) {
    return empty(
      "No Python environment found",
      "Install Python, or use “Scan a folder” to point Cokpyt at a project that has a venv.",
      "hub",
    );
  }

  const rows = store.state.envs.map((env) => {
    const isActive = env.python === store.state.active;
    const count = counts[env.python];

    const label = h(
      "span",
      { class: "cell-stack" },
      h(
        "span",
        { class: "cell-main" },
        h("span", { class: "cell-name", text: env.label }),
        env.default ? h("span", { class: "badge" }, "default") : null,
        isActive ? h("span", { class: "badge badge-strong" }, "active") : null,
      ),
      h("span", { class: "cell-desc mono truncate", title: env.python, text: shortPath(env.python, 4) }),
    );

    return h(
      "tr",
      {
        dataset: { selectable: "true", active: String(isActive) },
        title: `Use ${env.python}`,
        onclick: async (event) => {
          if (event.target.closest("button")) return;
          await ctx.select(env.python);
        },
      },
      h("td", {}, h("div", { class: "cell-main" }, h("span", { class: "cell-icon" }, icon("hub", 15)), label)),
      h(
        "td",
        { class: "cell-short" },
        h("span", { class: "badge", title: KIND_HINT[env.kind] || "" }, KIND_LABEL[env.kind] || env.kind),
      ),
      h("td", { class: "cell-num mono", text: env.version || "unknown" }),
      h(
        "td",
        { class: "cell-num" },
        count === undefined ? h("span", { class: "spinner" }) : h("span", { text: String(count) }),
      ),
      expand ? h("td", { class: "cell-flex mono truncate", title: env.root, text: env.root }) : null,
      actionCell(
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            title: "Show the environment folder",
            onclick: () => api.revealPath(env.root).catch((error) => toast(error.message, "danger")),
          },
          "Open",
        ),
        isActive
          ? null
          : h(
              "button",
              {
                class: "btn btn-sm btn-primary",
                type: "button",
                onclick: () => ctx.select(env.python),
              },
              "Use",
            ),
      ),
    );
  });

  const head = expand
    ? [
        { class: "cell-flex", text: "Environment" },
        { class: "cell-short", text: "Kind" },
        { class: "cell-num", text: "Python" },
        { class: "cell-num", text: "Packages" },
        { class: "cell-flex", text: "Folder" },
        { class: "cell-right", text: "" },
      ]
    : [
        { class: "cell-flex", text: "Environment" },
        { class: "cell-short", text: "Kind" },
        { class: "cell-num", text: "Python" },
        { class: "cell-num", text: "Packages" },
        { class: "cell-right", text: "" },
      ];

  return table(head, rows);
}
