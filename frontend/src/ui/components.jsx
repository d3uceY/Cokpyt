/* The small pieces every page shares: a panel, a table, a button that can show
   it is working, and the states a list can be in. */

import { Children, cloneElement, isValidElement } from "react";
import { describeOperation } from "../lib/operations.js";

/* icon references the sprite that main.jsx injects into the document. */
export function Icon({ name, size = 16 }) {
  return (
    <svg className="icon" aria-hidden="true" width={size} height={size}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

/* A button that started work is disabled, but it is not unavailable: it is the
   only progress indicator the app has. It keeps its ink and its width, and
   shows a spinner in place of the label it is working through. */
export function Button({ busy = false, className = "btn", children, disabled, type = "button", ...rest }) {
  return (
    <button
      type={type}
      className={busy ? `${className} is-busy` : className}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? <span className="spinner" /> : children}
    </button>
  );
}

export function Panel({ title, actions = [], toolbar = null, children }) {
  const buttons = Children.toArray(actions).filter(Boolean);
  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {buttons}
      </div>
      {toolbar}
      {children}
    </section>
  );
}

/* table builds the shape every list in the app uses: uppercase micro headers
   over 1px-ruled rows.

   Below a narrow window the rows fold into cards, and a cell that no longer has
   a header beside it needs its own label. The header is the only place that
   label exists, so it is copied onto each cell here rather than in every
   caller; the first cell becomes the card's heading instead. */
export function Table({ head, children }) {
  const labels = head.map((column) => {
    if (typeof column === "string") return column;
    return typeof column.text === "string" ? column.text : "";
  });

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {head.map((column, index) =>
              typeof column === "string" ? (
                <th key={index}>{column}</th>
              ) : (
                <th key={index} className={column.class}>
                  {column.text || ""}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>{Children.toArray(children).map((row) => decorateRow(row, labels))}</tbody>
      </table>
    </div>
  );
}

function decorateRow(row, labels) {
  if (!isValidElement(row) || row.type !== "tr") return row;

  const cells = Children.toArray(row.props.children);
  /* A row with a leading checkbox or no identity column names its own heading. */
  const hasHeading = cells.some(
    (cell) => isValidElement(cell) && String(cell.props.className || "").includes("cell-title"),
  );

  const decoratedCells = cells.map((cell, index) => {
    if (!isValidElement(cell) || cell.type !== "td") return cell;

    const className = cell.props.className || "";
    const heading = index === 0 && !hasHeading;
    const decorated = {
      className: [className, heading ? "cell-title" : ""].filter(Boolean).join(" ") || undefined,
    };

    const labelled = !className.includes("cell-right") && !className.includes("cell-title");
    if (index > 0 && labels[index] && labelled) {
      decorated["data-label"] = labels[index];
    }
    return cloneElement(cell, decorated);
  });

  return cloneElement(row, {}, decoratedCells);
}

/* actionCell is the last cell of a table row: buttons, right-aligned. */
export function ActionCell({ children }) {
  return (
    <td className="cell-right">
      <div className="cell-actions">{children}</div>
    </td>
  );
}

export function Empty({ title, sub, icon = "inventory_2" }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <span className="empty-title">{title}</span>
      {sub ? <span className="empty-sub">{sub}</span> : null}
    </div>
  );
}

export function Loading({ text = "Loading…" }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {text}
    </div>
  );
}

/* scanningBlock is what the body shows while discovery runs. The whole point of
   the app is that there is more than one environment, so the wait is worth
   narrating rather than hiding behind a bare spinner. */
export function ScanningBlock({ message = "" }) {
  return (
    <div className="empty">
      <span className="spinner" style={{ width: 18, height: 18 }} />
      <span className="empty-title">Looking for environments</span>
      <span className="empty-sub">
        py launcher, install directories, and pyvenv.cfg / conda-meta markers under your home folder.
      </span>
      {message ? <span className="empty-sub mono">{message}</span> : null}
    </div>
  );
}

export function ErrorNote({ children }) {
  return <div className="error-note">{children}</div>;
}

export function Note({ tone = "warn", children }) {
  const info = tone === "info";
  return (
    <div className={info ? "note note-info" : "note"}>
      <Icon name={info ? "info" : "warning"} size={16} />
      <span className="grow">{children}</span>
    </div>
  );
}

export function StatBlock({ label, value, note, tone = "muted", icon, small = false }) {
  return (
    <div className="stat">
      <div className="stat-head">
        <span className="eyebrow">{label}</span>
        {icon ? <Icon name={icon} size={16} /> : null}
      </div>
      <div className={small ? "stat-value stat-value-sm" : "stat-value"}>{value}</div>
      {note ? (
        <div className="stat-note" data-tone={tone}>
          {note}
        </div>
      ) : null}
    </div>
  );
}

/* The banner a page shows when it comes back to work that is already running.
   It is not a toast: it stays for as long as the operation does, because the
   controls around it stay disabled until then. */
export function OpsBanner({ operations }) {
  if (operations.length === 0) return null;
  return (
    <div className="op-banner">
      <span className="spinner" />
      <span className="op-text">{describeOperation(operations[0])}</span>
      {operations.length > 1 ? <span className="eyebrow">+{operations.length - 1} more</span> : null}
    </div>
  );
}
