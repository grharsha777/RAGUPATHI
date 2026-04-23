import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RAGHUPATI — DevSecOps Guardian",
    template: "%s · RAGHUPATI",
  },
  description: "Autonomous multi-agent DevSecOps command center.",
  icons: [{ rel: "icon", url: "/logo.jpg" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} grain`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
