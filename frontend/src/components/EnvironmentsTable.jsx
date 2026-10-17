import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useNotify } from "../app/ToastProvider.jsx";
import { shortPath } from "../lib/format.js";
import { ActionCell, Button, Empty, Icon, ScanningBlock, Table } from "../ui/components.jsx";

const KIND_LABEL = {
  launcher: "launcher",
  standalone: "standalone",
  venv: "venv",
  conda: "conda",
};

const KIND_HINT = {
  launcher: "Tracked by the Python Install Manager. `py -0p` lists these.",
  standalone: "Found in an install directory. `py` does not know about it.",
  venv: "Virtual environment. Its packages appear in no other list.",
  conda: "Conda environment. Marked by conda-meta, not pyvenv.cfg.",
};

/* environmentsTable is shared with the Overview page. */
export function EnvironmentsTable({ expand = false }) {
  const { state, selectEnvironment } = useApp();
  const notify = useNotify();

  if (state.scanning && state.envs.length === 0) {
    return <ScanningBlock message={state.scanMessage} />;
  }

  if (state.envs.length === 0) {
    return (
      <Empty
        title="No Python environment found"
        sub="Install Python, or use “Scan a folder” to point Cokpyt at a project that has a venv."
        icon="hub"
      />
    );
  }

  async function select(python) {
    try {
      await selectEnvironment(python);
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  const head = expand
    ? [
        { class: "cell-flex", text: "Environment" },
        { class: "cell-short", text: "Kind" },
        { class: "cell-num", text: "Python" },
        { class: "cell-num", text: "Packages" },
        { class: "cell-flex", text: "Folder" },
        { class: "cell-right", text: "" },
      ]
    : [
        { class: "cell-flex", text: "Environment" },
        { class: "cell-short", text: "Kind" },
        { class: "cell-num", text: "Python" },
        { class: "cell-num", text: "Packages" },
        { class: "cell-right", text: "" },
      ];

  return (
    <Table head={head}>
      {state.envs.map((env) => {
        const isActive = env.python === state.active;
        const count = state.counts[env.python];

        return (
          <tr
            key={env.python}
            data-selectable="true"
            data-active={String(isActive)}
            title={`Use ${env.python}`}
            onClick={() => select(env.python)}
          >
            <td>
              <div className="cell-main">
                <span className="cell-icon">
                  <Icon name="hub" size={15} />
                </span>
                <span className="cell-stack">
                  <span className="cell-main">
                    <span className="cell-name">{env.label}</span>
                    {env.default ? <span className="badge">default</span> : null}
                    {isActive ? <span className="badge badge-strong">active</span> : null}
                  </span>
                  <span className="cell-desc mono truncate" title={env.python}>
                    {shortPath(env.python, 4)}
                  </span>
                </span>
              </div>
            </td>
            <td className="cell-short">
              <span className="badge" title={KIND_HINT[env.kind] || ""}>
                {KIND_LABEL[env.kind] || env.kind}
              </span>
            </td>
            <td className="cell-num mono">{env.version || "unknown"}</td>
            <td className="cell-num">
              {count === undefined ? <span className="spinner" /> : <span>{String(count)}</span>}
            </td>
            {expand ? (
              <td className="cell-flex mono truncate" title={env.root}>
                {env.root}
              </td>
            ) : null}
            <ActionCell>
              <Button
                className="btn btn-sm btn-ghost"
                title="Open the environment folder"
                onClick={(event) => {
                  event.stopPropagation();
                  api.revealPath(env.root).catch((error) => notify(error.message, "danger"));
                }}
              >
                <Icon name="folder_open" size={13} />
                Open
              </Button>
              {isActive ? null : (
                <Button
                  className="btn btn-sm btn-ghost btn-primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    select(env.python);
                  }}
                >
                  <Icon name="check" size={13} />
                  Use
                </Button>
              )}
            </ActionCell>
          </tr>
        );
      })}
    </Table>
  );
}
