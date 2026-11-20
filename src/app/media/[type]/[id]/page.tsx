import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, Calendar, ArrowLeft, Sparkles } from "lucide-react";
import { providerForMediaType } from "@/server/integrations/registry";

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "TV Show",
  music: "Music",
  book: "Book",
  game: "Game",
};

const TYPE_BG: Record<string, string> = {
  movie: "bg-[#D2E9F9]",
  tv: "bg-[#D2E9F9]",
  music: "bg-[#FAD3A2]",
  book: "bg-[#E8C5C8]",
  game: "bg-[#FFEAA7]",
};

export default async function MediaDetailPage({
  params,
}: {
  params: { type: string; id: string };
}) {
  const { type, id } = params;

  const provider = providerForMediaType(type);
  if (!provider) notFound();

  const media = await provider.getDetails(id, type);
  if (!media) notFound();

  const typeLabel = TYPE_LABELS[type] || type;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#1a1a15]/60 transition-colors hover:text-[#1a1a15]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>

      <div className="relative rounded-2xl border-2 border-[#1a1a15] bg-white p-8 retro-shadow-md sm:p-10">
        <span className="absolute -top-1.5 -left-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />
        <span className="absolute -top-1.5 -right-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />
        <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />
        <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />

        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-xl border-2 border-[#1a1a15] bg-white">
            {media.coverImage ? (
              <img
                src={media.coverImage}
                alt={media.title}
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-[#FAF6EE]">
                <span className="text-6xl font-black text-[#1a1a15]/30">
                  {media.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border border-[#1a1a15] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#1a1a15]/80 ${TYPE_BG[type] ?? "bg-[#FAF6EE]"}`}
              >
                {typeLabel}
              </span>
              <span className="rounded-full border border-[#1a1a15]/40 bg-[#FAF6EE] px-3 py-1 text-xs font-medium capitalize text-[#1a1a15]/70">
                {media.provider}
              </span>
              {media.genres?.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {media.genres.slice(0, 4).map((genre: string) => (
                    <span
                      key={genre}
                      className="rounded-full border border-[#1a1a15]/40 bg-[#FAF6EE] px-3 py-1 text-xs font-bold text-[#1a1a15]/70"
                    >
                      {genre}
                    </span>
                  ))}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[#1a1a15] sm:text-4xl">
              {media.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#1a1a15]/60">
              {typeof media.rating === "number" && (
                <span className="flex items-center gap-1.5 text-[#1a1a15]">
                  <Star className="h-4 w-4 fill-[#1a1a15] text-[#1a1a15]" />
                  {media.rating.toFixed(1)}
                </span>
              )}
              {media.releaseDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {media.releaseDate}
                </span>
              )}
              {media.creators?.length > 0 && (
                <span>{media.creators.slice(0, 3).join(", ")}</span>
              )}
            </div>

            {media.description && (
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#1a1a15]/70">
                {media.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href={`/search/${encodeURIComponent(media.title)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#1a1a15] bg-[#1a1a15] px-6 py-3 text-sm font-bold text-white retro-shadow-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Find similar across mediums
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
