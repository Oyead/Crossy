import { Suspense } from "react";
import ResultsGrid from "@/components/results/ResultsGrid";
import {
  processMediaQueryFast,
  processMediaQueryEnhanced,
} from "@/server/pipeline/mediaPipeline";
import { createTimings } from "@/lib/trace";

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-16 text-center">
      <p className="text-lg font-medium">No results found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Try a different movie, show, album, game, or book title.
      </p>
    </div>
  );
}

export default async function Page({ params }: { params: { queryId: string } }) {
  const { queryId } = params;
  const query = decodeURIComponent(queryId);

  // Render immediately with provider results (cheap sort), no AI wait.
  const timings = createTimings();
  const initial = await processMediaQueryFast(query, timings);
  console.log(`[search] "${query}" fast phase: ${timings.toHeader()}`);

  return (
    <div className="container py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-accent mb-2">
          Search results
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Results for &quot;{query}&quot;
        </h1>
      </div>

      <Suspense
        fallback={
          initial.length === 0 ? (
            <EmptyState />
          ) : (
            <ResultsGrid results={initial} />
          )
        }
      >
        <EnhancedResults query={query} initial={initial} />
      </Suspense>
    </div>
  );
}

// Streams in Gemini's ranking — reasons and confidence "upgrade" the cards
// in place once ready (keys are stable, so React reconciles rather than
// flashing a full swap).
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
