/* Cleanup — reclaiming disk space from pip's own leftovers.

   The sizes are measured before anything is deleted, so "Run cleanup" is never
   a leap of faith. The download cache is pip-global and is counted once. */

import { api } from "../api.js";
import * as store from "../store.js";
import { confirmDialog, formatBytes, h, icon, loading, panel, plural, replace, toast } from "../ui.js";

export const meta = {
  eyebrow: "Active environment",
  title: "Cleanup",
  subtitle: "Leftovers pip and Python leave behind.",
};

export async function render(ctx) {
  const python = ctx.env.python;
  meta.subtitle = `Leftovers in ${store.envName(ctx.env)}.`;
  const body = h("div", {}, loading("Measuring…"));
  const selected = new Set();

  const runButton = h("button", { class: "btn btn-primary", type: "button", disabled: true }, "Run cleanup");
  const total = h("span", { class: "eyebrow" });

  let categories = [];
  try {
    categories = await api.cleanupScan(python);
  } catch (error) {
    replace(body, h("div", { class: "error-note", text: error.message }));
    return panel("Reclaimable", body);
  }

  function paintTotal() {
    const bytes = categories.filter((c) => selected.has(c.kind)).reduce((sum, c) => sum + c.size, 0);
    total.textContent = selected.size
      ? `${formatBytes(bytes)} selected`
      : `${formatBytes(categories.reduce((sum, c) => sum + c.size, 0))} available`;
    runButton.disabled = selected.size === 0 || bytes === 0;
  }

  runButton.addEventListener("click", async () => {
    const bytes = categories.filter((c) => selected.has(c.kind)).reduce((sum, c) => sum + c.size, 0);
    const yes = await confirmDialog({
      title: "Run cleanup?",
      text: `${formatBytes(bytes)} will be freed from ${ctx.env.label}. Deleted caches are re-downloaded when needed.`,
      confirm: "Clean up",
      danger: true,
    });
    if (!yes) return;

    const kinds = [...selected];
    ctx.setBusy(true);
    const ok = await store.operate(python, "Cleaning up", () => api.cleanupRun(python, kinds));
    ctx.setBusy(false);
    if (ok) {
      toast(`${formatBytes(bytes)} freed.`, "ok");
      ctx.refresh();
    }
  });

  const rows = categories.map((category) =>
    h(
      "div",
      { class: "check-line" },
      h("input", {
        class: "checkbox",
        type: "checkbox",
        disabled: category.size === 0,
        "aria-label": category.label,
        onchange: (event) => {
          if (event.target.checked) selected.add(category.kind);
          else selected.delete(category.kind);
          paintTotal();
        },
      }),
      h(
        "div",
        { class: "check-line-body" },
        h("div", { class: "row" }, h("span", { class: "cell-name", text: category.label }), h("span", { class: "badge" }, formatBytes(category.size))),
        h("div", { class: "check-line-detail mono truncate", title: category.path || "", text: explain(category) }),
      ),
    ),
  );

  replace(body, h("div", {}, rows));
  paintTotal();

  return panel("Reclaimable", body, {
    actions: [total, runButton],
  });
}

function explain(category) {
  if (category.size === 0) {
    return category.kind === "cache"
      ? "Nothing cached yet."
      : "Nothing to remove in this environment.";
  }

  const files = `${plural(category.files, "file")} · `;
  const where = category.path ? ` in ${category.path}` : "";
  switch (category.kind) {
    case "cache":
      return `${files}pip's shared download cache${where}.`;
    case "orphan":
      return `${files}leftover build metadata${where}. Safe once a package is installed.`;
    default:
      return `${files}compiled bytecode${where}. Python rebuilds it on demand.`;
  }
}
