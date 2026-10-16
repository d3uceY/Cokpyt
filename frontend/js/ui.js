/* Small DOM and formatting helpers. There is no framework here on purpose:
   the app is a handful of tables and forms, and a render helper plus explicit
   event handlers is less machinery than a component model would be. */

const SVG = "http://www.w3.org/2000/svg";

export const $ = (id) => document.getElementById(id);

/* h builds an element. Children are appended as text unless they are nodes,
   which means user-supplied strings can never be parsed as markup. */
export function h(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/* icon references the sprite in the document, which app.js injects at boot. */
export function icon(name, size = 16) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  const use = document.createElementNS(SVG, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

/* replace swaps a container's contents in one go. */
export function replace(container, ...children) {
  container.replaceChildren();
  append(container, children);
  return container;
}

/* hydrateIcons fills the placeholders that index.html can express as markup. */
export function hydrateIcons(root = document) {
  for (const slot of root.querySelectorAll("[data-icon]")) {
    const size = Number(slot.dataset.size || 16);
    slot.replaceWith(icon(slot.dataset.icon, size));
  }
}

export function empty(title, sub, iconName = "inventory_2") {
  return h(
    "div",
    { class: "empty" },
    h("span", { class: "empty-icon" }, icon(iconName, 26)),
    h("span", { class: "empty-title", text: title }),
    sub ? h("span", { class: "empty-sub", text: sub }) : null,
  );
}

export function loading(text = "Loading…") {
  return h("div", { class: "loading" }, h("span", { class: "spinner" }), text);
}

/* scanningBlock is what the body shows while discovery runs. The whole point of
   the app is that there is more than one environment, so the wait is worth
   narrating rather than hiding behind a bare spinner. */
export function scanningBlock(message = "") {
  return h(
    "div",
    { class: "empty" },
    h("span", { class: "spinner", style: "width:18px;height:18px" }),
    h("span", { class: "empty-title", text: "Looking for environments" }),
    h(
      "span",
      { class: "empty-sub" },
      "py launcher, install directories, and pyvenv.cfg / conda-meta markers under your home folder.",
    ),
    message ? h("span", { class: "empty-sub mono" }, message) : null,
  );
}

export function errorNote(message) {
  return h("div", { class: "error-note", text: message });
}

export function note(message, tone = "warn") {
  return h(
    "div",
    { class: tone === "info" ? "note note-info" : "note" },
    icon(tone === "info" ? "info" : "warning", 16),
    h("span", { class: "grow", text: message }),
  );
}

export function statBlock({ label, value, note: noteText, tone = "muted", icon: iconName, small }) {
  return h(
    "div",
    { class: "stat" },
    h(
      "div",
      { class: "stat-head" },
      h("span", { class: "eyebrow", text: label }),
      iconName ? icon(iconName, 16) : null,
    ),
    h("div", { class: small ? "stat-value stat-value-sm" : "stat-value", text: value }),
    noteText ? h("div", { class: "stat-note", dataset: { tone } }, noteText) : null,
  );
}

/* table builds the shape every list in the app uses: uppercase micro headers
   over 1px-ruled rows. A head entry is either a label or an attribute object
   for the cell (used to mark the right-aligned action column).

   Below a narrow window the rows fold into cards, and a cell that no longer has
   a header beside it needs its own label. The header is the only place that
   label exists, so it is copied onto each cell here rather than in every
   caller; the first cell becomes the card's heading instead. */
export function table(head, rows) {
  const labels = head.map((column) => (typeof column === "string" ? column : column.text || ""));

  for (const row of rows.flat(Infinity)) {
    if (!(row instanceof Element) || row.tagName !== "TR") continue;
    [...row.children].forEach((cell, index) => {
      if (cell.tagName !== "TD") return;
      if (index === 0) {
        cell.classList.add("cell-title");
        return;
      }
      if (cell.classList.contains("cell-right") || !labels[index]) return;
      cell.dataset.label = labels[index];
    });
  }

  return h(
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
          head.map((column) =>
            typeof column === "string"
              ? h("th", {}, column)
              : h("th", { class: column.class }, column.text || ""),
          ),
        ),
      ),
      h("tbody", {}, rows),
    ),
  );
}

/* panel is the bordered container: a title bar, optional toolbar, a body. */
export function panel(title, body, { actions = [], toolbar = null } = {}) {
  return h(
    "section",
    { class: "card" },
    h(
      "div",
      { class: "panel-head" },
      h("h2", { class: "panel-title", text: title }),
      ...actions.flat().filter(Boolean),
    ),
    toolbar,
    body,
  );
}

/* actionCell is the last cell of a table row: buttons, right-aligned. */
export function actionCell(...buttons) {
  return h("td", { class: "cell-right" }, h("div", { class: "cell-actions" }, ...buttons));
}

/* ── formatting ───────────────────────────────────────────────────────────── */

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

export function shortPath(path, keep = 3) {
  if (!path) return "";
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length <= keep ? path : `…/${parts.slice(-keep).join("/")}`;
}

export function relativeTime(stamp) {
  if (!stamp) return "";
  const then = new Date(stamp.replace(" ", "T"));
  if (Number.isNaN(then.getTime())) return stamp;
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return stamp;
}

/* ── toasts ───────────────────────────────────────────────────────────────── */

const TOAST_MS = 5000;

export function toast(message, tone = "info") {
  const host = $("toasts");
  if (!host) return;
  const node = h(
    "div",
    { class: "toast", dataset: { tone } },
    icon(tone === "ok" ? "check" : tone === "danger" || tone === "warn" ? "warning" : "info", 16),
    h("span", { text: message }),
    h(
      "button",
      {
        class: "icon-btn toast-close",
        type: "button",
        "aria-label": "Dismiss",
        onclick: () => node.remove(),
      },
      icon("close", 14),
    ),
  );
  host.append(node);
  setTimeout(() => node.remove(), TOAST_MS);
}

/* ── confirmation ─────────────────────────────────────────────────────────── */

/* confirmDialog replaces window.confirm so the wording, the destructive colour
   and the button order are ours rather than the browser's. */
export function confirmDialog({ title, text, confirm = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const close = (answer) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key === "Escape") close(false);
      if (event.key === "Enter") close(true);
    };
    const backdrop = h(
      "div",
      { class: "dialog-backdrop", onclick: (event) => event.target === backdrop && close(false) },
      h(
        "div",
        { class: "dialog", role: "dialog", "aria-modal": "true" },
        h(
          "div",
          { class: "dialog-body" },
          h("h2", { class: "dialog-title", text: title }),
          text ? h("p", { class: "dialog-text", text }) : null,
        ),
        h(
          "div",
          { class: "dialog-actions" },
          h("button", { class: "btn", type: "button", onclick: () => close(false) }, "Cancel"),
          h(
            "button",
            {
              class: danger ? "btn btn-primary btn-danger" : "btn btn-primary",
              type: "button",
              onclick: () => close(true),
            },
            confirm,
          ),
        ),
      ),
    );
    document.addEventListener("keydown", onKey);
    document.body.append(backdrop);
    backdrop.querySelector(".btn-primary").focus();
  });
}

/* ── prompt ───────────────────────────────────────────────────────────────── */

/* promptDialog asks for one line of text. pip accepts a bare name, a pinned
   version, a path or a URL, so nothing here validates the shape — pip's own
   error is better than a guess about what a requirement may look like. */
export function promptDialog({ title, label, placeholder = "", confirm = "Install" }) {
  return new Promise((resolve) => {
    const input = h("input", { class: "input", placeholder, spellcheck: "false", autocomplete: "off" });
    const finish = (value) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(null);
    };
    const submit = () => finish(input.value.trim() || null);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });

    const backdrop = h(
      "div",
      { class: "dialog-backdrop", onclick: (event) => event.target === backdrop && finish(null) },
      h(
        "div",
        { class: "dialog", role: "dialog", "aria-modal": "true" },
        h(
          "div",
          { class: "dialog-body" },
          h("h2", { class: "dialog-title", text: title }),
          label ? h("p", { class: "dialog-text", text: label }) : null,
          h("div", { class: "row", style: "margin-top:14px" }, input),
        ),
        h(
          "div",
          { class: "dialog-actions" },
          h("button", { class: "btn", type: "button", onclick: () => finish(null) }, "Cancel"),
          h("button", { class: "btn btn-primary", type: "button", onclick: submit }, confirm),
        ),
      ),
    );

    document.addEventListener("keydown", onKey);
    document.body.append(backdrop);
    input.focus();
  });
}

/* ── choosing ─────────────────────────────────────────────────────────────── */

/* chooseDialog asks for one item out of a list that has to be fetched first.

   The fetch starts when the dialog opens rather than before it, so a slow
   lookup shows as a note inside a dialog that is already on screen instead of
   as a row button that looks like it was ignored. `load` resolves to
   [{ value, label, selected, badge }], where `selected` marks the option to
   open on and `badge` is an optional short marker for it.

   The list is built from buttons rather than a native multi-row <select>. A
   native one paints the OS's own listbox, which ignores the theme, cannot show
   which row is the one already installed, and sits in the dialog like a widget
   someone dropped in. */
export function chooseDialog({ title, label, load, confirm = "OK" }) {
  return new Promise((resolve) => {
    const options = [];
    let active = 0;

    const list = h("div", {
      class: "dialog-list",
      role: "listbox",
      tabindex: "0",
      "aria-label": label || title,
    });
    list.hidden = true;

    const note = h("p", { class: "dialog-foot", text: "Looking this up…" });
    const submit = h("button", { class: "btn btn-primary", type: "button", disabled: true }, confirm);

    const finish = (value) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(null);
    };

    /* The chosen row is marked and named as the listbox's active descendant, so
       focus stays on the list and the arrows never have to chase it. */
    const mark = (index) => {
      if (index < 0 || index >= options.length) return;
      active = index;
      const rows = list.children;
      for (let i = 0; i < rows.length; i += 1) {
        rows[i].setAttribute("aria-selected", String(i === index));
      }
      list.setAttribute("aria-activedescendant", rows[index].id);
      rows[index].scrollIntoView({ block: "nearest" });
      submit.disabled = false;
    };

    list.addEventListener("click", (event) => {
      const row = event.target.closest(".dialog-option");
      if (!row) return;
      mark([...list.children].indexOf(row));
      list.focus();
    });

    list.addEventListener("keydown", (event) => {
      const last = options.length - 1;
      if (event.key === "ArrowDown") mark(Math.min(active + 1, last));
      else if (event.key === "ArrowUp") mark(Math.max(active - 1, 0));
      else if (event.key === "Home") mark(0);
      else if (event.key === "End") mark(last);
      else if (event.key === "Enter" && !submit.disabled) finish(options[active].value);
      else return;
      event.preventDefault();
    });

    submit.addEventListener("click", () => finish(options[active].value));

    const backdrop = h(
      "div",
      { class: "dialog-backdrop", onclick: (event) => event.target === backdrop && finish(null) },
      h(
        "div",
        { class: "dialog", role: "dialog", "aria-modal": "true" },
        h(
          "div",
          { class: "dialog-body" },
          h("h2", { class: "dialog-title", text: title }),
          label ? h("p", { class: "dialog-text", text: label }) : null,
          list,
          note,
        ),
        h(
          "div",
          { class: "dialog-actions" },
          h("button", { class: "btn", type: "button", onclick: () => finish(null) }, "Cancel"),
          submit,
        ),
      ),
    );

    document.addEventListener("keydown", onKey);
    document.body.append(backdrop);

    load()
      .then((loaded) => {
        if (loaded.length === 0) {
          note.textContent = "Nothing to choose from.";
          return;
        }

        options.push(...loaded);
        replace(
          list,
          loaded.map((option, index) =>
            h(
              "button",
              {
                class: "dialog-option",
                type: "button",
                role: "option",
                id: `cokpyt-choice-${index}`,
                "aria-selected": "false",
              },
              h("span", { class: "dialog-option-mark" }, icon("check", 13)),
              h("span", { class: "dialog-option-name", text: option.label }),
              option.badge ? h("span", { class: "badge", text: option.badge }) : null,
            ),
          ),
        );

        list.hidden = false;
        note.textContent = `${loaded.length} to choose from.`;

        /* Opening on the version already installed is usually the fastest way
           to find the one wanted; the first entry is the fallback. */
        const chosen = loaded.findIndex((option) => option.selected);
        mark(chosen === -1 ? 0 : chosen);
        list.focus();
      })
      .catch((error) => {
        note.textContent = error.message;
      });
  });
}

const MAX_LINES = 1500;
export const output = {
  lines: [],

  show() {
    const panel = $("console");
    if (panel) panel.hidden = false;
  },

  hide() {
    const panel = $("console");
    if (panel) panel.hidden = true;
  },

  clear() {
    this.lines = [];
    const body = $("console-body");
    if (body) body.textContent = "";
  },

  progress(message) {
    const slot = $("console-progress");
    if (slot) slot.textContent = message || "";
  },

  write(line) {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines = this.lines.slice(-MAX_LINES);
    const body = $("console-body");
    if (!body) return;
    body.append(document.createTextNode(`${line}\n`));
    while (body.childNodes.length > MAX_LINES) body.removeChild(body.firstChild);
    if (!$("console").hidden) body.scrollTop = body.scrollHeight;
  },

  /* writeAll replaces the panel contents, used when the persisted log is
     loaded rather than streamed. */
  writeAll(lines) {
    this.clear();
    for (const line of lines) this.write(line);
  },

  text() {
    return this.lines.join("\n");
  },
};
