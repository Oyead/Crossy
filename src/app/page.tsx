import SearchBar from "../components/search/SearchBar";
import { Clapperboard, Music, Gamepad2, BookOpen, Tv } from "lucide-react";

const FEATURES = [
  {
    icon: Clapperboard,
    label: "Movies & TV",
    hint: "Films and series from TMDB",
  },
  {
    icon: Music,
    label: "Music",
    hint: "Tracks & albums from iTunes",
  },
  {
    icon: Gamepad2,
    label: "Games",
    hint: "From the RAWG catalog",
  },
  {
    icon: BookOpen,
    label: "Books",
    hint: "From Open Library",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="mb-4 rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
        Cross-medium discovery
      </p>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        Find your next favorite,{" "}
        <span className="text-accent">in any medium</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Enter a movie, show, album, game, or book — or just describe a mood.
        We&apos;ll find matches across every medium, not just the one you started in.
      </p>

      <div className="mt-8 w-full flex justify-center">
        <SearchBar />
      </div>

      <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <feature.icon className="h-6 w-6 text-accent" />
            <span className="text-sm font-semibold">{feature.label}</span>
            <span className="text-xs text-muted-foreground">{feature.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
