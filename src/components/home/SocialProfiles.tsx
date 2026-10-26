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
    <div className="mx-auto max-w-7xl px-6 py-12 border-y-2 border-foreground bg-white/40 backdrop-blur-sm">
      <h2 className="text-xl sm:text-2xl font-black text-foreground mb-6 text-center uppercase tracking-wider">
        Follow Crossy
      </h2>
      <p className="text-center text-muted-foreground font-medium mb-8 max-w-xl mx-auto">
        Connect with Crossy across social media for the latest cross-medium
        discovery updates, recommendations, and new feature releases.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {SOCIAL_PROFILES.map((profile) => {
          const Icon = profile.icon;
          return (
            <a
              key={profile.name}
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 border-foreground bg-[#FAF6EE] text-foreground font-bold text-sm min-h-[44px] min-w-[44px] hover:bg-[#D2E9F9] transition-all shadow-[2px_2px_0px_#1a1a15] active:translate-x-0.5 active:translate-y-0.5"
              title={`Follow Crossy on ${profile.name}`}
            >
              <Icon className="h-5 w-5" />
              <span>{profile.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
