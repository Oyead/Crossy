import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import prisma from "@/server/db/prisma";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const lowerEmail = String(email).toLowerCase().trim();
    const pending = await prisma.pendingSignup.findUnique({
      where: { email: lowerEmail },
    });

    if (!pending) {
      return NextResponse.json(
        { error: "No signup in progress for this email. Please sign up again." },
        { status: 404 }
      );
    }

    if (pending.expiresAt < new Date()) {
      await prisma.pendingSignup.delete({ where: { id: pending.id } });
      return NextResponse.json(
        { error: "This code has expired. Please sign up again to get a new one." },
        { status: 410 }
      );
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await prisma.pendingSignup.delete({ where: { id: pending.id } });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please sign up again." },
        { status: 429 }
      );
    }

    const submittedHash = createHash("sha256").update(String(code)).digest("hex");
    const storedHash = Buffer.from(pending.codeHash, "hex");
    const submittedBuf = Buffer.from(submittedHash, "hex");

    if (storedHash.length !== submittedBuf.length || !timingSafeEqual(storedHash, submittedBuf)) {
      await prisma.pendingSignup.update({
        where: { id: pending.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - (pending.attempts + 1);
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
        { status: 400 }
      );
    }

    // Code is valid - create the real account
    try {
      await prisma.user.create({
        data: {
          email: pending.email,
          name: pending.email.split("@")[0],
          password: pending.password,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    await prisma.pendingSignup.delete({ where: { id: pending.id } });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Verify signup error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
