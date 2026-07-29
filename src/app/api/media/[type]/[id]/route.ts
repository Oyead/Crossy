import { NextResponse } from 'next/server'
import { providerRegistry } from '@/server/integrations/registry'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params
  const provider = providerRegistry.get(type)
  if (!provider) {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })
  }
  const details = await provider.getDetails(id)
  if (!details) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }
  return NextResponse.json(details)
}