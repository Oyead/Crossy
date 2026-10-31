"use client";

import { Youtube, Twitter, Linkedin, Instagram, Facebook } from "lucide-react";

const SOCIAL_PROFILES = [
  { name: "YouTube", url: "https://www.youtube.com/@crossy", icon: Youtube },
  { name: "X", url: "https://x.com/crossy", icon: Twitter },
  { name: "LinkedIn", url: "https://www.linkedin.com/company/crossy", icon: Linkedin },
  { name: "Instagram", url: "https://www.instagram.com/crossy", icon: Instagram },
  { name: "Facebook", url: "https://www.facebook.com/crossy", icon: Facebook },
];

export default function SocialProfiles() {
  return (
    <div className="relative border-2 border-foreground bg-white/60 backdrop-blur-sm p-5 sm:p-6 rounded-2xl shadow-[4px_4px_0px_#1a1a15]">
      <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
      <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
      <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
      <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
      <h2 className="text-lg font-black text-foreground mb-2 text-left uppercase tracking-wider">
        Follow Crossy
      </h2>
      <p className="text-left text-muted-foreground font-medium mb-4 max-w-xl text-sm">
        Connect with Crossy for cross-medium discovery updates, recommendations,
        and new feature releases.
      </p>
      <div className="flex flex-wrap justify-start gap-3">
        {SOCIAL_PROFILES.map((profile) => {
          const Icon = profile.icon;
          return (
            <a
              key={profile.name}
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-foreground bg-[#FAF6EE] text-foreground font-bold text-xs min-h-[40px] min-w-[40px] hover:bg-[#D2E9F9] transition-all shadow-[2px_2px_0px_#1a1a15] active:translate-x-0.5 active:translate-y-0.5"
              title={`Follow Crossy on ${profile.name}`}
            >
              <Icon className="h-4 w-4" />
              <span>{profile.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
