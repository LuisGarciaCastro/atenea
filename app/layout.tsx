import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Newsreader } from "next/font/google";
import "./globals.css";

// Única fuente web: la serif de lectura (títulos de libros, citas, highlights).
// El resto del hub usa la fuente del sistema (SF Pro en Mac/iPhone).
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atenea",
  description: "Centro de conocimiento personal",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atenea",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tema claro fijo (issue #99): no seguir prefers-color-scheme del
  // dispositivo, ni siquiera para el color de la barra de estado.
  themeColor: "#f2f2f4",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={newsreader.variable}>
      <body>{children}</body>
    </html>
  );
}
