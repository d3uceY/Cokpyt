/* The shell: sidebar, environment picker, router, status bar.

   Pages are ES modules loaded on demand. Each exports `meta` for the page head,
   optional `actions` for the top-right buttons, and `render` for the body. */

import { Events } from "/wails/runtime.js";
import { api } from "./api.js";
import * as store from "./store.js";
import { $, busy, errorNote, h, hydrateIcons, icon, loading, replace, scanningBlock, toast } from "./ui.js";

const ROUTES = [
  { path: "/", label: "Overview", icon: "dashboard", load: () => import("./pages/overview.js") },
  { path: "/environments", label: "Environments", icon: "hub", load: () => import("./pages/environments.js") },
  { path: "/packages", label: "Packages", icon: "inventory_2", load: () => import("./pages/packages.js") },
  { path: "/search", label: "Search PyPI", icon: "search", load: () => import("./pages/search.js") },
  { path: "/updates", label: "Updates", icon: "update", load: () => import("./pages/updates.js") },
  { path: "/cleanup", label: "Cleanup", icon: "cleaning_services", load: () => import("./pages/cleanup.js") },
  { label: "System" },
  { path: "/history", label: "History", icon: "history", load: () => import("./pages/history.js") },
  { path: "/doctor", label: "Doctor", icon: "health_and_safety", load: () => import("./pages/doctor.js") },
  { path: "/settings", label: "Settings", icon: "settings", load: () => import("./pages/settings.js") },
];

let current = null;
let busyCount = 0;
let scanMessage = "";

const opsSlot = h("span", { class: "statusbar-item", hidden: true });

/* ── boot ─────────────────────────────────────────────────────────────────── */

async function boot() {
  await injectSprite();
  hydrateIcons();
  buildNav();
  wireChrome();
  wireEvents();

  try {
    await store.bootstrap();
  } catch (error) {
    toast(`Could not read environments: ${error.message}`, "danger");
  }

  store.applyTheme(store.state.theme, { persist: false });
  renderEnvPicker();
  store.subscribe(paintChrome);
  paintChrome();

  window.addEventListener("hashchange", renderPage);

  /* Counts are globs over site-packages, so they are cheap enough to wait for.
     Doing it before the first paint is what keeps the totals on the Overview
     from reading zero and then never correcting themselves. */
  if (store.state.scanned) {
    await store.packageCounts().catch(() => {});
  }

  await renderPage();
  refreshStatusBar();
}

/* The icon sprite is fetched rather than referenced from another document,
   because a same-document <use> is the only form every webview agrees on. */
async function injectSprite() {
  try {
    const markup = await fetch("/assets/icons.svg").then((response) => response.text());
    document.body.insertAdjacentHTML("afterbegin", markup);
  } catch {
    /* Icons are decoration. Losing them should not stop the app. */
  }
}

/* ── chrome ───────────────────────────────────────────────────────────────── */

function buildNav() {
  const nav = $("nav");
  replace(
    nav,
    ROUTES.map((route) => {
      if (!route.path) return h("div", { class: "nav-label eyebrow", text: route.label });
      return h(
        "a",
        {
          class: "nav-item",
          href: `#${route.path}`,
          dataset: { route: route.path },
          /* The rail below 860px hides the label, so the name has to survive
             somewhere: the title for the pointer, the aria-label for a reader. */
          title: route.label,
          "aria-label": route.label,
        },
        icon(route.icon, 19),
        h("span", { text: route.label }),
        h("span", { class: "nav-count", hidden: true, dataset: { count: route.path } }),
      );
    }),
  );
}

function wireChrome() {
  $("env-select").addEventListener("change", (event) => selectEnvironment(event.target.value));

  $("env-rescan").addEventListener("click", rescan);

  $("theme-toggle").addEventListener("click", () => {
    store.applyTheme(store.state.theme === "dark" ? "light" : "dark");
  });
}

/* rescan re-inventories the machine. The button carries the wait: it spins for
   as long as the sweep runs, and the status bar names what is being looked for. */
async function rescan() {
  store.state.scanning = true;
  paintChrome();
  await busy($("env-rescan"), async () => {
    try {
      await store.rescan();
      renderEnvPicker();
      invalidatePageCaches();
      await store.packageCounts();
      await renderPage();
      toast(`Found ${store.state.envs.length} environments.`, "ok");
    } catch (error) {
      toast(error.message, "danger");
    } finally {
      store.state.scanning = false;
      paintChrome();
    }
  });
}

/* While the sweep is running and nothing has been found yet, the picker says
   what is being looked at. A blank select for ten seconds reads as a bug. */
function renderEnvPicker() {
  const select = $("env-select");

  if (store.state.scanning && store.state.envs.length === 0) {
    replace(select, h("option", { value: "" }, scanMessage || "Looking for environments…"));
    select.disabled = true;
    return;
  }

  const options = store.state.envs.map((env) =>
    h(
      "option",
      { value: env.python, selected: env.python === store.state.active },
      store.envName(env),
    ),
  );
  if (options.length === 0) {
    options.push(h("option", { value: "" }, "None found"));
  }
  replace(select, options);
  select.disabled = store.state.envs.length === 0;
}

/* paintChrome runs whenever shared state changes. */
function paintChrome() {
  $("version-label").textContent = store.state.version;
  const toggle = $("theme-toggle");
  replace(toggle, icon(store.state.theme === "dark" ? "light_mode" : "dark_mode", 18));
  toggle.title = store.state.theme === "dark" ? "Switch to light" : "Switch to dark";

  const path = currentPath();
  for (const link of document.querySelectorAll(".nav-item")) {
    const active = link.dataset.route === path;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  const env = store.activeEnv();
  $("env-health").dataset.state = env ? "ok" : "unknown";
  $("env-health").title = env ? env.python : "No environment selected";

  paintOperations();
}

async function refreshStatusBar() {
  const bar = $("statusbar");
  const env = store.activeEnv();
  const parts = [];

  if (store.state.scanning && store.state.envs.length === 0) {
    replace(
      bar,
      h("span", { class: "statusbar-item" }, h("span", { class: "spinner" }), "Scanning for environments"),
      h("span", { class: "statusbar-right", text: scanMessage }),
    );
    return;
  }

  parts.push(
    h("span", {
      class: "statusbar-item",
      text: `${store.state.envs.length} environments · ${store.totalPackages()} packages`,
    }),
  );

  /* The Python version is not repeated here: the active environment's label
     already ends in it, and it is shown on the right. */
  if (env) {
    try {
      const info = await api.environmentInfo(env.python);
      if (info.pipVersion) parts.push(h("span", { class: "statusbar-item", text: `pip ${info.pipVersion}` }));
      else parts.push(h("span", { class: "statusbar-item", text: "no pip" }));
    } catch {
      parts.push(h("span", { class: "statusbar-item", text: "environment will not run" }));
    }
  }

  /* The version lives in the sidebar foot and in Settings → About. Repeating it
     here as well puts the same string on screen three times. */
  replace(
    bar,
    parts,
    opsSlot,
    h("span", { class: "statusbar-right" }, icon("hub", 13), h("span", { text: store.activeLabel() })),
  );
  paintOperations();
}

function paintOperations() {
  const running = store.runningOperations();
  opsSlot.hidden = running.length === 0;
  syncPageActions();
  if (running.length === 0) {
    replace(opsSlot);
    return;
  }
  replace(
    opsSlot,
    h("span", { class: "spinner" }),
    h("span", { text: store.describeOperation(running[0]) }),
    running.length > 1 ? h("span", { class: "eyebrow", text: `+${running.length - 1} more` }) : null,
  );
}

/* ── routing ──────────────────────────────────────────────────────────────── */

function currentPath() {
  const hash = location.hash.replace(/^#/, "");
  return ROUTES.some((route) => route.path === hash) ? hash : "/";
}

function invalidatePageCaches() {
  for (const env of store.state.envs) store.invalidate(env.python);
}

/* Renders are asynchronous and a page that reaches out to PyPI can resolve
   after a newer navigation has already painted. The header goes up before the
   body is awaited, so the late page wins and the window ends up showing one
   page's head over another page's body — nothing looks wrong until you read the
   panel title. The token makes the newest render the only one allowed to write. */
let renderToken = 0;

async function renderPage() {
  const token = ++renderToken;
  const stale = () => token !== renderToken;

  const path = currentPath();
  const route = ROUTES.find((item) => item.path === path) || ROUTES[0];
  const view = $("view");

  let page;
  try {
    page = await route.load();
  } catch (error) {
    if (!stale()) replace(view, errorNote(`Could not load this page: ${error.message}`));
    return;
  }
  if (stale()) return;

  const previous = current;
  current = page;
  previous?.cleanup?.();
  paintHead(page);

  await store.refreshOperations().catch(() => {});
  if (stale()) return;

  const env = store.activeEnv();
  if (page.needsEnvironment !== false && !env) {
    replace(
      view,
      store.state.scanning
        ? scanningBlock(scanMessage)
        : errorNote(
            "No Python environment found. Install Python, or use “Scan a folder” on Environments to point Cokpyt at a project that has a venv.",
          ),
    );
    return;
  }

  const controller = { refresh: renderPage, env, setBusy, select: selectEnvironment };
  replace(view, loading());

  let body;
  try {
    body = await page.render(controller);
  } catch (error) {
    body = errorNote(error.message);
  }
  if (stale()) return;

  replace(view, body);
  view.scrollTop = 0;
  paintChrome();
}

async function selectEnvironment(python) {
  if (python === store.state.active) return;
  try {
    await store.selectEnvironment(python);
    renderEnvPicker();
    await renderPage();
    refreshStatusBar();
  } catch (error) {
    toast(error.message, "danger");
    renderEnvPicker();
  }
}

function setBusy(value) {
  const flag = Boolean(value);
  busyCount += flag ? 1 : -1;
  if (busyCount < 0) busyCount = 0;
  syncPageActions();
}

function syncPageActions() {
  const blocked = busyCount > 0 || store.runningOperations().length > 0;
  for (const button of document.querySelectorAll("#page-actions button")) button.disabled = blocked;
}

function paintHead(page) {
  const meta = page.meta || {};
  $("page-eyebrow").textContent = meta.eyebrow || "Cokpyt";
  $("page-title").textContent = meta.title || "";
  $("page-sub").textContent = meta.subtitle || "";
  $("page-sub").hidden = !meta.subtitle;
  const actions = page.actions ? page.actions({ refresh: renderPage, setBusy }) : [];
  replace($("page-actions"), actions.flat().filter(Boolean));
  syncPageActions();
}

/* ── runtime events ───────────────────────────────────────────────────────── */

function payload(event) {
  const data = event && Object.prototype.hasOwnProperty.call(event, "data") ? event.data : event;
  return Array.isArray(data) ? data : [data];
}

function wireEvents() {
  Events.On("scan:progress", (event) => {
    const [message] = payload(event);
    scanMessage = message || "";
    if (store.state.envs.length === 0) renderEnvPicker();
  });

  Events.On("scan:done", async () => {
    if (!store.state.scanning) return;
    try {
      await store.bootstrap();
      renderEnvPicker();
      await store.packageCounts();
      await renderPage();
      refreshStatusBar();
      if (store.state.envs.length === 0) {
        toast("No Python environment found.", "warn");
      }
    } catch (error) {
      toast(error.message, "danger");
    }
  });

  Events.On("ops:changed", (event) => {
    const [list] = payload(event);
    store.applyOperations(list);
  });

  Events.On("op:done", async (event) => {
    const [op] = payload(event);
    if (!op) return;

    store.invalidate(op.env);

    if (op.failed) {
      toast(op.message || `${store.describeOperation(op)} failed.`, "danger");
    } else if (op.failures && op.failures.length > 0) {
      toast(`${op.failures.length} could not be changed. ${op.failures[0]}`, "warn");
    } else {
      toast(`${store.describeOperation(op)}. Done.`, "ok");
    }

    if (op.env === store.state.active) {
      await renderPage();
    }
    refreshStatusBar();
  });
}


boot();
