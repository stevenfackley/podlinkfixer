// KV-backed result cache. Keys are cacheKeyFor(ParsedSource).
// Values are the full /api/convert response JSON. TTL is 30 days.

const TTL_SECONDS = 60 * 60 * 24 * 30;

export async function getCached<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const value = await kv.get(key, { type: "json" });
  return (value as T) ?? null;
}

export async function putCached(kv: KVNamespace, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: TTL_SECONDS });
}
