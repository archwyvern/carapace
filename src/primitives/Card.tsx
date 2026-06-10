import type { HTMLAttributes, KeyboardEvent } from "react";
import { cx } from "../cx";

/**
 * Surface container with the standard border. `interactive` adds an accent
 * hover-border, pointer cursor, and keyboard operability (role=button, Enter/Space
 * trigger the click). Padding is the caller's choice.
 */
export function Card({
  interactive = false,
  className,
  onKeyDown,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e);
    if (interactive && !e.defaultPrevented && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.currentTarget.click();
    }
  }
  return (
    <div
      className={cx(
        "border border-border bg-surface transition",
        interactive && "cursor-pointer hover:border-accent/60",
        className,
      )}
      {...(interactive ? { role: "button", tabIndex: 0 } : {})}
      {...rest}
      onKeyDown={handleKeyDown}
    />
  );
}
