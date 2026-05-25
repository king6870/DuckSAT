import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/enhanced-ui.css";


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
      <head>
        {/* Inline script to prevent flash of wrong theme - runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('ducksat-theme');
                let theme = 'light';
                
                if (savedTheme === 'light' || savedTheme === 'dark') {
                  theme = savedTheme;
                } else if (savedTheme === 'system' || !savedTheme) {
                  // Use system preference
                  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    theme = 'dark';
                  }
                }
                
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
