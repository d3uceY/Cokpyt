/* Doctor — is the active environment actually usable?

   Three checks with a plain answer each, and a concrete next step where
   something is wrong. The point is diagnosis, not a score. */

import { api } from "../api.js";
import * as store from "../store.js";
import { h, icon, loading, panel, replace, toast } from "../ui.js";

export const meta = {
  eyebrow: "Active environment",
  title: "Doctor",
  subtitle: "Interpreter, pip, and the network pip needs.",
};

export async function render(ctx) {
  const body = h("div", {}, loading("Running checks…"));
  meta.subtitle = `Interpreter, pip and PyPI, for ${store.envName(ctx.env)}.`;

  let report;
  try {
    report = await api.doctor(ctx.env.python);
  } catch (error) {
    replace(body, h("div", { class: "error-note", text: error.message }));
    return panel("Checks", body);
  }

  replace(
    body,
    h(
      "div",
      {},
      report.checks.map((check) =>
        h(
          "div",
          { class: "check-line" },
          h(
            "span",
            { class: "state-icon", dataset: { state: check.status } },
            icon(check.status === "ok" ? "check" : check.status === "warn" ? "warning" : "error", 15),
          ),
          h(
            "div",
            { class: "check-line-body" },
            h(
              "div",
              { class: "row" },
              h("span", { class: "cell-name", text: check.name }),
              h(
                "span",
                { class: `badge badge-${check.status === "ok" ? "ok" : check.status === "warn" ? "warn" : "danger"}` },
                check.status === "ok" ? "passed" : check.status,
              ),
            ),
            h("div", { class: "check-line-detail", text: check.detail }),
            check.hint ? h("div", { class: "check-line-detail", text: check.hint }) : null,
          ),
          check.fixUrl
            ? h(
                "button",
                {
                  class: "btn btn-sm",
                  type: "button",
                  onclick: () => api.openURL(check.fixUrl).catch((error) => toast(error.message, "danger")),
                },
                "Fix",
                icon("open_in_new", 13),
              )
            : null,
        ),
      ),
    ),
  );

  return panel(report.ok ? "All checks passed" : "Something needs attention", body, {
    actions: [h("span", { class: "eyebrow", text: ctx.env.label })],
  });
}
