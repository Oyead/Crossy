import { NextResponse } from 'next/server'
import { providerRegistry } from '@/server/integrations/registry'
import { processMediaQuery } from '@/server/pipeline/mediaPipeline'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  try {
    const results = await processMediaQuery(query)
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}