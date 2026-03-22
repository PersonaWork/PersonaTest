import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navigation from "@/components/Navigation";
import { ToastProvider } from "@/components/ui";
import WelcomeTour from "@/components/onboarding/WelcomeTour";
import LiveTicker from "@/components/engagement/LiveTicker";
import MobileNav from "@/components/engagement/MobileNav";
import ActivityToast from "@/components/engagement/ActivityToast";

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

const spaceGrotesk = Space_Grotesk({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        className={`${outfit.variable} ${plusJakarta.variable} ${spaceGrotesk.variable} antialiased bg-[#0a0a0f] text-white`}
      >
        <Providers>
          <Navigation />
          <LiveTicker />
          <div className="pb-mobile-nav">
            {children}
          </div>
          <MobileNav />
          <ActivityToast />
          <WelcomeTour />
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
