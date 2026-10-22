"use strict";
(function () {
// Wikidata access for the reader: MediaWiki API + SPARQL, with an in-memory TTL cache.
const CFG = (typeof require === "function" ? require("./config") : LX.config);

const cache = new Map();
const MAX_CACHE = 5000;
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  const p = fn();
  cache.set(key, { exp: Date.now() + ttlMs, val: p });
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  try { return await p; } catch (e) { cache.delete(key); throw e; }
}

async function getJson(url, opts = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Browsers forbid a custom User-Agent (it would also force a CORS preflight), so only Node sends it.
    const ua = typeof window === "undefined" ? { "User-Agent": CFG.userAgent } : {};
    const res = await fetch(url, { ...opts, headers: { ...ua, Accept: "application/json", ...(opts.headers || {}) } });
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return res.json();
  }
  throw new Error("Wikidata is busy, try again shortly");
}

async function api(params) {
  const q = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  const j = await getJson(`${CFG.wd}?${q}`);
  if (j.error) throw new Error(j.error.info || j.error.code);
  return j;
}

async function sparql(query, ttl = 30 * 60e3) {
  return cached("sparql:" + query, ttl, async () => {
    const j = await getJson(`${CFG.sparql}?format=json&query=${encodeURIComponent(query)}`, { headers: { Accept: "application/sparql-results+json" } });
    return j.results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
  });
}
const idOf = uri => String(uri || "").replace(/^.*\/entity\//, "");

/* ---------- entities ---------- */
const ENT_TTL = 10 * 60e3;
async function getEntities(ids, props) {
  ids = [...new Set(ids.filter(Boolean))];
  const out = {};
  const need = [];
  for (const id of ids) { const c = cache.get(`ent:${props || "all"}:${id}`); if (c && c.exp > Date.now()) out[id] = await c.val; else need.push(id); }
  for (let i = 0; i < need.length; i += 50) {
    const chunk = need.slice(i, i + 50);
    const p = { action: "wbgetentities", ids: chunk.join("|") };
    if (props) { p.props = props; p.languages = "bn|en"; p.languagefallback = "1"; }
    const j = await api(p);
    for (const [id, e] of Object.entries(j.entities || {})) {
      if (e.missing !== undefined) continue;
      out[id] = e; cache.set(`ent:${props || "all"}:${id}`, { exp: Date.now() + ENT_TTL, val: Promise.resolve(e) });
    }
  }
  return out;
}
// Drop a lexeme from the cache (after an edit) so the next read is fresh.
function forget(id) { for (const k of [...cache.keys()]) if (k.startsWith("ent:") && k.endsWith(":" + id)) cache.delete(k); }
const getLexeme = async id => (await getEntities([id]))[id] || null;

const firstVal = obj => { if (!obj) return ""; const v = obj.bn || obj.en || Object.values(obj)[0]; return v ? v.value : ""; };
const lemmaOf = lx => lx ? Object.values(lx.lemmas || {}).map(l => l.value).join(" / ") : "";

// Resolve labels for every Q/P/L(-F/-S) id mentioned anywhere in `obj`.
async function labelsFor(obj, extra = []) {
  const ids = new Set(extra);
  for (const m of JSON.stringify(obj).matchAll(/"([QPL]\d+(?:-[SF]\d+)?)"/g)) ids.add(m[1]);
  const qp = [...ids].filter(i => /^[QP]\d+$/.test(i));
  const lx = [...new Set([...ids].filter(i => i.startsWith("L")).map(i => i.split("-")[0]))];
  const [a, b] = await Promise.all([getEntities(qp, "labels|descriptions|datatype"), getEntities(lx)]);
  const labels = {};
  for (const id of qp) {
    const e = a[id]; if (!e) continue;
    labels[id] = { label: firstVal(e.labels) || id, desc: firstVal(e.descriptions), datatype: e.datatype || undefined };
    if (id.startsWith("P") && CFG.plabelBn[id]) labels[id].label = CFG.plabelBn[id];
  }
  const langIds = new Set();
  for (const id of ids) {
    if (!id.startsWith("L")) continue;
    const [lid, sub] = id.split("-"); const e = b[lid]; if (!e) continue;
    langIds.add(e.language);
    const base = { lemma: lemmaOf(e), language: e.language, category: e.lexicalCategory };
    if (!sub) labels[id] = { ...base, label: base.lemma, gloss: firstVal(e.senses?.[0]?.glosses) };
    else if (sub.startsWith("S")) { const s = (e.senses || []).find(x => x.id === id); labels[id] = { ...base, label: base.lemma, gloss: s ? firstVal(s.glosses) : "" }; }
    else { const f = (e.forms || []).find(x => x.id === id); labels[id] = { ...base, label: f ? firstVal(f.representations) : base.lemma }; }
  }
  const missingLang = [...langIds].filter(q => !labels[q]);
  if (missingLang.length) {
    const c = await getEntities(missingLang, "labels|descriptions");
    for (const q of missingLang) if (c[q]) labels[q] = { label: firstVal(c[q].labels) || q };
  }
  return labels;
}

const __exp = { forget, api, sparql, cached, idOf, getEntities, getLexeme, labelsFor, firstVal, lemmaOf };
if (typeof module !== "undefined" && module.exports) module.exports = __exp; else (window.LX = window.LX || {}).wd = __exp;
})();
