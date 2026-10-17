import { useState } from "react";
import { NAV } from "../app/routes.js";
import { useApp } from "../app/AppProvider.jsx";
import { useNotify } from "../app/ToastProvider.jsx";
import { envName } from "../lib/env.js";
import { Button, Icon } from "../ui/components.jsx";

export function Sidebar({ path }) {
  const { state, activeEnv, selectEnvironment, setTheme, scan } = useApp();
  const notify = useNotify();
  const [rescanning, setRescanning] = useState(false);

  async function rescan() {
    setRescanning(true);
    try {
      const info = await scan();
      notify(`Found ${info.envs.length} environments.`, "ok");
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setRescanning(false);
    }
  }

  async function pick(python) {
    if (!python || python === state.active) return;
    try {
      await selectEnvironment(python);
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  const scanningOnly = state.scanning && state.envs.length === 0;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="/assets/logo-light.png" alt="" data-logo="light" />
        <img className="brand-logo" src="/assets/logo-dark.png" alt="" data-logo="dark" />
        <div className="brand-text">
          <span className="brand-name">Cokpyt</span>
          <span className="brand-sub">pip manager</span>
        </div>
      </div>

      <div className="env-picker">
        <span className="eyebrow">Environment</span>
        <select
          className="select"
          aria-label="Active environment"
          value={activeEnv ? activeEnv.python : ""}
          disabled={state.envs.length === 0}
          onChange={(event) => pick(event.target.value)}
        >
          {scanningOnly ? (
            <option value="">{state.scanMessage || "Looking for environments…"}</option>
          ) : state.envs.length === 0 ? (
            <option value="">None found</option>
          ) : (
            state.envs.map((env) => (
              <option key={env.python} value={env.python}>
                {envName(env)}
              </option>
            ))
          )}
        </select>

        <Button
          id="env-rescan"
          className="btn btn-ghost btn-sm"
          busy={rescanning}
          title="Look for environments again"
          onClick={rescan}
        >
          <Icon name="refresh" size={14} />
          <span>Rescan</span>
        </Button>
      </div>

      <nav className="nav" aria-label="Sections">
        {NAV.map((entry, index) =>
          entry.path ? (
            <a
              key={entry.path}
              className="nav-item"
              href={`#${entry.path}`}
              title={entry.label}
              aria-label={entry.label}
              aria-current={entry.path === path ? "page" : undefined}
            >
              <Icon name={entry.icon} size={19} />
              <span>{entry.label}</span>
            </a>
          ) : (
            <div key={`label-${index}`} className="nav-label eyebrow">
              {entry.label}
            </div>
          ),
        )}
      </nav>

      <div className="sidebar-foot">
        <span
          className="status-dot"
          data-state={activeEnv ? "ok" : "unknown"}
          title={activeEnv ? activeEnv.python : "No environment selected"}
        />
        <span className="eyebrow">{state.version}</span>
        <button
          className="icon-btn"
          type="button"
          aria-label="Switch theme"
          title={state.theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={() => setTheme(state.theme === "dark" ? "light" : "dark")}
        >
          <Icon name={state.theme === "dark" ? "light_mode" : "dark_mode"} size={18} />
        </button>
      </div>
    </aside>
  );
}
