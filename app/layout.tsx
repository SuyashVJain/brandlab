import type { Metadata, Viewport } from "next";
import { Anton, Montserrat, Permanent_Marker } from "next/font/google";
import "./globals.css";

// Heavy condensed display face for "BRAND" and the loader counter.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

// Brush-marker face for "LAB".
const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap",
});

// Everything else.
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BRAND LAB | IEEE SUAS-SB",
  description:
    "Think it. Name it. Brand it. A creative challenge where ideas turn into identities. Tuesday 13 October 2026, Engineering Block, SUAS.",
};

export const viewport: Viewport = {
  themeColor: "#EFECE6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${marker.variable} ${montserrat.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
