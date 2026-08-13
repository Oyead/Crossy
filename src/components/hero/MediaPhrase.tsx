"use client";

import { useEffect, useState } from "react";

const WORDS = ["movies & tv", "games", "music", "books"];

export default function MediaPhrase() {
  const [hovering, setHovering] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!hovering) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 1000);
    return () => clearInterval(id);
  }, [hovering]);

  return (
    <span
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="relative bg-[#4F46E5] text-white px-3 py-1 inline-block retro-shadow-sm rotate-[-1deg] mt-2"
    >
      <span className="invisible" aria-hidden="true">
        in any medium
      </span>
      <span className="absolute inset-y-0 left-0 right-0 px-3 flex items-center whitespace-nowrap">
        {hovering ? WORDS[index] : "in any medium"}
      </span>
    </span>
  );
}
