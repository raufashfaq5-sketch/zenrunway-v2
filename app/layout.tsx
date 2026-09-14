import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ZenRunway | Financial & Runway Dashboard",
  description:
    "ZenRunway is an enterprise-grade treasury, cash flow, and runway controller dashboard built for modern businesses and freelancers.",
  keywords: [
    "ZenRunway",
    "Financial Dashboard",
    "Runway Controller",
    "Cash Flow",
    "Treasury Management",
    "Burn Rate",
    "Invoice Ledger",
  ],
  authors: [{ name: "ZenRunway Product Team" }],
  openGraph: {
    title: "ZenRunway | Financial & Runway Dashboard",
    description:
      "Enterprise treasury, cash flow, and runway controller dashboard built for modern businesses.",
    siteName: "ZenRunway",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZenRunway | Financial & Runway Dashboard",
    description:
      "Enterprise treasury, cash flow, and runway controller dashboard.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
