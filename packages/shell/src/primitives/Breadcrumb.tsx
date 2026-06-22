import type { ReactNode } from "react";
import { cx } from "../cx";

export interface BreadcrumbItem {
  label: ReactNode;
  /** When set, the segment is a button that navigates. The last item is always
   *  rendered as the (non-clickable) current location. */
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** A path trail (Parent / Child / Current). Items with `onClick` render as
 *  buttons; the last item is the current location and is never clickable. */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cx("flex min-w-0 items-center gap-1 text-base", className)}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <span className="shrink-0 text-fg-mid" aria-hidden>/</span>}
            {it.onClick && !last ? (
              <button
                type="button"
                onClick={it.onClick}
                className="truncate rounded-control px-0.5 text-fg-mid hover:text-fg hover:underline"
              >
                {it.label}
              </button>
            ) : (
              <span className={cx("truncate", last ? "font-semibold text-fg" : "text-fg-mid")}>{it.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
