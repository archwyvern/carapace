import { useEffect, useRef, useState } from "react";

export interface TreeFindProps {
  onPatternChange: (pattern: string) => void;
  onClose: () => void;
  /** Optional match navigation (when wired to highlight rather than filter). */
  matchCount?: number;
  currentMatch?: number;
  onNext?: () => void;
  onPrev?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** A find bar for a tree: a filter input + optional match count + close. */
export function TreeFind({
  onPatternChange,
  onClose,
  matchCount,
  currentMatch,
  onNext,
  onPrev,
  placeholder = "Find",
  autoFocus = true,
}: TreeFindProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState("");

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [autoFocus]);

  const showCount = matchCount !== undefined;

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-surface-raised px-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={pattern}
        placeholder={placeholder}
        onChange={(e) => {
          setPattern(e.target.value);
          onPatternChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          } else if (e.key === "Enter") {
            e.preventDefault();
            (e.shiftKey ? onPrev : onNext)?.();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onNext?.();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onPrev?.();
          }
        }}
        className="h-[23px] min-w-0 flex-1 border border-border bg-surface px-1.5 text-sm text-fg outline-none focus:border-accent"
      />
      {showCount && (
        <span className="shrink-0 whitespace-nowrap text-xs text-fg-mid">
          {pattern ? (matchCount! > 0 ? `${(currentMatch ?? 0) + 1}/${matchCount}` : "No results") : ""}
        </span>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close find"
        className="shrink-0 px-1 text-fg-mid hover:text-fg"
      >
        ✕
      </button>
    </div>
  );
}
