import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AIContextProvider, AIChatDrawer } from "@/components/ai-chat";
import { Nav } from "@/components/nav";
import { ChangelogModal } from "@/components/changelog-modal";
import { createClient } from "@/lib/supabase/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {user ? (
          <AIContextProvider>
            <header className="border-b px-8 py-4 flex items-center justify-between">
              <h1 className="text-xl font-bold">The Journey</h1>
              <Nav />
            </header>
            {children}
            <AIChatDrawer />
            <ChangelogModal />
          </AIContextProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
