/* Cleanup — reclaiming disk space from pip's own leftovers.

   The sizes are measured before anything is deleted, so "Run cleanup" is never
   a leap of faith. The download cache is pip-global and is counted once. */

import { useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useDialogs } from "../app/DialogProvider.jsx";
import { useRunning } from "../app/hooks.js";
import { useResource } from "../app/useResource.js";
import { PAGES } from "../app/routes.js";
import { PageShell } from "../components/PageShell.jsx";
import { envName } from "../lib/env.js";
import { formatBytes, plural } from "../lib/format.js";
import { Button, ErrorNote, Loading, OpsBanner, Panel } from "../ui/components.jsx";

const page = PAGES.cleanup;

const loadReclaimable = (python) => api.cleanupScan(python);

export default function Cleanup() {
  const { state, activeEnv, startOperation } = useApp();
  const python = activeEnv ? activeEnv.python : "";
  const reclaimable = useResource(loadReclaimable, python, state.revision);
  const running = useRunning(python);
  const { confirm } = useDialogs();

  const [selected, setSelected] = useState(() => new Set());

  const busy = running.length > 0;
  const categories = reclaimable.data || [];
  const selectedBytes = categories
    .filter((category) => selected.has(category.kind))
    .reduce((sum, category) => sum + category.size, 0);
  const totalBytes = categories.reduce((sum, category) => sum + category.size, 0);

  function toggle(kind) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  async function run() {
    const bytes = categories
      .filter((category) => selected.has(category.kind))
      .reduce((sum, category) => sum + category.size, 0);

    const yes = await confirm({
      title: "Run cleanup?",
      text: `${formatBytes(bytes)} will be freed from ${activeEnv.label}. Deleted caches are re-downloaded when needed.`,
      confirm: "Clean up",
      danger: true,
    });
    if (!yes) return;

    const kinds = [...selected];
    await startOperation((id) => api.cleanupRun(id, python, kinds), {
      kind: "cleanup",
      env: python,
      target: "pip leftovers",
    });
  }

  let body;
  if (reclaimable.error) {
    body = <ErrorNote>{reclaimable.error}</ErrorNote>;
  } else if (!reclaimable.data) {
    body = <Loading text="Measuring…" />;
  } else {
    body = (
      <div>
        {categories.map((category) => (
          <div className="check-line" key={category.kind}>
            <input
              className="checkbox"
              type="checkbox"
              disabled={category.size === 0}
              aria-label={category.label}
              checked={selected.has(category.kind)}
              onChange={() => toggle(category.kind)}
            />
            <div className="check-line-body">
              <div className="row">
                <span className="cell-name">{category.label}</span>
                <span className="badge">{formatBytes(category.size)}</span>
              </div>
              <div className="check-line-detail mono truncate" title={category.path || ""}>
                {explain(category)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle={`Leftovers in ${envName(activeEnv)}.`}
    >
      <div className="stack">
        <OpsBanner operations={running} />
        <Panel
          title="Reclaimable"
          actions={[
            <span className="eyebrow" key="total">
              {selected.size ? `${formatBytes(selectedBytes)} selected` : `${formatBytes(totalBytes)} available`}
            </span>,
            <Button
              key="run"
              className="btn btn-primary"
              busy={running.some((op) => op.kind === "cleanup")}
              disabled={selectedBytes === 0 || busy}
              onClick={run}
            >
              Run cleanup
            </Button>,
          ]}
        >
          {body}
        </Panel>
      </div>
    </PageShell>
  );
}

function explain(category) {
  if (category.size === 0) {
    return category.kind === "cache" ? "Nothing cached yet." : "Nothing to remove in this environment.";
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
