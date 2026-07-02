import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { Tooltip } from "../overlay/Tooltip";

const iconButton = tv({
  base: "inline-flex shrink-0 items-center justify-center rounded-control outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
  variants: {
    variant: {
      ghost: "text-fg-mid hover:bg-surface-raised hover:text-fg",
      default: "bg-surface-raised text-fg hover:bg-border",
      accent: "bg-accent text-accent-fg hover:brightness-110",
      danger: "text-fg-mid hover:bg-error/15 hover:text-error",
    },
    size: {
      sm: "h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5",
      md: "h-7 w-7 [&_svg]:h-4 [&_svg]:w-4",
    },
    // Pressed/toggled: gold tint that wins over the variant's colours, hover included.
    active: { true: "bg-list-active text-accent hover:bg-list-active hover:text-accent" },
  },
  defaultVariants: { variant: "ghost", size: "sm" },
});

type IconButtonVariantProps = VariantProps<typeof iconButton>;
export type IconButtonVariant = NonNullable<IconButtonVariantProps["variant"]>;
export type IconButtonSize = NonNullable<IconButtonVariantProps["size"]>;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, IconButtonVariantProps {
  /** Required: icon-only buttons have no visible text, so they need an accessible name. */
  label: string;
  icon: ReactNode;
  /** Styled hover/focus hint via <Tooltip> — replaces the native `title` (suppressed when set).
   *  `true` uses the label as the content. */
  tooltip?: ReactNode | boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Square icon-only button — toolbars, row actions, panel-header controls. */
export function IconButton({
  label,
  icon,
  tooltip,
  variant,
  size,
  active,
  title,
  className,
  ref,
  ...rest
}: IconButtonProps) {
  const tip = tooltip === true ? label : tooltip === false ? undefined : tooltip;
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={tip ? undefined : (title ?? label)}
      aria-pressed={active || undefined}
      className={iconButton({ variant, size, active, className })}
      {...rest}
    >
      {icon}
    </button>
  );
  return tip ? <Tooltip content={tip}>{button}</Tooltip> : button;
}
