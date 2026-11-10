import type { Metadata, Viewport } from "next";
import "./styles.css";

import { publicPath } from "../lib/public-path";

export const metadata: Metadata = {
  title: "NEXUS · Tu espacio para pensar",
  description: "Captura, organiza y conecta tu conocimiento personal.",
  manifest: publicPath("/manifest.webmanifest"),
  icons: { icon: publicPath("/nexus.svg"), apple: publicPath("/apple-icon.png") },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NEXUS" }
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f2fa" }, { media: "(prefers-color-scheme: dark)", color: "#11111d" }] };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
