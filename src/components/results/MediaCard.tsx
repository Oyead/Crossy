import Link from "next/link";

interface MediaCardProps {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  type: string;
  provider: string;
}

export default function MediaCard({ id, title, description, coverImage, type, provider }: MediaCardProps) {
  return (
    <Link
      href={`/media/${type}/${id}`}
      passHref
      className="group"
    >
      <div className="bg-card rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow duration-200">
        {coverImage && (
          <div className="relative">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-2">{description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{type}</span>
            <span>{provider}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}