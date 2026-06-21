import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "../cx";
import { CloseIcon } from "../icons";
import { Popover } from "../overlay/Popover";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Optional autocomplete pool, filtered by the draft and shown in a popover. */
  suggestions?: string[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Multi-tag chip input. Enter or comma commits the draft, Backspace on an empty field
 * removes the last chip, duplicates are ignored. Optional `suggestions` autocomplete via a
 * {@link Popover}. The chip + combobox pattern (filters, categories, wiki links).
 */
export function TagInput({ value, onChange, suggestions = [], placeholder, ariaLabel, className }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const t = raw.trim();
    setDraft("");
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
  };
  const removeAt = (i: number) => onChange(value.filter((_, k) => k !== i));

  const matches = suggestions
    .filter((s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 8);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length) {
      removeAt(value.length - 1);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <>
      <div
        ref={wrapRef}
        onClick={() => inputRef.current?.focus()}
        className={cx(
          "flex min-h-[22px] w-full flex-wrap items-center gap-1 rounded-control border border-border bg-surface-sunken px-1 py-0.5 text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] focus-within:border-accent",
          className,
        )}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-accent/15 px-1 text-2xs text-accent"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              className="flex text-accent/70 hover:text-accent"
            >
              <CloseIcon className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          aria-label={ariaLabel}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-[60px] flex-1 bg-transparent text-fg outline-none placeholder:text-fg-mid/60"
        />
      </div>
      <Popover
        open={open && draft.trim().length > 0 && matches.length > 0}
        onClose={() => setOpen(false)}
        anchorRef={wrapRef}
        matchWidth
      >
        <ul role="listbox">
          {matches.map((s) => (
            <li
              key={s}
              role="option"
              onClick={() => {
                add(s);
                inputRef.current?.focus();
              }}
              className="cursor-pointer px-2 py-1 text-xs text-fg-mid hover:bg-list-active hover:text-fg"
            >
              {s}
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}
