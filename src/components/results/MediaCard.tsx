"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { logInteraction } from "@/lib/interactions";

const TYPE_BG: Record<string, string> = {
  movie: "bg-[#D2E9F9]",
  tv: "bg-[#D2E9F9]",
  music: "bg-[#FAD3A2]",
  book: "bg-[#E8C5C8]",
  game: "bg-[#FFEAA7]",
};

interface MediaCardProps {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  type: string;
  provider: string;
  sourceQuery?: string;
  reason?: string;
  position?: number;
  metadata?: Record<string, unknown>;
  favorited: boolean;
  onToggleFavorite: (mediaData: {
    id: string;
    title: string;
    posterUrl?: string;
    mediaType: string;
    sourceApi: string;
    sourceQuery?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

export default function MediaCard({
  id,
  title,
  description,
  coverImage,
  type,
  provider,
  sourceQuery,
  reason,
  position,
  metadata,
  favorited,
  onToggleFavorite
}: MediaCardProps) {
  const handleClick = () => {
    logInteraction({
      kind: "click",
      query: sourceQuery,
      mediaType: type,
      externalId: id,
      sourceApi: provider,
      position,
    });
  };

  const handleFavoriteClick = async () => {
    if (!onToggleFavorite) return;

    try {
      await onToggleFavorite({
        id,
        title,
        posterUrl: coverImage,
        mediaType: type,
        sourceApi: provider,
        metadata
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border-2 border-[#1a1a15] p-3 retro-shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] ${TYPE_BG[type] ?? "bg-[#FAF6EE]"}`}
    >
      <Link
        href={`/media/${type}/${encodeURIComponent(id)}`}
        onClick={handleClick}
        className="block aspect-[4/5] w-full overflow-hidden rounded-lg border border-[#1a1a15]/30 bg-white"
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${title} cover`}
            className="block h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#FAF6EE]">
            <span className="text-xs font-black uppercase text-[#1a1a15]/40">
              {type}
            </span>
          </div>
        )}
      </Link>

      <div className="mt-3">
        <h3 className="line-clamp-2 text-sm font-bold text-[#1a1a15]">
          <Link
            href={`/media/${type}/${encodeURIComponent(id)}`}
            onClick={handleClick}
            className="transition-colors hover:text-[#4F46E5]"
          >
            {title}
          </Link>
        </h3>

        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-[#1a1a15]/60">
            {description}
          </p>
        )}

        {reason && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-[#1a1a15]/60">
            <span>{reason}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end">
          <button
            onClick={handleFavoriteClick}
            className={`flex items-center gap-2 rounded-lg border-2 border-[#1a1a15] px-3 py-2 text-xs font-bold transition-colors ${
              favorited
                ? "bg-[#1a1a15] text-white hover:bg-[#1a1a15]/90"
                : "bg-[#FAF6EE] text-[#1a1a15] hover:bg-[#1a1a15] hover:text-white"
            }`}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`h-4 w-4 transition-transform duration-200 ${
                favorited ? "scale-110 fill-current" : ""
              }`}
            />
            <span>{favorited ? "Unfavorite" : "Favorite"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
