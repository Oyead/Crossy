"use client";

import { useState } from "react";

export default function HomePage() {
  const [searchType, setSearchType] = useState<"Media" | "Vibe">("Media");
  const placeholderText =
    searchType === "Media"
      ? "Search for a movie, show, album, game, or book..."
      : "Describe a mood, theme, or aesthetic (e.g., 'dark rainy cyberpunk')...";

  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Find your next favorite, in any medium
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Enter a movie, show, album, game, or book — or just describe a mood.
        We&apos;ll find matches across every medium, not just the one you started in.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          className={`h-10 px-4 py-2 rounded-md font-medium transition-colors ${
            searchType === "Media"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => setSearchType("Media")} 
        >
          Media mode
        </button>

        <button
          type="button"
          className={`h-10 px-4 py-2 rounded-md font-medium transition-colors ${
            searchType === "Vibe"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => setSearchType("Vibe")}
        >
          Vibe mode
        </button>
      </div>

      <input
        type="text"
        placeholder={placeholderText}
        className="w-full max-w-lg px-4 py-2 border rounded-md bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
}