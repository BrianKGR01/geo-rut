import type { ReactNode } from "react";

type Tone = "info" | "warn" | "danger" | "ok";

const TONES: Record<Tone, string> = {
  info: "bg-info-soft border-brand text-ink",
  warn: "bg-warn-soft border-warn text-ink",
  danger: "bg-danger-soft border-danger text-ink",
  ok: "bg-ok-soft border-ok text-ink",
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
      className={`flex items-center gap-3 rounded-xl border-l-4 px-3 py-2 text-sm font-medium ${TONES[tone]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
