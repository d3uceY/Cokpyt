import { useCallback, useEffect, useRef, useState } from "react";

/* One async read, keyed by whatever the page is looking at.

   Changing the key replaces the data with a spinner; changing `revision` — the
   counter bumped whenever an operation may have changed what is installed —
   refetches in place, so a version update happens in the row instead of the
   table disappearing and coming back. */
export function useResource(load, key, revision = 0) {
  const [resource, setResource] = useState(() => ({
    key,
    status: key ? "loading" : "idle",
    data: null,
    error: "",
  }));
  const [attempt, setAttempt] = useState(0);
  const forceNext = useRef(false);

  useEffect(() => {
    if (!key) {
      setResource({ key: "", status: "idle", data: null, error: "" });
      return undefined;
    }

    let alive = true;
    setResource((current) =>
      current.key === key
        ? { ...current, status: "refreshing", error: "" }
        : { key, status: "loading", data: null, error: "" },
    );

    const options = { force: forceNext.current };
    forceNext.current = false;

    load(key, options)
      .then((data) => {
        if (alive) setResource({ key, status: "ready", data, error: "" });
      })
      .catch((error) => {
        if (alive) setResource((current) => ({ ...current, status: "error", error: error.message }));
      });

    return () => {
      alive = false;
    };
  }, [load, key, revision, attempt]);

  /* reload skips the cache: the user asked for a fresh answer, not the one
     that is already on screen. */
  const reload = useCallback(() => {
    forceNext.current = true;
    setAttempt((value) => value + 1);
  }, []);

  /* The effect runs after the commit, so for one frame the state still belongs
     to the previous key. Reporting it as loading instead of as data is what
     stops the previous environment's rows appearing under the new one's name. */
  if (resource.key !== key) {
    return { status: key ? "loading" : "idle", data: null, error: "", reload };
  }

  return { status: resource.status, data: resource.data, error: resource.error, reload };
}
