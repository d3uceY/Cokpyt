import { useEffect, useState } from "react";

/* The icon sprite is fetched rather than referenced from another document,
   because a same-document <use> is the only form every webview agrees on.

   The wrapper is hidden, and a hidden box is not a grid item, so it cannot
   disturb the shell's two-column layout. */
export function IconSprite() {
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    let alive = true;

    fetch("/assets/icons.svg")
      .then((response) => response.text())
      .then((text) => {
        if (alive) setMarkup(text);
      })
      .catch(() => {
        /* Icons are decoration. Losing them should not stop the app. */
      });

    return () => {
      alive = false;
    };
  }, []);

  if (!markup) return null;
  return <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />;
}
