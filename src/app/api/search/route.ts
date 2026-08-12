import { NextResponse } from 'next/server'
import { processMediaQuery } from '@/server/pipeline/mediaPipeline'
import { createTimings } from '@/lib/trace'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  const timings = createTimings()
  try {
    const results = await processMediaQuery(query, timings)
    const response = NextResponse.json(results)
    response.headers.set('Server-Timing', timings.toHeader())
    return response
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
