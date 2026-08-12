import { Suspense } from "react";
import ResultsGrid from "@/components/results/ResultsGrid";
import {
  processMediaQueryFast,
  processMediaQueryEnhanced,
} from "@/server/pipeline/mediaPipeline";
import { createTimings } from "@/lib/trace";

// High-contrast tactile empty state modeled after the layout cards in 32.jpg
function EmptyState() {
  return (
    <div className="relative rounded-2xl border-2 border-[#1a1a15] bg-white p-12 text-center shadow-[6px_6px_0px_#1a1a15] max-w-xl mx-auto my-12">
      {/* Editorial Corner Anchors */}
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
  const initial = await processMediaQueryFast(query, timings);
  console.log(`[search] "${query}" fast phase: ${timings.toHeader()}`);

  return (
    <section className="relative overflow-hidden min-h-screen px-4 sm:px-8 py-10 lg:py-16 bg-[#FAF6EE]">
      
      {/* Editorial Star Accents floating in whitespace (32.jpg / 42.jpg) */}
      <div className="absolute top-12 left-10 text-[#1a1a15] opacity-10 hidden xl:block select-none pointer-events-none">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2Z"/>
        </svg>
      </div>

      <div className="mx-auto max-w-7xl">
        
        {/* Main Asymmetric Header Grid Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          
          {/* Left Column: Structural Text Bounding Frame (Inspired by 32.jpg) */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="relative border-2 border-[#1a1a15] p-6 sm:p-8 rounded-2xl bg-white shadow-[8px_8px_0px_#1a1a15] w-full">
              {/* Box Corner Nodes */}
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

          {/* Right Column: Arched Status Art Panel & Pop Color Badges (Inspired by 42.jpg & 10.jpg) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="relative border-2 border-[#1a1a15] p-4 bg-white shadow-[8px_8px_0px_#1a1a15] rounded-2xl w-full max-w-sm">
              
              {/* Tall Arched Window Element from 42.jpg */}
              <div className="w-full h-72 bg-[#D2E9F9] border-2 border-[#1a1a15] rounded-t-full overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a15]/70 via-transparent to-transparent z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80" 
                  alt="Abstract Composition Structure" 
                  className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Floating Meta-Badge inside the Arch */}
                <div className="absolute bottom-4 left-4 right-4 bg-white border border-[#1a1a15] p-3 rounded-xl shadow-[3px_3px_0px_#1a1a15] text-[11px] font-black uppercase text-[#1a1a15] leading-snug">
                  ✨ Gemini AI is upgrading and sorting cards below in real-time.
                </div>
              </div>

              {/* Candy-Colored Block Mosaic Bar from 10.jpg */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="h-11 rounded-xl border-2 border-[#1a1a15] bg-[#E8C5C8] shadow-[2px_2px_0px_#1a1a15]" />
                <div className="h-11 rounded-xl border-2 border-[#1a1a15] bg-[#FAD3A2] shadow-[2px_2px_0px_#1a1a15]" />
                <div className="h-11 rounded-xl border-2 border-[#1a1a15] bg-[#4F46E5] shadow-[2px_2px_0px_#1a1a15]" />
                <div className="h-11 rounded-xl border-2 border-[#1a1a15] bg-[#FFEAA7] shadow-[2px_2px_0px_#1a1a15]" />
              </div>
            </div>
          </div>

        </div>

        {/* Structural Dotted Divider Grid Separation */}
        <div className="w-full border-t-2 border-dashed border-[#1a1a15]/30 mb-12" />

        {/* Continuous Asynchronous Stream Presentation Grid */}
        <div className="w-full min-h-[400px]">
          <Suspense
            fallback={
              initial.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="opacity-50 pointer-events-none saturate-50 transition-opacity duration-300">
                  <ResultsGrid results={initial} />
                </div>
              )
            }
          >
            <EnhancedResults query={query} initial={initial} />
          </Suspense>
        </div>

      </div>
    </section>
  );
}

// Handles stream-rendering matching lists cleanly
async function EnhancedResults({
  query,
  initial,
}: {
  query: string;
  initial: Array<any>;
}) {
  const timings = createTimings();
  const enhanced = await processMediaQueryEnhanced(query, initial, timings);
  console.log(`[search] "${query}" enhanced phase: ${timings.toHeader()}`);

  const results = enhanced.length > 0 ? enhanced : initial;

  return results.length === 0 ? <EmptyState /> : <ResultsGrid results={results} />;
}