import { NextResponse } from "next/server";
import { users } from "@/lib/mockUsers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existing = Array.from(users.values()).find((u) => u.email === email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Create new user
    const id = String(users.size + 1);
    const user = { id, name: email.split("@")[0], email, credentials: [] };
    users.set(id, user);

    return NextResponse.json({ ok: true, user: { id, name: user.name, email } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
