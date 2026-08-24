import OpenAI from "openai";
import { getGeminiClient } from "./client";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";

const DEFAULT_TIMEOUT_MS = 12000;
const PROVIDER_COOLDOWN_MS = 60 * 1000;

type LlmProviderName = "gemini" | "groq" | "openrouter";

interface ProviderAttempt {
  name: LlmProviderName;
  enabled: () => boolean;
  run: (prompt: string, timeoutMs: number) => Promise<string>;
}

const cooldownUntil = new Map<LlmProviderName, number>();

function isCoolingDown(name: LlmProviderName): boolean {
  return Date.now() < (cooldownUntil.get(name) ?? 0);
}

let groqClient: OpenAI | null = null;
let openRouterClient: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
      maxRetries: 1,
    });
  }
  return groqClient;
}

function getOpenRouterClient(): OpenAI {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      maxRetries: 1,
    });
  }
  return openRouterClient;
}

async function runOpenAiCompatible(
  client: OpenAI,
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  const completion = await client.chat.completions.create(
    {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      stream: false,
      ...(model.startsWith("openai/gpt-oss")
        ? ({ reasoning_effort: "low" } as const)
        : {}),
    },
    { timeout: timeoutMs }
  );
  const text = completion.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("empty response");
  return text;
}

const PROVIDERS: ProviderAttempt[] = [
  {
    name: "gemini",
    enabled: () => Boolean(process.env.GEMINI_API_KEY),
    run: async (prompt, timeoutMs) => {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt, { timeout: timeoutMs });
      return result.response.text();
    },
  },
  {
    name: "groq",
    enabled: () => Boolean(process.env.GROQ_API_KEY),
    run: (prompt, timeoutMs) =>
      runOpenAiCompatible(getGroqClient(), GROQ_MODEL, prompt, timeoutMs),
  },
  {
    name: "openrouter",
    enabled: () => Boolean(process.env.OPENROUTER_API_KEY),
    run: (prompt, timeoutMs) =>
      runOpenAiCompatible(
        getOpenRouterClient(),
        OPENROUTER_MODEL,
        prompt,
        timeoutMs
      ),
  },
];

export interface GenerateTextOptions {
  prompt: string;
  taskLabel: string;
  timeoutMs?: number;
}

export async function generateTextWithFallback({
  prompt,
  taskLabel,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: GenerateTextOptions): Promise<{ text: string; provider: LlmProviderName }> {
  const failures: string[] = [];

  for (const provider of PROVIDERS) {
    if (!provider.enabled()) continue;
    if (isCoolingDown(provider.name)) continue;

    try {
      const text = await provider.run(prompt, timeoutMs);
      cooldownUntil.delete(provider.name);
      return { text, provider: provider.name };
    } catch (error) {
      cooldownUntil.set(provider.name, Date.now() + PROVIDER_COOLDOWN_MS);
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${provider.name}: ${message}`);
      console.error(`[llm] ${taskLabel} ${provider.name} failed:`, message);
    }
  }

  throw new Error(
    `[llm] ${taskLabel} all providers failed${
      failures.length ? ` (${failures.join(" | ")})` : " (none configured or all cooling down)"
    }`
  );
}
