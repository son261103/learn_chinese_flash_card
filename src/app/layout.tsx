import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader, Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-chinese-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-chinese-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "HANZI. · Học Tiếng Trung & Luyện Gõ Chữ Hán",
  description:
    "Ứng dụng luyện gõ chữ Hán, Flashcards và học tiếng Trung HSK phong cách tối giản thanh lịch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${plusJakarta.variable} ${newsreader.variable} ${notoSerifSC.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF9F6] text-[#222B25] selection:bg-[#24523B] selection:text-white">
        {children}
      </body>
    </html>
  );
}
