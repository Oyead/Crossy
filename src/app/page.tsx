import SearchBar from "../components/search/SearchBar";
import MediaPhrase from "../components/hero/MediaPhrase";
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
  },
  {
    icon: Music,
    label: "Music",
    bgClass: "bg-[#FAD3A2]",
  },
  {
    icon: Gamepad2,
    label: "Games",
    bgClass: "bg-[#E8C5C8]",
  },
  {
    icon: BookOpen,
    label: "Books",
    bgClass: "bg-[#FFEAA7]",
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
            Enter a movie, show, album, game, or book, or just describe a mood.
            We&apos;ll discover brilliant matches scattered across different mediums automatically.
          </p>

          <div className="w-full pl-2">
            <SearchBar />
          </div>
        </div>


      </div>

      <div className="mx-auto w-full max-w-7xl pt-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.label}
              className={`animate-fade-up border-2 border-foreground p-5 rounded-xl ${feature.bgClass} retro-shadow-md transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1a1a15] cursor-pointer`}
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-white shadow-[2px_2px_0px_#1a1a15]">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{feature.label}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </section>
  );
}