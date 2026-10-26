import SearchBar from "../components/search/SearchBar";
import MediaPhrase from "../components/hero/MediaPhrase";
import ForYouSection from "../components/home/ForYouSection";
import SocialShare from "../components/home/SocialShare";
import SocialProfiles from "../components/home/SocialProfiles";
import Link from "next/link";
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
      "Browse films and series across genres, eras, and streaming platforms to find your next favorite in any medium.",
    href: "/search?q=movies",
  },
  {
    icon: Music,
    label: "Music",
    bgClass: "bg-[#FAD3A2]",
    description:
      "Find albums, artists, and tracks that match your vibe across every medium.",
    href: "/search?q=music",
  },
  {
    icon: Gamepad2,
    label: "Games",
    bgClass: "bg-[#E8C5C8]",
    description:
      "Discover indie gems and AAA titles across platforms and moods.",
    href: "/search?q=games",
  },
  {
    icon: BookOpen,
    label: "Books",
    bgClass: "bg-[#FFEAA7]",
    description:
      "Explore novels, non-fiction, and graphic novels by mood and genre.",
    href: "/search?q=books",
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
      "@id": "https://crossy.app/#organization",
      "name": "Crossy",
      "url": "https://crossy.app/",
      "logo": "https://crossy.app/logo.png",
    },
    {
      "@type": "WebSite",
      "@id": "https://crossy.app/#website",
      "url": "https://crossy.app/",
      "name": "Crossy",
      "description":
        "Discover your next favorite movie, show, game, or book across every medium with AI-powered cross-medium recommendations.",
      "publisher": { "@id": "https://crossy.app/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://crossy.app/search?q={search_term_string}",
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

      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8 pb-16">

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

          <p className="max-w-xl text-lg text-muted-foreground font-medium mb-8 pl-2">
            Find your next favorite movie, show, album, game, or book in any
            medium. Crossy is a cross-medium discovery engine built to help you
            discover brilliant matches scattered across movies, TV, music,
            games, and books. Enter a title, describe a mood, or pick a genre,
            and we&apos;ll surface your next favorite automatically&mdash;no
            matter which medium it lives in.
          </p>

          <div className="w-full pl-2">
            <SearchBar />
          </div>

          <p className="max-w-xl text-lg text-muted-foreground font-medium mt-8 pl-2">
            Start searching to find your next favorite in any medium. Build your
            <Link href="/favorites" className="text-[#4F46E5] underline underline-offset-2 hover:decoration-[#1a1a15]">
              library
            </Link>
            , explore personalized picks, and go pro for unlimited cross-medium
            discovery.
          </p>

        </div>

      </div>

      <div className="mx-auto w-full max-w-7xl pt-8 pb-12">
        <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-8 text-left uppercase tracking-wider">
          Discover across every medium
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <Link
              key={feature.label}
              href={feature.href}
              className={`block animate-fade-up border-2 border-foreground p-5 rounded-xl ${feature.bgClass} retro-shadow-md transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1a1a15]`}
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
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl pt-8 pb-12">
        <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-6 text-left uppercase tracking-wider">
          How Crossy works
        </h2>
        <p className="max-w-3xl text-lg text-muted-foreground font-medium leading-relaxed mb-6">
          Crossy blends AI-powered recommendations with vector search to connect
          you across every entertainment medium. Whether you are in the mood for
          a sci-fi film, a cozy game, synthwave music, or a fantasy novel,
          Crossy surfaces matches you might otherwise miss. Our engine analyzes
          movies, shows, albums, games, and books together, so your next
          favorite could come from any medium&mdash;not just the one you started
          with. Discover cross-medium recommendations that fit your taste, your
          mood, and your moment.
        </p>
        <p className="max-w-3xl text-lg text-muted-foreground font-medium leading-relaxed mb-6">
          Data is provided by our partners:{" "}
          {EXTERNAL_SOURCES.map((source, i) => (
            <span key={source.name} className="inline-block">
              {i > 0 && <span className="mx-2 text-foreground/40">·</span>}
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
          .
        </p>
      </div>

      <ForYouSection />

      <SocialShare />

      <SocialProfiles />

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
    </section>
  );
}
