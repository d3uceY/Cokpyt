/* The shell's state: the environments, the active one, the operation record,
   the theme, and the counters the chrome shows.

   This is a reducer rather than a pile of useState calls because most of it
   changes together when a bootstrap or an operation event arrives, and because
   the operation bookkeeping has to move in one step: a pending entry may only
   disappear in the same update that records the App's copy of it. */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { Events } from "../../bindings/runtime.js";
import { api } from "../api.js";
import { describeOperation } from "../lib/operations.js";
import { activeEnvironment } from "../lib/env.js";
import { useData } from "./DataProvider.jsx";
import { useNotify } from "./ToastProvider.jsx";

const AppContext = createContext(null);

const SETTLED_KEPT = 200;

const initialState = {
  ready: false,
  version: "",
  theme: "light",
  platform: "",
  active: "",
  envs: [],
  notes: [],
  counts: {},
  operations: [],
  pending: [],
  /* every id the App has reported finished, oldest first */
  settled: [],
  scanned: false,
  scanning: false,
  scanMessage: "",
  /* bumped whenever installed packages may have changed, so pages refetch */
  revision: 0,
};

function keepSettled(ids) {
  return ids.length > SETTLED_KEPT ? ids.slice(ids.length - SETTLED_KEPT) : ids;
}

function reducer(state, action) {
  switch (action.type) {
    case "bootstrap": {
      const info = action.info;
      const envs = info.envs || [];
      const stillThere = envs.some((env) => env.python === info.active);
      const theme = info.theme === "dark" || info.theme === "light" ? info.theme : state.theme;

      return {
        ...state,
        version: info.version || state.version,
        platform: info.platform || state.platform,
        envs,
        notes: info.notes || [],
        scanned: Boolean(info.scanned),
        scanning: Boolean(info.scanning),
        theme,
        active: action.keepActive && stillThere ? state.active : info.active || "",
      };
    }

    case "scanning":
      return {
        ...state,
        scanning: Boolean(action.value),
        scanMessage: action.message ?? state.scanMessage,
      };

    case "scanMessage":
      return { ...state, scanMessage: action.message };

    case "active":
      return { ...state, active: action.python };

    case "counts":
      return { ...state, counts: action.counts || {} };

    /* The App's list replaces ours, and anything it already knows about stops
       being an optimistic entry: the real record says everything it said and
       more. */
    case "operations": {
      const list = Array.isArray(action.list) ? action.list.filter(Boolean) : [];
      const finished = list.filter((op) => op.id && !op.running).map((op) => op.id);
      const known = new Set(list.map((op) => op.id));

      return {
        ...state,
        operations: list,
        settled: keepSettled([...state.settled, ...finished]),
        pending: state.pending.filter((entry) => !known.has(entry.id)),
      };
    }

    case "settle": {
      if (!action.id) return state;
      return {
        ...state,
        settled: keepSettled([...state.settled, action.id]),
        pending: state.pending.filter((entry) => entry.id !== action.id),
      };
    }

    case "pending:add":
      return { ...state, pending: [...state.pending, action.entry] };

    case "pending:drop":
      return { ...state, pending: state.pending.filter((entry) => entry.id !== action.id) };

    case "invalidate":
      return { ...state, revision: state.revision + 1 };

    case "theme":
      return { ...state, theme: action.theme };

    case "ready":
      return { ...state, ready: true };

    default:
      return state;
  }
}

/* Event data is the single argument the Go side passed to Emit. An operation
   list arrives as an array because the list itself is the argument, so it must
   not be unwrapped. */
function data(event) {
  return event && Object.prototype.hasOwnProperty.call(event, "data") ? event.data : event;
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const notify = useNotify();
  const { invalidate: invalidateCache } = useData();

  /* The App's record is authoritative, so a read that was already in flight
     when a newer event arrived must not move it backwards. */
  const opsEpoch = useRef(0);
  const pendingSeq = useRef(0);
  const scanningRef = useRef(state.scanning);

  useEffect(() => {
    scanningRef.current = state.scanning;
  }, [state.scanning]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    try {
      localStorage.setItem("cokpyt.theme", state.theme);
    } catch {
      /* A private-mode webview cannot write this. The theme still applies. */
    }
  }, [state.theme]);

  const loadBootstrap = useCallback(async ({ keepActive = false } = {}) => {
    const info = await api.bootstrap();
    dispatch({ type: "bootstrap", info, keepActive });
    return info;
  }, []);

  const refreshCounts = useCallback(async () => {
    const counts = await api.packageCounts();
    dispatch({ type: "counts", counts });
    return counts;
  }, []);

  const invalidate = useCallback(
    (python) => {
      invalidateCache(python);
      dispatch({ type: "invalidate" });
    },
    [invalidateCache],
  );

  const refreshOperations = useCallback(async () => {
    const epoch = opsEpoch.current;
    const list = (await api.operations()) || [];
    if (epoch !== opsEpoch.current) return;
    opsEpoch.current += 1;
    dispatch({ type: "operations", list });
  }, []);

  const applyOperations = useCallback((list) => {
    opsEpoch.current += 1;
    dispatch({ type: "operations", list });
  }, []);

  const settleOperation = useCallback((op) => {
    if (!op || !op.id) return;
    dispatch({ type: "settle", id: op.id });
  }, []);

  const selectEnvironment = useCallback(async (python) => {
    await api.selectEnvironment(python);
    dispatch({ type: "active", python });
  }, []);

  const setTheme = useCallback((theme) => {
    const next = theme === "dark" ? "dark" : "light";
    dispatch({ type: "theme", theme: next });
    api.setTheme(next).catch(() => {});
  }, []);

  /* startOperation hands one pip action to the App and records it optimistically
     under the id it also gives the App. That id is the whole point: the
     optimistic copy is replaced by the record with the same id, and the op:done
     event with that id removes it. Nothing has to guess which run is which. */
  const startOperation = useCallback(
    async (work, meta = {}) => {
      pendingSeq.current += 1;
      const id = `req-${Date.now().toString(36)}-${pendingSeq.current}`;
      const entry = {
        id,
        kind: meta.kind || "install",
        env: meta.env || state.active,
        target: meta.target || meta.name || "",
        name: meta.name || "",
        total: meta.total || 1,
        done: 1,
        running: true,
      };

      dispatch({ type: "pending:add", entry });

      try {
        await work(id);
      } catch (error) {
        dispatch({ type: "pending:drop", id });
        notify(error.message, "danger");
      }
    },
    [notify, state.active],
  );

  const scan = useCallback(async () => {
    dispatch({ type: "scanning", value: true, message: "" });
    try {
      const info = await api.scan();
      dispatch({ type: "bootstrap", info, keepActive: true });
      invalidate();
      await refreshCounts();
      return info;
    } finally {
      dispatch({ type: "scanning", value: false });
    }
  }, [invalidate, refreshCounts]);

  const scanFolder = useCallback(
    async (dir) => {
      const found = await api.scanFolder(dir);
      await loadBootstrap();
      await refreshCounts();
      return found;
    },
    [loadBootstrap, refreshCounts],
  );

  /* Boot: read what is known, then fill in the counters. Painting only after
     the counts land is what keeps the totals from reading zero and then never
     correcting themselves. */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const info = await loadBootstrap();
        if (info && info.scanned) await refreshCounts().catch(() => {});
      } catch (error) {
        notify(`Could not read environments: ${error.message}`, "danger");
      }

      await refreshOperations().catch(() => {});
      if (alive) dispatch({ type: "ready" });
    })();

    return () => {
      alive = false;
    };
  }, [loadBootstrap, notify, refreshCounts, refreshOperations]);

  /* Runtime events. Subscribed for the life of the provider, and unsubscribed
     the way the runtime's On returns. */
  useEffect(() => {
    const offProgress = Events.On("scan:progress", (event) => {
      dispatch({ type: "scanMessage", message: data(event) || "" });
    });

    const offScanDone = Events.On("scan:done", async () => {
      if (!scanningRef.current) return;
      try {
        await loadBootstrap();
        await refreshCounts();
      } catch (error) {
        notify(error.message, "danger");
      }
    });

    const offChanged = Events.On("ops:changed", (event) => {
      applyOperations(data(event));
    });

    const offDone = Events.On("op:done", (event) => {
      const op = data(event);
      if (!op || !op.id) return;

      /* The App's last word on this id. Marking it settled first means no
         repaint, however late, can put this run back to running underneath the
         toast that is about to say it is done. */
      settleOperation(op);
      invalidate(op.env);

      if (op.failed) {
        notify(op.message || `${describeOperation(op)} failed.`, "danger");
      } else if (op.failures && op.failures.length > 0) {
        notify(`${op.failures.length} could not be changed. ${op.failures[0]}`, "warn");
      } else {
        notify(`${describeOperation(op)}. Done.`, "ok");
      }
    });

    return () => {
      offProgress();
      offScanDone();
      offChanged();
      offDone();
    };
  }, [applyOperations, invalidate, loadBootstrap, notify, refreshCounts, settleOperation]);

  const activeEnv = useMemo(() => activeEnvironment(state), [state.envs, state.active]);

  const value = {
    state,
    activeEnv,
    refreshOperations,
    selectEnvironment,
    setTheme,
    startOperation,
    invalidate,
    scan,
    scanFolder,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
