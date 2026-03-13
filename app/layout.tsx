import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
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
      <body>{children}</body>
    </html>
  );
}
