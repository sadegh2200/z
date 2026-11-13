import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
});

export const metadata: Metadata = {
  title: "محاسبهٔ نفس — ترازوی اعمال روزانه",
  description:
    "محاسبه‌ی روزانه‌ی نفس با ترازوی امتیاز، زنجیره‌ی ثبات، توکن‌های پاداش و تحلیل هفتگی — نسخه‌ی بازسازی‌شده در کلاس جهانی.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "محاسبهٔ نفس",
  },
};

export const viewport: Viewport = {
  themeColor: "#05050a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className="min-h-screen bg-ink-950 font-sans text-stone-100 antialiased">
        {children}
      </body>
    </html>
  );
}
