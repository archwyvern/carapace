import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Adds a third button (e.g. "Don't Save") that resolves with "tertiary". */
  tertiaryLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}

export type ConfirmResult = "confirm" | "cancel" | "tertiary";

type ConfirmFn = (options: ConfirmOptions) => Promise<ConfirmResult>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface Pending {
  options: ConfirmOptions;
  resolve: (result: ConfirmResult) => void;
}

/**
 * Provides the imperative `useConfirm()` dialog: `await confirm(opts)` resolves
 * "confirm" | "cancel" | "tertiary". Renders the active dialog over its children.
 * Mount once near the app root.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<ConfirmResult>((resolve) => setPending({ options, resolve })),
    [],
  );

  const finish = (result: ConfirmResult) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmDialog
          title={pending.options.title}
          message={pending.options.message}
          confirmLabel={pending.options.confirmLabel}
          cancelLabel={pending.options.cancelLabel}
          tertiaryLabel={pending.options.tertiaryLabel}
          danger={pending.options.danger}
          onConfirm={() => finish("confirm")}
          onCancel={() => finish("cancel")}
          onTertiary={() => finish("tertiary")}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/** Returns an async `confirm(options)` resolving "confirm" | "cancel" | "tertiary". */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

/**
 * Like {@link useConfirm} but returns null instead of throwing when there is no
 * `ConfirmProvider` — for components that should confirm only when one is present.
 */
export function useOptionalConfirm(): ConfirmFn | null {
  return useContext(ConfirmContext);
}
