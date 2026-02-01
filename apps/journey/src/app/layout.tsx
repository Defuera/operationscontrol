import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AIContextProvider, AIChatDrawer } from "@/components/ai-chat";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Journey",
  description: "Personal productivity workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AIContextProvider>
          <header className="border-b px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">The Journey</h1>
            <Nav />
          </header>
          {children}
          <AIChatDrawer />
        </AIContextProvider>
      </body>
    </html>
  );
}
