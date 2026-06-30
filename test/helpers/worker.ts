// Minimal Workers test harness: an in-memory KV namespace, a Bindings env, and a
// fake ExecutionContext whose waitUntil() tasks can be awaited. Enough to drive the
// Hono app's `app.fetch(request, env, ctx)` end-to-end without miniflare/wrangler.

/** In-memory stand-in for a Workers KVNamespace (the subset the code uses). */
export function memoryKV(): KVNamespace {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string, options?: unknown): Promise<unknown> {
      const raw = store.get(key);
      if (raw === undefined) return null;
      const type =
        typeof options === "string"
          ? options
          : (options as { type?: string } | undefined)?.type;
      return type === "json" ? JSON.parse(raw) : raw;
    },
    async put(key: string, value: string): Promise<void> {
      // expirationTtl is accepted by the real API but irrelevant in-memory.
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(): Promise<{ keys: { name: string }[]; list_complete: boolean }> {
      return { keys: [...store.keys()].map((name) => ({ name })), list_complete: true };
    },
  };
  return kv as unknown as KVNamespace;
}

export interface WorkerEnv {
  ASSETS: Fetcher;
  LOOKUPS: KVNamespace;
  PODCAST_INDEX_KEY: string;
  PODCAST_INDEX_SECRET: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
}

/** Build a Bindings env. ASSETS is unused by /api/convert so it's left undefined. */
export function makeEnv(kv: KVNamespace = memoryKV()): WorkerEnv {
  return {
    ASSETS: undefined as unknown as Fetcher,
    LOOKUPS: kv,
    PODCAST_INDEX_KEY: "test-pi-key",
    PODCAST_INDEX_SECRET: "test-pi-secret",
    SPOTIFY_CLIENT_ID: "test-spotify-client-id",
    SPOTIFY_CLIENT_SECRET: "test-spotify-client-secret",
  };
}

export interface TestContext {
  ctx: ExecutionContext;
  /** Await all waitUntil()-scheduled tasks (e.g. the fire-and-forget cache write). */
  settle(): Promise<void>;
}

export function makeCtx(): TestContext {
  const tasks: Promise<unknown>[] = [];
  const ctx = {
    waitUntil(promise: Promise<unknown>): void {
      tasks.push(promise);
    },
    passThroughOnException(): void {},
    props: {},
  } as unknown as ExecutionContext;
  return {
    ctx,
    settle: async () => {
      await Promise.allSettled(tasks);
    },
  };
}

/** Convenience builder for an /api/convert request against the worker. */
export function convertRequest(podcastUrl: string): Request {
  return new Request(`https://podlinkfixer.test/api/convert?url=${encodeURIComponent(podcastUrl)}`);
}

/** Lookup-layer env shape used by resolveSource() / buildAllTargets() directly. */
export function resolveEnv(kv: KVNamespace = memoryKV()) {
  return {
    kv,
    spotify: { clientId: "test-spotify-client-id", clientSecret: "test-spotify-client-secret" },
    podcastIndex: { apiKey: "test-pi-key", apiSecret: "test-pi-secret" },
  };
}
