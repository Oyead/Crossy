"use client";

import { useState, useEffect } from "react";
import MediaTypeSection from "./MediaTypeSection";
import { getUserFavorites, toggleFavorite } from "@/lib/favorites";

interface ResultsGridProps {
  results: Array<{
    id: string;
    title: string;
    description?: string;
    coverImage?: string;
    rating?: number;
    provider: string;
    type: string;
    reason?: string;
    confidence?: number;
  }>;
}

const TYPE_ORDER = ["movie", "tv", "music", "book", "game"];

const TYPE_STYLES: Record<string, { label: string; bg: string; rotation: string }> = {
  movie: { label: "Movies", bg: "bg-[#D2E9F9]", rotation: "rotate-[-0.5deg]" },
  tv: { label: "Television", bg: "bg-[#D2E9F9]", rotation: "rotate-[0.5deg]" },
  music: { label: "Music", bg: "bg:#FAD3A2", rotation: "rotate-[-1deg]" },
  book: { label: "Books", bg: "bg:#E8C5C8", rotation: "rotate-[1deg]" },
  game: { label: "Games", bg: "bg:#FFEAA7", rotation: "rotate-[-0.5deg]" },
};

export default function ResultsGrid({ results }: ResultsGridProps) {
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  // Load user favorites on mount
  useEffect(() => {
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
  }, []);

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, Array<typeof results[0]>>);

  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)
  );

  const handleToggleFavorite = async (mediaData: {
  id: string;
  title: string;
  posterUrl?: string;
  mediaType: string;
  sourceApi: string;
}) => {
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
                media={grouped[type].map((item) => ({
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  coverImage: item.coverImage,
                  rating: item.rating,
                  provider: item.provider,
                  reason: item.reason,
                  confidence: item.confidence,
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