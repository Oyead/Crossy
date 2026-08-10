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
      className="flex w-full max-w-xl gap-2 rounded-xl border border-border bg-card p-1.5 shadow-soft focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
    >
      <Search className="ml-2 h-5 w-5 self-center text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try 'inception', 'cozy games', 'jazz', a book title..."
        className="flex-1 bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending || !query.trim()}
        className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
      </button>
    </form>
  );
}
