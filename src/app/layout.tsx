import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "../components/layout/Navbar";

export const metadata: Metadata = {
  title: "Crossy - Find your next favorite in any medium",
  description: "Search movies, shows, music, games, and books across every medium with AI-powered recommendations.",
  keywords: [
    "crossy",
    "media discovery",
    "cross-medium discovery",
    "movies",
    "tv",
    "music",
    "games",
    "books",
    "recommendations",
    "find your next favorite",
    "any medium",
  ],
  authors: [{ name: "Crossy" }],
  publisher: "Crossy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Crossy - Find your next favorite in any medium",
    description: "Search movies, shows, music, games, and books across every medium with AI-powered recommendations.",
    url: "https://crossy.app/",
    siteName: "Crossy",
    type: "website",
    locale: "en_US",
    images: [
      { url: "/logo.png", width: 512, height: 512, alt: "Crossy Logo" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crossy - Find your next favorite in any medium",
    description: "Search movies, shows, music, games, and books across every medium with AI-powered recommendations.",
    images: ["/logo.png"],
    creator: "@crossy",
    site: "@crossy",
  },
  alternates: {
    canonical: "https://crossy.app/",
  },
  icons: [
    { rel: "icon", type: "image/x-icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/logo.png" },
    { rel: "apple-touch-icon", sizes: "152x152", url: "/logo.png" },
    { rel: "apple-touch-icon", sizes: "120x120", url: "/logo.png" },
    { rel: "apple-touch-icon", sizes: "76x76", url: "/logo.png" },
  ],
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
