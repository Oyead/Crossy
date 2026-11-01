#!/usr/bin/env node
import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const GEMINI_EMBEDDING_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";
const CHECKPOINT_PATH = join(
  process.cwd(),
  ".cache",
  "reembed-checkpoint.json"
);
const DEFAULT_BATCH_SIZE = 32;
const MAX_BATCH_SIZE = 100;

const { values } = parseArgs({
  options: {
    target: { type: "string", default: "all" },
    batch: { type: "string", default: String(DEFAULT_BATCH_SIZE) },
    limit: { type: "string" },
    delay: { type: "string", default: "250" },
    restart: { type: "boolean", default: false },
    clear: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

const model = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const dims = Number(process.env.EMBEDDING_DIMS || 1536);
const apiKey = process.env.GEMINI_API_KEY;
const target = values.target;
const batchSize = clampInt(values.batch, DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE);
const limit = values.limit ? clampInt(values.limit, 0, 1, Infinity) : null;
const delayMs = clampInt(values.delay, 250, 0, 60000);
const dryRun = values["dry-run"];
const clearFirst = values.clear;

if (!["all", "media", "queries"].includes(target)) {
  console.error('--target must be one of "all", "media", or "queries"');
  process.exit(1);
}
if (!apiKey) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}
if (!Number.isFinite(dims) || dims <= 0) {
  console.error("EMBEDDING_DIMS must be a positive number");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required (run with --env-file=.env or use npm run embed:reembed)"
  );
  process.exit(1);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function vectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

function parseRetryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

class BatchEmbeddingError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "BatchEmbeddingError";
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

async function embedBatch(texts, taskType) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      `${GEMINI_EMBEDDING_ENDPOINT}/${encodeURIComponent(
        model
      )}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            taskType,
            outputDimensionality: dims,
          })),
        }),
        signal: controller.signal,
      }
    );

    const body = await response.text();
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new BatchEmbeddingError(
        `Gemini batch embedding ${response.status}: ${body.slice(0, 500)}`,
        {
          retryable,
          retryAfterMs: parseRetryAfterMs(
            response.headers.get("retry-after")
          ),
        }
      );
    }

    const payload = JSON.parse(body);
    const embeddings = payload.embeddings;
    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
      throw new BatchEmbeddingError(
        `Gemini returned ${embeddings?.length ?? 0} embeddings for ${
          texts.length
        } inputs`
      );
    }

    return embeddings.map((entry, index) => {
      const values = entry?.values;
      if (!Array.isArray(values) || values.length !== dims) {
        throw new BatchEmbeddingError(
          `Embedding ${index} has ${values?.length ?? 0} dims, expected ${dims}`
        );
      }
      return values;
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function embedBatchWithRetry(texts, taskType) {
  const attempts = 4;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await embedBatch(texts, taskType);
    } catch (error) {
      if (!error.retryable || attempt === attempts - 1) throw error;
      const waitMs =
        error.retryAfterMs ?? Math.min(30000, 2000 * Math.pow(2, attempt));
      console.warn(
        `[reembed] batch failed (${
          error.message
        }); retrying in ${Math.round(waitMs / 1000)}s`
      );
      await sleep(waitMs);
    }
  }
  throw new Error("unreachable");
}

function buildItemEmbeddingText(media) {
  let metadata = media.metadata;
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }
  const md = metadata && typeof metadata === "object" ? metadata : {};
  const overview =
    typeof md.overview === "string" && md.overview.trim()
      ? md.overview
      : typeof md.description === "string"
        ? md.description
        : "";
  const genres = Array.isArray(md.genres)
    ? md.genres.filter((genre) => typeof genre === "string")
    : [];
  const creators = Array.isArray(md.creators)
    ? md.creators.filter((creator) => typeof creator === "string")
    : [];

  return [
    media.title,
    media.mediaType !== "unknown" ? `(${media.mediaType})` : "",
    overview,
    genres.length > 0 ? `Genres: ${genres.join(", ")}` : "",
    creators.length > 0 ? `By ${creators.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadCheckpoint() {
  try {
    const raw = await readFile(CHECKPOINT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.model === model && parsed.dims === dims) return parsed;
    console.warn(
      `[reembed] checkpoint was for ${parsed.model}@${parsed.dims}; starting fresh`
    );
  } catch {}
  return { model, dims, media: null, queries: null, updatedAt: null };
}

async function saveCheckpoint(checkpoint) {
  checkpoint.updatedAt = new Date().toISOString();
  await mkdir(dirname(CHECKPOINT_PATH), { recursive: true });
  await writeFile(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

async function countRows(table, cursor) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "${table}" WHERE id > $1`,
    cursor ?? ""
  );
  return Number(rows?.[0]?.count ?? 0);
}

async function clearEmbeddings(table) {
  await prisma.$executeRawUnsafe(`UPDATE "${table}" SET embedding = NULL`);
}

async function processTarget({
  name,
  table,
  selectSql,
  buildText,
  taskType,
  checkpoint,
  prismaClient,
}) {
  let cursor = checkpoint[name] ?? null;
  if (clearFirst) {
    if (dryRun) {
      console.log(`[reembed] would clear ${table} embeddings`);
    } else {
      console.log(`[reembed] clearing ${table} embeddings`);
      await clearEmbeddings(table);
      checkpoint[name] = null;
      cursor = null;
      await saveCheckpoint(checkpoint);
    }
  }

  const remainingRows = await countRows(table, cursor);
  const total = Math.min(remainingRows, limit ?? Infinity);
  console.log(
    `[reembed] ${table}: ${total} rows remaining${
      limit ? ` (limit ${limit})` : ""
    }`
  );

  let processed = 0;
  let batchNumber = 0;

  while (processed < total) {
    const remaining = Math.min(batchSize, total - processed);
    const rows = await prismaClient.$queryRawUnsafe(
      `${selectSql} WHERE id > $1 ORDER BY id ASC LIMIT $2`,
      cursor ?? "",
      remaining
    );
    if (!rows || rows.length === 0) break;

    batchNumber += 1;
    const texts = rows.map(buildText);

    if (dryRun) {
      console.log(
        `[reembed] ${table} batch ${batchNumber}: would embed ${rows.length} rows (${
          rows[0].id
        } .. ${rows[rows.length - 1].id})`
      );
    } else {
      const embeddings = await embedBatchWithRetry(texts, taskType);
      for (let i = 0; i < rows.length; i++) {
        await prismaClient.$executeRawUnsafe(
          `UPDATE "${table}" SET embedding = $1::vector WHERE id = $2`,
          vectorLiteral(embeddings[i]),
          rows[i].id
        );
      }
      console.log(
        `[reembed] ${table} batch ${batchNumber}: embedded ${rows.length} rows (${processed + rows.length}/${total})`
      );
    }

    cursor = rows[rows.length - 1].id;
    checkpoint[name] = cursor;
    if (!dryRun) await saveCheckpoint(checkpoint);

    processed += rows.length;
    if (processed < total && delayMs > 0) await sleep(delayMs);
  }

  console.log(`[reembed] ${table}: done (${processed} rows processed)`);
}

const prisma = new PrismaClient();

try {
  const checkpoint = values.restart
    ? { model, dims, media: null, queries: null, updatedAt: null }
    : await loadCheckpoint();
  checkpoint.model = model;
  checkpoint.dims = dims;

  if (target === "media" || target === "all") {
    await processTarget({
      name: "media",
      table: "Media",
      selectSql: `SELECT id, title, "mediaType", metadata FROM "Media"`,
      buildText: buildItemEmbeddingText,
      taskType: "RETRIEVAL_DOCUMENT",
      checkpoint,
      prismaClient: prisma,
    });
  }

  if (target === "queries" || target === "all") {
    await processTarget({
      name: "queries",
      table: "SearchQuery",
      selectSql: `SELECT id, "rawInput" FROM "SearchQuery"`,
      buildText: (row) => String(row.rawInput ?? "").trim(),
      taskType: "RETRIEVAL_QUERY",
      checkpoint,
      prismaClient: prisma,
    });
  }

  if (!dryRun) {
    await saveCheckpoint(checkpoint);
    console.log(
      `[reembed] checkpoint saved to ${CHECKPOINT_PATH} (use --restart to redo from scratch)`
    );
  }
} catch (error) {
  console.error(
    `[reembed] failed: ${error instanceof Error ? error.message : error}`
  );
  console.error(
    "[reembed] progress saved; rerun the same command to resume from the last completed batch"
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
