import type { Metadata, Viewport } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "NEXUS · Tu espacio para pensar",
  description: "Captura, organiza y conecta tu conocimiento personal.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/nexus.svg", apple: "/apple-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NEXUS" }
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#f6f5f0" };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
