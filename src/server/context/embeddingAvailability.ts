import prisma from "@/server/db/prisma";

const AVAILABILITY_TTL_MS = 30_000;

let mediaCheckedAt = 0;
let mediaAvailable = false;
let queriesCheckedAt = 0;
let queriesAvailable = false;

export async function hasEmbeddedMedia(): Promise<boolean> {
  if (Date.now() - mediaCheckedAt < AVAILABILITY_TTL_MS) return mediaAvailable;
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM "Media" WHERE embedding IS NOT NULL) AS exists
    `;
    mediaAvailable = Boolean(rows[0]?.exists);
  } catch {
    mediaAvailable = false;
  }
  mediaCheckedAt = Date.now();
  return mediaAvailable;
}

export async function hasEmbeddedQueries(): Promise<boolean> {
  if (Date.now() - queriesCheckedAt < AVAILABILITY_TTL_MS) return queriesAvailable;
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM "SearchQuery" WHERE embedding IS NOT NULL) AS exists
    `;
    queriesAvailable = Boolean(rows[0]?.exists);
  } catch {
    queriesAvailable = false;
  }
  queriesCheckedAt = Date.now();
  return queriesAvailable;
}
