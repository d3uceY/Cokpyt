/* Overview — the machine at a glance.

   The headline numbers are deliberately about environments rather than
   packages. "39 installed packages" is a true sentence about one interpreter
   and a misleading sentence about the machine, and that is the confusion this
   app exists to remove. */

import { api } from "../api.js";
import * as store from "../store.js";
import { environmentsTable } from "./environments.js";
import { empty, h, icon, loading, note, panel, replace, scanningBlock, statBlock, table } from "../ui.js";

export const meta = {
  eyebrow: "Machine",
  title: "Overview",
  subtitle: "What is installed, where it lives, and what changed recently.",
};

export let needsEnvironment = false;

export async function render(ctx) {
  const env = store.activeEnv();
  const root = h("div", { class: "stack" });

  /* Nothing is worth showing until the inventory exists: a grid of zeroes
     during a scan reads as "you have nothing installed". */
  if (store.state.scanning && store.state.envs.length === 0) {
    return scanningBlock();
  }

  root.append(stats(env));
  root.append(
    panel("Environments", environmentsTable(ctx, store.state.counts, { expand: false }), {
      actions: [h("a", { class: "link-btn", href: "#/environments" }, "Manage")],
    }),
  );
  root.append(activity());

  intro().then((banner) => banner && root.prepend(banner));
  return root;
}

function stats(env) {
  const outdatedSlot = h(
    "div",
    { class: "stat-value", text: "—" },
  );
  const outdatedCard = h(
    "div",
    { class: "stat" },
    h("div", { class: "stat-head" }, h("span", { class: "eyebrow", text: "Updates available" }), icon("update", 16)),
    outdatedSlot,
    h("div", { class: "stat-note", dataset: { tone: "muted" } }, "checking PyPI…"),
  );

  const grid = h(
    "div",
    { class: "stats" },
    statBlock({
      label: "Environments",
      value: String(store.state.envs.length),
      note: `${store.environmentsWithPackages()} hold packages`,
      icon: "hub",
    }),
    statBlock({
      label: "Packages in total",
      value: String(store.totalPackages()),
      note: "across every environment",
      icon: "inventory_2",
      tone: "muted",
    }),
    outdatedCard,
    statBlock({
      label: "Active interpreter",
      value: env ? env.version || "unknown" : "none",
      note: env ? env.label : "no environment selected",
      icon: "code",
      small: true,
    }),
  );

  if (env) {
    store
      .outdated(env.python)
      .then((list) => {
        replace(outdatedSlot, String(list.length));
        const parent = outdatedCard.querySelector(".stat-note");
        if (parent) {
          parent.dataset.tone = list.length ? "warn" : "ok";
          parent.textContent = list.length
            ? `${list.length} waiting in ${store.envName(env)}`
            : `${store.envName(env)} is up to date`;
        }
      })
      .catch(() => {
        replace(outdatedSlot, "?");
        const parent = outdatedCard.querySelector(".stat-note");
        if (parent) parent.textContent = "PyPI could not be reached";
      });
  } else {
    outdatedSlot.textContent = "0";
  }

  return grid;
}

function activity() {
  const body = h("div", {}, loading("Loading history…"));
  store
    .history()
    .then((entries) => {
      if (entries.length === 0) {
        replace(
          body,
          empty(
            "Nothing yet",
            "Installs, upgrades and uninstalls run from Cokpyt are recorded here.",
            "history",
          ),
        );
        return;
      }
      const recent = entries.slice(0, 6);
      replace(
        body,
        table(
          [
            { class: "cell-flex", text: "Package" },
            { class: "cell-num", text: "Version" },
            { class: "cell-short", text: "Action" },
            { class: "cell-short", text: "Status" },
            { class: "cell-num", text: "When" },
          ],
          recent.map((entry) =>
            h(
              "tr",
              {},
              h("td", { class: "cell-name", text: entry.package }),
              h("td", { class: "mono cell-num", text: entry.version || "—" }),
              h("td", { class: "muted cell-short", text: entry.action }),
              h(
                "td",
                { class: "cell-short" },
                h("span", { class: `badge ${entry.status === "success" ? "badge-ok" : "badge-danger"}` }, entry.status),
              ),
              h("td", { class: "muted cell-num", text: entry.timestamp }),
            ),
          ),
        ),
      );
    })
    .catch((error) => replace(body, note(error.message)));

  return panel("Recent activity", body, {
    actions: [h("a", { class: "link-btn", href: "#/history" }, "All history")],
  });
}

/* The first-run note replaces what used to be a five-step product tour: one
   paragraph that says the thing the app is for, and a dismiss button. */
export async function intro() {
  if (await api.introSeen().catch(() => true)) return null;
  const dismiss = h(
    "button",
    {
      class: "link-btn",
      type: "button",
      onclick: () => {
        node.remove();
        api.markIntroSeen().catch(() => {});
      },
    },
    "Got it",
  );
  node.append(dismiss);
  return node;
}
