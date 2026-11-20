export default function ResultsSkeleton() {
  return (
    <div className="space-y-16 animate-pulse" aria-busy="true" aria-label="Loading results">
      {["Movies", "Games", "Music", "Books"].map((label, s) => (
        <div
          key={label}
          className="relative rounded-2xl border-2 border-[#1a1a15] bg-white/60 p-6 backdrop-blur-sm retro-shadow-md sm:p-8"
        >
          <span className="absolute -top-1.5 -left-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />
          <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />
          <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 border border-[#1a1a15] bg-[#FFEAA7]" />

          <div className="mb-8 flex items-center justify-between gap-4 border-b-2 border-dashed border-[#1a1a15]/20 pb-4">
            <span className="inline-block h-9 w-32 rounded-lg bg-[#1a1a15]/10 border-2 border-[#1a1a15]/30" />
            <span className="h-6 w-24 rounded-lg bg-[#1a1a15]/10" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: s === 0 ? 3 : 2 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[4/5] w-full rounded-lg bg-[#1a1a15]/10 border-2 border-[#1a1a15]/20" />
                <div className="mt-4 h-4 w-3/4 rounded bg-[#1a1a15]/10" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[#1a1a15]/10" />
              </div>
            ))}
          </div>
          <span className="sr-only">{label} results loading…</span>
        </div>
      ))}
    </div>
  );
}
