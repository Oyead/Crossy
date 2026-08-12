"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles, Layers } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Discover", href: "#" },
    { name: "Media Catalog", href: "#" },
    { name: "My Library", href: "#" },
  ];

  return (
    <nav className="top-0 z-50 px-6 py-4 bg-[#FAF6EE]">
      <div className="mx-auto max-w-7xl flex items-center justify-between border-2 border-foreground bg-white px-6 py-3 rounded-2xl retro-shadow-sm relative">
        
        {/* Decorative corner target handles inspired by 32.jpg */}
        <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
        <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
        <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
        <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />

        {/* Logo / Brand Wrapper */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-[#4F46E5] text-white shadow-[2px_2px_0px_#1a1a15] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[0px_0px_0px_#1a1a15] transition-all">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-black text-xl tracking-tight text-foreground uppercase">
            Crossy
          </span>
        </Link>

        {/* Desktop Navigation Links (Inline Minimalist List) */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="font-bold text-sm text-foreground/80 hover:text-foreground px-3 py-1.5 rounded-lg border border-transparent hover:border-foreground hover:bg-[#D2E9F9] hover:retro-shadow-sm transition-all"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Action Callout Button (Styled like the prominent badges in 42.jpg / 32.jpg) */}
        <div className="hidden md:flex items-center">
          <Link
            href="#"
            className="flex items-center gap-1.5 bg-[#FFEAA7] border-2 border-foreground px-4 py-2 rounded-xl text-xs font-black text-foreground uppercase tracking-wider retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />
            Go Pro
          </Link>
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-xl border border-foreground bg-white text-foreground retro-shadow-sm active:scale-95 transition-all"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer (Applying the 10.jpg / 42.jpg structural color grids vibe) */}
      {isOpen && (
        <div className="md:hidden mt-3 border-2 border-foreground bg-white rounded-2xl p-4 retro-shadow-md flex flex-col gap-3 animate-fade-up">
          {navLinks.map((link, idx) => {
            // Distribute matching candy background colors across mobile items on hover
            const dynamicBgs = ["hover:bg-[#D2E9F9]", "hover:bg-[#FAD3A2]", "hover:bg-[#E8C5C8]"];
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`w-full font-bold text-base text-foreground border-2 border-transparent p-3 rounded-xl transition-all ${dynamicBgs[idx % dynamicBgs.length]} hover:border-foreground hover:retro-shadow-sm`}
              >
                ✦ {link.name}
              </Link>
            );
          })}
          
          <hr className="border-t border-foreground/30 my-1" />
          
          <Link
            href="#"
            onClick={() => setIsOpen(false)}
            className="w-full text-center bg-[#FFEAA7] border-2 border-foreground p-3 rounded-xl font-black text-sm uppercase tracking-wider retro-shadow-sm block"
          >
            Go Pro ✦
          </Link>
        </div>
      )}
    </nav>
  );
}