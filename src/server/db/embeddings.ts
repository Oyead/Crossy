import { OpenAI } from "openai";
import { getEnv } from "../../lib/env";
import { redis } from "../../lib/redis";

/**
 * @returns 
 */
function getOpenAIClient(): OpenAI {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for embeddings");
  }
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

/**
 * @param text 
 * @param model 
 * @returns 
 */
export async function generateEmbedding(
  text: string,
  model: "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002" = "text-embedding-3-small"
): Promise<number[]> {
  const cacheKey = `embedding:${model}:${Buffer.from(text).toString('base64')}`;

  const cached = await redis.get<string>(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model,
      input: text,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;

    await redis.setex(cacheKey, 60 * 60 * 24, JSON.stringify(embedding));

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * @param texts
 * @param model 
 * @returns 
 */
export async function generateEmbeddings(
  texts: string[],
  model: "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002" = "text-embedding-3-small"
): Promise<number[][]> {
  const cacheKeys = texts.map(text => `embedding:${model}:${Buffer.from(text).toString('base64')}`);
  const cachedValues = await redis.mget(...cacheKeys);

  const results: number[][] = new Array(texts.length);
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];

  texts.forEach((text, index) => {
    const cached = cachedValues[index];
    if (cached !== null && typeof cached === 'string') {
      results[index] = JSON.parse(cached);
    } else {
      uncachedTexts.push(text);
      uncachedIndices.push(index);
    }
  });

  if (uncachedTexts.length === 0) {
    return results;
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model,
      input: uncachedTexts,
      encoding_format: "float",
    });

    const embeddings = response.data.map(item => item.embedding);
    for (let i = 0; i < embeddings.length; i++) {
      const index = uncachedIndices[i];
      results[index] = embeddings[i];

      const cacheKey = cacheKeys[index];
      await redis.setex(cacheKey, 60 * 60 * 24, JSON.stringify(embeddings[i]));
    }

    return results;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * @param vectorA 
 * @param vectorB 
 * @returns 
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}