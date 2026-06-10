import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "accent";

const VARIANT_CLASS: Record<Variant, string> = {
  default: "bg-surface-raised text-fg hover:bg-border",
  accent: "bg-accent text-accent-fg hover:brightness-110",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "default", className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-control px-3 py-1 text-sm ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}
