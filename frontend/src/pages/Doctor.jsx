/* Doctor — is the active environment actually usable?

   Three checks with a plain answer each, and a concrete next step where
   something is wrong. The point is diagnosis, not a score. */

import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useResource } from "../app/useResource.js";
import { useNotify } from "../app/ToastProvider.jsx";
import { PAGES } from "../app/routes.js";
import { PageShell } from "../components/PageShell.jsx";
import { envName } from "../lib/env.js";
import { Button, ErrorNote, Icon, Loading, Panel } from "../ui/components.jsx";

const page = PAGES.doctor;
const BADGE = { ok: "ok", warn: "warn", fail: "danger" };

const loadReport = (python) => api.doctor(python);

export default function Doctor() {
  const { state, activeEnv } = useApp();
  const notify = useNotify();
  const python = activeEnv ? activeEnv.python : "";
  const report = useResource(loadReport, python, state.revision);

  let body;
  if (report.error) {
    body = <ErrorNote>{report.error}</ErrorNote>;
  } else if (!report.data) {
    body = <Loading text="Running checks…" />;
  } else {
    body = (
      <div>
        {report.data.checks.map((check) => (
          <div className="check-line" key={check.name}>
            <span className="state-icon" data-state={check.status}>
              <Icon
                name={check.status === "ok" ? "check" : check.status === "warn" ? "warning" : "error"}
                size={15}
              />
            </span>
            <div className="check-line-body">
              <div className="row">
                <span className="cell-name">{check.name}</span>
                <span className={`badge badge-${BADGE[check.status] || "danger"}`}>
                  {check.status === "ok" ? "passed" : check.status}
                </span>
              </div>
              <div className="check-line-detail">{check.detail}</div>
              {check.hint ? <div className="check-line-detail">{check.hint}</div> : null}
            </div>
            {check.fixUrl ? (
              <Button
                className="btn btn-sm"
                onClick={() => api.openURL(check.fixUrl).catch((problem) => notify(problem.message, "danger"))}
              >
                Fix
                <Icon name="open_in_new" size={13} />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle={`Interpreter, pip and PyPI, for ${envName(activeEnv)}.`}
    >
      <Panel
        title={report.data && report.data.ok ? "All checks passed" : "Something needs attention"}
        actions={<span className="eyebrow">{activeEnv ? activeEnv.label : ""}</span>}
      >
        {body}
      </Panel>
    </PageShell>
  );
}
