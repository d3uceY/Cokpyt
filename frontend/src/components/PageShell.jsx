import { Children } from "react";

/* The head and the scrolling body every page shares. The head is painted by
   the page itself so its subtitle and actions can follow the page's own state. */
export function PageShell({ eyebrow = "Cokpyt", title = "", subtitle = "", actions = null, children }) {
  const buttons = Children.toArray(actions).filter(Boolean);

  return (
    <>
      <header className="page-head">
        <div className="page-head-text">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        </div>
        <div className="page-actions">{buttons}</div>
      </header>
      <div className="view" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
