import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ViewTransition } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SkipLink } from "@/components/skip-link";
import { CookieBanner } from "@/components/cookie-banner";
import { AgeGate } from "@/components/age-gate";

// `--font-sans` is what globals.css (and the shadcn theme) actually reads.
const sans = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const BASE_URL = "https://ttb-label-verifier-barnslau.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "TTB Label Verifier — AI-Assisted Alcohol Label Compliance",
    template: "%s — TTB Label Verifier",
  },
  description:
    "AI-assisted verification that an alcohol beverage label matches its COLA application. Two-stage pipeline: Claude vision extraction + deterministic TTB rule checks.",
  openGraph: {
    type: "website",
    siteName: "TTB Label Verifier",
    title: "TTB Label Verifier — AI-Assisted Alcohol Label Compliance",
    description:
      "AI-assisted verification that an alcohol beverage label matches its COLA application.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary",
    title: "TTB Label Verifier — AI-Assisted Alcohol Label Compliance",
    description:
      "AI-assisted verification that an alcohol beverage label matches its COLA application.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {/* WCAG 2.1 SC 2.4.1 — skip repeated navigation */}
        <SkipLink />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Age gate: must confirm 21+ before accessing alcohol label content */}
          <AgeGate />
          {/* ViewTransition drives the blur+scale page crossfade in globals.css */}
          <ViewTransition name="page-body">{children}</ViewTransition>
          <Toaster />
          {/* CCPA cookie-consent banner; shown once until user makes a choice */}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
