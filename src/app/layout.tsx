import type { Metadata } from "next";
// Use the UserMenu client component
import UserMenu from "@/components/UserMenu";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/enhanced-ui.css";
import AuthSessionProvider from "@/components/SessionProvider";
import Link from "next/link";
import Image from "next/image";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuckSAT",
  description: "Your comprehensive platform for SAT preparation and academic excellence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthSessionProvider>
          {/* Global header with duck logo and user menu - ARIA landmark */}
          <header role="banner" className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
            <nav role="navigation" aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
              <Link 
                href="/" 
                className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-lg"
                aria-label="DuckSAT Home"
              >
                <Image src="/duck-logo.svg" alt="" width={40} height={40} className="w-10 h-10" aria-hidden="true" />
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DuckSAT
                </span>
              </Link>
              {/* User menu in top right */}
              <UserMenu />
            </nav>
          </header>
          {/* Main content area - ARIA landmark */}
          <main role="main" className="pt-16">
            {children}
          </main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
