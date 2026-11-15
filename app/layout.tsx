// PROTECTED FILE (MASTER.md §6): keep changes minimal and announce them.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BackButton from "@/components/ui/BackButton";
import SiteHeader from "@/components/ui/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Boothfinder",
    template: "%s | Boothfinder",
  },
  description:
    "Find events that are seeking vendors, and see which ones are worth the booth fee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        {/* Each page renders its own <main>. Use PageContainer for standard pages. */}
        {children}
        <BackButton />
      </body>
    </html>
  );
}
