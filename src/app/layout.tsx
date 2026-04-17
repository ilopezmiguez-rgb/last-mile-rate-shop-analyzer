import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import "./globals.css";
import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DataProvider } from "@/components/data/DataProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rate Shop Analyzer — Precision Ledger",
  description:
    "A freight-pricing analytics instrument. Segmented analyzer, opportunity finder, and price recommendator running entirely in the browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <NuqsAdapter>
            <Suspense fallback={null}>
              <DataProvider>
                <div className="flex min-h-screen">
                  <SideNav />
                  <div className="flex flex-1 flex-col min-w-0">
                    <TopBar />
                    <main className="flex-1 px-6 py-6 md:px-10 md:py-8 min-w-0">
                      {children}
                    </main>
                  </div>
                </div>
              </DataProvider>
            </Suspense>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
