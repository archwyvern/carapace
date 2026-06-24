import type { ReactNode } from "react";

export interface StatusBarProps {
  left?: ReactNode;
  right?: ReactNode;
}

/** Optional bottom strip. */
export function StatusBar({ left, right }: StatusBarProps) {
  return (
    <footer className="flex min-h-6 items-center justify-between border-t border-border bg-surface px-2 text-base text-fg-mid">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </footer>
  );
}
