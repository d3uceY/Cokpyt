/* History — every install, upgrade and uninstall this app has run.

   This is a record of what Cokpyt did, not of what the environment contains:
   a package installed from a terminal will not appear here. Saying so beats
   letting it read as a complete audit trail. */

import { api } from "../api.js";
import * as store from "../store.js";
import { confirmDialog, empty, h, icon, loading, note, panel, replace, relativeTime, table, toast } from "../ui.js";

export const meta = {
  eyebrow: "Record",
  title: "History",
  subtitle: "Installs, upgrades and uninstalls run from Cokpyt, newest first.",
};

const FILTERS = ["all", "install", "upgrade", "uninstall"];
let filter = "all";

export async function render(ctx) {
  const body = h("div", {}, loading());
  const entries = await store.history();

  const filtered = filter === "all" ? entries : entries.filter((entry) => entry.action === filter);

  const tabs = h(
    "div",
    { class: "segmented" },
    FILTERS.map((kind) =>
      h(
        "button",
        {
          type: "button",
          "aria-pressed": String(kind === filter),
          onclick: () => {
            filter = kind;
            ctx.refresh();
          },
        },
        kind === "all" ? `All ${entries.length}` : `${kind} ${entries.filter((e) => e.action === kind).length}`,
      ),
    ),
  );

  const actions = [
    tabs,
    h("span", { class: "panel-toolbar-spacer" }),
    h(
      "button",
      {
        class: "btn btn-sm",
        type: "button",
        disabled: filtered.length === 0,
        onclick: () => exportCSV(filtered),
      },
      icon("download", 13),
      "Export CSV",
    ),
    h(
      "button",
      {
        class: "btn btn-sm btn-danger",
        type: "button",
        disabled: entries.length === 0,
        onclick: async () => {
          const yes = await confirmDialog({
            title: "Clear the whole history?",
            text: `${entries.length} entries will be deleted. The packages themselves are untouched.`,
            confirm: "Clear",
            danger: true,
          });
          if (!yes) return;
          try {
            await api.clearHistory();
            store.invalidate(store.state.active);
            toast("History cleared.", "ok");
            ctx.refresh();
          } catch (error) {
            toast(error.message, "danger");
          }
        },
      },
      "Clear",
    ),
  ];

  if (filtered.length === 0) {
    replace(
      body,
      empty(
        entries.length === 0 ? "Nothing recorded yet" : `No ${filter} entries`,
        "Operations started from Cokpyt are recorded here as they finish.",
        "history",
      ),
    );
    return h(
      "div",
      { class: "stack" },
      panel("Activity", body, { actions }),
      note("Only actions run from this app are listed. Anything you did in a terminal lives only in that terminal.", "info"),
    );
  }

  const rows = filtered.map((entry) =>
    h(
      "tr",
      { title: entry.command },
      h("td", { class: "cell-name", text: entry.package }),
      h("td", { class: "mono cell-num", text: entry.version || "—" }),
      h("td", { class: "muted cell-short", text: entry.action }),
      h(
        "td",
        { class: "cell-short" },
        h("span", { class: `badge ${entry.status === "success" ? "badge-ok" : "badge-danger"}` }, entry.status),
      ),
      h("td", { class: "muted cell-num", title: entry.timestamp, text: relativeTime(entry.timestamp) }),
    ),
  );

  replace(
    body,
    table(
      [
        { class: "cell-flex", text: "Package" },
        { class: "cell-num", text: "Version" },
        { class: "cell-short", text: "Action" },
        { class: "cell-short", text: "Result" },
        { class: "cell-num", text: "When" },
      ],
      rows,
    ),
  );
  return panel("Activity", body, { actions });
}

/* exportCSV builds the file in the page and hands it to the browser. No round
   trip to Go for something the page already holds. */
function exportCSV(entries) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [["timestamp", "action", "package", "version", "status", "command"].join(",")];
  for (const entry of entries) {
    lines.push(
      [entry.timestamp, entry.action, entry.package, entry.version, entry.status, entry.command].map(quote).join(","),
    );
  }

  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv" }));
  const link = h("a", { href: url, download: `cokpyt-history-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
