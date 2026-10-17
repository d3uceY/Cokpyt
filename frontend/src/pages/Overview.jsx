/* Overview — the machine at a glance.

   The headline numbers are deliberately about environments rather than
   packages. "39 installed packages" is a true sentence about one interpreter
   and a misleading sentence about the machine, and that is the confusion this
   app exists to remove. */

import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useHistory, useOutdated } from "../app/hooks.js";
import { PAGES } from "../app/routes.js";
import { EnvironmentsTable } from "../components/EnvironmentsTable.jsx";
import { PageShell } from "../components/PageShell.jsx";
import { environmentsWithPackages, envName, totalPackages } from "../lib/env.js";
import {
  Empty,
  ErrorNote,
  Icon,
  Loading,
  Note,
  Panel,
  ScanningBlock,
  StatBlock,
  Table,
} from "../ui/components.jsx";

const page = PAGES.overview;

export default function Overview() {
  const { state, activeEnv } = useApp();
  const outdated = useOutdated(activeEnv ? activeEnv.python : "");
  const history = useHistory();
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .introSeen()
      .then((seen) => {
        if (alive) setIntro(!seen);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  if (state.scanning && state.envs.length === 0) {
    return (
      <PageShell
        eyebrow={page.eyebrow}
        title={page.title}
        subtitle="Environments, packages, and recent changes."
      >
        <ScanningBlock message={state.scanMessage} />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle="Environments, packages, and recent changes."
    >
      <div className="stack">
        {intro ? <IntroNote onDismiss={() => setIntro(false)} /> : null}

        <div className="stats">
          <StatBlock
            label="Environments"
            value={String(state.envs.length)}
            note={`${environmentsWithPackages(state)} hold packages`}
            icon="hub"
          />
          <StatBlock
            label="Packages in total"
            value={String(totalPackages(state.counts))}
            note="across all environments"
            icon="inventory_2"
          />
          <OutdatedStat resource={outdated} env={activeEnv} />
          <StatBlock
            label="Active interpreter"
            value={activeEnv ? activeEnv.version || "unknown" : "none"}
            note={activeEnv ? activeEnv.label : "no environment selected"}
            icon="code"
            small
          />
        </div>

        <Panel
          title="Environments"
          actions={
            <a className="link-btn" href="#/environments">
              Manage
            </a>
          }
        >
          <EnvironmentsTable />
        </Panel>

        <Panel
          title="Recent activity"
          actions={
            <a className="link-btn" href="#/history">
              All history
            </a>
          }
        >
          <Activity resource={history} />
        </Panel>
      </div>
    </PageShell>
  );
}

/* The first-run note replaces what used to be a five-step product tour: one
   paragraph that says the thing the app is for, and a dismiss button. */
function IntroNote({ onDismiss }) {
  return (
    <Note tone="info">
      Cokpyt runs pip against any Python environment on this machine. Switch with the sidebar picker;
      every page follows.
      <button
        className="link-btn"
        type="button"
        style={{ marginLeft: 8 }}
        onClick={() => {
          onDismiss();
          api.markIntroSeen().catch(() => {});
        }}
      >
        Got it
      </button>
    </Note>
  );
}

function OutdatedStat({ resource, env }) {
  let value = "—";
  let note = "checking PyPI…";
  let tone = "muted";

  if (!env) {
    value = "0";
    note = "no environment selected";
  } else if (resource.status === "error" && !resource.data) {
    value = "?";
    note = "PyPI unreachable";
    tone = "warn";
  } else if (resource.data) {
    value = String(resource.data.length);
    if (resource.data.length) {
      note = `${resource.data.length} waiting in ${envName(env)}`;
      tone = "warn";
    } else {
      note = `${envName(env)} is up to date`;
      tone = "ok";
    }
  }

  return (
    <div className="stat">
      <div className="stat-head">
        <span className="eyebrow">Updates available</span>
        <Icon name="update" size={16} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note" data-tone={tone}>
        {note}
      </div>
    </div>
  );
}

function Activity({ resource }) {
  if (resource.error) return <ErrorNote>{resource.error}</ErrorNote>;
  if (!resource.data) return <Loading text="Loading history…" />;

  if (resource.data.length === 0) {
    return (
      <Empty
        title="Nothing yet"
        sub="Installs, upgrades and uninstalls run from Cokpyt show up here."
        icon="history"
      />
    );
  }

  return (
    <Table
      head={[
        { class: "cell-flex", text: "Package" },
        { class: "cell-num", text: "Version" },
        { class: "cell-short", text: "Action" },
        { class: "cell-short", text: "Status" },
        { class: "cell-num", text: "When" },
      ]}
    >
      {resource.data.slice(0, 6).map((entry, index) => (
        <tr key={`${entry.timestamp}-${entry.package}-${index}`}>
          <td className="cell-name">{entry.package}</td>
          <td className="mono cell-num">{entry.version || "—"}</td>
          <td className="muted cell-short">{entry.action}</td>
          <td className="cell-short">
            <span className={`badge ${entry.status === "success" ? "badge-ok" : "badge-danger"}`}>
              {entry.status}
            </span>
          </td>
          <td className="muted cell-num">{entry.timestamp}</td>
        </tr>
      ))}
    </Table>
  );
}
