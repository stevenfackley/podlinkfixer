# PodLinkFixer

Paste any podcast URL, get the same show/episode on every other platform.

Mike has an iPhone and sends Apple Podcasts links. You have Android and use Spotify. Or vice versa. This is the converter.

## How it works

Single Cloudflare Worker. You paste a URL on the home page → it calls `/api/convert` → which parses the source platform, resolves the canonical podcast via [Podcast Index](https://podcastindex.org), matches the episode across every target platform (Spotify, YouTube Music, Pocket Casts, Overcast, Castro, Amazon Music, Audible), caches the result in KV for 30 days, and returns JSON. The client renders a results card with one clickable + copy-able link per platform.

No accounts, no preferences, no share-sheet integration. Just paste → results.

## Stack

- **Runtime:** Cloudflare Workers + [Hono](https://hono.dev)
- **Cache:** Cloudflare KV
- **Lookup:** Podcast Index API (canonical mapping), iTunes Search API (Apple metadata), Spotify Web API (Spotify metadata)
- **Frontend:** Static HTML + vanilla JS served from the same Worker via [Workers Assets](https://developers.cloudflare.com/workers/static-assets/)
- **PWA:** Installable on Android Chrome + iOS Safari for a home-screen icon

## One-time setup

```powershell
# 1. Install deps
npm install

# 2. Authenticate wrangler to your Cloudflare account (opens browser)
npx wrangler login

# 3. Create the KV namespace (production)
npx wrangler kv namespace create LOOKUPS
# -> outputs something like:
#    [[kv_namespaces]]
#    binding = "LOOKUPS"
#    id = "abc123..."
# Paste the id into wrangler.toml (replace REPLACE_WITH_KV_NAMESPACE_ID)

# 4. (Recommended) Create a preview namespace for `wrangler dev`
npx wrangler kv namespace create LOOKUPS --preview
# Add `preview_id = "..."` to the [[kv_namespaces]] block in wrangler.toml

# 5. Get a Podcast Index API key+secret (free)
#    -> https://podcastindex.org/  (Create Account -> API Keys)

# 6. Create a Spotify developer app (free)
#    -> https://developer.spotify.com/dashboard  (Create app)
#    See "Spotify app — important notes" below.

# 7. Local secrets
copy .dev.vars.example .dev.vars
# edit .dev.vars and paste:
#   PODCAST_INDEX_KEY, PODCAST_INDEX_SECRET, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
```

### Spotify app — important notes

We use Spotify's **Client Credentials flow** (server-to-server, no user login). The Spotify developer dashboard *requires* a Redirect URI field when creating the app, but our code never sends a user through it.

When creating the app at <https://developer.spotify.com/dashboard>:

- **App name:** PodLinkFixer (or whatever you want)
- **Redirect URI:** put any valid URL — `https://example.com/callback` is fine. **It is never used.** It's a Spotify form-field requirement, not a flow requirement.
- **Which API/SDKs:** check ☑ **Web API**

After save, copy the **Client ID** and **Client Secret** into your `.dev.vars`.

## Local dev

```powershell
npm run dev
# -> http://localhost:8787
```

Open the URL in a browser, paste a podcast link, get the results card.

Or hit the API directly:

```powershell
curl 'http://localhost:8787/api/convert?url=https://podcasts.apple.com/us/podcast/the-daily/id1200361736'
```

## Tests

```powershell
npm test
```

Unit tests cover the URL parsers and the episode-matching logic. An e2e script (`test/e2e.test.ts`) requires `wrangler dev` to be running on port 8787 and hits the live API with real URLs.

## Deploy

```powershell
# One time: push the four secrets to the Worker (each prompts for the value)
npx wrangler secret put PODCAST_INDEX_KEY
npx wrangler secret put PODCAST_INDEX_SECRET
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET

# Deploy
npm run deploy
# -> https://podlinkfixer.<your-cf-subdomain>.workers.dev
```

Your Worker URL is determined by:
- **Worker name** = `name` in `wrangler.toml` (currently `podlinkfixer`)
- **`<your-cf-subdomain>`** = your Cloudflare account's workers subdomain, set once on your account (e.g. `stevenfackley`). If you've never deployed a Worker before, `wrangler deploy` will prompt you to choose it.

After deploy, you can attach a custom domain (e.g. `podlinkfixer.app`) via the Cloudflare dashboard → Workers & Pages → your worker → Settings → Triggers → Custom Domain. No code change needed.

## PWA install

- **Android Chrome:** menu → Install app
- **iOS Safari:** Share → Add to Home Screen
