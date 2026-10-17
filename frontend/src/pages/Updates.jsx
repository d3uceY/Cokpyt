/* Updates — every package in the active environment with a newer version on
   PyPI. PyPI answers this, so the page can be slow and says so while it waits. */

import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useDialogs } from "../app/DialogProvider.jsx";
import { useRunning, useOutdated } from "../app/hooks.js";
import { useNotify } from "../app/ToastProvider.jsx";
import { PAGES } from "../app/routes.js";
import { PageShell } from "../components/PageShell.jsx";
import { envName, normalise } from "../lib/env.js";
import {
  ActionCell,
  Button,
  Empty,
  ErrorNote,
  Icon,
  Loading,
  OpsBanner,
  Panel,
  Table,
} from "../ui/components.jsx";

const page = PAGES.updates;

export default function Updates() {
  const { activeEnv, startOperation } = useApp();
  const python = activeEnv ? activeEnv.python : "";
  const outdated = useOutdated(python);
  const running = useRunning(python);
  const { confirm } = useDialogs();
  const notify = useNotify();

  const busy = running.length > 0;
  const upgradingAll = running.some((op) => op.kind === "upgrade" && op.total > 1);
  const list = outdated.data;

  async function upgradeAll() {
    const yes = await confirm({
      title: `Upgrade ${list.length} package${list.length === 1 ? "" : "s"}?`,
      text: `${activeEnv.label} is updated one package at a time. A major bump can break things.`,
      confirm: "Upgrade all",
    });
    if (!yes) return;

    await startOperation((id) => api.upgradeMany(id, python, list.map((item) => item.name)), {
      kind: "upgrade",
      env: python,
      name: list[0].name,
      target: `${list.length} packages`,
      total: list.length,
    });
  }

  let body;
  if (outdated.error && !list) {
    body = <ErrorNote>{outdated.error}</ErrorNote>;
  } else if (!list) {
    body = <Loading text="Asking PyPI…" />;
  } else if (list.length === 0) {
    body = (
      <Empty
        title="Everything is up to date"
        sub={`Nothing in ${activeEnv.label} is behind PyPI. Run “Check again” if that seems unlikely.`}
        icon="check"
      />
    );
  } else {
    body = (
      <Table
        head={[
          { class: "cell-flex", text: "Package" },
          { class: "cell-num", text: "Installed" },
          { class: "cell-num", text: "Latest" },
          { class: "cell-short", text: "Bump" },
          { class: "cell-right", text: "" },
        ]}
      >
        {list.map((item) => {
          const key = normalise(item.name);
          const op = running.find((entry) => entry.name && normalise(entry.name) === key) || null;

          return (
            <tr key={item.name}>
              <td className="cell-flex">
                <div className="cell-main">
                  <span className="cell-icon">
                    <Icon name="inventory_2" size={15} />
                  </span>
                  <span className="cell-name">{item.name}</span>
                </div>
              </td>
              <td className="mono cell-num">{item.version}</td>
              <td className="mono cell-num">{item.latestVersion}</td>
              <td className="cell-short">
                <span className="badge">{item.bumpType}</span>
              </td>
              <ActionCell>
                {item.changelogUrl ? (
                  <Button
                    className="btn btn-sm btn-ghost"
                    title={item.changelogUrl}
                    onClick={() =>
                      api.openURL(item.changelogUrl).catch((problem) => notify(problem.message, "danger"))
                    }
                  >
                    <Icon name="link" size={13} />
                  </Button>
                ) : null}
                <Button
                  className="btn btn-sm btn-ghost btn-primary"
                  busy={op?.kind === "upgrade"}
                  disabled={busy}
                  onClick={() =>
                    startOperation((id) => api.upgrade(id, python, item.name), {
                      kind: "upgrade",
                      env: python,
                      name: item.name,
                    })
                  }
                >
                  <Icon name="arrow_upward" size={13} />
                  Upgrade
                </Button>
              </ActionCell>
            </tr>
          );
        })}
      </Table>
    );
  }

  const toolbar =
    list && list.length > 0 ? (
      <div className="panel-toolbar">
        <span className="eyebrow">{list.length} behind</span>
        <span className="row">
          {["major", "minor", "patch"].map((kind) => (
            <span key={kind} className="eyebrow">
              {list.filter((item) => item.bumpType === kind).length} {kind}
            </span>
          ))}
        </span>
        <span className="panel-toolbar-spacer" />
        <Button className="btn btn-primary btn-sm" busy={upgradingAll} disabled={busy} onClick={upgradeAll}>
          Upgrade all
        </Button>
      </div>
    ) : null;

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle={`Packages behind PyPI in ${envName(activeEnv)}.`}
      actions={
        <Button
          busy={outdated.status === "loading" || outdated.status === "refreshing"}
          disabled={busy}
          onClick={outdated.reload}
        >
          <Icon name="refresh" size={14} />
          Check again
        </Button>
      }
    >
      <div className="stack">
        <OpsBanner operations={running} />
        <Panel title="Outdated" toolbar={toolbar}>
          {body}
        </Panel>
      </div>
    </PageShell>
  );
}
