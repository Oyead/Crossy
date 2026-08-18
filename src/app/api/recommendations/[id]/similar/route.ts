import { NextResponse } from "next/server"
import { providerForMediaType } from "@/server/integrations/registry"
import { processMediaQuery } from "@/server/pipeline/mediaPipeline"
import prisma from "@/server/db/prisma"

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