import "server-only";
import { NextRequest } from "next/server";

// Rate limit simples em memória, por processo. Suficiente pra coibir abuso
// básico num painel de uso interno; não é distribuído entre instâncias
// (num deploy serverless com múltiplas instâncias, cada uma tem seu próprio
// balde). Se o tráfego crescer, trocar por um limitador com storage
// compartilhado (ex: Upstash Redis).
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
