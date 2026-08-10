import { Heart } from "lucide-react";

export default function FavoritesPage() {
  return (
    <div className="container flex flex-col items-center py-20 text-center">
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
        <Heart className="h-7 w-7 text-primary" />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">Your Favorites</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Favorites are coming soon. Search for something and we&apos;ll let you
        save the things you love.
      </p>
    </div>
  );
}
