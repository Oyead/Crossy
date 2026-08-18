"use client";

import { Star } from "lucide-react";

interface MediaCardProps {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  rating?: number;
  type: string;
  provider: string;
  reason?: string;
  confidence?: number;
  favorited: boolean;
  onToggleFavorite: (mediaData: {
    id: string;
    title: string;
    posterUrl?: string;
    mediaType: string;
    sourceApi: string;
  }) => Promise<void>;
}

export default function MediaCard({
  id,
  title,
  description,
  coverImage,
  rating,
  type,
  provider,
  reason,
  confidence,
  favorited,
  onToggleFavorite
}: MediaCardProps) {
  const handleFavoriteClick = async () => {
    if (!onToggleFavorite) return;

    try {
      await onToggleFavorite({
        id,
        title,
        posterUrl: coverImage,
        mediaType: type,
        sourceApi: provider
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Error handling is done in the parent component's optimistic update
    }
  };

  return (
    <div className="relative group">
      {/* Media Image */}
      <div className="aspect-w-4 aspect-h-5 w-full overflow-hidden rounded-lg bg-gray-200">
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${title} cover`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-300">
            <div className="text-gray-500">{type.toUpperCase()}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-[#1a1a15] line-clamp-2">
          {title}
        </h3>

        {/* Rating */}
        {rating !== undefined && (
          <div className="flex items-center mt-1">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={i < rating ? "text-[#FBBF24]" : "text-[#E2E8F0]"}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 13.53 14.14 15.69 20.09 12 16.77 8.31 20.09 10.47 14.14 2 9.27 8.91 8.26" strokeWidth="1.5" stroke="currentColor" />
                </svg>
              ))}
            </div>
            <span className="ml-2 text-sm text-[#6B7280]">({rating.toFixed(1)})</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-[#6B7280]">
            {description}
          </p>
        )}

        {/* Metadata */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#9CA3AF]">
          <span>#{provider}</span>
          {reason && <span>{reason}</span>}
          {confidence !== undefined && (
            <span>{(confidence * 100).toFixed(0)}% match</span>
          )}
        </div>

        {/* Favorite Button */}
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={handleFavoriteClick}
            className={`flex items-center gap-2 p-2 rounded-full transition-all duration-200 ${
              favorited
                ? "bg-[#FBBF24]/20 text-[#FBBF24] hover:bg-[#FBBF24]/30"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#374151]"
            }`}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star className={`h-4 w-4 transition-transform duration-200 ${
              favorited ? "transform scale-110" : ""
            }`} />
            <span className="text-sm font-medium">{favorited ? "Unfavorite" : "Favorite"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}