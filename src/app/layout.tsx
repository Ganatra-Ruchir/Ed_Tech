import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Fonts are self-hosted from the `geist` package (next/font/local under the
// hood): no request to Google Fonts at build time or in the browser, and the
// font files are served from this app's own origin with long-lived caching.

export const metadata: Metadata = {
  title: "Silver Oak Learning Hub",
  description: "Evidence-linked student supervision, review, and analytics platform.",
};

export const viewport: Viewport = {
  themeColor: "#241417",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f4f5f0] text-[#17212b]">{children}</body>
    </html>
  );
}
