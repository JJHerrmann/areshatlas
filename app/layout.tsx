import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aresh Codex",
  description: "The Natural and Geographic Survey of Aresh",
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
