import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FeedbackButton } from "@/components/FeedbackButton";
import { PwaRegister } from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AV Scheduler - Audio Visual Scheduling System",
  description: "Streamlined scheduling and management for audio visual resources and personnel",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://av-scheduler.up.railway.app'),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AV Scheduler",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegister />
          {children}
          <div className="fixed bottom-2 right-4 text-xs text-muted-foreground opacity-50 z-50 pointer-events-none select-none">
            &copy;p-e-koko
          </div>
          <FeedbackButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
