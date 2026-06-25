import type { CSSProperties } from "react";

/** One pickable tile. */
export interface PaletteItem {
  /** Stable id passed to onPick and set as the drag payload. */
  id: string;
  /** Tooltip + the text shown when no icon is supplied. */
  label: string;
  /** Icon URL (e.g. a rendered PNG/SVG). Omit to render the label text instead. */
  icon?: string;
}

/** A labelled section of tiles. */
export interface PaletteGroup {
  label: string;
  items: PaletteItem[];
}

export interface PaletteProps {
  groups: PaletteGroup[];
  /** Pick a tile (fires per `pickOn`). */
  onPick?: (id: string) => void;
  /** Whether onPick fires on a single click (default) or a double click; the other does nothing. */
  pickOn?: "click" | "doubleClick";
  /** Drag MIME type; the dragged item's id is the payload. Omit to disable dragging. */
  dragMime?: string;
  /** Fired when a tile drag STARTS (e.g. to close a host popover so it doesn't obscure the drop target). */
  onDragStart?: () => void;
  /** Fired when a tile drag ends (e.g. to close a host popover). */
  onDragEnd?: () => void;
  /** Max columns per section grid (default 3). */
  maxColumns?: number;
  /** Square tile edge (CSS length, default "4rem"). */
  tileSize?: string;
  /** Extra classes on the root (positioning, shadow) — e.g. for a popover wrapper. */
  className?: string;
  style?: CSSProperties;
}

/**
 * Palette — a categorized icon-tile picker. Sections lay out horizontally with dividers between them,
 * each a tight grid of square clay tiles; tiles click (onPick) and optionally drag (dragMime, with
 * the item id as payload). Generic over content: the consumer maps its own catalogue into `groups`
 * and supplies icon URLs. Wrap it in a popover/panel for an "add" affordance.
 */
export function Palette({ groups, onPick, pickOn = "click", dragMime, onDragStart, onDragEnd, maxColumns = 3, tileSize = "4rem", className, style }: PaletteProps) {
  return (
    <div
      className={`flex items-stretch divide-x divide-border border border-border bg-surface-raised p-3${className ? ` ${className}` : ""}`}
      style={style}
    >
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col px-4 first:pl-0 last:pr-0">
          <div className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-fg-mid">{group.label}</div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(group.items.length, maxColumns)}, ${tileSize})` }}
          >
            {group.items.map((item) => (
              <button
                key={item.id}
                title={item.label}
                style={{ height: tileSize }}
                className="flex cursor-grab items-center justify-center border border-border bg-surface-sunken p-1 transition hover:border-accent/50 hover:bg-surface"
                draggable={dragMime !== undefined}
                onDragStart={
                  dragMime !== undefined
                    ? (e) => {
                        e.dataTransfer.setData(dragMime, item.id);
                        onDragStart?.();
                      }
                    : undefined
                }
                onDragEnd={onDragEnd}
                onClick={pickOn === "click" ? () => onPick?.(item.id) : undefined}
                onDoubleClick={pickOn === "doubleClick" ? () => onPick?.(item.id) : undefined}
              >
                {item.icon !== undefined ? (
                  <img src={item.icon} alt={item.label} className="h-full w-full" draggable={false} />
                ) : (
                  <span className="text-sm text-fg">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
