"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X, Star } from "lucide-react";
import MediaTypeSection from "./MediaTypeSection";
import { getUserFavorites, toggleFavorite } from "@/lib/favorites";
import { logInteractions } from "@/lib/interactions";

interface ResultsGridProps {
  query?: string;
  results: Array<{
    id: string;
    title: string;
    description?: string;
    coverImage?: string;
    provider: string;
    type: string;
    reason?: string;
  }>;
}

const TYPE_ORDER = ["movie", "tv", "music", "book", "game"];

const TYPE_STYLES: Record<string, { label: string; bg: string; rotation: string }> = {
  movie: { label: "Movies", bg: "bg-[#D2E9F9]", rotation: "rotate-[-0.5deg]" },
  tv: { label: "Television", bg: "bg-[#D2E9F9]", rotation: "rotate-[0.5deg]" },
  music: { label: "Music", bg: "bg-[#FAD3A2]", rotation: "rotate-[-1deg]" },
  book: { label: "Books", bg: "bg-[#E8C5C8]", rotation: "rotate-[1deg]" },
  game: { label: "Games", bg: "bg-[#FFEAA7]", rotation: "rotate-[-0.5deg]" },
};

export default function ResultsGrid({ query, results }: ResultsGridProps) {
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const { status } = useSession();
  const loggedImpressionsRef = useRef<string>("");

  useEffect(() => {
    if (!showLoginPrompt) return;
    const timer = setTimeout(() => setShowLoginPrompt(false), 6000);
    return () => clearTimeout(timer);
  }, [showLoginPrompt]);

  // Impression logging: once per unique result set
  useEffect(() => {
    if (results.length === 0) return;
    const key = `${query ?? ""}::${results.map((r) => `${r.type}:${r.id}`).join("|")}`;
    if (loggedImpressionsRef.current === key) return;
    loggedImpressionsRef.current = key;
    logInteractions(
      results.slice(0, 20).map((r, i) => ({
        kind: "impression" as const,
        query,
        mediaType: r.type,
        externalId: r.id,
        sourceApi: r.provider,
        position: i + 1,
      }))
    );
  }, [results, query]);

  // Load user favorites once signed in
  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const loadFavorites = async () => {
      setLoading(true);
      try {
        const favorites = await getUserFavorites();
        setFavoritedIds(favorites);
      } catch (error) {
        console.error("Failed to load favorites:", error);
        setFavoritedIds(new Set());
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [status]);

  const grouped = results.reduce((acc, item, index) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push({ ...item, position: index + 1 });
    return acc;
  }, {} as Record<string, Array<typeof results[0] & { position: number }>>);

  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)
  );

  const handleToggleFavorite = async (mediaData: {
  id: string;
  title: string;
  posterUrl?: string;
  mediaType: string;
  sourceApi: string;
  sourceQuery?: string;
}) => {
    if (status !== "authenticated") {
      setShowLoginPrompt(true);
      return;
    }

    try {
      // Optimistically update state
      setFavoritedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mediaData.id)) {
          newSet.delete(mediaData.id);
        } else {
          newSet.add(mediaData.id);
        }
        return newSet;
      });

      // Call API
      await toggleFavorite(mediaData);
      // Note: We don't need to update state again with API result because
      // our optimistic update was correct
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      // Rollback optimistic update
      setFavoritedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mediaData.id)) {
          newSet.delete(mediaData.id);
        } else {
          newSet.add(mediaData.id);
        }
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-16 pb-24">
      {showLoginPrompt && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100%-3rem)] max-w-md animate-fade-up">
          <div className="relative flex items-start gap-3 border-2 border-[#1a1a15] bg-[#FFEAA7] rounded-xl px-4 py-3 shadow-[4px_4px_0px_#1a1a15]">
            <Star className="mt-0.5 h-5 w-5 shrink-0 text-[#1a1a15]" fill="#1a1a15" />
            <p className="text-sm font-bold text-[#1a1a15]">
              Log in to save favorites to your library.{" "}
              <Link
                href="/login"
                className="text-[#4F46E5] underline underline-offset-2 hover:text-[#3b34c4]"
              >
                Sign in
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setShowLoginPrompt(false)}
              aria-label="Dismiss"
              className="ml-auto shrink-0 rounded-lg p-1 text-[#1a1a15]/60 hover:bg-[#1a1a15]/10 hover:text-[#1a1a15] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {sortedTypes.map((type) => {
        const style = TYPE_STYLES[type] || { label: type, bg: "bg-white", rotation: "rotate-0" };

        return (
          <div
            key={type}
            className="relative border-2 border-[#1a1a15] bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_#1a1a15]"
          >
            <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
            <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
            <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-[#1a1a15]/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-[#4F46E5]">
                  ✦ Categorized Section
                </span>
                <h2 className={`inline-block border-2 border-[#1a1a15] px-4 py-1 text-xl sm:text-2xl font-black text-[#1a1a15] ${style.bg} ${style.rotation} shadow-[3px_3px_0px_#1a1a15]`}>
                  {style.label}
                </h2>
              </div>

              <div className="text-xs font-bold text-[#1a1a15]/60 bg-[#FAF6EE] border border-[#1a1a15] px-2.5 py-1 rounded-xl shadow-[1px_1px_0px_#1a1a15]">
                {grouped[type].length} matches found
              </div>
            </div>

            <div className="relative z-10">
              <MediaTypeSection
                type={type}
                title={style.label}
                sourceQuery={query}
                media={grouped[type].map((item) => ({
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  coverImage: item.coverImage,
                  provider: item.provider,
                  reason: item.reason,
                }))}
                favoritedIds={favoritedIds}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}