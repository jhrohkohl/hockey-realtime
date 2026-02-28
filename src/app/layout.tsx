import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shot Hex — NHL Shot Heatmaps",
  description: "Real-time hexagonal shot charts for NHL games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-sh-bg text-sh-text`}
      >
        <NavBar />
        {children}
      </body>
    </html>
  );
}
