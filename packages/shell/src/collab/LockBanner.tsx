import type { ReactNode } from "react";
import { cx } from "../cx";

export interface LockBannerProps {
  /** Display name of the lock holder. */
  holder: string;
  /** Overrides the default message entirely. */
  message?: ReactNode;
  className?: string;
}

/** Read-only strip shown to non-holders while someone else holds the edit lock. */
export function LockBanner({ holder, message, className }: LockBannerProps) {
  return (
    <div role="status" className={cx("border-b border-accent/20 bg-accent/10 px-3 py-1.5 text-sm text-fg", className)}>
      {message ?? (
        <>
          Being edited by <span className="text-accent">{holder}</span> — read-only until they finish.
        </>
      )}
    </div>
  );
}
