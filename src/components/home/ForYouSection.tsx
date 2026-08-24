"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

interface ForYouPick {
  id: string;
  title: string;
  type: string;
  provider: string;
  coverImage?: string;
  description?: string;
  rating?: number;
  reason?: string;
}

const TYPE_BG: Record<string, string> = {
  movie: "bg-[#D2E9F9]",
  tv: "bg-[#D2E9F9]",
  music: "bg-[#FAD3A2]",
  book: "bg-[#E8C5C8]",
  game: "bg-[#FFEAA7]",
};

export default function ForYouSection() {
  const { status } = useSession();
  const [picks, setPicks] = useState<ForYouPick[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/recommendations/for-you")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setPicks(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "authenticated" || picks.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 pb-16">
      <div className="relative border-2 border-[#1a1a15] bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_#1a1a15]">
        <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
        <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />
        <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#1a1a15] border border-white" />

        <div className="mb-6 flex flex-wrap items-center gap-3 border-b-2 border-dashed border-[#1a1a15]/20 pb-4">
          <h2 className="inline-flex items-center gap-2 border-2 border-[#1a1a15] bg-[#E8C5C8] px-4 py-1 text-xl sm:text-2xl font-black text-[#1a1a15] shadow-[3px_3px_0px_#1a1a15]">
            <Sparkles className="h-5 w-5" />
            For You
          </h2>
          <span className="text-xs font-bold text-[#1a1a15]/60">
            Based on your favorites, across every medium
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {picks.map((pick) => (
            <Link
              key={`${pick.type}-${pick.id}`}
              href={`/media/${pick.type}/${encodeURIComponent(pick.id)}`}
              className={`group border-2 border-[#1a1a15] rounded-xl p-3 ${TYPE_BG[pick.type] ?? "bg-white"} retro-shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5`}
            >
              <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-[#1a1a15]/20 bg-white">
                {pick.coverImage ? (
                  <img
                    src={pick.coverImage}
                    alt={`${pick.title} cover`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-black uppercase text-gray-500">
                    {pick.type}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-bold text-[#1a1a15] group-hover:text-[#4F46E5] transition-colors">
                {pick.title}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1a1a15]/50">
                {pick.type} · {pick.reason}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
