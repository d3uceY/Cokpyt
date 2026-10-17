/* Dialogs are React state: one at a time, owned by a provider, rendered while
   it is set. The promise is only how a caller waits for the answer without
   having to thread a callback through every handler.

   The chrome is a native <dialog>: showModal gives the backdrop, the focus
   trap, the top layer and Escape cancellation for free. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../ui/components.jsx";

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const open = useCallback(
    (config) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog(config);
      }),
    [],
  );

  const close = useCallback((value) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setDialog(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback((options) => open({ kind: "confirm", ...options }), [open]);
  const prompt = useCallback((options) => open({ kind: "prompt", ...options }), [open]);
  const choose = useCallback((options) => open({ kind: "choose", ...options }), [open]);

  const value = useMemo(() => ({ confirm, prompt, choose }), [confirm, prompt, choose]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && dialog.kind === "confirm" ? <ConfirmDialog dialog={dialog} onClose={close} /> : null}
      {dialog && dialog.kind === "prompt" ? <PromptDialog dialog={dialog} onClose={close} /> : null}
      {dialog && dialog.kind === "choose" ? <ChooseDialog dialog={dialog} onClose={close} /> : null}
    </DialogContext.Provider>
  );
}

export function useDialogs() {
  return useContext(DialogContext);
}

/* The dialog element is opened once, on mount, and React removes it when the
   state clears. Enter confirms where there is a single obvious answer; the
   version list owns its own arrow keys. */
function Dialog({ onClose, onEnter, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(event) => {
        /* Escape: cancel the native close so React stays the one that decides. */
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && onEnter) {
          event.preventDefault();
          onEnter();
        }
      }}
    >
      {children}
    </dialog>
  );
}

function ConfirmDialog({ dialog, onClose }) {
  const finish = () => onClose(true);

  return (
    <Dialog onClose={() => onClose(false)} onEnter={finish}>
      <div className="dialog-body">
        <h2 className="dialog-title">{dialog.title}</h2>
        {dialog.text ? <p className="dialog-text">{dialog.text}</p> : null}
      </div>
      <div className="dialog-actions">
        <button className="btn" type="button" onClick={() => onClose(false)}>
          Cancel
        </button>
        <button
          autoFocus
          className={dialog.danger ? "btn btn-primary btn-danger" : "btn btn-primary"}
          type="button"
          onClick={finish}
        >
          {dialog.confirm}
        </button>
      </div>
    </Dialog>
  );
}

function PromptDialog({ dialog, onClose }) {
  const [value, setValue] = useState("");
  const submit = () => onClose(value.trim() || null);

  return (
    <Dialog onClose={() => onClose(null)} onEnter={submit}>
      <div className="dialog-body">
        <h2 className="dialog-title">{dialog.title}</h2>
        {dialog.label ? <p className="dialog-text">{dialog.label}</p> : null}
        <div className="row" style={{ marginTop: 14 }}>
          <input
            autoFocus
            className="input"
            placeholder={dialog.placeholder}
            spellCheck="false"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
      </div>
      <div className="dialog-actions">
        <button className="btn" type="button" onClick={() => onClose(null)}>
          Cancel
        </button>
        <button className="btn btn-primary" type="button" onClick={submit}>
          {dialog.confirm}
        </button>
      </div>
    </Dialog>
  );
}

/* The version chooser: a list of one-of-N options, not a form control. */
function ChooseDialog({ dialog, onClose }) {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef(null);

  useEffect(() => {
    let alive = true;

    dialog
      .load()
      .then((loaded) => {
        if (!alive) return;
        setOptions(loaded);
        const chosen = loaded.findIndex((option) => option.selected);
        setActive(chosen === -1 ? 0 : chosen);
      })
      .catch((problem) => {
        if (alive) setError(problem.message);
      });

    return () => {
      alive = false;
    };
  }, [dialog]);

  /* The list holds focus, not a row: Enter then means "choose the highlighted
     version" rather than "press the row the pointer is over". */
  useEffect(() => {
    if (options && options.length > 0) list.current?.focus();
  }, [options]);

  const choose = () => {
    if (options && options[active]) onClose(options[active].value);
  };

  const move = (index) => {
    if (!options || index < 0 || index >= options.length) return;
    setActive(index);
  };

  const onListKeyDown = (event) => {
    if (!options) return;
    const last = options.length - 1;
    if (event.key === "ArrowDown") move(Math.min(active + 1, last));
    else if (event.key === "ArrowUp") move(Math.max(active - 1, 0));
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(last);
    else return;
    event.preventDefault();
  };

  return (
    <Dialog onClose={() => onClose(null)} onEnter={choose}>
      <div className="dialog-body">
        <h2 className="dialog-title">{dialog.title}</h2>
        {dialog.label ? <p className="dialog-text">{dialog.label}</p> : null}

        {options && options.length > 0 ? (
          <div
            ref={list}
            className="dialog-list"
            role="listbox"
            tabIndex={0}
            aria-label={dialog.label || dialog.title}
            aria-activedescendant={`cokpyt-choice-${active}`}
            onKeyDown={onListKeyDown}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                id={`cokpyt-choice-${index}`}
                className="dialog-option"
                type="button"
                role="option"
                aria-selected={index === active}
                onClick={() => setActive(index)}
              >
                <span className="dialog-option-mark">
                  <Icon name="check" size={13} />
                </span>
                <span className="dialog-option-name">{option.label}</span>
                {option.badge ? <span className="badge">{option.badge}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <p className="dialog-foot">
          {error ||
            (options === null
              ? "Looking this up…"
              : options.length === 0
                ? "Nothing to choose from."
                : `${options.length} to choose from.`)}
        </p>
      </div>
      <div className="dialog-actions">
        <button className="btn" type="button" onClick={() => onClose(null)}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          type="button"
          disabled={!options || options.length === 0}
          onClick={choose}
        >
          {dialog.confirm}
        </button>
      </div>
    </Dialog>
  );
}
