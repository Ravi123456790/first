import type { Metadata } from "next";
import Script from "next/script";
import { TelegramProvider } from "./components/providers/TelegramProvider";
import "./globals.css";
import "./style.css";
import { ToastProvider } from "./components/providers/ToastContext";

export const metadata: Metadata = {
  title: "BC.GAME: Crypto Casino Games & Casino Slot Games",
  description: "Crypto Gambling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet" />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="lock-scroll">
        <TelegramProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
