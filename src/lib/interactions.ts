export interface InteractionEvent {
  kind: "impression" | "click";
  query?: string;
  mediaType: string;
  externalId: string;
  sourceApi?: string;
  position?: number;
}

export function logInteraction(event: InteractionEvent): void {
  if (typeof window === "undefined") return;
  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => undefined);
}

export function logInteractions(events: InteractionEvent[]): void {
  if (typeof window === "undefined" || events.length === 0) return;
  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: events.slice(0, 50) }),
    keepalive: true,
  }).catch(() => undefined);
}
