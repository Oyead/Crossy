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
