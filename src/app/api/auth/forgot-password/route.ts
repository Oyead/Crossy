import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import prisma from "@/server/db/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

const RESET_TOKEN_TTL_SECONDS = 15 * 60;

function getBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const lowerEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowerEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET is not set - cannot issue password reset tokens");
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
      select: { id: true, password: true },
    });

    if (user?.password) {
      const token = await encode({
        token: { id: user.id, sub: user.id, email: lowerEmail, purpose: "password-reset" },
        secret,
        maxAge: RESET_TOKEN_TTL_SECONDS,
      });

      const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(lowerEmail, resetUrl);
    }

    // Always respond the same way so attackers can't discover registered emails
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
