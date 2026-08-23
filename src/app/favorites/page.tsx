"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Heart, Loader2, Sparkles } from "lucide-react";
import MediaCard from "@/components/results/MediaCard";
import { getFavoriteItems, toggleFavorite, type FavoriteItem } from "@/lib/favorites";

const CORNER_DOT_POSITIONS = [
  "-top-1.5 -left-1.5",
  "-top-1.5 -right-1.5",
  "-bottom-1.5 -left-1.5",
  "-bottom-1.5 -right-1.5",
];

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const loadFavorites = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const favorites = await getFavoriteItems();
        setItems(favorites.filter((item) => item.id));
      } catch (err: any) {
        setError(err?.message || "Failed to load your library");
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, [status]);

  const handleToggleFavorite = async (mediaData: {
    id: string;
    title: string;
    posterUrl?: string;
    mediaType: string;
    sourceApi: string;
    sourceQuery?: string;
  }) => {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setItems((prev) =>
      prev.filter(
        (item) => !(item.id === mediaData.id && item.mediaType === mediaData.mediaType)
      )
    );

    try {
      await toggleFavorite(mediaData);
    } catch (err) {
      console.error("Failed to remove favorite:", err);
      setError("Failed to update your library. Please refresh and try again.");
    }
  };

  if (status !== "authenticated" || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 rounded-2xl border-2 border-foreground bg-[#E8C5C8] shadow-[3px_3px_0px_#1a1a15]">
            <span className={`absolute ${CORNER_DOT_POSITIONS[0]} w-2 h-2 bg-[#FFEAA7] border border-foreground`} />
            <span className={`absolute ${CORNER_DOT_POSITIONS[1]} w-2 h-2 bg-[#FFEAA7] border border-foreground`} />
            <span className={`absolute ${CORNER_DOT_POSITIONS[2]} w-2 h-2 bg-[#FFEAA7] border border-foreground`} />
            <span className={`absolute ${CORNER_DOT_POSITIONS[3]} w-2 h-2 bg-[#FFEAA7] border border-foreground`} />
            <Heart className="absolute inset-0 m-auto h-6 w-6 text-foreground fill-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">
              My Library
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Everything you&apos;ve favorited, in one place.
            </p>
          </div>
        </div>

        {!error && (
          <div className="text-xs font-bold text-foreground/60 bg-white border border-foreground px-3 py-1.5 rounded-xl shadow-[1px_1px_0px_#1a1a15]">
            {items.length} saved
          </div>
        )}
      </div>

      {error && (
        <div className="mb-8 border-2 border-[#dc2626] bg-[#fef2f2] rounded-xl p-4 text-sm font-medium text-[#dc2626]">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="relative mx-auto max-w-md border-2 border-foreground bg-white p-10 rounded-2xl retro-shadow-md text-center space-y-4">
          {CORNER_DOT_POSITIONS.map((position) => (
            <span
              key={position}
              className={`absolute ${position} w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground`}
            />
          ))}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-xl border-2 border-foreground bg-[#FAF6EE] flex items-center justify-center shadow-[2px_2px_0px_#1a1a15]">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-lg font-black text-foreground">Nothing here yet</h2>
          <p className="text-sm font-medium text-muted-foreground">
            Search for something you love and hit the star on a result card to save it.
          </p>
          <Link
            href="/"
            className="inline-flex justify-center items-center gap-2 py-3 px-6 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] transition-all"
          >
            <Sparkles className="h-4 w-4 text-[#FFEAA7]" />
            Start discovering
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MediaCard
              key={`${item.sourceApi}-${item.id}`}
              id={item.id}
              title={item.title}
              coverImage={item.posterUrl}
              type={item.mediaType}
              provider={item.sourceApi}
              sourceQuery={item.sourceQuery}
              favorited={true}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
