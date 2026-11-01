import { Suspense } from "react";
import ResultsGrid from "@/components/results/ResultsGrid";
import ResultsSkeleton from "@/components/results/ResultsSkeleton";
import { getCurrentUserId } from "@/lib/auth";
import { getUserSearchSignal, type UserSearchSignal } from "@/server/context/userSignal";
import { processMediaQuery } from "@/server/pipeline/mediaPipeline";
import { createTimings } from "@/lib/trace";

function EmptyState() {
  return (
    <div className="relative rounded-2xl border-2 border-[#1a1a15] bg-white p-12 text-center shadow-[6px_6px_0px_#1a1a15] max-w-xl mx-auto my-12">
      <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#E8C5C8] border border-[#1a1a15]" />
      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#E8C5C8] border border-[#1a1a15]" />
      <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#E8C5C8] border border-[#1a1a15]" />
      <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#E8C5C8] border border-[#1a1a15]" />

      <p className="text-xl font-black text-[#1a1a15] uppercase tracking-wider">No Connections Found</p>
      <p className="mt-3 text-sm font-medium text-[#1a1a15]/70 leading-relaxed">
        We couldn&apos;t bridge cross-medium threads for this input. Try describing a different mood, genre, or specific artistic piece.
      </p>
    </div>
  );
}

export default async function Page({ params }: { params: { queryId: string } }) {
  const { queryId } = params;
  const query = decodeURIComponent(queryId);

  return (
    <section className="relative overflow-hidden min-h-screen px-4 sm:px-8 py-10 lg:py-16 bg-[#FAF6EE]">

      <div className="absolute top-12 left-10 text-[#1a1a15] opacity-10 hidden xl:block select-none pointer-events-none">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2Z"/>
        </svg>
      </div>

      <div className="mx-auto max-w-7xl">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-16">

          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="relative border-2 border-[#1a1a15] p-6 sm:p-8 rounded-2xl bg-white shadow-[8px_8px_0px_#1a1a15] w-full">
              <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />
              <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />
              <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />

              <span className="text-xs font-black uppercase tracking-widest text-[#4F46E5] bg-[#D2E9F9] border border-[#1a1a15] px-2.5 py-1 rounded-md shadow-[2px_2px_0px_#1a1a15] inline-block mb-4">
                ✦ Mapping Engine Active
              </span>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1a1a15] leading-[1.15]">
                Cross-Medium Results <br />
                <span className="text-sm font-bold tracking-widest uppercase block text-[#1a1a15]/50 mt-3 mb-1">
                  Results for:
                </span>
                <span className="inline-block bg-[#FFEAA7] text-[#1a1a15] px-4 py-1 rounded-xl border-2 border-[#1a1a15] shadow-[4px_4px_0px_#1a1a15] text-2xl sm:text-4xl mt-1 font-black">
                  &ldquo;{query}&rdquo;
                </span>
              </h1>
            </div>
          </div>

          <aside className="lg:col-span-5 relative border-2 border-[#1a1a15] bg-white/70 backdrop-blur-sm p-5 sm:p-6 rounded-2xl shadow-[6px_6px_0px_#1a1a15]">
            <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#D2E9F9] border border-[#1a1a15]" />
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#D2E9F9] border border-[#1a1a15]" />
            <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#D2E9F9] border border-[#1a1a15]" />
            <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#D2E9F9] border border-[#1a1a15]" />

            <p className="text-xs font-black uppercase tracking-widest text-[#4F46E5]">
              ✦ How this grid works
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-[#1a1a15]/70">
              We parse your exploration seed across film repositories, game
              catalogs, music databases, and literary texts to build an
              interconnected aesthetic matching grid.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Movies", "TV", "Music", "Games", "Books"].map((type) => (
                <span
                  key={type}
                  className="rounded-md border border-[#1a1a15]/40 bg-[#FAF6EE] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#1a1a15]/70"
                >
                  {type}
                </span>
              ))}
            </div>
          </aside>

        </div>

        <div className="w-full border-t-2 border-dashed border-[#1a1a15]/30 mb-12" />

        <div className="w-full min-h-[400px]">
          <Suspense fallback={<ResultsSkeleton />}>
            <SearchResults query={query} />
          </Suspense>
        </div>

      </div>
    </section>
  );
}

async function SearchResults({ query }: { query: string }) {
  const timings = createTimings();

  let personalization: UserSearchSignal | undefined;
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      personalization = await getUserSearchSignal(userId, query);
    }
  } catch (error) {
    console.error("[search] Failed to load user signal:", error);
  }

  const results = await processMediaQuery(query, timings, personalization);
  console.log(`[search] "${query}" complete: ${timings.toHeader()}`);

  if (results.length === 0) return <EmptyState />;
  return <ResultsGrid results={results} query={query} />;
}