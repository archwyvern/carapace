import { cx } from "../cx";
import { Tooltip } from "../overlay/Tooltip";

export interface PresenceUser {
  /** Pre-resolved display name — consumers map emails/ids before passing. */
  name: string;
}

export interface PresenceStackProps {
  users: PresenceUser[];
  /** Visible avatars before collapsing into a "+N" chip. Default 4. */
  max?: number;
  className?: string;
}

const CIRCLE =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-sm text-fg";

/** Overlapping initial-letter avatars for who's-here presence. Dedups by name;
 *  beyond `max` the tail collapses into a "+N" chip listing the rest. */
export function PresenceStack({ users, max = 4, className }: PresenceStackProps) {
  const names = [...new Set(users.map((u) => u.name))];
  if (names.length === 0) return null;

  const visible = names.length > max ? names.slice(0, max - 1) : names;
  const overflow = names.slice(visible.length);

  return (
    <div aria-label={`${names.length} people here`} className={cx("flex items-center", className)}>
      {visible.map((name, i) => (
        <Tooltip key={name} content={name}>
          <span className={cx(CIRCLE, i > 0 && "-ml-1.5")}>{name.trim().charAt(0).toUpperCase()}</span>
        </Tooltip>
      ))}
      {overflow.length > 0 && (
        <Tooltip content={overflow.join(", ")}>
          <span className={cx(CIRCLE, "-ml-1.5")}>+{overflow.length}</span>
        </Tooltip>
      )}
    </div>
  );
}
