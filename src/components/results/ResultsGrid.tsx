"use client";

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

// Colors mapped to the candy-palette accents from 10.jpg & 42.jpg
const TYPE_STYLES: Record<string, { label: string; bg: string; rotation: string }> = {
  movie: { label: "Cinema / Film", bg: "bg-[#D2E9F9]", rotation: "rotate-[-0.5deg]" },
  tv: { label: "Television", bg: "bg-[#D2E9F9]", rotation: "rotate-[0.5deg]" },
  music: { label: "Audio & Music", bg: "bg-[#FAD3A2]", rotation: "rotate-[-1deg]" },
  book: { label: "Literature & Books", bg: "bg-[#E8C5C8]", rotation: "rotate-[1deg]" },
  game: { label: "Interactive / Games", bg: "bg-[#FFEAA7]", rotation: "rotate-[-0.5deg]" },
};

export default function ResultsGrid({ results }: ResultsGridProps) {
  // Group results by type
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, Array<typeof results[0]>>);

  // Sort groups based on intended layout hierarchy
  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)
  );

  return (
    <div className="space-y-16 pb-24">
      {sortedTypes.map((type) => {
        const style = TYPE_STYLES[type] || { label: type, bg: "bg-white", rotation: "rotate-0" };
        
        return (
          <div 
            key={type} 
            className="relative border-2 border-[#1a1a15] bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_#1a1a15]"
          >
            {/* Box Bounding Target Nodes inspired by 32.jpg */}
            <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
            <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
            <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />

            {/* Asymmetric Section Header Block inspired by 32.jpg / 42.jpg */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-[#1a1a15]/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-[#4F46E5]">
                  ✦ Categorized Section
                </span>
                <h2 className={`inline-block border-2 border-[#1a1a15] px-4 py-1 text-xl sm:text-2xl font-black text-[#1a1a15] ${style.bg} ${style.rotation} shadow-[3px_3px_0px_#1a1a15]`}>
                  {style.label}
                </h2>
              </div>
              
              {/* Micro badge counting results inside the bracket */}
              <div className="text-xs font-bold text-[#1a1a15]/60 bg-[#FAF6EE] border border-[#1a1a15] px-2.5 py-1 rounded-xl shadow-[1px_1px_0px_#1a1a15]">
                {grouped[type].length} matches found
              </div>
            </div>

            {/* Sub-grid Content Renderer */}
            <div className="relative z-10">
              <MediaTypeSection
                type={type}
                title={style.label}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}