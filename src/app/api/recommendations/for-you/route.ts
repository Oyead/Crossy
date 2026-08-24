import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { recallForYou } from "@/server/context/itemVectors";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const picks = await recallForYou(userId, 8);
    return NextResponse.json(
      picks.map((pick) => ({
        id: pick.result.id,
        title: pick.result.title,
        type: pick.result.type,
        provider: pick.result.provider,
        coverImage: pick.result.coverImage,
        description: pick.result.description,
        rating: pick.result.rating,
        releaseDate: pick.result.releaseDate,
        genres: pick.result.genres,
        reason: pick.reason,
      }))
    );
  } catch (error) {
    console.error("[forYou] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
