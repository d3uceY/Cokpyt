/* Cleanup — reclaiming disk space from pip's own leftovers.

   The sizes are measured before anything is deleted, so "Run cleanup" is never
   a leap of faith. The download cache is pip-global and is counted once. */

import { api } from "../api.js";
import * as store from "../store.js";
import { confirmDialog, formatBytes, h, icon, loading, panel, plural, replace, setWorking } from "../ui.js";

export const meta = {
  eyebrow: "Active environment",
  title: "Cleanup",
  subtitle: "Leftovers pip and Python leave behind.",
};

let unsubscribe = null;

export function cleanup() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

export async function render(ctx) {
  const python = ctx.env.python;
  meta.subtitle = `Leftovers in ${store.envName(ctx.env)}.`;
  const body = h("div", {}, loading("Measuring…"));
  const selected = new Set();

  const runButton = h("button", { class: "btn btn-primary", type: "button", disabled: true }, "Run cleanup");
  const total = h("span", { class: "eyebrow" });
  const opsBanner = h("div", { class: "op-banner", hidden: true });

  let categories = [];
  let selectedBytes = 0;
  try {
    categories = await api.cleanupScan(python);
  } catch (error) {
    replace(body, h("div", { class: "error-note", text: error.message }));
    return panel("Reclaimable", body);
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
      );
    } else {
      opsBanner.hidden = true;
      replace(opsBanner);
    }

    setWorking(runButton, running.some((op) => op.kind === "cleanup"));
    runButton.disabled = selectedBytes === 0 || busyNow;
  }

  function paintTotal() {
    selectedBytes = categories.filter((c) => selected.has(c.kind)).reduce((sum, c) => sum + c.size, 0);
    total.textContent = selected.size
      ? `${formatBytes(selectedBytes)} selected`
      : `${formatBytes(categories.reduce((sum, c) => sum + c.size, 0))} available`;
    paintOperations();
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
    await store.start(() => api.cleanupRun(python, kinds), {
      kind: "cleanup",
      env: python,
      target: "pip leftovers",
    });
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
  cleanup();
  unsubscribe = store.subscribe(paintOperations);

  return h("div", { class: "stack" }, opsBanner, panel("Reclaimable", body, {
    actions: [total, runButton],
  }));
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
