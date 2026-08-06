import type { Metadata, Viewport } from "next";
import { Rajdhani, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/lib/register-service-worker";
import { ThemeProvider } from "@/components/theme-provider";
import { AppClerkProvider } from "@/components/app-clerk-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// https://fonts.google.com/specimen/Rajdhani — police d'identite Serveo.
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Serveo — Gerer. Servir. Simplifier.",
  description: "Ventes, stock et charges pour bars et buvettes, en temps reel.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Serveo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2420" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${rajdhani.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TooltipProvider>
              <ServiceWorkerRegister />
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </AppClerkProvider>
      </body>
    </html>
  );
}
