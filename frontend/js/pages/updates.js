/* Updates — every package in the active environment with a newer version on
   PyPI. PyPI answers this, so the page can be slow and says so while it waits. */

import { api } from "../api.js";
import * as store from "../store.js";
import { actionCell, busy, confirmDialog, empty, h, icon, loading, panel, replace, table, toast } from "../ui.js";

export const meta = { eyebrow: "Active environment", title: "Updates" };

let unsubscribe = null;

/* cleanup runs when the shell replaces this page. */
export function cleanup() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

export function actions(ctx) {
  return [
    h(
      "button",
      { class: "btn", type: "button", onclick: (event) => busy(event.currentTarget, () => ctx.refresh()) },
      icon("refresh", 14),
      "Check again",
    ),
  ];
}

export async function render(ctx) {
  const python = ctx.env.python;
  meta.subtitle = `Packages behind PyPI in ${store.envName(ctx.env)}.`;

  const body = h("div", {}, loading("Asking PyPI…"));
  const list = await store.outdated(python, { force: false });

  const opsBanner = h("div", { class: "op-banner", hidden: true });
  const rowActions = new Map();
  let upgradeAll = null;

  function paintOperations() {
    const running = store.runningOperations(python);
    const working = store.operationNames(python);
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

    for (const [key, cell] of rowActions) {
      const slot = cell.querySelector(".cell-actions");
      const spin = slot.querySelector(".spinner");
      if (working.has(key)) {
        if (!spin) slot.prepend(h("span", { class: "spinner" }));
      } else if (spin) {
        spin.remove();
      }
      for (const button of slot.querySelectorAll("button")) button.disabled = busyNow;
    }

    if (upgradeAll) upgradeAll.disabled = busyNow;
  }

  function mounted(node) {
    paintOperations();
    cleanup();
    unsubscribe = store.subscribe(paintOperations);
    return h("div", { class: "stack" }, opsBanner, node);
  }

  if (list.length === 0) {
    replace(
      body,
      empty(
        "Everything is up to date",
        `Nothing in ${ctx.env.label} is behind PyPI. Run “Check again” if that seems unlikely.`,
        "check",
      ),
    );
    return mounted(panel("Outdated", body));
  }

  const rows = list.map((item) => {
    const row = h(
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
                class: "btn btn-sm btn-ghost",
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
            class: "btn btn-sm btn-ghost btn-primary",
            type: "button",
            onclick: (event) =>
              busy(event.currentTarget, () => store.start(() => api.upgrade(python, item.name))),
          },
          icon("arrow_upward", 13),
          "Upgrade",
        ),
      ),
    );

    rowActions.set(store.normalise(item.name), row.lastElementChild);
    return row;
  });

  const toolbar = h(
    "div",
    { class: "panel-toolbar" },
    h("span", { class: "eyebrow", text: `${list.length} behind` }),
    summaryCounts(list),
    h("span", { class: "panel-toolbar-spacer" }),
    (upgradeAll = updateAllButton(ctx, list)),
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
  return mounted(panel("Outdated", body, { toolbar }));
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
      onclick: (event) =>
        busy(event.currentTarget, async () => {
          const yes = await confirmDialog({
            title: `Upgrade ${list.length} package${list.length === 1 ? "" : "s"}?`,
            text: `${ctx.env.label} is updated one package at a time. A major bump can break things.`,
            confirm: "Upgrade all",
          });
          if (!yes) return;

          await store.start(() => api.upgradeMany(ctx.env.python, list.map((item) => item.name)));
        }),
    },
    "Upgrade all",
  );
}
