import type { Metadata, Viewport } from "next";
import { Anton, Montserrat, Permanent_Marker } from "next/font/google";
import VercelInsights from "@/components/shared/VercelInsights";
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

const TITLE = "BRAND LAB | IEEE SUAS-SB";
const DESCRIPTION =
  "Think it. Name it. Brand it. A creative challenge where ideas turn into identities. Tuesday 13 October 2026, Engineering Block, SUAS.";

// Icons (app/icon.svg, favicon.ico, apple-icon.png) and the share image
// (app/opengraph-image.png, 1200 x 630) are picked up from their file names.
export const metadata: Metadata = {
  metadataBase: new URL("https://brandlab-ieee.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "BRAND LAB",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#EFECE6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${marker.variable} ${montserrat.variable} antialiased`}>
      <body>
        {children}
        <VercelInsights />
      </body>
    </html>
  );
}
