/* The reads each page makes, in terms of the providers. A hook owns the
   fetch, the loading/error status, and the refetch on revision; the page only
   decides what to draw. */

import { useApp } from "./AppProvider.jsx";
import { useData } from "./DataProvider.jsx";
import { runningOperations } from "../lib/operations.js";
import { useResource } from "./useResource.js";

export function usePackages(python) {
  const { state } = useApp();
  const { loadPackages } = useData();
  return useResource(loadPackages, python || "", state.revision);
}

export function useOutdated(python) {
  const { state } = useApp();
  const { loadOutdated } = useData();
  return useResource(loadOutdated, python || "", state.revision);
}

export function useHistory() {
  const { state } = useApp();
  const { loadHistory } = useData();
  return useResource(loadHistory, "history", state.revision);
}

export function useRunning(python) {
  const { state } = useApp();
  return runningOperations(state, python);
}
