import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ระบบบริหารโครงการ Timeline",
  description: "ระบบจัดตารางเวลาโครงการอัตโนมัติสำหรับฟรีแลนซ์และทีมงาน",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='1' y='1.5' width='12' height='3.5' rx='1.5' fill='%233b82f6'/%3E%3Crect x='3' y='6.5' width='10' height='3.5' rx='1.5' fill='%2310b981'/%3E%3Crect x='2' y='11.5' width='8' height='3.5' rx='1.5' fill='%23f97316'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
