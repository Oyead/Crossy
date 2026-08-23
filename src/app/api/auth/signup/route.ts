import { NextResponse } from "next/server";
import bcrypt from 'bcrypt';
import { createHash, randomInt } from "crypto";
import prisma from "@/server/db/prisma";
import { sendVerificationCode } from "@/lib/mailer";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const lowerEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowerEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a 6-digit code; store only its hash
    const code = String(randomInt(100000, 1000000));
    const codeHash = createHash("sha256").update(code).digest("hex");

    await prisma.pendingSignup.upsert({
      where: { email: lowerEmail },
      update: {
        password: hashedPassword,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        attempts: 0,
      },
      create: {
        email: lowerEmail,
        password: hashedPassword,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    const { delivered } = await sendVerificationCode(lowerEmail, code);

    return NextResponse.json({ ok: true, delivered }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
