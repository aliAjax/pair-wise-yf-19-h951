import type { ToastItem } from "../types";

interface Props {
  toasts: ToastItem[];
  onAction: (toast: ToastItem) => void;
}

export function Toasts({ toasts, onAction }: Props) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.text}</span>
          {t.action && (
            <button className="toast-action" onClick={() => onAction(t)}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
