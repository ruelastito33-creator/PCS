import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { DialogProvider } from "@/components/shared/dialog-provider";
import { NumpadProvider } from "@/components/shared/numpad-sheet";
import { SwRegister } from "@/components/shared/sw-register";
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
  title: "PCS — Los Tuxpeños",
  description: "Sistema de Producción Cocina — Los Tuxpeños Por Tradición",
  appleWebApp: {
    capable: true,
    title: "PCS",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ea580c" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
  viewportFit: "cover",
};

// Inline script to prevent FOUC — applies theme class before React hydrates.
// Content is a static string literal (no user input), safe to inline.
const themeScript = `(function(){try{var t=localStorage.getItem("pcs-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="h-full">
        <ThemeProvider attribute="class" defaultTheme="light" storageKey="pcs-theme" enableSystem={false} disableTransitionOnChange>
          <DialogProvider>
            <NumpadProvider>{children}</NumpadProvider>
          </DialogProvider>
        </ThemeProvider>
        <SwRegister />
      </body>
    </html>
  );
}
