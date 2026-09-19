import type { ReactNode } from "react";

/** Íconos de trazo propios (24×24): evitan sumar una librería para una veintena de formas. */
const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  "arrow-left": <path d="M19 12H5m7 7-7-7 7-7" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-up": <path d="m6 15 6-6 6 6" />,
  navigation: <path d="M3 11 22 2l-9 19-2-8-8-2Z" />,
  play: <path d="M6 3 20 12 6 21V3Z" />,
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  grip: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3.2} />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  contrast: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
    </>
  ),
  flag: <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12Zm0 7v-7" />,
  home: <path d="M3 10.5 12 3l9 7.5V21H3V10.5ZM9 21v-6h6v6" />,
  trash: <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v6m4-6v6" />,
  "map-pin": (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  undo: <path d="M3 7v6h6m12 4a9 9 0 0 0-15-6.7L3 13" />,
  expand: <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3" />,
  clipboard: <path d="M9 2h6v4H9V2Zm7 2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />,
  refresh: <path d="M3 12a9 9 0 0 1 15-6.7L21 8m0-5v5h-5m5 4a9 9 0 0 1-15 6.7L3 16m0 5v-5h5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 22, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className ?? ""}`}
    >
      {PATHS[name]}
    </svg>
  );
}
