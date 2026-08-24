import { NextResponse } from "next/server";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

interface BucketRow {
  bucket: string;
  kind: string;
  count: bigint;
}

/**
 * Online evaluation: click-through rate by result position bucket.
 * The essay's "measure precision@k / NDCG" stand-in until we have
 * explicit relevance labels — CTR@k is the cheapest honest proxy.
 */
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<BucketRow[]>`
      SELECT
        CASE
          WHEN position <= 3 THEN '1-3'
          WHEN position <= 6 THEN '4-6'
          WHEN position <= 10 THEN '7-10'
          ELSE '11+'
        END AS bucket,
        kind,
        COUNT(*)::bigint AS count
      FROM "Interaction"
      WHERE kind IN ('impression', 'click') AND position IS NOT NULL
      GROUP BY 1, 2
    `;

    const buckets = new Map<string, { impressions: number; clicks: number }>();
    for (const row of rows) {
      const entry = buckets.get(row.bucket) ?? { impressions: 0, clicks: 0 };
      if (row.kind === 'impression') entry.impressions += Number(row.count);
      else entry.clicks += Number(row.count);
      buckets.set(row.bucket, entry);
    }

    const ctr = Array.from(buckets.entries()).map(([position, b]) => ({
      position,
      impressions: b.impressions,
      clicks: b.clicks,
      ctr: b.impressions > 0 ? Number((b.clicks / b.impressions).toFixed(4)) : 0,
    }));

    const totals = ctr.reduce(
      (acc, b) => ({ impressions: acc.impressions + b.impressions, clicks: acc.clicks + b.clicks }),
      { impressions: 0, clicks: 0 }
    );

    return NextResponse.json({
      overallCtr:
        totals.impressions > 0
          ? Number((totals.clicks / totals.impressions).toFixed(4))
          : 0,
      ...totals,
      byPosition: ctr.sort((a, b) => a.position.localeCompare(b.position)),
    });
  } catch (error) {
    console.error("[stats] CTR computation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
