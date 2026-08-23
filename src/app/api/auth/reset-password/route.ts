import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import bcrypt from "bcrypt";
import prisma from "@/server/db/prisma";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Reset token and new password are required" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET is not set - cannot verify password reset tokens");
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    let payload;
    try {
      payload = await decode({ token: String(token), secret });
    } catch {
      payload = null;
    }

    if (!payload || payload.purpose !== "password-reset" || typeof payload.sub !== "string") {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { password: true },
    });

    if (!user?.password) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (await bcrypt.compare(password, user.password)) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: payload.sub },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
