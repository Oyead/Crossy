import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;
export const EMBED_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

let openaiClient: OpenAI | null = null;
let embedDisabledUntil = 0;

function isQuotaError(error: unknown): boolean {
  const err = error as { status?: number; code?: string };
  return (
    err?.status === 429 ||
    err?.code === "insufficient_quota" ||
    err?.code === "credit_balance_exhausted"
  );
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 8000,
      maxRetries: 1,
    });
  }
  return openaiClient;
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function parseVectorLiteral(text: string): number[] {
  return text
    .replace(/[[\]]/g, "")
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
}

export async function embedText(text: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  if (Date.now() < embedDisabledUntil) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 2000),
      dimensions: EMBEDDING_DIMS,
    });
    return response.data?.[0]?.embedding ?? null;
  } catch (error) {
    if (isQuotaError(error)) {
      embedDisabledUntil = Date.now() + EMBED_QUOTA_COOLDOWN_MS;
      console.error(
        "[embed] OpenAI quota exhausted - embeddings disabled for 10 minutes"
      );
    } else {
      console.error("[embed] Embedding failed:", error);
    }
    return null;
  }
}
