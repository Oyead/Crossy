import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-primary px-4 py-2">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white font-bold text-xl">
          Crossy
        </Link>
        <div className="flex space-x-4">
          <Link href="/" className="text-white hover:text-accent">
            Home
          </Link>
          <Link href="/favorites" className="text-white hover:text-accent">
            Favorites
          </Link>
          <Link href="/login" className="text-white hover:text-accent">
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}