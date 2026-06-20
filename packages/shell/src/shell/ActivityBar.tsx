import type { ReactNode } from "react";

export interface ActivityItem {
  id: string;
  icon: ReactNode;
  title: string;
  /** Optional caption rendered under the icon. When any item has one, the bar
   *  switches to the wider labeled-rail layout. */
  label?: string;
  active?: boolean;
  onClick: () => void;
}

/** Optional left icon strip — the sidebar mode-switcher. Icon-only by default;
 *  renders a labeled rail when items carry a `label`. */
export function ActivityBar({ items }: { items: ActivityItem[] }) {
  const labeled = items.some((i) => i.label);
  return (
    <nav
      className={`flex ${labeled ? "w-20" : "w-12"} flex-col items-center gap-1 border-r border-border bg-surface py-2`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.title}
          title={item.title}
          aria-pressed={item.active ?? false}
          onClick={item.onClick}
          className={`flex items-center justify-center border-l-2 hover:text-fg ${
            labeled ? "w-full flex-col gap-1 py-2.5" : "h-10 w-10"
          } ${item.active ? "border-accent text-fg" : "border-transparent text-fg-mid"}`}
        >
          <span className="flex items-center justify-center leading-none [&_svg]:size-6">
            {item.icon}
          </span>
          {item.label && <span className="text-2xs uppercase leading-none">{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}
