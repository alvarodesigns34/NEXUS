import type { NextConfig } from "next";

const pagesPreview = process.env.NEXUS_PAGES_PREVIEW === "true";
const basePath = pagesPreview ? process.env.NEXT_PUBLIC_NEXUS_BASE_PATH || "" : "";

const serverHeaders: NonNullable<NextConfig["headers"]> = async () => [{
  source: "/:path*",
  headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "same-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
  ]
}];

const config: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_NEXUS_BASE_PATH: basePath },
  // Only the Node build discovers route.server.ts handlers.
  pageExtensions: pagesPreview ? ["tsx", "ts"] : ["server.ts", "tsx", "ts"],
  poweredByHeader: false,
  devIndicators: false,
  ...(pagesPreview ? { output: "export", trailingSlash: true } : { headers: serverHeaders })
};

export default config;
