import { Icon } from "../ui/components.jsx";
import { useDismissToast, useToasts } from "../app/ToastProvider.jsx";

function iconFor(tone) {
  if (tone === "ok") return "check";
  if (tone === "danger" || tone === "warn") return "warning";
  return "info";
}

export function Toaster() {
  const toasts = useToasts();
  const dismiss = useDismissToast();

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((item) => (
        <div key={item.id} className="toast" data-tone={item.tone}>
          <Icon name={iconFor(item.tone)} size={16} />
          <span>{item.message}</span>
          <button
            className="icon-btn toast-close"
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(item.id)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
