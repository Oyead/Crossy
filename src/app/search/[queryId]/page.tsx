import { notFound } from "next/navigation";
import ResultsGrid from "@/components/results/ResultsGrid";

export default async function Page({ params }: { params: { queryId: string } }) {
  const { queryId } = params;
  const query = decodeURIComponent(queryId);

  // Fetch results from our own API
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    notFound();
  }
  const results = await res.json();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Search results for: "{query}"</h1>
      {results.length === 0 ? (
        <p className="text-center text-muted-foreground">No results found.</p>
      ) : (
        <ResultsGrid results={results} />
      )}
    </div>
  );
}