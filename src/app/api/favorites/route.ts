import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import prisma from "@/server/db/prisma"

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { media: true }
    })
    return NextResponse.json(favorites)
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { externalId, title, posterUrl, mediaType, sourceApi, sourceQuery } = body

    if (!externalId || !mediaType || !sourceApi) {
      return NextResponse.json(
        { error: "externalId, mediaType, and sourceApi are required" },
        { status: 400 }
      )
    }

    // Upsert media to ensure it exists in our DB (we only store minimal info)
    const media = await prisma.media.upsert({
      where: {
        mediaType_externalId: {
          mediaType,
          externalId
        }
      },
      update: {
        title,
        posterUrl: posterUrl ?? null
      },
      create: {
        mediaType,
        externalId,
        title,
        posterUrl: posterUrl ?? null,
        sourceApi,
        metadata: {}
      }
    })

    // Check if favorite already exists
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        mediaId: media.id
      }
    })

    if (existingFavorite) {
      // Remove favorite
      await prisma.favorite.delete({
        where: {
          id: existingFavorite.id
        }
      })
      return NextResponse.json({ success: true, favorited: false })
    } else {
      // Create the favorite
      const favorite = await prisma.favorite.create({
        data: {
          userId,
          mediaId: media.id,
          sourceQuery: typeof sourceQuery === "string" && sourceQuery.trim() ? sourceQuery.trim() : null
        }
      })

      return NextResponse.json({ success: true, favorited: true })
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id: favoriteId } = body

    if (!favoriteId) {
      return NextResponse.json({ error: "favoriteId is required" }, { status: 400 })
    }

    await prisma.favorite.deleteMany({
      where: {
        id: favoriteId,
        userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting favorite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}