"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Sparkles, LogOut, KeyRound, ChevronDown } from "lucide-react";
import logo from "@/app/logo.png";

const CORNER_DOT_POSITIONS = [
  "-top-1.5 -left-1.5",
  "-top-1.5 -right-1.5",
  "-bottom-1.5 -left-1.5",
  "-bottom-1.5 -right-1.5",
];

const DESKTOP_LINK_CLASS =
  "font-bold text-sm text-foreground/80 hover:text-foreground px-3 py-1.5 rounded-lg border border-transparent hover:border-foreground hover:bg-[#D2E9F9] hover:retro-shadow-sm transition-all";

const MOBILE_ITEM_BASE_CLASS =
  "w-full font-bold text-base text-foreground border-2 p-3 rounded-xl transition-all text-left";

const MOBILE_DYNAMIC_BGS = [
  "hover:bg-[#D2E9F9]",
  "hover:bg-[#FAD3A2]",
  "hover:bg-[#E8C5C8]",
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const username = session?.user?.email?.split("@")[0] ?? "User";

  const handleSignOut = () => {
    setIsOpen(false);
    signOut({ callbackUrl: "/" });
  };

  const SignOutButton = ({ className, children }: { className: string; children: ReactNode }) => (
    <button type="button" onClick={handleSignOut} className={className}>
      {children}
    </button>
  );

  const navLinks = [
    { name: "Discover", href: "/" },
    { name: "My Library", href: "/favorites" },
    ];

  return (
    <nav className="top-0 z-50 px-6 py-4 bg-[#FAF6EE]">
      <div className="mx-auto max-w-7xl flex items-center justify-between border-2 border-foreground bg-white px-6 py-3 rounded-2xl retro-shadow-sm relative">
        
        {CORNER_DOT_POSITIONS.map((position) => (
          <span
            key={position}
            className={`absolute ${position} w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground`}
          />
        ))}

        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src={logo}
            alt="Crossy Logo"
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
          <span className="text-xl font-black leading-none tracking-tight text-foreground uppercase">
            Crossy
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={DESKTOP_LINK_CLASS}
            >
              {link.name}
            </Link>
          ))}
          {isLoggedIn ? (
            <div className="relative group flex items-center">
              <span className="flex items-center gap-1.5 font-bold text-sm text-foreground/80 hover:text-foreground px-3 py-1.5 rounded-lg border border-transparent group-hover:border-foreground group-hover:bg-[#D2E9F9] group-hover:retro-shadow-sm transition-all cursor-pointer">
                {username}
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </span>
              <div className="absolute right-0 top-full pt-2 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 focus-within:visible focus-within:opacity-100 focus-within:translate-y-0 transition-all duration-150 flex flex-col gap-1">
                <Link
                  href="/forgot-password"
                  className="w-full min-w-[10rem] flex items-center gap-1.5 font-bold text-sm text-foreground px-3 py-1.5 rounded-lg border border-transparent bg-white hover:border-foreground hover:bg-[#D2E9F9] hover:retro-shadow-sm transition-all"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset password
                </Link>
                <SignOutButton className="w-full min-w-[10rem] flex items-center gap-1.5 font-bold text-sm text-foreground px-3 py-1.5 rounded-lg border border-transparent bg-white hover:border-foreground hover:bg-[#E8C5C8] hover:retro-shadow-sm transition-all">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </SignOutButton>
              </div>
            </div>
          ) : (
            <Link href="/login" className={DESKTOP_LINK_CLASS}>
              Login
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center">
          <Link
            href="/subscription"
            className="flex items-center gap-1.5 bg-[#FFEAA7] border-2 border-foreground px-4 py-2 rounded-xl text-xs font-black text-foreground uppercase tracking-wider retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />
            Go Pro
          </Link>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-xl border border-foreground bg-white text-foreground retro-shadow-sm active:scale-95 transition-all"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden mt-3 border-2 border-foreground bg-white rounded-2xl p-4 retro-shadow-md flex flex-col gap-3 animate-fade-up">
          {navLinks.map((link, idx) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`${MOBILE_ITEM_BASE_CLASS} border-transparent ${MOBILE_DYNAMIC_BGS[idx % MOBILE_DYNAMIC_BGS.length]} hover:border-foreground hover:retro-shadow-sm`}
            >
              ✦ {link.name}
            </Link>
          ))}

          <hr className="border-t border-foreground/30 my-1" />

          {isLoggedIn ? (
            <>
              <div className={`${MOBILE_ITEM_BASE_CLASS} bg-[#D2E9F9] border-foreground`}>
                ✦ {username}
              </div>
              <Link
                href="/forgot-password"
                onClick={() => setIsOpen(false)}
                className={`${MOBILE_ITEM_BASE_CLASS} border-foreground hover:bg-[#D2E9F9] hover:retro-shadow-sm`}
              >
                ✦ Reset password
              </Link>
              <SignOutButton className={`${MOBILE_ITEM_BASE_CLASS} border-foreground hover:bg-[#E8C5C8] hover:retro-shadow-sm`}>
                ✦ Sign out
              </SignOutButton>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className={`${MOBILE_ITEM_BASE_CLASS} border-transparent hover:bg-[#D2E9F9] hover:border-foreground hover:retro-shadow-sm`}
            >
              ✦ Login
            </Link>
          )}

          <Link
            href="/subscription"
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