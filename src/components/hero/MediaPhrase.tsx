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
      className="relative max-w-full bg-[#4F46E5] text-white px-3 py-1 inline-block retro-shadow-sm rotate-[-1deg] mt-2 cursor-pointer text-[1.7rem] min-[420px]:text-[length:inherit] after:content-['movies_&_tv'] after:invisible"
    >
      <span className="absolute inset-0 flex items-center justify-center px-3 whitespace-nowrap">
        {hovering ? WORDS[index] : "in any medium"}
      </span>
    </span>
  );
}
