/* Updates — every package in the active environment with a newer version on
   PyPI. PyPI answers this, so the page can be slow and says so while it waits. */

import { api } from "../api.js";
import * as store from "../store.js";
import { actionCell, confirmDialog, empty, h, icon, loading, panel, replace, table, toast } from "../ui.js";

export const meta = { eyebrow: "Active environment", title: "Updates" };

export function actions(ctx) {
  return [
    h("button", { class: "btn", type: "button", onclick: () => ctx.refresh() }, icon("refresh", 14), "Check again"),
  ];
}

export async function render(ctx) {
  const python = ctx.env.python;
  meta.subtitle = `Everything behind the newest release on PyPI for ${store.envName(ctx.env)}.`;

  const body = h("div", {}, loading("Asking PyPI what is newer…"));
  const list = await store.outdated(python, { force: false });

  if (list.length === 0) {
    replace(
      body,
      empty(
        "Everything is up to date",
        `${ctx.env.label} has nothing behind PyPI. Run “Check again” if that seems unlikely.`,
        "check",
      ),
    );
    return panel("Outdated", body);
  }

  const rows = list.map((item) =>
    h(
      "tr",
      {},
      h(
        "td",
        { class: "cell-flex" },
        h(
          "div",
          { class: "cell-main" },
          h("span", { class: "cell-icon" }, icon("inventory_2", 15)),
          h("span", { class: "cell-name", text: item.name }),
        ),
      ),
      h("td", { class: "mono cell-num", text: item.version }),
      h("td", { class: "mono cell-num", text: item.latestVersion }),
      h("td", { class: "cell-short" }, h("span", { class: "badge" }, item.bumpType)),
      actionCell(
        item.changelogUrl
          ? h(
              "button",
              {
                class: "btn btn-sm",
                type: "button",
                title: item.changelogUrl,
                onclick: () => api.openURL(item.changelogUrl).catch((error) => toast(error.message, "danger")),
              },
              icon("link", 13),
            )
          : null,
        h(
          "button",
          {
            class: "btn btn-sm btn-primary",
            type: "button",
            onclick: async () => {
              const ok = await store.operate(python, `Upgrading ${item.name}`, () => api.upgrade(python, item.name));
              if (ok) ctx.refresh();
            },
          },
          "Upgrade",
        ),
      ),
    ),
  );

  const toolbar = h(
    "div",
    { class: "panel-toolbar" },
    h("span", { class: "eyebrow", text: `${list.length} behind` }),
    summaryCounts(list),
    h("span", { class: "panel-toolbar-spacer" }),
    updateAllButton(ctx, list),
  );

  replace(
    body,
    h(
      "div",
      { class: "table-wrap" },
      table(
        [
          { class: "cell-flex", text: "Package" },
          { class: "cell-num", text: "Installed" },
          { class: "cell-num", text: "Latest" },
          { class: "cell-short", text: "Bump" },
          { class: "cell-right", text: "" },
        ],
        rows,
      ),
    ),
  );
  return panel("Outdated", body, { toolbar });
}

function summaryCounts(list) {
  const counts = { major: 0, minor: 0, patch: 0 };
  for (const item of list) counts[item.bumpType] += 1;
  return h(
    "span",
    { class: "row" },
    ...["major", "minor", "patch"].map((kind) =>
      h("span", { class: "eyebrow" }, `${counts[kind]} ${kind}`),
    ),
  );
}

function updateAllButton(ctx, list) {
  return h(
    "button",
    {
      class: "btn btn-primary btn-sm",
      type: "button",
      onclick: async () => {
        const yes = await confirmDialog({
          title: `Upgrade ${list.length} package${list.length === 1 ? "" : "s"}?`,
          text: `${ctx.env.label} will be updated one package at a time. A major version bump can break things.`,
          confirm: "Upgrade all",
        });
        if (!yes) return;

        ctx.setBusy(true);
        let failures = [];
        const ok = await store.operate(ctx.env.python, `Upgrading ${list.length} packages`, async () => {
          failures = (await api.upgradeMany(ctx.env.python, list.map((item) => item.name))) || [];
        });
        ctx.setBusy(false);

        if (ok && failures.length > 0) {
          toast(`${failures.length} could not be upgraded. ${failures[0]}`, "warn");
        }
        ctx.refresh();
      },
    },
    "Upgrade all",
  );
}
