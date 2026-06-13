import type { ReactNode } from "react";

export interface ActivityItem {
  id: string;
  icon: ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}

/** Optional left icon strip — the sidebar mode-switcher. */
export function ActivityBar({ items }: { items: ActivityItem[] }) {
  return (
    <nav className="flex w-12 flex-col items-center gap-1 border-r border-border bg-surface py-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.title}
          title={item.title}
          aria-pressed={item.active ?? false}
          onClick={item.onClick}
          className={`flex h-10 w-10 items-center justify-center border-l-2 hover:text-fg ${
            item.active ? "border-accent text-fg" : "border-transparent text-fg-mid"
          }`}
        >
          <span className="flex items-center justify-center text-2xl leading-none [&_svg]:size-6">
            {item.icon}
          </span>
        </button>
      ))}
    </nav>
  );
}
