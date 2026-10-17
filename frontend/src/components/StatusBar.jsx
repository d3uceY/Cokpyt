import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useRunning } from "../app/hooks.js";
import { envName, totalPackages } from "../lib/env.js";
import { describeOperation } from "../lib/operations.js";
import { Icon } from "../ui/components.jsx";

export function StatusBar() {
  const { state, activeEnv } = useApp();
  const running = useRunning();
  const [pip, setPip] = useState({ status: "none", version: "" });

  useEffect(() => {
    if (!activeEnv) {
      setPip({ status: "none", version: "" });
      return undefined;
    }

    let alive = true;
    setPip({ status: "loading", version: "" });
    api
      .environmentInfo(activeEnv.python)
      .then((info) => {
        if (alive) setPip({ status: "ok", version: info.pipVersion || "" });
      })
      .catch(() => {
        if (alive) setPip({ status: "error", version: "" });
      });

    return () => {
      alive = false;
    };
  }, [activeEnv ? activeEnv.python : ""]);

  if (state.scanning && state.envs.length === 0) {
    return (
      <footer className="statusbar">
        <span className="statusbar-item">
          <span className="spinner" />
          Scanning for environments
        </span>
        <span className="statusbar-right">{state.scanMessage}</span>
      </footer>
    );
  }

  return (
    <footer className="statusbar">
      <span className="statusbar-item">
        {state.envs.length} environments · {totalPackages(state.counts)} packages
      </span>

      {activeEnv && pip.status === "ok" ? (
        <span className="statusbar-item">{pip.version ? `pip ${pip.version}` : "no pip"}</span>
      ) : null}
      {activeEnv && pip.status === "error" ? (
        <span className="statusbar-item">environment will not run</span>
      ) : null}

      {running.length > 0 ? (
        <span className="statusbar-item">
          <span className="spinner" />
          <span>{describeOperation(running[0])}</span>
          {running.length > 1 ? <span className="eyebrow">+{running.length - 1} more</span> : null}
        </span>
      ) : null}

      <span className="statusbar-right">
        <Icon name="hub" size={13} />
        <span>{envName(activeEnv) || "no environment"}</span>
      </span>
    </footer>
  );
}
