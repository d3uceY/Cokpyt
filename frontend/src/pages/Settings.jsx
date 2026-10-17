/* Settings — appearance, updates, and where the app keeps its files. */

import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useResource } from "../app/useResource.js";
import { useNotify } from "../app/ToastProvider.jsx";
import { PAGES } from "../app/routes.js";
import { PageShell } from "../components/PageShell.jsx";
import { Button, Icon, Panel } from "../ui/components.jsx";

const page = PAGES.settings;

const loadEnvironmentInfo = (python) => api.environmentInfo(python);

export default function Settings() {
  const { state, activeEnv, setTheme, invalidate } = useApp();
  const info = useResource(loadEnvironmentInfo, activeEnv ? activeEnv.python : "", state.revision);

  return (
    <PageShell eyebrow={page.eyebrow} title={page.title}>
      <div className="stack">
        <Appearance theme={state.theme} onTheme={setTheme} />
        <About version={state.version} platform={state.platform} environments={state.envs.length} />
        <EnvironmentPanel env={activeEnv} info={info.data} />
        <StoredData onIntroReset={() => invalidate(activeEnv ? activeEnv.python : "")} />
      </div>
    </PageShell>
  );
}

function Appearance({ theme, onTheme }) {
  return (
    <Panel title="Appearance">
      <div className="panel-body stack">
        <div className="row">
          <span className="eyebrow grow">Theme</span>
          <div className="segmented">
            {["light", "dark"].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                onClick={() => onTheme(value)}
              >
                {value === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Remembered between runs.
        </p>
      </div>
    </Panel>
  );
}

function About({ version, platform, environments }) {
  const notify = useNotify();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  async function check() {
    setChecking(true);
    try {
      setResult(await api.checkForUpdate());
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setChecking(false);
    }
  }

  let note = null;
  if (result && result.error) {
    note = <span className="muted" style={{ fontSize: 12 }}>GitHub unreachable: {result.error}</span>;
  } else if (result && result.hasUpdate) {
    note = (
      <span className="muted" style={{ fontSize: 12 }}>
        Version {result.latestVersion} is available.{" "}
        <button
          className="link-btn"
          type="button"
          onClick={() => api.openURL(result.releaseURL).catch((error) => notify(error.message, "danger"))}
        >
          Open release
        </button>
      </span>
    );
  } else if (result) {
    note = <span className="muted" style={{ fontSize: 12 }}>Up to date ({version}).</span>;
  }

  return (
    <Panel title="About">
      <div className="panel-body stack">
        <dl className="kv">
          <dt>Version</dt>
          <dd>{version}</dd>
          <dt>Platform</dt>
          <dd>
            {platform} · {environments} environments
          </dd>
        </dl>
        <div className="row">
          {note}
          <span className="grow" />
          <Button className="btn btn-sm" busy={checking} onClick={check}>
            Check for updates
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function EnvironmentPanel({ env, info }) {
  const notify = useNotify();

  if (!env) {
    return (
      <Panel title="Active environment">
        <div className="panel-body muted">None found.</div>
      </Panel>
    );
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

  return (
    <Panel title="Active environment">
      <div className="panel-body stack">
        <dl className="kv">
          {rows.flatMap(([key, value]) => [
            <dt key={`${key}-term`}>{key}</dt>,
            <dd key={`${key}-value`}>{value || "—"}</dd>,
          ])}
        </dl>
        <div className="row">
          <Button
            className="btn btn-sm"
            onClick={() => api.revealPath(env.root).catch((error) => notify(error.message, "danger"))}
          >
            <Icon name="folder_open" size={13} />
            Open folder
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function StoredData({ onIntroReset }) {
  const notify = useNotify();

  return (
    <Panel title="Stored data">
      <div className="panel-body stack">
        <p className="muted" style={{ fontSize: 12 }}>
          A config file, the operation history, and a copy of the PyPI name index. Nothing about your
          packages is copied anywhere.
        </p>
        <IndexRow />
        <div className="row">
          <Button
            className="btn btn-sm"
            onClick={async () => {
              await api.markIntroSeen().catch(() => {});
              onIntroReset();
              notify("The first-run note will show again on Overview.", "ok");
            }}
          >
            Show the intro again
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* The name index is the one download Cokpyt does for itself: every project on
   PyPI, a few hundred thousand names. It is stored on disk, so opening the app
   again reads the file instead of fetching it again. */
function IndexRow() {
  const notify = useNotify();
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState("");
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .indexStatus()
      .then((found) => {
        if (alive) setStatus(found);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  async function refetch() {
    setRefetching(true);
    setProgress("Downloading every name on PyPI. About a minute…");
    try {
      setStatus(await api.refreshIndex());
      notify("PyPI index refreshed.", "ok");
    } catch (error) {
      notify(error.message, "danger");
      setStatus(await api.indexStatus().catch(() => null));
    } finally {
      setProgress("");
      setRefetching(false);
    }
  }

  const text = status
    ? status.fetched
      ? `PyPI index: ${status.names.toLocaleString()} names, fetched ${status.fetched}`
      : "PyPI index: not downloaded. The first search fetches it."
    : "";

  return (
    <div className="row">
      <span className="muted" style={{ fontSize: 12 }}>
        {progress || text}
      </span>
      <span className="grow" />
      <Button className="btn btn-sm" busy={refetching} onClick={refetch}>
        <Icon name="sync" size={13} />
        Refetch the index
      </Button>
    </div>
  );
}
