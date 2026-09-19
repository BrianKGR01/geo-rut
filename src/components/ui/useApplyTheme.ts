import { useEffect } from "react";
import { useAppStore } from "@/lib/storage/store";

/** Refleja el tema elegido en <html data-theme>; "auto" deja mandar al sistema (ver globals.css). */
export function useApplyTheme() {
  const theme = useAppStore((state) => state.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
}
