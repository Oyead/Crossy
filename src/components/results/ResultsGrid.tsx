import MediaTypeSection from "./MediaTypeSection";

interface ResultsGridProps {
  results: Array<{
    id: string;
    title: string;
    description?: string;
    coverImage?: string;
    provider: string;
    type: string;
    matchReason?: string;
  }>;
}

export default function ResultsGrid({ results }: ResultsGridProps) {
  // Group results by type
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, Array<typeof results[0]>>);

  // Define type labels
  const typeLabels: Record<string, string> = {
    movie: "Movies",
    tv: "TV Shows",
    music: "Music",
    book: "Books",
    game: "Games",
  };

  return (
    <div>
      {Object.keys(grouped).map((type) => (
        <MediaTypeSection
          key={type}
          type={type}
          title={typeLabels[type] || type}
          media={grouped[type].map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            coverImage: item.coverImage,
            provider: item.provider,
          }))}
        />
      ))}
    </div>
  );
}