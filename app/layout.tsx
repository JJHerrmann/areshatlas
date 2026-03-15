import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import WikiSidebar from "@/components/codex/WikiSidebar";
import "./globals.css";

const publicRoot = path.join(process.cwd(), "public");
const siteIcoPath = path.join(publicRoot, "site.ico");

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
      <body>
        <div className="wiki-page-shell">
          <div className="wiki-page-frame wiki-shell-frame">
            <div className="wiki-shell-layout">
              <aside className="wiki-sidebar">
                <WikiSidebar />
              </aside>
              <div className="wiki-main">{children}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
