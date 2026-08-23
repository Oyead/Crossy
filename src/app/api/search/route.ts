import { NextResponse } from "next/server"
import { processMediaQuery } from "@/server/pipeline/mediaPipeline"
import { createTimings } from "@/lib/trace"
import { logSearchQueryAsync } from "@/lib/analytics"
import { getCurrentUserId } from "@/lib/auth"
import { getUserSearchSignal, type UserSearchSignal } from "@/server/context/userSignal"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  const timings = createTimings()

  let personalization: UserSearchSignal | undefined
  try {
    const userId = await getCurrentUserId()
    if (userId) {
      personalization = await getUserSearchSignal(userId, query)
    }
  } catch (error) {
    console.error("[search] Failed to load user signal:", error)
  }

  try {
    const results = await processMediaQuery(query, timings, personalization)
    const response = NextResponse.json(results)
    response.headers.set('Server-Timing', timings.toHeader())

    // Log the search query asynchronously (do not block response)
    ;(async () => {
      await logSearchQueryAsync(query, "text")
    })()

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}