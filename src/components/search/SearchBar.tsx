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
      className="bg-white border-2 border-foreground p-2 rounded-2xl retro-shadow-md flex w-full items-center gap-2 focus-within:ring-2 focus-within:ring-[#4F46E5] focus-within:ring-offset-2 transition-all"
    >
      <Search className="ml-2 h-5 w-5 shrink-0 text-foreground/70" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try 'inception', 'cozy games', 'jazz' and more"
        className="flex-1 bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground font-medium"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending || !query.trim()}
        className="flex shrink-0 items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-[#1a1a15] border border-transparent transition-all hover:bg-foreground/80 active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
      </button>
    </form>
  );
}