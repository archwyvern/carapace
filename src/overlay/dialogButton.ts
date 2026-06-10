// Shared button classes for the dialog family.

export const CANCEL_BTN = "px-4 py-1.5 text-sm text-fg-mid hover:text-fg";

export function confirmBtn(opts: { danger?: boolean; disabled?: boolean }): string {
  const base = "border px-5 py-1.5 text-sm uppercase tracking-wide";
  if (opts.disabled) return `${base} cursor-not-allowed border-border bg-surface-sunken text-fg-mid`;
  if (opts.danger) return `${base} cursor-pointer border-error/30 bg-error/10 text-error hover:bg-error/20`;
  return `${base} cursor-pointer border-accent/40 bg-accent/15 text-accent hover:bg-accent/25`;
}

export const DIALOG_INPUT =
  "mb-2 w-full border border-border bg-surface-sunken px-2.5 py-1 text-sm text-fg outline-none focus:border-accent";
