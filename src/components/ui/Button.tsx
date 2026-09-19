import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  // Amarillo señal con texto asfalto: la acción principal se reconoce a pleno sol y de noche.
  primary: "bg-signal text-on-signal border-2 border-on-signal active:bg-signal-press",
  secondary: "bg-card text-ink border-2 border-strong active:bg-raised",
  success: "bg-ok-solid text-white border-2 border-ok-solid active:opacity-90",
  danger: "bg-danger-solid text-white border-2 border-danger-solid active:opacity-90",
  ghost: "bg-transparent text-via underline underline-offset-4 active:bg-raised",
};

export function buttonClass(variant: ButtonVariant = "primary", big = false): string {
  const size = big
    ? "min-h-14 text-xl font-display font-bold uppercase tracking-wide"
    : "min-h-12 text-lg font-display font-semibold tracking-wide";
  return `inline-flex items-center justify-center gap-2 rounded-xl px-3 leading-none select-none transition-colors disabled:opacity-45 ${size} ${VARIANTS[variant]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  big?: boolean;
  icon?: IconName;
}

export function Button({ variant, big, icon, className = "", type = "button", children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass(variant, big)} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={big ? 24 : 20} />}
      {children}
    </button>
  );
}
