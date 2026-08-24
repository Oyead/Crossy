import { NextResponse } from "next/server"
import { providerForMediaType } from "@/server/integrations/registry"
import { processMediaQuery } from "@/server/pipeline/mediaPipeline"
import prisma from "@/server/db/prisma"
import { recallItemsByVector } from "@/server/context/itemVectors"
import { toVectorLiteral } from "@/server/context/embed"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type) {
    return NextResponse.json({ error: 'Type query parameter is required' }, { status: 400 })
  }

  const provider = providerForMediaType(type)
  if (!provider) {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })
  }

  const mediaItem = await provider.getDetails(id, type)
  if (!mediaItem) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  // Fast path: nearest neighbors of the item's own description embedding.
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; embedding: string }>>`
      SELECT id, embedding::text AS embedding
      FROM "Media"
      WHERE "mediaType" = ${type} AND "externalId" = ${id} AND embedding IS NOT NULL
      LIMIT 1
    `
    if (rows.length > 0) {
      const vector = toVectorLiteral(
        (rows[0].embedding || '').replace(/[[\]]/g, '').split(',').map(Number).filter(Number.isFinite)
      )
      const neighbors = await recallItemsByVector(vector, {
        limit: 10,
        distanceThreshold: 0.95,
      })
      const filtered = neighbors
        .map((n) => n.result)
        .filter((item) => item.id !== id)
      if (filtered.length >= 4) {
        return NextResponse.json(filtered)
      }
    }
  } catch (error) {
    console.error('[similar] Vector path failed, falling back to pipeline:', error)
  }

  try {
    const query = mediaItem.title
    const similarItems = await processMediaQuery(query)
    const filtered = similarItems.filter((item: any) => item.id !== id)

    // Log the query and recommendations asynchronously (do not block response)
    ;(async () => {
      try {
        // Create a SearchQuery for this similar media query
        const searchQuery = await prisma.searchQuery.create({
          data: {
            rawInput: query,
            mode: "similar",
            resolvedType: undefined
          }
        })

        // Prepare recommendation data
        const mediaIds = filtered.map((item) => item.id)
        const matchReasons = filtered.map((item) => item.reason ?? "")

        await prisma.recommendation.createMany({
          data: mediaIds.map((mediaId, index) => ({
            queryId: searchQuery.id,
            mediaId,
            matchReason: matchReasons[index],
            verified: false
          })),
          skipDuplicates: true
        })
      } catch (error) {
        console.error("Failed to log recommendations for similar media:", error)
      }
    })()

    return NextResponse.json(filtered)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}