"use strict";
// Shared helpers for the reader pages.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const toBn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const ICON = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  plus: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>', branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 7v10"/><path d="M18 9c0 5-6 4-11.5 8.5"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>', shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

// Uses the Node server's /api when it is running; otherwise (opened as a file, or another static host)
// runs the same reader code (lib/reader.js) in the browser against Wikidata directly.
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
// Remember for the session whether a Node server answered, so later pages skip the failed probe.
let serverOk = !location.protocol.startsWith("http") ? false : ss.get("lx_server") ?? null;
function localApi(url) {
  const u = new URL(url, "http://x"), q = Object.fromEntries(u.searchParams), R = window.LX?.reader;
  if (!R) throw new Error("reader engine not loaded");
  const m = u.pathname.match(/^\/api\/(word|etymology|neighbors|same|descendants)\/(L\d+)$/);
  if (m) return { word: () => R.word(m[2], q), neighbors: () => R.neighbors(m[2]), etymology: () => R.etymology(m[2], q), same: () => R.sameLemma(m[2]), descendants: () => R.descendants(m[2], q) }[m[1]]();
  const fn = { "/api/config": () => R.config(), "/api/search": () => R.search(q), "/api/home": () => R.home(q), "/api/browse": () => R.browse(q),
    "/api/random": () => R.random(q.lang), "/api/collection": () => R.collection(q) }[u.pathname];
  if (!fn) throw new Error("unknown endpoint " + u.pathname);
  return fn();
}
// Session cache (10 min) for read endpoints; `fresh=1` bypasses it, random never caches.
const CACHE_MS = 10 * 60e3;
async function getJSON(url, { cache = !/\/api\/random|fresh=1/.test(url) } = {}) {
  const key = "lxc:" + url;
  if (cache) { const c = ss.get(key); if (c && c.t > Date.now() - CACHE_MS) return c.v; }
  let v;
  if (serverOk !== false) {
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), { fromServer: true });
      if (serverOk !== true) { serverOk = true; ss.set("lx_server", true); }
      v = j;
    } catch (e) { if (e.fromServer || serverOk) throw e; serverOk = false; ss.set("lx_server", false); }
  }
  if (v === undefined) v = await localApi(url);
  if (cache) ss.set(key, { t: Date.now(), v });
  return v;
}
// Forget every cached response about a lexeme (after it was edited).
function dropCache(id) { try { Object.keys(sessionStorage).filter(k => k.startsWith("lxc:") && k.includes(id)).forEach(k => sessionStorage.removeItem(k)); } catch (e) {} }
const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== "" && v != null)).toString();
const params = () => Object.fromEntries(new URLSearchParams(location.search));

/* config + language preference */
let SITE = { languages: [], categories: [], plabelBn: {} };
const configReady = getJSON("/api/config").then(c => (SITE = c)).catch(() => SITE);
// Without the Node server, load the local word index of the reading language (from IndexedDB, or build it once).
configReady.then(() => { if (serverOk === false && window.LX?.index) LX.index.get(getLang()); });
const getLang = () => { try { return localStorage.getItem("reader_lang") || "Q9610"; } catch (e) { return "Q9610"; } };
const setLang = q => { try { localStorage.setItem("reader_lang", q); } catch (e) {} };
function catLabel(qid, labels = {}) { const c = SITE.categories.find(x => x.qid === qid); return c ? c.bn : labels[qid]?.label || qid || ""; }
function langLabel(qid, labels = {}) { const l = SITE.languages.find(x => x.qid === qid); return l ? l.bn : labels[qid]?.label || qid || ""; }
function langColor(qid) { let h = 0; for (const c of String(qid)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 42%)`; }
const langBadge = (qid, labels) => `<span class="lang-badge" style="background:${langColor(qid)}">${esc(langLabel(qid, labels))}</span>`;
// Behind the Node server links are clean (/word/L123); opened as plain files they fall back to ?id=.
const wordUrl = id => (window.LX_NODE ? `/word/${id}` : `word.html?id=${id}`);
const colUrl = cat => (window.LX_NODE ? `/collection/${cat}` : `collection.html?cat=${cat}`);
const etyUrl = id => (window.LX_NODE ? `/etymology/${id}` : `etymology.html?id=${id}`);
// A search hit that matched an inflected form (e.g. মাকে → মা) opens the word at that form (#L1472-F11).
const hitUrl = s => (s.formId ? `${wordUrl(s.id)}#${s.formId}` : wordUrl(s.id));

// The header (navigation, অনুসন্ধান, login, light/dark) is built by sitenav.js — the same on every page.
function initChrome() {  document.body.insertAdjacentHTML("beforeend", `<footer class="footer"><div class="wrap"><span><b>লেক্সিম.বাংলা</b> · তথ্য: <a href="https://www.wikidata.org/wiki/Wikidata:Lexicographical_data" target="_blank" rel="noopener">উইকি উপাত্ত লেক্সিম</a> (CC0)</span><span>নির্মাতা: <a href="https://www.wikidata.org/wiki/User:Aishik_Rehman" target="_blank" rel="noopener">ঐশিক রেহমান (User:Aishik Rehman)</a></span></div></footer>`);
}

/* search-as-you-type suggestions */
// Search-as-you-type with the results shown inline, below the box (no popup).
// `out` is the element that receives the result rows.
function liveResults(input, out, { limit = 20 } = {}) {
  if (!input || !out) return;
  let t, seq = 0;
  input.addEventListener("input", () => {
    clearTimeout(t); const q = input.value.trim();
    if (!q) { seq++; out.innerHTML = ""; return; }
    t = setTimeout(async () => {
      const my = ++seq; out.innerHTML = skeleton(3);
      try {
        const j = await getJSON(`/api/search?${qs({ q, lang: getLang(), limit })}`); if (my !== seq) return;
        out.innerHTML = j.list.length
          ? `<p class="muted" style="margin:6px 0">“${esc(q)}” — ${toBn(j.list.length)}টি ফল · <a href="search.html?${qs({ q })}" data-mode="advanced">উন্নত অনুসন্ধান →</a></p>` + j.list.map((s, i) => rowItem(s, j.labels, i + 1)).join("")
          : `<div class="msg">“${esc(q)}” পাওয়া যায়নি। <a href="search.html?${qs({ q })}" data-mode="advanced">উন্নত অনুসন্ধানে চেষ্টা করুন</a> বা <a href="wizard.html?${qs({ lemma: q, return: 1 })}">নতুন শব্দ হিসেবে যোগ করুন</a></div>`;
      } catch (e) { if (my === seq) out.innerHTML = `<div class="msg err">খোঁজা যায়নি: ${esc(e.message)}</div>`; }
    }, 250);
  });
}
/* shared renderers */
// `num` (1, 2, …) puts the serial number at the start of the row.
const rowItem = (s, labels, num) => `<a class="row-item${num ? " numbered" : ""}" href="${hitUrl(s)}">${num ? `<span class="sn">${toBn(num)}.</span>` : ""}<span class="lem">${esc(s.lemma)}${s.form && s.form !== s.lemma ? ` <small class="muted">(${esc(s.form)})</small>` : ""}</span><span class="g">${esc(s.gloss) || '<span class="muted">—</span>'}</span><span class="n"><span class="chip">${esc(catLabel(s.category, labels))}</span> ${s.id}</span></a>`;
const wcard = (s, cls = "") => `<a class="wcard ${cls}" href="${wordUrl(s.id)}"><div class="lem">${esc(s.lemma)}</div>${s.gloss ? `<div class="g">${esc(s.gloss)}</div>` : ""}</a>`;
function pager(cur, pages, href) {
  if (pages <= 1) return "";
  const set = new Set([1, pages, cur - 2, cur - 1, cur, cur + 1, cur + 2].filter(p => p >= 1 && p <= pages));
  const nums = [...set].sort((a, b) => a - b); let out = "", last = 0;
  if (cur > 1) out += `<a href="${href(cur - 1)}" rel="prev">← আগের</a>`;
  for (const n of nums) { if (n - last > 1) out += `<span class="muted">…</span>`; out += `<a href="${href(n)}"${n === cur ? ' aria-current="page"' : ""}>${toBn(n)}</a>`; last = n; }
  if (cur < pages) out += `<a href="${href(cur + 1)}" rel="next">পরের →</a>`;
  return `<nav class="pager" aria-label="পাতা">${out}</nav>`;
}
/* Compact left-to-right tree. `childrenOf(id)` → [{ id, edge }], `node(id)` → { lemma, language, gloss }.
   The root sits on the left; each node's children fan out to its right. */
function htree(rootId, childrenOf, node, labels, { edgeLabel = () => "", maxDepth = 12 } = {}) {
  const li = (id, depth, seen, edge) => {
    const n = node(id) || { lemma: id };
    const kids = depth < maxDepth && !seen.has(id) ? childrenOf(id) : [];
    const s = new Set(seen).add(id);
    const lab = edge ? edgeLabel(edge) : "";
    const box = `<a class="nd${depth === 0 ? " root" : ""}" href="${wordUrl(id)}" title="${esc(n.gloss || "")}" style="--c:${langColor(n.language)}">${lab ? `<small class="el">${esc(lab)}</small>` : ""}<span class="lm">${esc(n.lemma)}</span>${n.language ? `<span class="lg">${esc(langLabel(n.language, labels))}</span>` : ""}${seen.has(id) ? '<span class="lg">↺</span>' : ""}</a>`;
    return `<li${kids.length ? ' class="has"' : ""}>${box}${kids.length ? `<ul>${kids.map(k => li(k.id, depth + 1, s, k.edge)).join("")}</ul>` : ""}</li>`;
  };
  return `<div class="htree-wrap"><ul class="htree">${li(rootId, 0, new Set(), null)}</ul></div>`;
}
// Ancestry tree from /api/etymology: parts (in reading order) first, then "derived from".
function etymologyTree(t, rootId) {
  const kids = id => t.edges.filter(x => x.from === id && t.nodes[x.to]).sort((a, b) => (a.kind === b.kind ? (a.ord || 0) - (b.ord || 0) : a.kind === "part" ? -1 : 1)).map(x => ({ id: x.to, edge: x }));
  const node = id => { const n = t.nodes[id]; return n && { lemma: n.lemma, language: n.language, gloss: (n.glosses || []).join("; ") }; };
  return htree(rootId, kids, node, t.labels, { edgeLabel: e => (e.kind === "part" ? (e.ord ? `খণ্ডাংশ ${toBn(e.ord)}` : "খণ্ডাংশ") : t.labels[e.mode]?.label || "উদ্ভূত") });
}
// Tree of lexemes built from this one, from /api/descendants.
function descendantsTree(t, rootId, rootNode) {
  const kids = id => { const seen = new Set(); return t.edges.filter(x => x.from === id && t.nodes[x.to] && !seen.has(x.to) && seen.add(x.to)).map(x => ({ id: x.to, edge: x })); };
  const node = id => (id === rootId ? rootNode : t.nodes[id]);
  return htree(rootId, kids, node, t.labels, { edgeLabel: e => (e.kind === "compound" ? "গঠিত" : "উদ্ভূত"), maxDepth: 5 });
}
const skeleton = n => Array.from({ length: n }, () => `<div class="card"><div class="skel" style="width:40%"></div><div class="skel" style="width:80%;margin-top:8px"></div></div>`).join("");
const LETTERS = "অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য়".split(" ");

initChrome();
// Links marked data-mode="advanced" open the search page in advanced mode (remembered, not put in the URL).
document.addEventListener("click", e => { const a = e.target.closest("a[data-mode]"); if (a) try { localStorage.setItem("search_mode", a.dataset.mode); } catch (err) {} }, true);
// (.html links in the pages are turned into clean URLs by sitenav.js when served by Node.)
