import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { PromptDialog } from "./PromptDialog";

export interface PromptOptions {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Optional sync validator. Return a string to show as an error and block confirm. */
  validate?: (value: string) => string | null;
}

type PromptFn = (options: PromptOptions) => Promise<string | null>;

const PromptContext = createContext<PromptFn | null>(null);

interface Pending {
  options: PromptOptions;
  resolve: (result: string | null) => void;
}

/**
 * Provides the imperative `usePrompt()` dialog: `await prompt(opts)` resolves the
 * entered (trimmed) string, or null on cancel. Renders the active dialog over its
 * children. Mount once near the app root. Mirrors {@link ConfirmProvider}.
 */
export function PromptProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const prompt = useCallback<PromptFn>(
    (options) => new Promise<string | null>((resolve) => setPending({ options, resolve })),
    [],
  );

  const finish = (result: string | null) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {pending && (
        <PromptDialog
          title={pending.options.title}
          message={pending.options.message}
          initialValue={pending.options.initialValue}
          placeholder={pending.options.placeholder}
          confirmLabel={pending.options.confirmLabel}
          validate={pending.options.validate}
          onConfirm={(value) => finish(value)}
          onCancel={() => finish(null)}
        />
      )}
    </PromptContext.Provider>
  );
}

/** Returns an async `prompt(options)` resolving the entered string, or null on cancel. */
export function usePrompt(): PromptFn {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used within <PromptProvider>");
  return ctx;
}

/**
 * Like {@link usePrompt} but returns null when there is no `PromptProvider` — for
 * components that should prompt only when one is present.
 */
export function useOptionalPrompt(): PromptFn | null {
  return useContext(PromptContext);
}
