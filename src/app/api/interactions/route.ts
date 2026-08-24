import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import prisma from "@/server/db/prisma";

const eventSchema = z.object({
  kind: z.enum(["impression", "click"]),
  query: z.string().trim().max(300).optional(),
  mediaType: z.string().trim().min(1).max(30),
  externalId: z.string().trim().min(1).max(100),
  sourceApi: z.string().trim().max(40).optional(),
  position: z.number().int().min(1).max(200).optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid events payload" }, { status: 400 });
    }

    await prisma.interaction.createMany({
      data: parsed.data.events.map((event) => ({
        userId: userId ?? null,
        kind: event.kind,
        query: event.query ?? null,
        mediaType: event.mediaType,
        externalId: event.externalId,
        sourceApi: event.sourceApi ?? null,
        position: event.position ?? null,
      })),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[interactions] Log failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
