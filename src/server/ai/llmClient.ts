import OpenAI from "openai";
import { createHash } from "node:crypto";
import { redis } from "../../lib/redis";
import { getGeminiClient } from "./client";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_QUOTA_COOLDOWN_MS = 60 * 60 * 1000;
const DEFAULT_CONFIG_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TRANSIENT_BACKOFF_MS = 60 * 1000;
const DEFAULT_MAX_BACKOFF_MS = 30 * 60 * 1000;
const MAX_RETRY_WAIT_MS = 5000;
const STAT_TTL_SECONDS = 2 * 24 * 60 * 60;

export type LlmProviderName = "gemini" | "groq" | "openrouter";
export type LlmTask = "candidates" | "rank" | "general";

type ErrorClass = "quota" | "config" | "transient" | "unknown";

interface ProviderRunInput {
  prompt: string;
  model: string;
  timeoutMs: number;
  apiKey: string;
}

interface ProviderConfig {
  name: LlmProviderName;
  keyEnvAliases: string[];
  baseURL?: string;
  defaultModel: string;
  run: (input: ProviderRunInput) => Promise<string>;
}

const DEFAULT_MODELS: Record<LlmProviderName, string> = {
  gemini: "gemini-flash-latest",
  groq: "openai/gpt-oss-120b",
  openrouter: "meta-llama/llama-3.3-70b-instruct",
};

const DEFAULT_ORDERS: Record<LlmTask, LlmProviderName[]> = {
  candidates: ["groq", "gemini", "openrouter"],
  rank: ["gemini", "groq", "openrouter"],
  general: ["gemini", "groq", "openrouter"],
};

function readNumberEnv(name: string, fallback?: number): number | undefined {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProviderApiKey(config: ProviderConfig): string | null {
  for (const envName of config.keyEnvAliases) {
    const value = process.env[envName];
    if (value?.trim()) return value.trim();
  }
  return null;
}

function isProviderName(value: string): value is LlmProviderName {
  return value === "gemini" || value === "groq" || value === "openrouter";
}

function parseProviderOrder(raw: string | undefined): LlmProviderName[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(isProviderName);
}

function getProviderOrder(task: LlmTask): LlmProviderName[] {
  const envName =
    task === "general"
      ? "LLM_PROVIDER_ORDER"
      : `LLM_PROVIDER_ORDER_${task.toUpperCase()}`;
  const configured = parseProviderOrder(process.env[envName]);
  const order = configured.length > 0 ? configured : DEFAULT_ORDERS[task];
  return Array.from(new Set(order));
}

function resolveModel(name: LlmProviderName, task: LlmTask): string {
  const prefix = name.toUpperCase();
  const taskEnv =
    task === "candidates"
      ? `${prefix}_CANDIDATES_MODEL`
      : task === "rank"
        ? `${prefix}_RANK_MODEL`
        : null;
  return (
    (taskEnv ? process.env[taskEnv] : undefined) ||
    process.env[`${prefix}_MODEL`] ||
    DEFAULT_MODELS[name]
  );
}

const openAiClients = new Map<string, OpenAI>();

function getCompatibleClient(
  name: string,
  baseURL: string,
  apiKey: string
): OpenAI {
  const cacheKey = `${name}:${apiKey}`;
  let client = openAiClients.get(cacheKey);
  if (!client) {
    client = new OpenAI({ apiKey, baseURL, maxRetries: 0 });
    openAiClients.set(cacheKey, client);
  }
  return client;
}

async function runOpenAiCompatible(
  name: string,
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  const client = getCompatibleClient(name, baseURL, apiKey);
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

const PROVIDERS: ProviderConfig[] = [
  {
    name: "gemini",
    keyEnvAliases: ["GEMINI_API_KEY"],
    defaultModel: DEFAULT_MODELS.gemini,
    run: async ({ prompt, model, timeoutMs }) => {
      const genAI = getGeminiClient();
      const generativeModel = genAI.getGenerativeModel({ model });
      const result = await generativeModel.generateContent(prompt, {
        timeout: timeoutMs,
      });
      const text = result.response.text();
      if (!text.trim()) throw new Error("empty response");
      return text;
    },
  },
  {
    name: "groq",
    keyEnvAliases: ["GROQ_API_KEY"],
    baseURL: GROQ_BASE_URL,
    defaultModel: DEFAULT_MODELS.groq,
    run: ({ prompt, model, timeoutMs, apiKey }) =>
      runOpenAiCompatible(
        "groq",
        GROQ_BASE_URL,
        apiKey,
        model,
        prompt,
        timeoutMs
      ),
  },
  {
    name: "openrouter",
    keyEnvAliases: ["OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY"],
    baseURL: OPENROUTER_BASE_URL,
    defaultModel: DEFAULT_MODELS.openrouter,
    run: ({ prompt, model, timeoutMs, apiKey }) =>
      runOpenAiCompatible(
        "openrouter",
        OPENROUTER_BASE_URL,
        apiKey,
        model,
        prompt,
        timeoutMs
      ),
  },
];

const PROVIDER_BY_NAME = new Map(
  PROVIDERS.map((provider) => [provider.name, provider])
);

function getErrorStatus(error: unknown): number | null {
  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate?.status ?? candidate?.response?.status;
  return typeof status === "number" ? status : null;
}

function getErrorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error).toLowerCase();
  const candidate = error as {
    code?: unknown;
    type?: unknown;
    message?: string;
  };
  return `${candidate.code ?? ""} ${candidate.type ?? ""} ${
    candidate.message ?? ""
  }`.toLowerCase();
}

function classifyError(error: unknown): ErrorClass {
  const status = getErrorStatus(error);
  const text = getErrorText(error);

  if (
    status === 429 ||
    status === 402 ||
    /insufficient_quota|credit_balance_exhausted|resource_exhausted|quota|rate.?limit|billing/.test(
      text
    )
  ) {
    return "quota";
  }
  if (
    status === 401 ||
    status === 403 ||
    /invalid.?api.?key|api key not valid|unauthenticated|permission_denied|forbidden|unauthorized|invalid model|model.*(not found|not exist|invalid|unsupported)|not found for api version/.test(
      text
    )
  ) {
    return "config";
  }
  if (
    status === null ||
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status >= 500 ||
    /timeout|timed out|aborted|network|fetch failed|econnreset|econnrefused|etimedout|socket hang up|empty response/.test(
      text
    )
  ) {
    return "transient";
  }
  return "unknown";
}

function getHeader(error: unknown, name: string): string | null {
  const headers = (error as { headers?: unknown })?.headers;
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const record = headers as Record<string, string>;
  return record[name] ?? record[name.toLowerCase()] ?? null;
}

function getRetryAfterMs(error: unknown): number | null {
  const raw = getHeader(error, "retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

const memoryCooldowns = new Map<LlmProviderName, number>();
const memoryBackoffs = new Map<LlmProviderName, number>();

function cooldownKey(name: LlmProviderName): string {
  return `llm:cooldown:${name}`;
}

function backoffKey(name: LlmProviderName): string {
  return `llm:backoff:${name}`;
}

async function readCooldown(name: LlmProviderName): Promise<number> {
  const memoryUntil = memoryCooldowns.get(name) ?? 0;
  try {
    const value = await redis.get<number | string>(cooldownKey(name));
    const parsed = Number(value ?? 0);
    return Math.max(memoryUntil, Number.isFinite(parsed) ? parsed : 0);
  } catch {
    return memoryUntil;
  }
}

async function writeCooldown(
  name: LlmProviderName,
  until: number
): Promise<void> {
  memoryCooldowns.set(name, until);
  const ttlSeconds = Math.max(1, Math.ceil((until - Date.now()) / 1000));
  try {
    await redis.set(cooldownKey(name), until, { ex: ttlSeconds });
  } catch {}
}

async function clearCooldown(name: LlmProviderName): Promise<void> {
  memoryCooldowns.delete(name);
  memoryBackoffs.delete(name);
  try {
    await redis.del(cooldownKey(name), backoffKey(name));
  } catch {}
}

async function nextTransientCooldownMs(
  name: LlmProviderName
): Promise<number> {
  let attempts = (memoryBackoffs.get(name) ?? 0) + 1;
  try {
    const value = await redis.incr(backoffKey(name));
    if (typeof value === "number" && Number.isFinite(value)) {
      attempts = Math.max(attempts, value);
    }
    await redis.expire(backoffKey(name), 60 * 60);
  } catch {}
  memoryBackoffs.set(name, attempts);

  const base =
    readNumberEnv("LLM_TRANSIENT_BACKOFF_MS", DEFAULT_TRANSIENT_BACKOFF_MS) ??
    DEFAULT_TRANSIENT_BACKOFF_MS;
  const max =
    readNumberEnv("LLM_MAX_BACKOFF_MS", DEFAULT_MAX_BACKOFF_MS) ??
    DEFAULT_MAX_BACKOFF_MS;
  return Math.min(base * Math.pow(2, Math.min(attempts - 1, 8)), max);
}

async function applyCooldown(
  name: LlmProviderName,
  errorClass: ErrorClass,
  error: unknown
): Promise<number> {
  const now = Date.now();
  const retryAfterMs = getRetryAfterMs(error) ?? 0;
  let until: number;

  if (errorClass === "quota") {
    const cooldownMs =
      readNumberEnv("LLM_QUOTA_COOLDOWN_MS", DEFAULT_QUOTA_COOLDOWN_MS) ??
      DEFAULT_QUOTA_COOLDOWN_MS;
    until = now + Math.max(cooldownMs, retryAfterMs);
  } else if (errorClass === "config") {
    const cooldownMs =
      readNumberEnv("LLM_CONFIG_COOLDOWN_MS", DEFAULT_CONFIG_COOLDOWN_MS) ??
      DEFAULT_CONFIG_COOLDOWN_MS;
    until = now + cooldownMs;
  } else {
    const backoffMs = await nextTransientCooldownMs(name);
    const maxBackoffMs =
      readNumberEnv("LLM_MAX_BACKOFF_MS", DEFAULT_MAX_BACKOFF_MS) ??
      DEFAULT_MAX_BACKOFF_MS;
    until =
      now + Math.max(backoffMs, Math.min(retryAfterMs, maxBackoffMs));
  }

  await writeCooldown(name, until);
  return until;
}

function budgetLimits(): { daily?: number; minute?: number } {
  return {
    daily: readNumberEnv("LLM_DAILY_BUDGET"),
    minute: readNumberEnv("LLM_PER_MINUTE_LIMIT"),
  };
}

function budgetKeys(name: LlmProviderName): {
  day: string;
  minute: string;
} {
  const now = new Date().toISOString();
  return {
    day: `llm:budget:${name}:day:${now.slice(0, 10)}`,
    minute: `llm:budget:${name}:minute:${now.slice(0, 16)}`,
  };
}

async function hasBudget(name: LlmProviderName): Promise<boolean> {
  const limits = budgetLimits();
  if (limits.daily === undefined && limits.minute === undefined) return true;
  try {
    const keys = budgetKeys(name);
    const [daily, minute] = await redis.mget<[number | null, number | null]>([
      keys.day,
      keys.minute,
    ]);
    if (limits.daily !== undefined && Number(daily ?? 0) >= limits.daily) {
      return false;
    }
    if (limits.minute !== undefined && Number(minute ?? 0) >= limits.minute) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

async function recordBudget(name: LlmProviderName): Promise<void> {
  const limits = budgetLimits();
  if (limits.daily === undefined && limits.minute === undefined) return;
  try {
    const keys = budgetKeys(name);
    const pipeline = redis.pipeline();
    if (limits.daily !== undefined) {
      pipeline.incr(keys.day).expire(keys.day, 2 * 24 * 60 * 60);
    }
    if (limits.minute !== undefined) {
      pipeline.incr(keys.minute).expire(keys.minute, 120);
    }
    await pipeline.exec();
  } catch {}
}

function recordStat(
  name: LlmProviderName,
  task: LlmTask,
  outcome: string
): void {
  const day = new Date().toISOString().slice(0, 10);
  const key = `llm:stat:${day}:${name}:${task}:${outcome}`;
  try {
    redis
      .incr(key)
      .then(() => redis.expire(key, STAT_TTL_SECONDS))
      .catch(() => {});
  } catch {}
}

function logEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ scope: "llm", ...event }));
}

async function runWithRetry(
  config: ProviderConfig,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await config.run({ prompt, model, timeoutMs, apiKey });
    } catch (error) {
      const errorClass = classifyError(error);
      if (errorClass === "quota" || errorClass === "config") throw error;
      if (attempt >= 1) throw error;
      const retryAfterMs = getRetryAfterMs(error);
      if (retryAfterMs !== null && retryAfterMs > MAX_RETRY_WAIT_MS) {
        throw error;
      }
      await sleep(retryAfterMs ?? 500);
    }
  }
}

export interface GenerateTextOptions {
  prompt: string;
  taskLabel: string;
  task?: LlmTask;
  timeoutMs?: number;
}

export interface GenerateTextResult {
  text: string;
  provider: LlmProviderName;
}

function inferTask(taskLabel: string): LlmTask {
  const normalized = taskLabel.toLowerCase();
  if (normalized.includes("candidate")) return "candidates";
  if (normalized.includes("rank")) return "rank";
  return "general";
}

const inFlight = new Map<string, Promise<GenerateTextResult>>();

function flightKey(task: LlmTask, prompt: string, timeoutMs: number): string {
  return createHash("sha256")
    .update(`${task}:${timeoutMs}:${prompt}`)
    .digest("hex");
}

export function generateTextWithFallback(
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const task = options.task ?? inferTask(options.taskLabel);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const key = flightKey(task, options.prompt, timeoutMs);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = runFallback({ ...options, task, timeoutMs }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

async function runFallback({
  prompt,
  taskLabel,
  task,
  timeoutMs,
}: GenerateTextOptions & {
  task: LlmTask;
  timeoutMs: number;
}): Promise<GenerateTextResult> {
  const failures: string[] = [];

  for (const name of getProviderOrder(task)) {
    const config = PROVIDER_BY_NAME.get(name);
    if (!config) continue;

    const apiKey = getProviderApiKey(config);
    if (!apiKey) continue;

    const [cooldownUntil, withinBudget] = await Promise.all([
      readCooldown(name),
      hasBudget(name),
    ]);

    if (Date.now() < cooldownUntil) {
      logEvent({
        event: "skip",
        reason: "cooldown",
        provider: name,
        task,
        cooldownUntil,
      });
      continue;
    }
    if (!withinBudget) {
      logEvent({ event: "skip", reason: "budget", provider: name, task });
      continue;
    }

    const model = resolveModel(name, task);
    const startedAt = Date.now();
    await recordBudget(name);

    try {
      const text = await runWithRetry(
        config,
        apiKey,
        model,
        prompt,
        timeoutMs
      );
      const latencyMs = Date.now() - startedAt;
      await clearCooldown(name);
      logEvent({
        event: "success",
        provider: name,
        task,
        taskLabel,
        model,
        latencyMs,
      });
      recordStat(name, task, "success");
      return { text, provider: name };
    } catch (error) {
      const errorClass = classifyError(error);
      const latencyMs = Date.now() - startedAt;
      const cooldownUntil = await applyCooldown(name, errorClass, error);
      const message = error instanceof Error ? error.message : String(error);
      logEvent({
        event: "failure",
        provider: name,
        task,
        taskLabel,
        model,
        latencyMs,
        errorClass,
        cooldownUntil,
        message: message.slice(0, 500),
      });
      recordStat(name, task, errorClass);
      failures.push(`${name}: ${message}`);
    }
  }

  throw new Error(
    `[llm] ${taskLabel} all providers failed${
      failures.length
        ? ` (${failures.join(" | ")})`
        : " (none configured or all cooling down)"
    }`
  );
}
