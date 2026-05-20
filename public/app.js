// PodLinkFixer client — vanilla JS, no build step.

const PLATFORM_LABELS = {
  apple: "Apple Podcasts",
  spotify: "Spotify",
  youtube_music: "YouTube Music",
  pocketcasts: "Pocket Casts",
  overcast: "Overcast",
  castro: "Castro",
  amazon_music: "Amazon Music",
  audible: "Audible",
};

const RECENTS_KEY = "podlinkfixer:recents:v1";
const RECENTS_MAX = 10;

const form = document.getElementById("convert-form");
const input = document.getElementById("url-input");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const recentsSection = document.getElementById("recents-section");
const recentsList = document.getElementById("recents");
const pasteBtn = document.getElementById("paste-btn");
const clearRecentsBtn = document.getElementById("clear-recents");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;
  await convert(url);
});

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      input.value = text;
      input.focus();
    }
  } catch {
    setStatus("Clipboard read blocked. Paste manually with Ctrl/Cmd-V.", "warn");
  }
});

clearRecentsBtn.addEventListener("click", () => {
  localStorage.removeItem(RECENTS_KEY);
  renderRecents();
});

async function convert(url) {
  setStatus("Looking up…", "info");
  resultsEl.innerHTML = "";
  try {
    const res = await fetch(`/api/convert?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || `Lookup failed (${res.status})`, "error");
      return;
    }
    renderResults(data);
    pushRecent({ url, show: data.show, episode: data.episode, ts: Date.now() });
    setStatus(data.cached ? "From cache." : "Done.", "ok");
  } catch (err) {
    setStatus("Network error. Check your connection and try again.", "error");
  }
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.dataset.kind = kind || "";
}

function renderResults(data) {
  const { show, episode, targets } = data;
  const showTitle = show?.title || "Unknown show";
  const showPublisher = show?.publisher ? ` — ${escapeHtml(show.publisher)}` : "";
  const artwork = show?.artwork_url
    ? `<img class="art" src="${escapeAttr(show.artwork_url)}" alt="" loading="lazy" />`
    : "";
  const episodeHtml = episode
    ? `<div class="ep"><div class="ep-title">${escapeHtml(episode.title)}</div>${
        episode.published_at
          ? `<div class="ep-date">${formatDate(episode.published_at)}</div>`
          : ""
      }</div>`
    : "";

  const targetsHtml = (targets || [])
    .map((t) => {
      const label = PLATFORM_LABELS[t.platform] || t.platform;
      const kindBadge =
        t.kind === "episode"
          ? `<span class="badge badge-ep">Episode</span>`
          : t.kind === "search"
            ? `<span class="badge badge-search">Search</span>`
            : `<span class="badge badge-show">Show</span>`;
      const note = t.note ? `<div class="target-note">${escapeHtml(t.note)}</div>` : "";
      return `
        <li class="target">
          <div class="target-main">
            <a class="target-link" href="${escapeAttr(t.url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>
            ${kindBadge}
          </div>
          <button class="copy" data-url="${escapeAttr(t.url)}" aria-label="Copy ${escapeHtml(label)} link">Copy</button>
          ${note}
        </li>`;
    })
    .join("");

  resultsEl.innerHTML = `
    <article class="card">
      <div class="card-head">
        ${artwork}
        <div class="card-meta">
          <h2 class="show-title">${escapeHtml(showTitle)}<span class="show-publisher">${showPublisher}</span></h2>
          ${episodeHtml}
        </div>
      </div>
      <ul class="targets">${targetsHtml}</ul>
    </article>
  `;

  resultsEl.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.url);
        const original = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1200);
      } catch {
        // ignore — user can long-press the link instead
      }
    });
  });
}

function pushRecent(entry) {
  const list = readRecents();
  // Dedupe by URL
  const filtered = list.filter((e) => e.url !== entry.url);
  filtered.unshift(entry);
  while (filtered.length > RECENTS_MAX) filtered.pop();
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage full or unavailable — non-fatal
  }
  renderRecents();
}

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderRecents() {
  const list = readRecents();
  if (!list.length) {
    recentsSection.hidden = true;
    recentsList.innerHTML = "";
    return;
  }
  recentsSection.hidden = false;
  recentsList.innerHTML = list
    .map((e) => {
      const title = e.show?.title || e.url;
      const sub = e.episode?.title ? ` — ${escapeHtml(e.episode.title)}` : "";
      return `<li><button class="recent-item" data-url="${escapeAttr(e.url)}">${escapeHtml(title)}<span class="recent-sub">${sub}</span></button></li>`;
    })
    .join("");
  recentsList.querySelectorAll(".recent-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.url;
      convert(btn.dataset.url);
    });
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function escapeAttr(s) {
  return escapeHtml(s);
}
function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

renderRecents();

// Register the service worker — improves offline launch + install prompt UX
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
