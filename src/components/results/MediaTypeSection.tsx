import MediaCard from "./MediaCard";

interface MediaTypeSectionProps {
  type: string;
  title: string;
  media: Array<{
    id: string;
    title: string;
    description?: string;
    coverImage?: string;
    provider: string;
  }>;
}

export default function MediaTypeSection({ type, title, media }: MediaTypeSectionProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.map((item) => (
          <MediaCard
            key={item.id}
            id={item.id}
            title={item.title}
            description={item.description}
            coverImage={item.coverImage}
            type={type}
            provider={item.provider}
          />
        ))}
      </div>
    </section>
  );
}