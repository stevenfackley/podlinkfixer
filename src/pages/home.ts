// Server-rendered HTML shell. All interactivity lives in /app.js (served from /public).
// Inline a tiny bit of CSS for first-paint while /styles.css loads.

export function homePage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PodLinkFixer — paste a podcast link, get it on every platform</title>
  <meta name="description" content="Paste any podcast URL (Apple, Spotify, Pocket Casts, Overcast). Get the same show or episode on every other platform." />
  <meta name="theme-color" content="#0f172a" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" type="image/png" href="/icon-192.png" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <link rel="stylesheet" href="/styles.css" />
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100dvh; }
  </style>
</head>
<body>
  <main class="container">
    <header class="hero">
      <h1>PodLinkFixer</h1>
      <p class="tagline">Paste a podcast link. Get it on every other platform.</p>
    </header>

    <form id="convert-form" class="paste-form" autocomplete="off">
      <label for="url-input" class="visually-hidden">Podcast URL</label>
      <input
        id="url-input"
        name="url"
        type="url"
        inputmode="url"
        placeholder="https://podcasts.apple.com/... or open.spotify.com/episode/..."
        required
        autofocus
        spellcheck="false"
      />
      <div class="paste-actions">
        <button type="button" id="paste-btn" class="ghost">Paste from clipboard</button>
        <button type="submit" class="primary">Convert</button>
      </div>
    </form>

    <section id="status" class="status" aria-live="polite"></section>
    <section id="results" class="results" aria-live="polite"></section>

    <section id="recents-section" class="recents" hidden>
      <h2>Recent conversions</h2>
      <ul id="recents"></ul>
      <button type="button" id="clear-recents" class="ghost small">Clear</button>
    </section>

    <footer class="footer">
      <p>
        Powered by <a href="https://podcastindex.org" target="_blank" rel="noopener">Podcast Index</a>,
        iTunes Search API, and Spotify Web API.
        No accounts, no tracking, no link is stored server-side beyond a 30-day lookup cache.
      </p>
    </footer>
  </main>
  <script src="/app.js" defer></script>
</body>
</html>`;
}
