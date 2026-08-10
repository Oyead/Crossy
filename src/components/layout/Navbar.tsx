import Link from "next/link";
import { Clapperboard } from "lucide-react";
import ModeToggle from "../search/ModeToggle";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/favorites", label: "Favorites" },
  { href: "/login", label: "Login" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <nav className="container flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            <Clapperboard className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            Crossy
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2">
            <ModeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
