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
    <div className="container py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <div className="grid gap-8 md:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          {media.coverImage ? (
            <img
              src={media.coverImage}
              alt={media.title}
              className="aspect-[3/4] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-muted">
              <span className="text-6xl font-bold text-muted-foreground/40">
                {media.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              {typeLabel}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
              {media.provider}
            </span>
            {media.genres?.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {media.genres.slice(0, 4).map((genre: string) => (
                  <span
                    key={genre}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {genre}
                  </span>
                ))}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight">{media.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {typeof media.rating === "number" && (
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Star className="h-4 w-4 fill-accent text-accent" />
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
            <p className="text-base leading-relaxed text-muted-foreground">
              {media.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={`/search/${encodeURIComponent(media.title)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Find similar across mediums
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
