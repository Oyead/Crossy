import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "../components/layout/Navbar";

export const metadata: Metadata = {
  title: "Crossy - Find your next favorite in any medium",
  description: "Search movies, shows, music, games, and books across every medium with AI-powered recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-6xl px-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
