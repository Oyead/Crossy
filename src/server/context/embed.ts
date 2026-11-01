import { createHash } from "node:crypto";
import { redis } from "../../lib/redis";

export type EmbeddingKind = "query" | "document";

export const EMBEDDING_PROVIDER = (
  process.env.EMBEDDING_PROVIDER || "gemini"
).toLowerCase();
export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMS = positiveInt(process.env.EMBEDDING_DIMS, 1536);
export const EMBED_QUOTA_COOLDOWN_MS = positiveInt(
  process.env.EMBED_QUOTA_COOLDOWN_MS,
  10 * 60 * 1000
);

const EMBEDDING_CACHE_TTL_SECONDS = positiveInt(
  process.env.EMBEDDING_CACHE_TTL_SECONDS,
  30 * 24 * 60 * 60
);
const EMBEDDING_TIMEOUT_MS = positiveInt(
  process.env.EMBEDDING_TIMEOUT_MS,
  8000
);
const EMBEDDING_MAX_INPUT_CHARS = positiveInt(
  process.env.EMBEDDING_MAX_INPUT_CHARS,
  6000
);
const GEMINI_EMBEDDING_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_COOLDOWN_KEY = "embed:cooldown:gemini";

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

interface EmbeddingProvider {
  name: string;
  dims: number;
  embed(text: string, kind: EmbeddingKind): Promise<number[]>;
}

class EmbeddingRequestError extends Error {
  readonly status: number | null;
  readonly quota: boolean;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    options: {
      status?: number | null;
      quota?: boolean;
      retryAfterMs?: number | null;
    } = {}
  ) {
    super(message);
    this.name = "EmbeddingRequestError";
    this.status = options.status ?? null;
    this.quota = options.quota ?? false;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

function taskTypeFor(kind: EmbeddingKind): "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" {
  return kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function parseGeminiError(
  status: number,
  body: string
): { message: string; quota: boolean } {
  let message = body;
  let errorStatus = "";
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string };
    };
    message = parsed?.error?.message || body;
    errorStatus = parsed?.error?.status || "";
  } catch {}
  const quota =
    status === 429 ||
    status === 402 ||
    /RESOURCE_EXHAUSTED|insufficient_quota|credit_balance_exhausted|quota|rate.?limit|billing/i.test(
      `${errorStatus} ${message}`
    );
  return {
    message: `Gemini embedding ${status}: ${String(message).slice(0, 500)}`,
    quota,
  };
}

const geminiProvider: EmbeddingProvider = {
  name: "gemini",
  dims: EMBEDDING_DIMS,
  async embed(text, kind) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new EmbeddingRequestError("GEMINI_API_KEY is not set");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${GEMINI_EMBEDDING_ENDPOINT}/${encodeURIComponent(
          EMBEDDING_MODEL
        )}:embedContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: taskTypeFor(kind),
            outputDimensionality: EMBEDDING_DIMS,
          }),
          signal: controller.signal,
        }
      );

      const body = await response.text();
      if (!response.ok) {
        const parsed = parseGeminiError(response.status, body);
        throw new EmbeddingRequestError(parsed.message, {
          status: response.status,
          quota: parsed.quota,
          retryAfterMs: parseRetryAfterMs(
            response.headers.get("retry-after")
          ),
        });
      }

      const payload = JSON.parse(body) as {
        embedding?: { values?: number[] };
      };
      const values = payload.embedding?.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new EmbeddingRequestError("Gemini embedding response was empty");
      }
      return values;
    } catch (error) {
      if (error instanceof EmbeddingRequestError) throw error;
      throw new EmbeddingRequestError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};

let loggedUnsupportedProvider = false;

function getActiveProvider(): EmbeddingProvider | null {
  if (EMBEDDING_PROVIDER === "gemini") return geminiProvider;
  if (!loggedUnsupportedProvider) {
    loggedUnsupportedProvider = true;
    console.error(
      `[embed] unsupported EMBEDDING_PROVIDER "${EMBEDDING_PROVIDER}" - embeddings disabled`
    );
  }
  return null;
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

function embeddingCacheKey(
  provider: EmbeddingProvider,
  kind: EmbeddingKind,
  text: string
): string {
  const hash = createHash("sha256")
    .update(
      `${provider.name}:${EMBEDDING_MODEL}:${provider.dims}:${kind}:${text}`
    )
    .digest("hex");
  return `embed:${provider.name}:${hash}`;
}

async function readCachedEmbedding(key: string): Promise<number[] | null> {
  try {
    const value = await redis.get<number[] | string>(key);
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCachedEmbedding(
  key: string,
  embedding: number[]
): Promise<void> {
  try {
    await redis.set(key, embedding, { ex: EMBEDDING_CACHE_TTL_SECONDS });
  } catch {}
}

let memoryCooldownUntil = 0;

async function isCoolingDown(): Promise<boolean> {
  if (Date.now() < memoryCooldownUntil) return true;
  try {
    const value = await redis.get<number | string>(GEMINI_COOLDOWN_KEY);
    const until = Number(value ?? 0);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

async function setCooldown(cooldownMs: number): Promise<void> {
  memoryCooldownUntil = Date.now() + cooldownMs;
  try {
    await redis.set(GEMINI_COOLDOWN_KEY, memoryCooldownUntil, {
      ex: Math.max(1, Math.ceil(cooldownMs / 1000)),
    });
  } catch {}
}

async function clearCooldown(): Promise<void> {
  memoryCooldownUntil = 0;
  try {
    await redis.del(GEMINI_COOLDOWN_KEY);
  } catch {}
}

const inFlight = new Map<string, Promise<number[] | null>>();

export async function embedText(
  text: string,
  kind: EmbeddingKind = "document"
): Promise<number[] | null> {
  const input =
    typeof text === "string"
      ? text.trim().slice(0, EMBEDDING_MAX_INPUT_CHARS)
      : "";
  if (!input) return null;

  const provider = getActiveProvider();
  if (!provider) return null;

  const cacheKey = embeddingCacheKey(provider, kind, input);
  const cached = await readCachedEmbedding(cacheKey);
  if (cached && cached.length === provider.dims) return cached;

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  if (await isCoolingDown()) return null;

  const racing = inFlight.get(cacheKey);
  if (racing) return racing;

  const promise = (async () => {
    try {
      const embedding = await provider.embed(input, kind);
      if (!Array.isArray(embedding) || embedding.length !== provider.dims) {
        console.error(
          `[embed] ${provider.name} returned ${
            embedding?.length ?? 0
          } dims, expected ${provider.dims}`
        );
        return null;
      }
      await writeCachedEmbedding(cacheKey, embedding);
      await clearCooldown();
      return embedding;
    } catch (error) {
      if (error instanceof EmbeddingRequestError && error.quota) {
        const cooldownMs = Math.max(
          EMBED_QUOTA_COOLDOWN_MS,
          error.retryAfterMs ?? 0
        );
        await setCooldown(cooldownMs);
        console.error(
          `[embed] ${provider.name} quota exhausted - embeddings paused for ${Math.round(
            cooldownMs / 1000
          )}s`
        );
      } else {
        console.error(
          "[embed] Embedding failed:",
          error instanceof Error ? error.message : error
        );
      }
      return null;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}
