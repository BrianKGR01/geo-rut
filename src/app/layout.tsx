import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "RutaTiendas",
  description: "Planifica y ejecuta tu ruta de entregas a tiendas.",
  applicationName: "RutaTiendas",
  appleWebApp: { capable: true, title: "RutaTiendas", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // La barra superior es color asfalto en ambos temas; la del sistema la acompaña.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#14181d" },
    { media: "(prefers-color-scheme: dark)", color: "#05070a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
