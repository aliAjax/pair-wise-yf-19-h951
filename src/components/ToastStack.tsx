export type ToastKind = "ok" | "warn" | "err";

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const ICON: Record<ToastKind, string> = {
  ok: "✓",
  warn: "⚠",
  err: "✕",
};

export default function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <b>{ICON[t.kind]}</b>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
