/* Search PyPI — find a package and install it into the active environment.

   Matching runs against the PyPI name index, and the shortlist's details come
   from the JSON API, so the descriptions are real rather than scraped. */

import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useData } from "../app/DataProvider.jsx";
import { useResource } from "../app/useResource.js";
import { useRunning } from "../app/hooks.js";
import { useNotify } from "../app/ToastProvider.jsx";
import { PAGES } from "../app/routes.js";
import { PageShell } from "../components/PageShell.jsx";
import { normalise } from "../lib/env.js";
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

const page = PAGES.search;
const DEBOUNCE_MS = 300;

const loadSearch = (query) => api.search(query);

export default function Search() {
  const { state, activeEnv, startOperation } = useApp();
  const { loadPackages } = useData();
  const python = activeEnv ? activeEnv.python : "";
  const running = useRunning(python);
  const notify = useNotify();

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const results = useResource(loadSearch, submitted, 0);

  const [installed, setInstalled] = useState(() => new Set());
  const refreshInstalled = useCallback(() => {
    loadPackages(python)
      .then((packages) => setInstalled(new Set(packages.map((pkg) => normalise(pkg.name)))))
      .catch(() => {});
  }, [loadPackages, python]);

  /* The "installed" badge follows the environment, and follows an install that
     this page just started. */
  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled, state.revision]);

  /* Typing is debounced; pressing Enter skips the wait. */
  useEffect(() => {
    const needle = query.trim();
    if (!needle) {
      setSubmitted("");
      return undefined;
    }
    const timer = setTimeout(() => setSubmitted(needle), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const busy = running.length > 0;
  const installing = new Set(
    running.filter((op) => op.kind === "install" && op.name).map((op) => normalise(op.name)),
  );

  function install(result) {
    startOperation((id) => api.install(id, python, result.name), {
      kind: "install",
      env: python,
      name: result.name,
    });
  }

  let body;
  if (!submitted) {
    body = <Empty title="Type a package name" sub="The index holds every published project." icon="search" />;
  } else if (results.error) {
    body = <ErrorNote>{results.error}</ErrorNote>;
  } else if (!results.data) {
    body = <Loading text={`Searching PyPI for “${submitted}”…`} />;
  } else if (results.data.length === 0) {
    body = <Empty title="No matches" sub={`Nothing on PyPI matches “${submitted}”.`} icon="search" />;
  } else {
    body = (
      <Table
        head={[
          { class: "cell-flex", text: "Package" },
          { class: "cell-num", text: "Latest" },
          { class: "cell-short", text: "" },
          { class: "cell-right", text: "" },
        ]}
      >
        {results.data.map((result) => {
          const key = normalise(result.name);
          const isInstalled = installed.has(key);

          return (
            <tr key={result.name}>
              <td className="cell-flex cell-title">
                <div className="cell-main">
                  <span className="cell-icon">
                    <Icon name="inventory_2" size={15} />
                  </span>
                  <span className="cell-stack">
                    <span className="cell-name">{result.name}</span>
                    {result.description ? (
                      <span className="cell-desc truncate" title={result.description}>
                        {result.description}
                      </span>
                    ) : null}
                  </span>
                </div>
              </td>
              <td className="mono cell-num">{result.version}</td>
              <td className="cell-short">{isInstalled ? <span className="badge">installed</span> : null}</td>
              <ActionCell>
                {result.homePage ? (
                  <Button
                    className="btn btn-sm btn-ghost"
                    title={result.homePage}
                    onClick={() => api.openURL(result.homePage).catch((error) => notify(error.message, "danger"))}
                  >
                    <Icon name="open_in_new" size={13} />
                  </Button>
                ) : null}
                <Button
                  className="btn btn-sm btn-ghost btn-primary"
                  busy={installing.has(key)}
                  disabled={busy}
                  onClick={() => install(result)}
                >
                  <Icon name={isInstalled ? "refresh" : "download"} size={13} />
                  {isInstalled ? "Reinstall" : "Install"}
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
      subtitle="Find and install into the active environment."
    >
      <div className="stack">
        <OpsBanner operations={running} />
        <Panel
          title="Results"
          toolbar={
            <div className="panel-toolbar">
              <div className="field grow" style={{ maxWidth: 520 }}>
                <span className="field-icon">
                  <Icon name="search" size={16} />
                </span>
                <input
                  className="input"
                  type="search"
                  placeholder="Package name, e.g. requests"
                  spellCheck="false"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setSubmitted(query.trim());
                  }}
                />
              </div>
            </div>
          }
        >
          {body}
        </Panel>
      </div>
    </PageShell>
  );
}
