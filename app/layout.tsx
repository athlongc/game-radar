import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "Game Radar",
    description: "游戏与智能硬件榜单、市场和公司动态监控。",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png" },
        { url: "/icon.svg", type: "image/svg+xml" }
      ],
      apple: "/apple-touch-icon.png"
    },
    openGraph: {
      title: "Game Radar",
      description: "游戏与智能硬件榜单、市场和公司动态监控。",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Game Radar 数据监控看板" }]
    },
    twitter: {
      card: "summary_large_image",
      title: "Game Radar",
      description: "游戏与智能硬件榜单、市场和公司动态监控。",
      images: ["/og.png"]
    }
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
