import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { api } from "../api.js";

const DataContext = createContext(null);

/* Two of the calls in this app are genuinely expensive: `pip list --outdated`
   hits PyPI, and package counts walk site-packages for every environment. A
   page unmounts whenever the user navigates, so the results are kept in a ref
   here rather than in page state — that is the one thing React cannot own,
   because it has to outlive the component that asked for it.

   Everything else is plain page state fetched by useResource. */
export function DataProvider({ children }) {
  const cache = useRef({ packages: new Map(), outdated: new Map(), history: null });

  const loadPackages = useCallback(async (python, { force = false } = {}) => {
    if (!python) return [];
    const held = cache.current.packages.get(python);
    if (!force && held) return held;
    const list = (await api.packages(python)) || [];
    cache.current.packages.set(python, list);
    return list;
  }, []);

  const loadOutdated = useCallback(async (python, { force = false } = {}) => {
    if (!python) return [];
    const held = cache.current.outdated.get(python);
    if (!force && held) return held;
    const list = (await api.outdated(python)) || [];
    cache.current.outdated.set(python, list);
    return list;
  }, []);

  const loadHistory = useCallback(async (_key, { force = false } = {}) => {
    if (!force && cache.current.history) return cache.current.history;
    const entries = (await api.history()) || [];
    cache.current.history = entries;
    return entries;
  }, []);

  /* invalidate is called after anything that changes what is installed. Passing
     no environment clears everything, which is what a rescan needs. */
  const invalidate = useCallback((python) => {
    if (python) {
      cache.current.packages.delete(python);
      cache.current.outdated.delete(python);
    } else {
      cache.current.packages.clear();
      cache.current.outdated.clear();
    }
    cache.current.history = null;
  }, []);

  const value = useMemo(
    () => ({ loadPackages, loadOutdated, loadHistory, invalidate }),
    [loadPackages, loadOutdated, loadHistory, invalidate],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
