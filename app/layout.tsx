import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000/"),
  title: "贪婪之岛指定口袋卡册",
  description: "《HUNTER×HUNTER》贪婪之岛 No.000—099 三语互动卡册。",
  applicationName: "Greed Island Card Binder",
  openGraph: {
    title: "贪婪之岛指定口袋卡册",
    description: "No.000—099 三语互动卡册，支持搜索、跳转和滑动翻页。",
    type: "website",
    images: [{ url: "og.png", width: 1680, height: 910, alt: "Greed Island interactive card binder" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "贪婪之岛指定口袋卡册",
    description: "No.000—099 三语互动卡册",
    images: ["og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#16132f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
