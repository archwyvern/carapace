import type { ButtonHTMLAttributes, Ref } from "react";
import { tv, type VariantProps } from "tailwind-variants";

/** Variant/size class table (tailwind-variants — bundles tailwind-merge, so a caller's
 *  `className` reliably overrides). The reference pattern for carapace's variant components. */
export const buttonVariants = tv({
  base: "rounded-control outline-none transition focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
  variants: {
    // Filled variants get a drop shadow + a 1px inner top highlight (lit-from-above);
    // ghost stays intentionally flat/quiet.
    variant: {
      default: "bg-surface-raised text-fg shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-border",
      accent: "bg-accent text-accent-fg shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-110",
      ghost: "border border-border bg-transparent text-fg-mid hover:bg-surface-raised hover:text-fg",
      danger: "bg-error text-error-fg shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-110",
    },
    size: {
      sm: "px-3 py-1 text-base",
      md: "px-4 py-2 text-base",
    },
  },
  defaultVariants: { variant: "default", size: "sm" },
});

type ButtonVariantProps = VariantProps<typeof buttonVariants>;
export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>;
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, size, className, ref, ...rest }: ButtonProps) {
  return <button ref={ref} className={buttonVariants({ variant, size, className })} {...rest} />;
}
