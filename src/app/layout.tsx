import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/ui/Sidebar";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
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
        className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
      >
        <Providers>
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
