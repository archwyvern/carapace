import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";

export type ToastTone = "info" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  /** Show a transient notification. Pass `duration: 0` to make it sticky. */
  notify: (message: string, opts?: { tone?: ToastTone; duration?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_BORDER: Record<ToastTone, string> = {
  info: "border-info/50",
  success: "border-success/50",
  error: "border-error/50",
};
const TONE_DOT: Record<ToastTone, string> = {
  info: "bg-info",
  success: "bg-success",
  error: "bg-error",
};

/** Global notification system. Each toast is its own live region (error = alert). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback<ToastApi["notify"]>(
    (message, opts) => {
      const id = ++seq.current;
      const tone = opts?.tone ?? "info";
      setToasts((t) => [...t, { id, message, tone }]);
      const duration = opts?.duration ?? (tone === "error" ? 6000 : 3500);
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[110] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto flex max-w-[360px] items-start gap-2 border bg-surface-raised px-3 py-2 text-sm text-fg shadow-lg",
              TONE_BORDER[t.tone],
            )}
          >
            <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[t.tone])} />
            <span className="flex-1 whitespace-pre-line break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-base leading-none text-fg-mid hover:text-fg"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
