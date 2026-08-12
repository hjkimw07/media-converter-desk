import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PROJECT_AUTHOR, PROJECT_NAME } from "@/constants/project";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

// next/font가 빌드 시 자체 호스팅하므로 교차 출처 격리(COEP)에 걸리지 않습니다.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description: "Browser-first image and video conversion MVP with future server processing stubs.",
  applicationName: PROJECT_NAME,
  authors: [{ name: PROJECT_AUTHOR }],
  creator: PROJECT_AUTHOR,
};

/**
 * 첫 페인트 전에 저장된 테마를 반영해 깜빡임을 막습니다.
 * 다크가 기본이므로 라이트일 때만 클래스를 붙입니다.
 */
const themeScript = `try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light")document.documentElement.classList.add("light")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
