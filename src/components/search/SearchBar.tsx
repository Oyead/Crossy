"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || pending) return;
    setPending(true);
    router.push(`/search/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-2 border-foreground p-1.5 sm:p-2 rounded-2xl retro-shadow-md flex w-full max-w-2xl items-center gap-1 sm:gap-2 focus-within:ring-2 focus-within:ring-[#4F46E5] focus-within:ring-offset-2 transition-all"
    >
      <Search className="ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-foreground/70" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try 'inception', 'cozy games', 'jazz'..."
        className="flex-1 min-w-0 bg-transparent px-1 sm:px-2 py-2 text-xs sm:text-sm md:text-base text-foreground outline-none placeholder:text-muted-foreground font-medium"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending || !query.trim()}
        className="flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white bg-[#1a1a15] border border-transparent transition-all hover:bg-foreground/80 active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : "Search"}
      </button>
    </form>
  );
}