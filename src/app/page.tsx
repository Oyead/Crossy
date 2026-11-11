import SearchBar from "../components/search/SearchBar";
import MediaPhrase from "../components/hero/MediaPhrase";
import ForYouSection from "../components/home/ForYouSection";
import SocialShare from "../components/home/SocialShare";
import SocialProfiles from "../components/home/SocialProfiles";
import {
  Clapperboard,
  Music,
  Gamepad2,
  BookOpen,
} from "lucide-react";

const FEATURES = [
  {
    icon: Clapperboard,
    label: "Movies & TV",
    bgClass: "bg-[#D2E9F9]",
    description:
      "Films and series across genres, eras, and streaming platforms.",
  },
  {
    icon: Music,
    label: "Music",
    bgClass: "bg-[#FAD3A2]",
    description:
      "Albums, artists, and tracks that match your vibe.",
  },
  {
    icon: Gamepad2,
    label: "Games",
    bgClass: "bg-[#E8C5C8]",
    description:
      "Indie gems and AAA titles across platforms and moods.",
  },
  {
    icon: BookOpen,
    label: "Books",
    bgClass: "bg-[#FFEAA7]",
    description:
      "Novels, non-fiction, and graphic novels by mood and genre.",
  },
];

const MEDIA_TYPES = [
  "Inception", "The Dark Knight", "Interstellar", "Parasite",
  "Spirited Away", "The Matrix", "Breaking Bad", "Stranger Things",
  "Tame Impala", "Kendrick Lamar", "Radiohead", "Frank Ocean",
  "Elden Ring", "Stardew Valley", "The Legend of Zelda", "Hades",
  "Dune", "1984", "The Hobbit",
  "Sci-fi", "Cozy", "Synthwave", "Cyberpunk", "Noir", "Fantasy",
  "Lo-fi", "True crime", "Ambient", "Retro",
];

const EXTERNAL_SOURCES = [
  { name: "TMDB", url: "https://www.themoviedb.org" },
  { name: "iTunes", url: "https://www.apple.com/itunes/" },
  { name: "RAWG", url: "https://rawg.io" },
  { name: "Open Library", url: "https://openlibrary.org" },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://crossy.site/#organization",
      "name": "Crossy",
      "url": "https://crossy.site/",
      "logo": "https://crossy.site/logo.png",
    },
    {
      "@type": "WebSite",
      "@id": "https://crossy.site/#website",
      "url": "https://crossy.site/",
      "name": "Crossy",
      "description":
        "Discover your next favorite movie, show, game, or book across every medium with AI-powered cross-medium recommendations.",
      "publisher": { "@id": "https://crossy.site/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://crossy.site/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <section className="relative overflow-hidden min-h-screen px-6 py-12 lg:py-20">

      <div className="absolute top-12 left-12 text-[#1a1a15] opacity-20 hidden md:block select-none pointer-events-none">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2Z"/>
        </svg>
      </div>
      <div className="absolute top-24 right-1/3 text-[#4F46E5] opacity-20 hidden lg:block select-none pointer-events-none">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/>
        </svg>
      </div>

      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-start pt-8 pb-16">

        <div className="lg:col-span-7 flex flex-col justify-center text-left relative">

          <div className="relative border border-foreground/40 p-6 md:p-8 rounded-xl bg-white/40 backdrop-blur-sm mb-8">
            <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#FFEAA7] border border-foreground" />

            <p className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] mb-3 flex items-center gap-1.5">
              ✦ Cross-medium discovery
            </p>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
              Find your next favorite, <br />
              <MediaPhrase />
            </h1>
          </div>

          <div className="w-full pl-2">
            <SearchBar />
          </div>

        </div>
        <aside className="lg:col-span-5 relative border-2 border-foreground bg-white/70 backdrop-blur-sm p-5 sm:p-6 rounded-xl retro-shadow-sm">
          <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#D2E9F9] border border-foreground" />
          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#D2E9F9] border border-foreground" />
          <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#D2E9F9] border border-foreground" />
          <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#D2E9F9] border border-foreground" />
          <p className="text-xs font-black uppercase tracking-widest text-[#4F46E5]">
            ✦ One search, every medium
          </p>
          <h2 className="mt-2 text-xl font-black leading-tight text-foreground">
            Discover your next favorite across movies, TV, music, games, and books.
          </h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
            Crossy is an AI-powered cross-medium discovery engine. Enter a title,
            describe a mood, or pick a genre, and we&apos;ll surface brilliant
            matches from every medium&mdash;not just the one you started with.
          </p>
          <p className="mt-4 border-t-2 border-dashed border-foreground/20 pt-3 text-xs font-medium leading-relaxed text-muted-foreground">
            Start with a title, a mood, or a genre in the search box&mdash;Crossy
            takes it from there.
          </p>
        </aside>
      </div>

      <div className="mx-auto w-full max-w-7xl pt-8 pb-12">
        <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-8 text-left uppercase tracking-wider">
          Discover across every medium
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.label}
              className={`animate-fade-up border-2 border-foreground p-5 rounded-xl ${feature.bgClass} retro-shadow-md`}
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-white shadow-[2px_2px_0px_#1a1a15]">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{feature.label}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          <div className="lg:col-span-4">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground text-left uppercase tracking-wider">
              How Crossy works
            </h2>
            <p className="mt-3 text-sm font-bold uppercase tracking-widest text-[#4F46E5]">
              Taste, mood, and moment
            </p>
          </div>
          <div className="lg:col-span-8">
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
              Crossy uses AI embeddings and vector search to connect metadata
              across movies, shows, albums, games, and books, so a single seed
              surfaces matches in every medium. Your next favorite might come
              from a medium you didn&apos;t start in.
            </p>
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-widest text-foreground/50">
                For example
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold">
                <span className="rounded-lg border-2 border-foreground bg-[#FFEAA7] px-3 py-1.5 shadow-[2px_2px_0px_#1a1a15]">
                  Dune
                </span>
                <span className="text-foreground/40">&rarr;</span>
                <span className="rounded-lg border border-foreground/40 bg-muted/40 px-3 py-1.5">
                  Hyperion <span className="text-muted-foreground">· book</span>
                </span>
                <span className="rounded-lg border border-foreground/40 bg-muted/40 px-3 py-1.5">
                  Blade Runner 2049 OST{" "}
                  <span className="text-muted-foreground">· music</span>
                </span>
                <span className="rounded-lg border border-foreground/40 bg-muted/40 px-3 py-1.5">
                  Hellblade <span className="text-muted-foreground">· game</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForYouSection />

      <div className="mask-fade-x animate-marquee flex w-max gap-4 py-6 border-y-2 border-foreground bg-white mt-8 font-bold text-sm text-foreground uppercase tracking-wider">
        {[...MEDIA_TYPES, ...MEDIA_TYPES].map((type, index) => (
          <span
            key={`${type}-${index}`}
            className="px-4 py-1 mx-2 rounded border border-foreground/30 bg-muted/40"
          >
            ✦ {type}
          </span>
        ))}
      </div>

      <footer className="mx-auto w-full max-w-7xl px-6 pt-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <p>
            Data provided by{" "}
            {EXTERNAL_SOURCES.map((source, i) => (
              <span key={source.name} className="inline-block">
                {i > 0 && <span className="mx-1.5 text-foreground/40">·</span>}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4F46E5] underline underline-offset-2 hover:decoration-[#1a1a15]"
                >
                  {source.name}
                </a>
              </span>
            ))}
          </p>
          <p>© {new Date().getFullYear()} Crossy</p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <SocialShare />
          <SocialProfiles />
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
    </section>
  );
}
