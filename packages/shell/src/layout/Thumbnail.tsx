import type { MouseEvent, ReactNode } from "react";
import { cx } from "../cx";
import { StatusDot } from "../primitives/StatusDot";
import type { BadgeTone } from "../primitives/Badge";

export interface ThumbnailProps {
  src?: string;
  label?: ReactNode;
  /** Status indicator dot tone (omit for none). */
  status?: BadgeTone;
  statusPulse?: boolean;
  /** Corner overlay (e.g. a Badge or tag). */
  badge?: ReactNode;
  selected?: boolean;
  /** Square edge length in px. Default 120. */
  size?: number;
  onClick?: (e: MouseEvent) => void;
  onDoubleClick?: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  className?: string;
}

/** Asset/preview tile: square image (or placeholder) + optional status dot, corner badge,
 *  selection ring, and a label beneath. Drops into a {@link Grid}; pairs with useGridSelection. */
export function Thumbnail({
  src,
  label,
  status,
  statusPulse,
  badge,
  selected = false,
  size = 120,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
}: ThumbnailProps) {
  return (
    <div
      className={cx("group flex cursor-pointer flex-col gap-1", className)}
      style={{ width: size }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-control border bg-surface-sunken",
          selected ? "border-accent ring-1 ring-accent" : "border-border group-hover:border-fg-mid/40",
        )}
        style={{ width: size, height: size }}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xs text-fg-mid">no preview</div>
        )}
        {status && (
          <span className="absolute left-1 top-1">
            <StatusDot tone={status} pulse={statusPulse} />
          </span>
        )}
        {badge && <span className="absolute right-1 top-1">{badge}</span>}
      </div>
      {label !== undefined && (
        <div className="truncate text-base text-fg" style={{ width: size }}>
          {label}
        </div>
      )}
    </div>
  );
}
