import SearchBar from "@/components/search/SearchBar";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Find your next favorite, in any medium
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Enter a movie, show, album, game, or book — or just describe a mood.
        We'll find matches across every medium, not just the one you started in.
      </p>

      <SearchBar />
    </div>
  );
}