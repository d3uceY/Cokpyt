/* Packages — what is installed in the active environment, and the buttons that
   change it.

   `pip list --outdated` is deliberately not part of loading this page. It
   queries PyPI and can take half a minute, so the list renders immediately and
   the "latest" column fills in behind it. */

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useDialogs } from "../app/DialogProvider.jsx";
import { useRunning, useOutdated, usePackages } from "../app/hooks.js";
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

const page = PAGES.packages;
const RENDER_LIMIT = 400;

export default function Packages() {
  const { activeEnv, startOperation } = useApp();
  const python = activeEnv ? activeEnv.python : "";
  const packages = usePackages(python);
  const outdated = useOutdated(python);
  const running = useRunning(python);
  const { confirm, prompt, choose } = useDialogs();
  const notify = useNotify();

  const [filter, setFilter] = useState("");
  const [selection, setSelection] = useState(() => new Set());
  const selectAll = useRef(null);

  /* A different interpreter is a different list; a refresh of the same one is
     not, and keeps what is on screen until the new answer arrives. */
  useEffect(() => {
    setSelection(new Set());
    setFilter("");
  }, [python]);

  const busy = running.length > 0;
  const installBusy = running.some((op) => op.kind === "install" && (!op.name || op.target === op.name));

  const latest = useMemo(() => {
    const map = new Map();
    for (const item of outdated.data || []) map.set(normalise(item.name), item);
    return map;
  }, [outdated.data]);

  const needle = filter.trim().toLowerCase();
  const all = packages.data || [];
  const visible = needle
    ? all.filter((pkg) => `${pkg.name} ${pkg.summary || ""}`.toLowerCase().includes(needle))
    : all;

  const shown = visible.slice(0, RENDER_LIMIT);
  const selectedVisible = shown.filter((pkg) => selection.has(pkg.name)).length;

  useEffect(() => {
    if (!selectAll.current) return;
    selectAll.current.indeterminate = selectedVisible > 0 && selectedVisible < shown.length;
  }, [selectedVisible, shown.length]);

  function toggle(name) {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll(checked) {
    setSelection((current) => {
      const next = new Set(current);
      for (const pkg of shown) {
        if (checked) next.add(pkg.name);
        else next.delete(pkg.name);
      }
      return next;
    });
  }

  async function install() {
    const spec = await prompt({
      title: "Install a package",
      label: "Name, pinned version, path, or URL.",
      placeholder: "requests==2.32.0",
    });
    if (!spec) return;

    await startOperation((id) => api.install(id, python, spec), {
      kind: "install",
      env: python,
      name: spec,
    });
  }

  async function chooseVersion(pkg) {
    const version = await choose({
      title: `Choose a version of ${pkg.name}`,
      label: "Versions pip can install here.",
      confirm: "Install",
      load: async () => {
        const versions = (await api.versions(python, pkg.name)) || [];
        return versions.map((value) => ({
          value,
          label: value,
          selected: value === pkg.version,
          badge: value === pkg.version ? "installed" : null,
        }));
      },
    });
    if (!version || version === pkg.version) return;

    await startOperation((id) => api.installVersion(id, python, pkg.name, version), {
      kind: "install",
      env: python,
      name: pkg.name,
      target: `${pkg.name} ${version}`,
    });
  }

  async function uninstall(pkg) {
    const yes = await confirm({
      title: `Uninstall ${pkg.name}?`,
      text: `${pkg.version} will be removed from ${activeEnv.label}. Anything depending on it will break.`,
      confirm: "Uninstall",
      danger: true,
    });
    if (!yes) return;

    await startOperation((id) => api.uninstall(id, python, pkg.name), {
      kind: "uninstall",
      env: python,
      name: pkg.name,
    });
  }

  async function uninstallSelected() {
    const names = [...selection];
    if (names.length === 0) return;

    const yes = await confirm({
      title: `Uninstall ${names.length} package${names.length === 1 ? "" : "s"}?`,
      text: `They will be removed from ${activeEnv.label}. Anything depending on them will break.`,
      confirm: "Uninstall all",
      danger: true,
    });
    if (!yes) return;

    await startOperation((id) => api.uninstallMany(id, python, names), {
      kind: "uninstall",
      env: python,
      name: names[0],
      target: names.length === 1 ? names[0] : `${names.length} packages`,
      total: names.length,
    });

    setSelection(new Set());
  }

  function latestCell(pkg) {
    if (outdated.status === "error" && !outdated.data) {
      return <span className="mono muted">unavailable</span>;
    }
    if (!outdated.data) return <span className="mono muted">…</span>;

    const item = latest.get(normalise(pkg.name));
    if (!item) return <span className="mono muted">up to date</span>;

    /* One tone for "there is a newer version". How big the jump is belongs in
       a word, and the Updates page has a column for exactly that. */
    return (
      <span className="badge badge-warn" title={`${item.bumpType} update`}>
        {item.latestVersion}
      </span>
    );
  }

  const countLabel = !packages.data
    ? ""
    : visible.length > RENDER_LIMIT
      ? `first ${RENDER_LIMIT} of ${visible.length}`
      : `${visible.length} of ${packages.data.length}`;

  const toolbar = (
    <div className="panel-toolbar">
      {/* The header row is gone once the table has folded into cards, and with
          it the only way to select every row, so the same control is offered
          here for that layout. */}
      <label className="narrow-only eyebrow" title="Select every visible package">
        <input
          className="checkbox"
          type="checkbox"
          aria-label="Select every visible package"
          onChange={(event) => toggleAll(event.target.checked)}
        />
        All
      </label>

      <div className="field grow" style={{ maxWidth: 430 }}>
        <span className="field-icon">
          <Icon name="search" size={16} />
        </span>
        <input
          className="input"
          type="search"
          placeholder="Filter by name or description…"
          spellCheck="false"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      <span className="eyebrow">{countLabel}</span>

      <Button
        className="btn btn-sm btn-danger"
        hidden={selection.size === 0}
        disabled={busy}
        onClick={uninstallSelected}
      >
        Uninstall {selection.size} selected
      </Button>
    </div>
  );

  let body;
  if (packages.error) {
    body = <ErrorNote>{packages.error}</ErrorNote>;
  } else if (!packages.data) {
    body = <Loading />;
  } else if (packages.data.length === 0) {
    body = <Empty title="No packages in this environment" sub="Use Install to add the first one." />;
  } else {
    body = (
      <Table
        head={[
          {
            class: "cell-tight",
            text: (
              <input
                ref={selectAll}
                className="checkbox"
                type="checkbox"
                aria-label="Select every visible package"
                onChange={(event) => toggleAll(event.target.checked)}
              />
            ),
          },
          { class: "cell-flex", text: "Package" },
          { class: "cell-num", text: "Installed" },
          { class: "cell-num", text: "Latest" },
          { class: "cell-right", text: "" },
        ]}
      >
        {shown.map((pkg) => {
          const key = normalise(pkg.name);
          const op = running.find((item) => item.name && normalise(item.name) === key) || null;

          return (
            <tr key={pkg.name}>
              <td className="cell-tight">
                <input
                  className="checkbox"
                  type="checkbox"
                  aria-label={`Select ${pkg.name}`}
                  checked={selection.has(pkg.name)}
                  onChange={() => toggle(pkg.name)}
                />
              </td>
              <td className="cell-flex cell-title">
                <div className="cell-main">
                  <span className="cell-icon">
                    <Icon name="inventory_2" size={15} />
                  </span>
                  <span className="cell-stack">
                    <span className="cell-name">{pkg.name}</span>
                    {pkg.summary ? (
                      <span className="cell-desc truncate" title={pkg.summary}>
                        {pkg.summary}
                      </span>
                    ) : null}
                  </span>
                </div>
              </td>
              <td className="mono cell-num">{pkg.version}</td>
              <td className="cell-num">{latestCell(pkg)}</td>
              <ActionCell>
                <Button
                  className="btn btn-sm btn-ghost"
                  busy={op?.kind === "upgrade"}
                  disabled={busy}
                  onClick={() =>
                    startOperation((id) => api.upgrade(id, python, pkg.name), {
                      kind: "upgrade",
                      env: python,
                      name: pkg.name,
                    })
                  }
                >
                  <Icon name="arrow_upward" size={13} />
                  Upgrade
                </Button>
                <Button
                  className="btn btn-sm btn-ghost"
                  title={`Install a different version of ${pkg.name}`}
                  busy={op?.kind === "install" && op.target !== op.name}
                  disabled={busy}
                  onClick={() => chooseVersion(pkg)}
                >
                  <Icon name="history" size={13} />
                  Versions
                </Button>
                <Button
                  className="btn btn-sm btn-ghost"
                  busy={op?.kind === "uninstall"}
                  disabled={busy}
                  onClick={() => uninstall(pkg)}
                >
                  <Icon name="delete" size={13} />
                  Uninstall
                </Button>
              </ActionCell>
            </tr>
          );
        })}
      </Table>
    );
  }

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle={`Installed in ${envName(activeEnv)}.`}
      actions={
        <Button className="btn btn-primary" busy={installBusy} disabled={busy} onClick={install}>
          <Icon name="add" size={14} />
          Install
        </Button>
      }
    >
      <div className="stack">
        <OpsBanner operations={running} />
        <Panel title="Installed" toolbar={toolbar}>
          {body}
        </Panel>
      </div>
    </PageShell>
  );
}
