/* Pure selectors over the operation record. The state lives in AppProvider;
   these only decide what it means. */

const VERBS = {
  install: "Installing",
  upgrade: "Upgrading",
  uninstall: "Uninstalling",
  cleanup: "Cleaning up",
};

export function describeOperation(op) {
  const verb = VERBS[op.kind] || "Working on";
  const what = op.name || op.target || "packages";
  const steps = op.total > 1 ? ` · ${Math.min(op.done, op.total)}/${op.total}` : "";
  return `${verb} ${what}${steps}`;
}

/* runningOperations merges the optimistic entries with the App's record.

   `settled` holds every id the App has reported finished. Once an id is in
   there nothing can show it as running again: not an older snapshot, not a
   page painted mid-run. This is what stops a "done" toast from sitting above a
   spinner that never goes away. */
export function runningOperations(state, python) {
  return [...state.pending, ...state.operations].filter(
    (op) => op.running && !state.settled.includes(op.id) && (!python || op.env === python),
  );
}
