import { Hono } from "hono";
import { cacheKeyFor, detectAndParse } from "./parsers";
import { resolveSource } from "./resolve";
import { buildAllTargets } from "./targets";
import { getCached, putCached } from "./cache";
import { homePage } from "./pages/home";

type Bindings = {
  ASSETS: Fetcher;
  LOOKUPS: KVNamespace;
  PODCAST_INDEX_KEY: string;
  PODCAST_INDEX_SECRET: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.html(homePage()));

// Health check — handy for uptime monitors
app.get("/healthz", (c) => c.text("ok"));

app.get("/api/convert", async (c) => {
  const rawUrl = c.req.query("url");
  if (!rawUrl) {
    return c.json({ error: "Missing ?url=<podcast url>" }, 400);
  }

  const parsed = detectAndParse(rawUrl);
  if (!parsed) {
    return c.json(
      {
        error:
          "Could not parse that URL. Supported: Apple Podcasts, Spotify, Pocket Casts, Overcast.",
      },
      400,
    );
  }

  const key = cacheKeyFor(parsed);

  // Cache hit -> return immediately
  const cached = await getCached<unknown>(c.env.LOOKUPS, key);
  if (cached && typeof cached === "object") {
    return c.json({ ...(cached as object), cached: true });
  }

  const env = {
    kv: c.env.LOOKUPS,
    spotify: {
      clientId: c.env.SPOTIFY_CLIENT_ID,
      clientSecret: c.env.SPOTIFY_CLIENT_SECRET,
    },
    podcastIndex: {
      apiKey: c.env.PODCAST_INDEX_KEY,
      apiSecret: c.env.PODCAST_INDEX_SECRET,
    },
  };

  let resolved;
  try {
    resolved = await resolveSource(parsed, env);
  } catch (err) {
    console.error("resolve error", err);
    return c.json({ error: "Lookup failed. Try again in a moment." }, 502);
  }

  if (!resolved) {
    return c.json(
      {
        error:
          parsed.platform === "pocketcasts"
            ? "Pocket Casts share links aren't supported as input yet — paste an Apple Podcasts or Spotify link instead."
            : "Couldn't find this podcast across platforms.",
      },
      404,
    );
  }

  const targets = await buildAllTargets(resolved.show, resolved.episode, env);

  const result = {
    source: { platform: parsed.platform },
    show: {
      title: resolved.show.title,
      publisher: resolved.show.publisher ?? null,
      artwork_url: resolved.show.artworkUrl,
      itunes_id: resolved.show.itunesId,
    },
    episode: resolved.episode
      ? {
          title: resolved.episode.title,
          published_at: resolved.episode.publishedAt,
        }
      : null,
    targets,
    cached: false,
  };

  // Fire-and-forget cache write; we don't want to delay the response on it.
  c.executionCtx.waitUntil(putCached(c.env.LOOKUPS, key, result));

  return c.json(result);
});

// Anything else: let Workers Assets handle it (static files). If no match, 404.
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status !== 404) return res;
  }
  return c.notFound();
});

export default app;
