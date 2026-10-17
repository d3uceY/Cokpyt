/* Search PyPI — find a package and install it into the active environment.

   Matching runs against the PyPI name index, and the shortlist's details come
   from the JSON API, so the descriptions are real rather than scraped. */

import { api } from "../api.js";
import * as store from "../store.js";
import { actionCell, empty, h, icon, loading, panel, replace, setWorking, toast } from "../ui.js";

const DEBOUNCE_MS = 300;

export const meta = {
  eyebrow: "PyPI",
  title: "Search PyPI",
  subtitle: "Find and install into the active environment.",
};

let unsubscribe = null;

export function cleanup() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

let query = "";
let results = null;

export async function render(ctx) {
  const body = h("div", {});
  const opsBanner = h("div", { class: "op-banner", hidden: true });
  let installButtons = new Map();

  const input = h("input", {
    class: "input",
    type: "search",
    placeholder: "Package name, e.g. requests",
    spellcheck: "false",
    value: query,
    oninput: (event) => {
      query = event.target.value;
      clearTimeout(input.timer);
      input.timer = setTimeout(run, DEBOUNCE_MS);
    },
    onkeydown: (event) => {
      if (event.key === "Enter") {
        clearTimeout(input.timer);
        run();
      }
    },
  });

  const field = h(
    "div",
    { class: "panel-toolbar" },
    h("div", { class: "field grow", style: "max-width:520px" }, h("span", { class: "field-icon" }, icon("search", 16)), input),
  );

  let known = new Set();
  store
    .packages(ctx.env.python)
    .then((packages) => {
      known = new Set(packages.map((pkg) => store.normalise(pkg.name)));
      show();
    })
    .catch(() => {});

  async function run() {
    const needle = query.trim();
    if (!needle) {
      results = null;
      show();
      return;
    }
    replace(body, loading(`Searching PyPI for “${needle}”…`));
    try {
      results = await api.search(needle);
    } catch (error) {
      results = null;
      replace(body, h("div", { class: "error-note", text: error.message }));
      return;
    }
    show();
  }

  function paintOperations() {
    const running = store.runningOperations(ctx.env.python);
    const busyNow = running.length > 0;

    if (busyNow) {
      opsBanner.hidden = false;
      replace(
        opsBanner,
        h("span", { class: "spinner" }),
        h("span", { class: "op-text", text: store.describeOperation(running[0]) }),
      );
    } else {
      opsBanner.hidden = true;
      replace(opsBanner);
    }

    const installs = new Set(
      running.filter((op) => op.kind === "install" && op.name).map((op) => store.normalise(op.name)),
    );
    for (const [name, button] of installButtons) {
      setWorking(button, installs.has(name));
      button.disabled = busyNow;
    }
  }

  function installButton(result, installed) {
    const button = h(
      "button",
      {
        class: "btn btn-sm btn-ghost btn-primary",
        type: "button",
        onclick: () =>
          store.start(() => api.install(ctx.env.python, result.name), {
            kind: "install",
            env: ctx.env.python,
            name: result.name,
          }),
      },
      icon(installed ? "refresh" : "download", 13),
      installed ? "Reinstall" : "Install",
    );
    installButtons.set(store.normalise(result.name), button);
    return button;
  }

  function show() {
    installButtons = new Map();
    if (!query.trim()) {
      replace(
        body,
        empty("Type a package name", "The index holds every published project.", "search"),
      );
      return;
    }
    if (!results) return;
    if (results.length === 0) {
      replace(body, empty("No matches", `Nothing on PyPI matches “${query.trim()}”.`, "search"));
      return;
    }

    replace(
      body,
      h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          { class: "table" },
          h(
            "thead",
            {},
            h(
              "tr",
              {},
              h("th", { class: "cell-flex" }, "Package"),
              h("th", { class: "cell-num" }, "Latest"),
              h("th", { class: "cell-short" }, ""),
              h("th", { class: "cell-right" }, ""),
            ),
          ),
          h(
            "tbody",
            {},
            results.map((result) => {
              const installed = known.has(store.normalise(result.name));
              const install = installButton(result, installed);
              return h(
                "tr",
                {},
                h(
                  "td",
                  { class: "cell-flex cell-title" },
                  h(
                    "div",
                    { class: "cell-main" },
                    h("span", { class: "cell-icon" }, icon("inventory_2", 15)),
                    h(
                      "span",
                      { class: "cell-stack" },
                      h("span", { class: "cell-name", text: result.name }),
                      result.description
                        ? h("span", { class: "cell-desc truncate", title: result.description, text: result.description })
                        : null,
                    ),
                  ),
                ),
                h("td", { class: "mono cell-num", dataset: { label: "Latest" }, text: result.version }),
                h("td", { class: "cell-short" }, installed ? h("span", { class: "badge" }, "installed") : null),
                actionCell(
                  result.homePage
                    ? h(
                        "button",
                        {
                          class: "btn btn-sm btn-ghost",
                          type: "button",
                          title: result.homePage,
                          onclick: () => api.openURL(result.homePage).catch((error) => toast(error.message, "danger")),
                        },
                        icon("open_in_new", 13),
                      )
                    : null,
                  install,
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  show();
  setTimeout(() => input.focus(), 0);

  paintOperations();
  cleanup();
  unsubscribe = store.subscribe(paintOperations);

  return h("div", { class: "stack" }, opsBanner, panel("Results", body, { toolbar: field }));
}
