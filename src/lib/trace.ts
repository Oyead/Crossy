export interface Timings {
  time<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
  toHeader(): string;
}

// Wraps a phase, logging a console.time span and recording it for a
// Server-Timing response header.
export function createTimings(): Timings {
  const spans: Record<string, number> = {};

  return {
    async time<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
      const start = performance.now();
      console.time(`[search] ${name}`);
      try {
        return await fn();
      } finally {
        const ms = Math.round(performance.now() - start);
        spans[name] = (spans[name] ?? 0) + ms;
        console.timeEnd(`[search] ${name}`);
      }
    },
    toHeader(): string {
      return Object.entries(spans)
        .map(([name, ms]) => `${name};dur=${ms}`)
        .join(', ');
    },
  };
}

// Calls through to timings.time when timings are provided, otherwise just runs.
export function timed<T>(
  timings: Timings | undefined,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return timings ? timings.time(name, fn) : fn();
}
