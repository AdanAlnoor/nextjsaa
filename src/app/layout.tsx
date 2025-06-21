import "@/utils/cookie-utils";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

// Simplified layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <Suspense fallback={<div>Loading Root...</div>}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}