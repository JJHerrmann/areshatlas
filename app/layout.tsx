import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import StreamRefreshController from "@/components/codex/StreamRefreshController";
import PersistentFooter from "@/components/codex/PersistentFooter";
import WikiSidebar from "@/components/codex/WikiSidebar";
import { getThemeCssVariables } from "@/src/theme/cssVariables";
import "./globals.css";

const publicRoot = path.join(process.cwd(), "public");
const siteIcoPath = path.join(publicRoot, "site.ico");
const themeCssVariables = getThemeCssVariables();

export const metadata: Metadata = {
  title: "Aresh Codex",
  description: "The Natural and Geographic Survey of Aresh",
  icons: fs.existsSync(siteIcoPath) ? { icon: "/site.ico" } : undefined,
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
