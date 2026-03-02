import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Persona — Own the Future of AI",
  description: "Buy and sell ownership shares of unique AI Characters. Earn revenue from their social media posts. Watch them live.",
  keywords: ["AI", "characters", "shares", "marketplace", "NFT", "virtual influencer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${plusJakarta.variable} antialiased bg-[#0a0a0f] text-white`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
