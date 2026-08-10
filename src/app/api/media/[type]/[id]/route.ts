import { NextResponse } from 'next/server'
import { providerForMediaType } from '@/server/integrations/registry'

export async function GET(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params
  const provider = providerForMediaType(type)
  if (!provider) {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })
  }
  const details = await provider.getDetails(id, type)
  if (!details) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }
  return NextResponse.json(details)
}
