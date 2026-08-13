import { LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="container flex flex-col items-center py-20 text-center">
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
        <LogIn className="h-7 w-7 text-primary" />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">Welcome to Crossy</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Sign-in is coming soon. For now, search across movies, shows, music,
        games, and books, no account needed.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        Start searching
      </Link>
    </div>
  );
}
