"use client";

import { Share2, Facebook, Twitter, Mail } from "lucide-react";

const shareData = {
  title: "Crossy - Find your next favorite in any medium",
  text: "Discover your next favorite movie, show, album, game, or book in any medium with Crossy.",
  url: "https://crossy.app/",
};

export default function SocialShare() {
  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as any).share(shareData);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 border-y-2 border-foreground bg-white/40 backdrop-blur-sm">
      <h2 className="text-xl sm:text-2xl font-black text-foreground mb-6 text-center uppercase tracking-wider">
        Share Crossy
      </h2>
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-foreground bg-[#FAF6EE] text-foreground font-bold text-sm hover:bg-[#D2E9F9] transition-all shadow-[2px_2px_0px_#1a1a15] active:translate-x-0.5 active:translate-y-0.5"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-foreground bg-[#FAF6EE] text-foreground font-bold text-sm hover:bg-[#D2E9F9] transition-all shadow-[2px_2px_0px_#1a1a15] active:translate-x-0.5 active:translate-y-0.5"
          title="Share on Facebook"
        >
          <Facebook className="h-4 w-4" />
          <span>Facebook</span>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.title)}&url=${encodeURIComponent(shareData.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-foreground bg-[#FAF6EE] text-foreground font-bold text-sm hover:bg-[#D2E9F9] transition-all shadow-[2px_2px_0px_#1a1a15] active:translate-x-0.5 active:translate-y-0.5"
          title="Share on X"
        >
          <Twitter className="h-4 w-4" />
          <span>X</span>
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + " " + shareData.url)}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-foreground bg-[#FAF6EE] text-foreground font-bold text-sm hover:bg-[#D2E9F9] transition-all shadow-[2px_2px_0px_#1a1a15] active:translate-x-0.5 active:translate-y-0.5"
          title="Share via email"
        >
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </a>
      </div>
    </div>
  );
}
