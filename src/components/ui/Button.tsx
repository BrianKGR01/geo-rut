import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white active:bg-brand-strong",
  secondary: "bg-paper text-ink border-2 border-ink active:bg-surface",
  success: "bg-ok text-white active:opacity-90",
  danger: "bg-danger text-white active:opacity-90",
  ghost: "bg-transparent text-brand-strong underline active:bg-surface",
};

export function buttonClass(variant: ButtonVariant = "primary", big = false): string {
  const size = big ? "min-h-14 text-lg" : "min-h-12 text-base";
  return `inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold select-none transition-colors disabled:opacity-50 ${size} ${VARIANTS[variant]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  big?: boolean;
}

export function Button({ variant, big, className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, big)} ${className}`} {...rest} />;
}
