import Link from "next/link";
import { Sparkles, Star } from "lucide-react";

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
}

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "TV Show",
  music: "Music",
  book: "Book",
  game: "Game",
};

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
}: MediaCardProps) {
  const typeLabel = TYPE_LABELS[type] || type;

  return (
    <Link
      href={`/media/${type}/${id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
    >
      {coverImage ? (
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">
          <img
            src={coverImage}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex aspect-[3/2] items-center justify-center bg-muted">
          <span className="text-4xl font-bold text-muted-foreground/40">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-accent">
            {title}
          </h3>
          {typeof rating === "number" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Star className="h-3 w-3 fill-accent text-accent" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {typeLabel}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
            {provider}
          </span>
          {typeof confidence === "number" && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              {Math.round(confidence * 100)}% match
            </span>
          )}
        </div>

        {reason && (
          <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 p-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-accent">{reason}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
