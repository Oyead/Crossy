import { NextResponse } from 'next/server'
import { providerForMediaType } from '@/server/integrations/registry'
import { processMediaQuery } from '@/server/pipeline/mediaPipeline'

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
    return NextResponse.json(filtered)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
