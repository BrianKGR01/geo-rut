import type { ReactNode } from "react";

type Tone = "info" | "warn" | "danger" | "ok";

const TONES: Record<Tone, string> = {
  info: "bg-via-tint border-via-solid",
  warn: "bg-warn-tint border-warn-solid",
  danger: "bg-danger-tint border-danger-solid",
  ok: "bg-ok-tint border-ok-solid",
};

interface BannerProps {
  tone?: Tone;
  children: ReactNode;
  action?: ReactNode;
  /** `alert` interrumpe al lector de pantalla; úsalo solo para errores. */
  role?: "status" | "alert";
}

export function Banner({ tone = "info", children, action, role = "status" }: BannerProps) {
  return (
    <div
      role={role}
      className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm font-semibold text-ink ${TONES[tone]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
