"use client";

import { useAppStore } from "@/lib/storage/store";
import type { ThemeMode } from "@/types/domain";
import { Icon, type IconName } from "./Icon";

const NEXT: Record<ThemeMode, ThemeMode> = { auto: "light", light: "dark", dark: "auto" };
const ICON: Record<ThemeMode, IconName> = { auto: "contrast", light: "sun", dark: "moon" };
const LABEL: Record<ThemeMode, string> = {
  auto: "Tema automático (según el celular)",
  light: "Tema claro, para el sol",
  dark: "Tema oscuro, para la noche",
};

export function ThemeToggle() {
  const theme = useAppStore((state) => state.settings.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`${LABEL[theme]}. Tocar para cambiar`}
      title={LABEL[theme]}
      className="flex h-12 w-12 items-center justify-center rounded-xl active:bg-white/15"
    >
      <Icon name={ICON[theme]} size={24} />
    </button>
  );
}
