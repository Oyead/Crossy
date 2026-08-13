"use client";

import MediaCard from "./MediaCard";

interface MediaTypeSectionProps {
  type: string;
  title: string;
  media: Array<{
    id: string;
    title: string;
    description?: string;
    coverImage?: string;
    rating?: number;
    provider: string;
    reason?: string;
    confidence?: number;
  }>;
}

export default function MediaTypeSection({ type, title, media }: MediaTypeSectionProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <section className="mb-12 last:mb-0">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((item) => (
          <MediaCard
            key={`${item.provider}-${item.id}`}
            id={item.id}
            title={item.title}
            description={item.description}
            coverImage={item.coverImage}
            rating={item.rating}
            type={type}
            provider={item.provider}
            reason={item.reason}
            confidence={item.confidence}
          />
        ))}
      </div>
    </section>
  );
}