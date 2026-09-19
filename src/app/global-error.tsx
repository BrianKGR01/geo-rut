"use client";

import "./globals.css";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

// Reemplaza al layout raíz cuando falla: debe traer su propio <html> y <body>.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="es">
      <body>
        <title>RutaTiendas — error</title>
        <ErrorScreen onRetry={retry} />
      </body>
    </html>
  );
}
