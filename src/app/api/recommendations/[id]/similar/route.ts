import { NextResponse } from 'next/server'
import { providerRegistry } from '@/server/integrations/registry'
import { processMediaQuery } from '@/server/pipeline/mediaPipeline'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type) {
    return NextResponse.json({ error: 'Type query parameter is required' }, { status: 400 })
  }

  const provider = providerRegistry.get(type)
  if (!provider) {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })
  }

  const mediaItem = await provider.getDetails(id)
  if (!mediaItem) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  try {
    // Use the title as the query for similarity search
    const query = mediaItem.title
    const similarItems = await processMediaQuery(query)
    // Filter out the original media item from the results
    const filtered = similarItems.filter((item: any) => item.id !== id || item.provider !== type)
    return NextResponse.json(filtered)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}