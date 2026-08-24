"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  type: string;
  provider: string;
  coverImage?: string;
  year?: string;
}

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "TV",
  music: "Music",
  book: "Book",
  game: "Game",
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  movie: "bg-[#D2E9F9]",
  tv: "bg-[#CDE7DA]",
  music: "bg-[#FAD3A2]",
  book: "bg-[#FFEAA7]",
  game: "bg-[#E8C5C8]",
};

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    const cached = cacheRef.current.get(trimmed);
    if (cached) {
      setSuggestions(cached);
      setActiveIndex(-1);
      setShowSuggestions(true);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
        const data = await res.json();
        const list: Suggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];
        cacheRef.current.set(trimmed, list);
        setSuggestions(list);
        setActiveIndex(-1);
        setShowSuggestions(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!showSuggestions) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showSuggestions]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`suggestion-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setShowSuggestions(false);
    router.push(`/search/${encodeURIComponent(trimmed)}`);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    setShowSuggestions(false);
    setPending(true);
    router.push(`/search/${encodeURIComponent(suggestion.title)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  const showDropdown =
    showSuggestions &&
    query.trim().length >= MIN_QUERY_LENGTH &&
    (loadingSuggestions || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-foreground p-1.5 sm:p-2 rounded-2xl retro-shadow-md flex w-full items-center gap-1 sm:gap-2 focus-within:ring-2 focus-within:ring-[#4F46E5] focus-within:ring-offset-2 transition-all"
      >
        <Search className="ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-foreground/70" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && query.trim().length >= MIN_QUERY_LENGTH) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Try 'inception', 'cozy games', 'jazz'..."
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          className="flex-1 min-w-0 bg-transparent px-1 sm:px-2 py-2 text-xs sm:text-sm md:text-base text-foreground outline-none placeholder:text-muted-foreground font-medium"
          disabled={pending}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white bg-[#1a1a15] border border-transparent transition-all hover:bg-foreground/80 active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </form>

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-30 max-h-96 overflow-y-auto bg-white border-2 border-foreground rounded-xl retro-shadow-md overflow-x-hidden"
        >
          {loadingSuggestions && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-xs font-medium text-muted-foreground">
              No quick matches — press Enter for a full AI search
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.provider}-${suggestion.type}-${suggestion.id}`}
                id={`suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === activeIndex ? "bg-[#D2E9F9]" : "bg-white"
                }`}
              >
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md border border-foreground/20 bg-gray-200 flex items-center justify-center">
                  {suggestion.coverImage ? (
                    <img
                      src={suggestion.coverImage}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-black text-gray-500 uppercase">
                      {suggestion.title.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1a1a15]">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[suggestion.year, `via ${suggestion.provider}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md border border-foreground/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground ${
                    TYPE_BADGE_CLASSES[suggestion.type] ?? "bg-muted"
                  }`}
                >
                  {TYPE_LABELS[suggestion.type] ?? suggestion.type}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
