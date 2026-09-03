import type { Metadata } from "next";
import path from "node:path";
import { Suspense } from "react";
import StreamRefreshController from "@/components/codex/StreamRefreshController";
import PersistentFooter from "@/components/codex/PersistentFooter";
import WikiSidebar from "@/components/codex/WikiSidebar";
import { getThemeCssVariables } from "@/src/theme/cssVariables";
import "./globals.css";

const themeCssVariables = getThemeCssVariables();

const SITE_NAME = "Aresh Codex";
const SITE_DESCRIPTION =
  "A browsable field archive of the world of Areshnaat — pantheon, regions, cultures, and languages, recorded as a pre-industrial atlas.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.areshatlas.com"),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/vendor/rpg-awesome/css/rpg-awesome.min.css" />
        <style id="theme-tokens">{themeCssVariables}</style>
      </head>
      <body>
        <Suspense fallback={null}>
          <StreamRefreshController />
        </Suspense>
        <div className="wiki-page-shell">
          <div className="wiki-page-frame wiki-shell-frame">
            <div className="wiki-shell-layout">
              <aside className="wiki-sidebar">
                <WikiSidebar />
              </aside>
              <div className="wiki-main">{children}</div>
            </div>
            <PersistentFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
