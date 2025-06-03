import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TurtleSoup.chat",
  description: "AI와 함께하는 추리 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900`}>
        <nav className="p-4 bg-gray-100 dark:bg-gray-800 shadow">
          <ul className="flex space-x-4">
            <li><Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">채팅</Link></li>
            <li><Link href="/scenarios" className="text-blue-600 dark:text-blue-400 hover:underline">시나리오 선택</Link></li>
            <li><Link href="/history" className="text-blue-600 dark:text-blue-400 hover:underline">플레이 기록</Link></li>
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
