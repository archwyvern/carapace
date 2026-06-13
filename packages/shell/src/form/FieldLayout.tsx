import type { ReactNode } from "react";

export type FieldLayoutMode = "stacked" | "inline";

export interface FieldLayoutProps {
  label: string;
  /** `inline` = a two-column property-grid row (label left, control right). `stacked` = label above. */
  layout?: FieldLayoutMode;
  children: ReactNode;
}

/**
 * Shared label + control layout for the form controls and the inspector. `inline` is the
 * dense property-grid row used by the inspector for scalars; `stacked` (the default) suits
 * wide controls (Vector3/4, colours, arrays) and standalone form use. A wrapping `<label>`
 * keeps the control's accessible name associated with the text.
 */
export function FieldLayout({ label, layout = "stacked", children }: FieldLayoutProps) {
  if (layout === "inline") {
    return (
      <label className="flex items-center gap-2">
        <span className="w-2/5 shrink-0 truncate text-sm text-fg-mid">{label}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-sm text-fg-mid">{label}</span>
      {children}
    </label>
  );
}
