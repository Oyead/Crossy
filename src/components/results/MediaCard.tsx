"use client";

import { Star } from "lucide-react";

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

const TAG_BG_MAP: Record<string, string> = {
  movie: "bg-[#D2E9F9]",
  tv: "bg-[#D2E9F9]",
  music: "bg-[#FAD3A2]",
  book: "bg-[#E8C5C8]",
  game: "bg-[#FFEAA7]",
};

export default function MediaCard({
  title,
  description,
  coverImage,
  rating,
  type,
  provider,
  reason,
  confidence,
}: MediaCardProps) {
  const typeBg = TAG_BG_MAP[type] || "bg-white";

  return (
    <div className="group relative flex flex-col justify-between bg-white border-2 border-[#1a1a15] rounded-xl overflow-hidden shadow-[4px_4px_0px_#1a1a15] hover:shadow-[7px_7px_0px_#1a1a15] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200">
      
      <div>
        <div className="w-full aspect-[16/10] bg-[#FAF6EE] border-b-2 border-[#1a1a15] overflow-hidden relative">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <img
              src="https://placehold.co/600x400/FAF6EE/1a1a15"
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#FFEAA7] border border-[#1a1a15] px-2 py-0.5 rounded-md shadow-[2px_2px_0px_#1a1a15] text-xs font-black text-[#1a1a15]">
              <Star className="h-3 w-3 fill-[#1a1a15] stroke-[#1a1a15]" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <h3 className="font-black text-xl text-[#1a1a15] tracking-tight leading-tight uppercase group-hover:text-[#4F46E5] transition-colors line-clamp-1">
            {title}
          </h3>

          {description && (
            <p className="mt-2 text-xs font-medium text-[#1a1a15]/70 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}

          {reason && (
            <div className="mt-3 bg-[#FAF6EE] border border-[#1a1a15]/10 p-2.5 rounded-lg text-[11px] font-medium text-[#1a1a15]/80 italic leading-normal">
              &ldquo;{reason}&rdquo;
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:p-5 pt-0 pb-4 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5">
          <span className={`${typeBg} border border-[#1a1a15] text-[#1a1a15] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#1a1a15]`}>
            {type}
          </span>
          <span className="bg-white border border-[#1a1a15]/30 text-[#1a1a15]/60 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
            {provider}
          </span>
        </div>

        {confidence && (
          <span className="text-[10px] font-black tracking-widest text-[#1a1a15]/40 uppercase">
            {Math.round(confidence * 100)}% Match
          </span>
        )}
      </div>

    </div>
  );
}