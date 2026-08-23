import prisma from "@/server/db/prisma"

export async function logSearchQueryAsync(
  rawInput: string,
  mode: string,
  resolvedType?: string
) {
  // Fire and forget - we don't want to block the response
  // We'll catch and log any errors but not propagate them
  prisma.searchQuery
    .create({
      data: {
        rawInput,
        mode,
        resolvedType: resolvedType ?? undefined
      }
    })
    .catch((error) => {
      console.error("Failed to log search query:", error)
    })
}

export async function logRecommendationsAsync(
  queryId: string,
  mediaIds: string[],
  matchReasons: string[]
) {
  // We assume that mediaIds and matchReasons are parallel arrays
  // We'll create a Recommendation for each pair
  const recommendations = mediaIds.map((mediaId, index) => ({
    queryId,
    mediaId,
    matchReason: matchReasons[index] ?? "",
    verified: false
  }))

  // Fire and forget
  prisma.recommendation
    .createMany({
      data: recommendations,
      skipDuplicates: true // Avoid duplicates if same mediaId appears multiple times
    })
    .catch((error) => {
      console.error("Failed to log recommendations:", error)
    })
}