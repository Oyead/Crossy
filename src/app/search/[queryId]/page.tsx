import { notFound } from "next/navigation";
import ResultsGrid from "@/components/results/ResultsGrid";
import { processMediaQuery } from "@/server/pipeline/mediaPipeline";

export default async function Page({ params }: { params: { queryId: string } }) {
  const { queryId } = params;
  const query = decodeURIComponent(queryId);

  const results = await processMediaQuery(query);
  if (!results) {
    notFound();
  }

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
      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-16 text-center">
          <p className="text-lg font-medium">No results found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different movie, show, album, game, or book title.
          </p>
        </div>
      ) : (
        <ResultsGrid results={results} />
      )}
    </div>
  );
}
