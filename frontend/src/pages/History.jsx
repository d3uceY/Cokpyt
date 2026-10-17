/* History — every install, upgrade and uninstall this app has run.

   This is a record of what Cokpyt did, not of what the environment contains:
   a package installed from a terminal will not appear here. Saying so beats
   letting it read as a complete audit trail. */

import { useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useDialogs } from "../app/DialogProvider.jsx";
import { useHistory } from "../app/hooks.js";
import { useNotify } from "../app/ToastProvider.jsx";
import { PAGES } from "../app/routes.js";
import { PageShell } from "../components/PageShell.jsx";
import { relativeTime } from "../lib/format.js";
import { Button, Empty, ErrorNote, Icon, Loading, Note, Panel, Table } from "../ui/components.jsx";

const page = PAGES.history;
const FILTERS = ["all", "install", "upgrade", "uninstall"];

export default function History() {
  const { invalidate } = useApp();
  const history = useHistory();
  const { confirm } = useDialogs();
  const notify = useNotify();
  const [filter, setFilter] = useState("all");

  const all = history.data || [];
  const filtered = filter === "all" ? all : all.filter((entry) => entry.action === filter);

  async function clear() {
    const yes = await confirm({
      title: "Clear the whole history?",
      text: `${all.length} entries will be deleted. The packages themselves are untouched.`,
      confirm: "Clear",
      danger: true,
    });
    if (!yes) return;

    try {
      await api.clearHistory();
      invalidate();
      notify("History cleared.", "ok");
    } catch (problem) {
      notify(problem.message, "danger");
    }
  }

  const actions = [
    <span key="tabs" className="segmented">
      {FILTERS.map((kind) => (
        <button key={kind} type="button" aria-pressed={kind === filter} onClick={() => setFilter(kind)}>
          {kind === "all"
            ? `All ${all.length}`
            : `${kind} ${all.filter((entry) => entry.action === kind).length}`}
        </button>
      ))}
    </span>,
    <span className="panel-toolbar-spacer" key="spacer" />,
    <Button
      key="export"
      className="btn btn-sm"
      disabled={filtered.length === 0}
      onClick={() => exportCSV(filtered)}
    >
      <Icon name="download" size={13} />
      Export CSV
    </Button>,
    <Button key="clear" className="btn btn-sm btn-danger" disabled={all.length === 0} onClick={clear}>
      Clear
    </Button>,
  ];

  let body;
  if (history.error) {
    body = <ErrorNote>{history.error}</ErrorNote>;
  } else if (!history.data) {
    body = <Loading />;
  } else if (filtered.length === 0) {
    body = (
      <Empty
        title={all.length === 0 ? "Nothing recorded yet" : `No ${filter} entries`}
        sub="Operations run from Cokpyt are recorded here as they finish."
        icon="history"
      />
    );
  } else {
    body = (
      <Table
        head={[
          { class: "cell-flex", text: "Package" },
          { class: "cell-num", text: "Version" },
          { class: "cell-short", text: "Action" },
          { class: "cell-short", text: "Result" },
          { class: "cell-num", text: "When" },
        ]}
      >
        {filtered.map((entry, index) => (
          <tr key={`${entry.timestamp}-${entry.package}-${index}`} title={entry.command}>
            <td className="cell-name">{entry.package}</td>
            <td className="mono cell-num">{entry.version || "—"}</td>
            <td className="muted cell-short">{entry.action}</td>
            <td className="cell-short">
              <span className={`badge ${entry.status === "success" ? "badge-ok" : "badge-danger"}`}>
                {entry.status}
              </span>
            </td>
            <td className="muted cell-num" title={entry.timestamp}>
              {relativeTime(entry.timestamp)}
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  const panel = (
    <Panel title="Activity" actions={actions}>
      {body}
    </Panel>
  );

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle="Installs, upgrades and uninstalls run from Cokpyt, newest first."
    >
      {history.data && filtered.length === 0 ? (
        <div className="stack">
          {panel}
          <Note tone="info">
            Only actions run from Cokpyt are listed. Terminal commands are not recorded.
          </Note>
        </div>
      ) : (
        panel
      )}
    </PageShell>
  );
}

/* exportCSV builds the file in the page and hands it to the browser. No round
   trip to Go for something the page already holds. */
function exportCSV(entries) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [["timestamp", "action", "package", "version", "status", "command"].join(",")];
  for (const entry of entries) {
    lines.push(
      [entry.timestamp, entry.action, entry.package, entry.version, entry.status, entry.command]
        .map(quote)
        .join(","),
    );
  }

  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `cokpyt-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
