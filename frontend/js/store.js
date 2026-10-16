/* Shared state and the data loaders every page uses.

   Deliberately small and deliberately cached, because two of these calls are
   genuinely expensive: `pip list --outdated` hits PyPI, and package counts walk
   site-packages for every environment on the machine. Both are cached per
   environment and invalidated when an operation could have changed them. */

import { api } from "./api.js";
import { output, toast } from "./ui.js";

export const state = {
  version: "",
  theme: "light",
  platform: "",
  active: "",
  envs: [],
  notes: [],
  counts: {},
  scanned: false,
  scanning: false,
};

const cache = {
  packages: new Map(), // interpreter path -> Package[]
  outdated: new Map(), // interpreter path -> Outdated[]
  history: null,
};

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* announce tells the shell that something the chrome displays has changed. */
export function announce() {
  for (const listener of listeners) listener();
}



export function envByPython(python) {
  return state.envs.find((env) => env.python === python) || null;
}

export function activeEnv() {
  return envByPython(state.active) || state.envs[0] || null;
}

export function activeLabel() {
  return envName(activeEnv()) || "no environment";
}

/* envName is how an environment is referred to in prose and in the picker.
   A runtime's label already carries its version ("Python 3.14.3"); a venv's
   does not ("tts/.venv"), so the version is only appended when it adds
   something. */
export function envName(env) {
  if (!env) return "";
  if (!env.version || env.label.includes(env.version)) return env.label;
  return `${env.label} (${env.version})`;
}

export async function bootstrap() {
  const info = await api.bootstrap();
  applyState(info);
  return info;
}

export async function rescan() {
  const info = await api.scan();
  applyState(info, { keepActive: true });
  return info;
}

function applyState(info, { keepActive = false } = {}) {
  state.version = info.version || state.version;
  state.platform = info.platform || state.platform;
  state.envs = info.envs || [];
  state.notes = info.notes || [];
  state.scanned = Boolean(info.scanned);
  state.scanning = Boolean(info.scanning);

  /* The Go config is the source of truth for the theme; localStorage only
     exists so the first paint does not flash the wrong one. */
  if (info.theme === "dark" || info.theme === "light") {
    state.theme = info.theme;
  }

  const stillThere = state.envs.some((env) => env.python === info.active);
  state.active = keepActive && stillThere ? state.active : info.active || "";

  /* Anything that no longer exists should not keep its cache entry alive. */
  const live = new Set(state.envs.map((env) => env.python));
  for (const key of cache.packages.keys()) if (!live.has(key)) cache.packages.delete(key);
  for (const key of cache.outdated.keys()) if (!live.has(key)) cache.outdated.delete(key);
}

export async function selectEnvironment(python) {
  await api.selectEnvironment(python);
  state.active = python;
  announce();
}

export async function packageCounts() {
  state.counts = (await api.packageCounts()) || {};
  announce();
  return state.counts;
}

export function totalPackages() {
  return Object.values(state.counts).reduce((sum, n) => sum + n, 0);
}

export function environmentsWithPackages() {
  return state.envs.filter((env) => (state.counts[env.python] || 0) > 0).length;
}

/* ── packages ─────────────────────────────────────────────────────────────── */

export async function packages(python, { force = false } = {}) {
  if (!python) return [];
  if (!force && cache.packages.has(python)) return cache.packages.get(python);
  const list = (await api.packages(python)) || [];
  cache.packages.set(python, list);
  return list;
}

export async function outdated(python, { force = false } = {}) {
  if (!python) return [];
  if (!force && cache.outdated.has(python)) return cache.outdated.get(python);
  const list = (await api.outdated(python)) || [];
  cache.outdated.set(python, list);
  return list;
}

export function outdatedMap(python) {
  const map = new Map();
  for (const item of cache.outdated.get(python) || []) {
    map.set(normalise(item.name), item);
  }
  return map;
}

/* invalidate is called after anything that changes what is installed. */
export function invalidate(python) {
  cache.packages.delete(python);
  cache.outdated.delete(python);
  cache.history = null;
}

/* operate runs one pip action: it opens the console so pip's own output is
   visible while it works, then refreshes whatever the action invalidated. */
export async function operate(python, label, work) {
  output.show();
  output.progress(`${label}…`);
  try {
    await work();
    invalidate(python);
    toast(`${label}. Done.`, "ok");
    return true;
  } catch (error) {
    invalidate(python);
    toast(error.message, "danger");
    return false;
  } finally {
    output.progress("");
  }
}

export async function history({ force = false } = {}) {
  if (!force && cache.history) return cache.history;
  cache.history = (await api.history()) || [];
  return cache.history;
}

/* pip treats "PyYAML" and "pyyaml" as the same project. PEP 503 collapses a
   run of -_. to a single dash, so this has to be a run replacement and not a
   character replacement: "zope..if" is "zope-if", not "zope--if". */
export function normalise(name) {
  return String(name)
    .toLowerCase()
    .replace(/[-_.]+/g, "-");
}

/* ── theme ────────────────────────────────────────────────────────────────── */

export function applyTheme(theme, { persist = true } = {}) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  try {
    localStorage.setItem("cokpyt.theme", state.theme);
  } catch {
    /* A private-mode webview cannot write this. The theme still applies. */
  }
  if (persist) api.setTheme(state.theme).catch(() => {});
  announce();
}
