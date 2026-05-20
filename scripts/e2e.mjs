#!/usr/bin/env node
// Manual smoke test. Requires `npm run dev` to be running (wrangler dev on :8787).
// Hits the live API with a handful of real podcast URLs and prints a compact summary.
//
// Usage:
//   node scripts/e2e.mjs [baseUrl]
//   node scripts/e2e.mjs https://podlinkfixer.<your>.workers.dev

const BASE = process.argv[2] || "http://localhost:8787";

const FIXTURES = [
  {
    label: "Apple show (The Daily)",
    url: "https://podcasts.apple.com/us/podcast/the-daily/id1200361736",
  },
  {
    label: "Spotify show (The Joe Rogan Experience)",
    url: "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk",
  },
  {
    label: "Overcast iTunes (The Daily)",
    url: "https://overcast.fm/itunes1200361736",
  },
];

async function main() {
  console.log(`Testing against: ${BASE}\n`);
  let pass = 0;
  for (const f of FIXTURES) {
    process.stdout.write(`• ${f.label}\n  ${f.url}\n  `);
    try {
      const t0 = Date.now();
      const res = await fetch(`${BASE}/api/convert?url=${encodeURIComponent(f.url)}`);
      const ms = Date.now() - t0;
      const data = await res.json();
      if (!res.ok) {
        console.log(`✗ ${res.status} — ${data.error || "no error message"}`);
        continue;
      }
      const targetCount = (data.targets || []).length;
      const showTitle = data.show?.title ?? "?";
      const cached = data.cached ? " (cached)" : "";
      console.log(`✓ ${ms}ms${cached} — "${showTitle}" → ${targetCount} targets`);
      pass++;
    } catch (err) {
      console.log(`✗ network: ${err.message}`);
    }
    console.log();
  }
  console.log(`\n${pass}/${FIXTURES.length} passed.`);
  process.exit(pass === FIXTURES.length ? 0 : 1);
}

main();
