import MediaTypeSection from "./MediaTypeSection";

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

export default function ResultsGrid({ results }: ResultsGridProps) {
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, Array<typeof results[0]>>);

  const typeLabels: Record<string, string> = {
    movie: "Movies",
    tv: "TV Shows",
    music: "Music",
    book: "Books",
    game: "Games",
  };

  const types = Object.keys(grouped).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)
  );

  return (
    <div>
      {types.map((type) => (
        <MediaTypeSection
          key={type}
          type={type}
          title={typeLabels[type] || type}
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
        />
      ))}
    </div>
  );
}
