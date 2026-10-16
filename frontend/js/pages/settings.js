/* Settings — appearance, updates, and where the app keeps its files. */

import { api } from "../api.js";
import * as store from "../store.js";
import { confirmDialog, h, icon, panel, replace, toast } from "../ui.js";

export const meta = { eyebrow: "Cokpyt", title: "Settings" };

export let needsEnvironment = false;

export async function render(ctx) {
  const env = store.activeEnv();
  const info = env ? await api.environmentInfo(env.python).catch(() => null) : null;

  return h(
    "div",
    { class: "stack" },
    appearance(),
    about(),
    environment(env, info),
    maintenance(ctx),
  );
}

function appearance() {
  return panel(
    "Appearance",
    h(
      "div",
      { class: "panel-body stack" },
      h(
        "div",
        { class: "row" },
        h("span", { class: "eyebrow grow" }, "Theme"),
        h(
          "div",
          { class: "segmented" },
          ["light", "dark"].map((theme) =>
            h(
              "button",
              {
                type: "button",
                "aria-pressed": String(store.state.theme === theme),
                onclick: () => store.applyTheme(theme),
              },
              theme === "dark" ? "Dark" : "Light",
            ),
          ),
        ),
      ),
      h("p", { class: "muted", style: "font-size:12px" }, "Remembered between runs."),
    ),
  );
}

function about() {
  const slot = h("span", { class: "muted", style: "font-size:12px" }, "");

  async function check() {
    slot.textContent = "Asking GitHub…";
    try {
      const info = await api.checkForUpdate();
      if (info.hasUpdate) {
        slot.replaceChildren(
          document.createTextNode(`Version ${info.latestVersion} is available. `),
          h(
            "button",
            {
              class: "link-btn",
              type: "button",
              onclick: () => api.openURL(info.releaseURL).catch((error) => toast(error.message, "danger")),
            },
            "Open release",
          ),
        );
      } else {
        slot.textContent = `Up to date (${store.state.version}).`;
      }
    } catch (error) {
      slot.textContent = `GitHub unreachable: ${error.message}`;
    }
  }

  return panel(
    "About",
    h(
      "div",
      { class: "panel-body stack" },
      h(
        "dl",
        { class: "kv" },
        h("dt", {}, "Version"),
        h("dd", {}, store.state.version),
        h("dt", {}, "Platform"),
        h("dd", {}, `${store.state.platform} · ${store.state.envs.length} environments`),
      ),
      h("div", { class: "row" }, slot, h("span", { class: "grow" }), h("button", { class: "btn btn-sm", type: "button", onclick: check }, "Check for updates")),
    ),
  );
}

function environment(env, info) {
  if (!env) {
    return panel("Active environment", h("div", { class: "panel-body muted" }, "None found."));
  }

  const rows = [
    ["Interpreter", env.python],
    ["Environment", env.root],
    ["Kind", env.kind + (env.base ? ` · built from ${env.base}` : "")],
    ["Found by", env.source],
  ];
  if (info) {
    rows.push(["Python", info.pythonVersion || "unknown"]);
    rows.push(["pip", info.pipVersion || "missing"]);
    rows.push(["Site packages", info.sitePackages || info.prefix || "unknown"]);
  }

  return panel(
    "Active environment",
    h(
      "div",
      { class: "panel-body stack" },
      h(
        "dl",
        { class: "kv" },
        rows.flatMap(([key, value]) => [h("dt", {}, key), h("dd", {}, value || "—")]),
      ),
      h(
        "div",
        { class: "row" },
        h(
          "button",
          { class: "btn btn-sm", type: "button", onclick: () => api.revealPath(env.root).catch((error) => toast(error.message, "danger")) },
          icon("folder_open", 13),
          "Open folder",
        ),
      ),
    ),
  );
}

function maintenance(ctx) {
  return panel(
    "Stored data",
    h(
      "div",
      { class: "panel-body stack" },
      h(
        "p",
        { class: "muted", style: "font-size:12px" },
        "A config file, a log, the operation history, and a copy of the PyPI name index. Nothing about your packages is copied anywhere.",
      ),
      indexRow(),
      h(
        "div",
        { class: "row" },
        h(
          "button",
          { class: "btn btn-sm", type: "button", onclick: () => showLog().catch((error) => toast(error.message, "danger")) },
          "View the log",
        ),
        h(
          "button",
          {
            class: "btn btn-sm btn-danger",
            type: "button",
            onclick: async () => {
              const yes = await confirmDialog({
                title: "Clear the log?",
                text: "Log lines only. The operation history is separate.",
                confirm: "Clear",
                danger: true,
              });
              if (!yes) return;
              try {
                await api.clearLogs();
                toast("Log cleared.", "ok");
              } catch (error) {
                toast(error.message, "danger");
              }
            },
          },
          "Clear the log",
        ),
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            onclick: async () => {
              await api.markIntroSeen().catch(() => {});
              store.invalidate(store.state.active);
              toast("The first-run note will show again on Overview.", "ok");
            },
          },
          "Show the intro again",
        ),
      ),
    ),
  );
}

/* The name index is the one download Cokpyt does for itself: every project on
   PyPI, a few hundred thousand names. It is stored on disk, so opening the app
   again reads the file instead of fetching it again. */
function indexRow() {
  const note = h("span", { class: "muted", style: "font-size:12px" });
  const button = h(
    "button",
    { class: "btn btn-sm", type: "button", onclick: refetch },
    icon("sync", 13),
    "Refetch the index",
  );

  function show(status) {
    note.textContent = status.fetched
      ? `PyPI index: ${status.names.toLocaleString()} names, fetched ${status.fetched}`
      : "PyPI index: not downloaded. The first search fetches it.";
  }

  async function refetch() {
    button.disabled = true;
    note.textContent = "Downloading every name on PyPI. About a minute…";
    try {
      show(await api.refreshIndex());
      toast("PyPI index refreshed.", "ok");
    } catch (error) {
      toast(error.message, "danger");
      show(await api.indexStatus().catch(() => ({})));
    } finally {
      button.disabled = false;
    }
  }

  api.indexStatus().then(show, () => {});

  return h("div", { class: "row" }, note, h("span", { class: "grow" }), button);
}

async function showLog() {
  const entries = await api.logs();
  if (entries.length === 0) {
    toast("The log is empty.", "info");
    return;
  }
  const { output } = await import("../ui.js");
  output.show();
  output.writeAll(entries.map((entry) => `${entry.timestamp}  ${entry.level.padEnd(6)}  ${entry.message}`));
}
