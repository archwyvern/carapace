import type { InputHTMLAttributes, Ref } from "react";
import { cx } from "../cx";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error styling (red border). */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Bare single-line input with carapace's inset-well styling — the naked control
 * that {@link FormString} wraps with a label. Use directly for search boxes,
 * filter fields, toolbar inputs, etc.
 */
export function TextInput({ invalid = false, type = "text", className, ref, ...rest }: TextInputProps) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx(
        "h-[22px] w-full rounded-control border bg-surface-sunken px-1.5 text-xs text-fg outline-none",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] placeholder:text-fg-mid/60",
        "disabled:cursor-default disabled:opacity-60",
        invalid ? "border-error focus:border-error" : "border-border focus:border-accent",
        className,
      )}
      {...rest}
    />
  );
}
