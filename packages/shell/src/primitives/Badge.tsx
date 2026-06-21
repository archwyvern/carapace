import type { HTMLAttributes, Ref } from "react";
import { tv, type VariantProps } from "tailwind-variants";

/** Tone class table. Tinted form (colour-on-tint) is intentional — not the solid `-fg` pairing. */
export const badgeVariants = tv({
  // rounded + a subtle vertical tint gradient + a 1px top highlight = lit-from-above depth
  // (vs the old flat tint that read as a cheap sticker).
  base: "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs uppercase tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  variants: {
    tone: {
      accent: "border-accent/40 bg-gradient-to-b from-accent/25 to-accent/10 text-accent",
      info: "border-info/40 bg-gradient-to-b from-info/25 to-info/10 text-info",
      success: "border-success/40 bg-gradient-to-b from-success/25 to-success/10 text-success",
      warning: "border-warning/40 bg-gradient-to-b from-warning/25 to-warning/10 text-warning",
      error: "border-error/40 bg-gradient-to-b from-error/25 to-error/10 text-error",
      neutral: "border-border bg-gradient-to-b from-surface-raised to-surface text-fg-mid",
    },
  },
  defaultVariants: { tone: "accent" },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

/** Small uppercase status chip. */
export function Badge({
  tone,
  className,
  ref,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; ref?: Ref<HTMLSpanElement> }) {
  return <span ref={ref} className={badgeVariants({ tone, className })} {...rest} />;
}
