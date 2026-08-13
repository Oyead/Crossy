import { Suspense } from "react";
import { headers } from "next/headers";
import ResultsGrid from "@/components/results/ResultsGrid";
import {
  processMediaQueryFast,
  mergeMediaQueryResults,
  rankMergedResults,
} from "@/server/pipeline/mediaPipeline";
import { generateCandidatesWithAi } from "@/server/pipeline/candidateSearch";
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

  const timings = createTimings();
  const candidatesPromise = generateCandidatesWithAi(query);
  const initial = await processMediaQueryFast(query, timings);
  console.log(`[search] "${query}" fast phase: ${timings.toHeader()}`);

  try {
    headers().set("Server-Timing", timings.toHeader());
  } catch (error) {
  }

  return (
    <section className="relative overflow-hidden min-h-screen px-4 sm:px-8 py-10 lg:py-16 bg-[#FAF6EE]">
      
      <div className="absolute top-12 left-10 text-[#1a1a15] opacity-10 hidden xl:block select-none pointer-events-none">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2Z"/>
        </svg>
      </div>

      <div className="mx-auto max-w-7xl">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          
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
                  Query Parameter Match:
                </span>
                <span className="inline-block bg-[#FFEAA7] text-[#1a1a15] px-4 py-1 rounded-xl border-2 border-[#1a1a15] shadow-[4px_4px_0px_#1a1a15] text-2xl sm:text-4xl mt-1 font-black">
                  &ldquo;{query}&rdquo;
                </span>
              </h1>
            </div>
            
            <p className="mt-6 text-sm sm:text-base text-[#1a1a15]/70 font-medium max-w-xl pl-2 leading-relaxed">
              We parsed your exploration seed across film repositories, game catalogs, vinyl databases, and literary texts to formulate an interconnected aesthetic matching grid.
            </p>
          </div>

        </div>

        <div className="w-full border-t-2 border-dashed border-[#1a1a15]/30 mb-12" />

        <div className="w-full min-h-[400px]">
          <Suspense
            fallback={
              initial.length === 0 ? (
                <EmptyState />
              ) : (
                <ResultsGrid results={initial} />
              )
            }
          >
            <MergedResults query={query} initial={initial} candidatesPromise={candidatesPromise} />
          </Suspense>
        </div>

      </div>
    </section>
  );
}

async function MergedResults({
  query,
  initial,
  candidatesPromise,
}: {
  query: string;
  initial: Array<any>;
  candidatesPromise: ReturnType<typeof generateCandidatesWithAi>;
}) {
  const timings = createTimings();
  const { results: merged, fromCache } = await mergeMediaQueryResults(
    query,
    initial,
    timings,
    candidatesPromise
  );
  console.log(`[search] "${query}" merged phase: ${timings.toHeader()}`);

  if (merged.length === 0) {
    return <EmptyState />;
  }

  if (fromCache) {
    return <ResultsGrid results={merged} />;
  }

  return (
    <Suspense fallback={<ResultsGrid results={merged} />}>
      <RankedResults query={query} merged={merged} />
    </Suspense>
  );
}

async function RankedResults({
  query,
  merged,
}: {
  query: string;
  merged: Array<any>;
}) {
  const timings = createTimings();
  const ranked = await rankMergedResults(query, merged, timings);
  console.log(`[search] "${query}" ranked phase: ${timings.toHeader()}`);

  return <ResultsGrid results={ranked} />;
}