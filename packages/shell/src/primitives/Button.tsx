import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "accent" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: "bg-surface-raised text-fg hover:bg-border",
  accent: "bg-accent text-accent-fg hover:brightness-110",
  ghost: "bg-transparent text-fg-mid border border-border hover:text-fg hover:bg-surface-raised",
  danger: "bg-error text-fg hover:brightness-110",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "default", size = "sm", className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-control ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}
