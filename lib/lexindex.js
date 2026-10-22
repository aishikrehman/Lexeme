"use strict";
(function () {
// Local word index per language: every lexeme's lemma, category and bn/en definitions, plus every
// inflected form. Built from three parallel SPARQL queries (~3 s), kept for 12 h and refreshed in the
// background. Node keeps it in memory + cache/*.json; the browser keeps it in IndexedDB.
// With the index, search / browse / lists / counts / prev-next run locally in milliseconds.
const isNode = typeof window === "undefined";
const W = isNode ? require("./wikidata") : LX.wd;
const VERSION = 1;
const MAX_AGE = 12 * 60 * 60e3;

const store = isNode ? (() => {
  const fs = require("fs"), path = require("path"); const dir = path.join(__dirname, "..", "cache");
  return {
    async get(k) { try { return JSON.parse(await fs.promises.readFile(path.join(dir, k + ".json"), "utf8")); } catch (e) { return null; } },
    async set(k, v) { try { await fs.promises.mkdir(dir, { recursive: true }); await fs.promises.writeFile(path.join(dir, k + ".json"), JSON.stringify(v)); } catch (e) {} },
  };
})() : {
  db: null,
  open() { return (this.db = this.db || new Promise((ok, no) => { const r = indexedDB.open("lexeme-index", 1); r.onupgradeneeded = () => r.result.createObjectStore("idx"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); })); },
  async get(k) { try { const db = await this.open(); return await new Promise(ok => { const q = db.transaction("idx").objectStore("idx").get(k); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch (e) { return null; } },
  async set(k, v) { try { const db = await this.open(); db.transaction("idx", "readwrite").objectStore("idx").put(v, k); } catch (e) {} },
};

async function fetchRaw(lang) {
  const [lem, defs, forms] = await Promise.all([
    W.sparql(`SELECT ?l ?lemma ?cat WHERE { ?l dct:language wd:${lang} ; wikibase:lemma ?lemma ; wikibase:lexicalCategory ?cat }`, 1),
    W.sparql(`SELECT ?l ?d (LANG(?d) AS ?dl) WHERE { ?l dct:language wd:${lang} ; ontolex:sense/skos:definition ?d . FILTER(LANG(?d) IN ("bn","en")) }`, 1),
    W.sparql(`SELECT ?f ?rep WHERE { ?l dct:language wd:${lang} ; ontolex:lexicalForm ?f . ?f ontolex:representation ?rep }`, 1),
  ]);
  const raw = { v: VERSION, t: Date.now(), lang,
    L: lem.map(r => [W.idOf(r.l), r.lemma, W.idOf(r.cat)]),
    D: defs.map(r => [W.idOf(r.l), r.dl, r.d]),
    F: forms.map(r => [W.idOf(r.f), r.rep]) };
  // Labels of every category (and the language) travel with the index, so lists need no extra request.
  raw.labels = await W.labelsFor([...new Set(raw.L.map(x => x[2]))].concat(lang)).catch(() => ({}));
  return raw;
}

function prepare(raw) {
  const byId = new Map();
  for (const [id, lemma, cat] of raw.L) {
    const r = byId.get(id);
    if (r) { if (!r.lemmas.includes(lemma)) r.lemmas.push(lemma); }
    else byId.set(id, { id, lemmas: [lemma], category: cat, bn: [], en: [], forms: [] });
  }
  for (const [id, dl, d] of raw.D) { const r = byId.get(id); if (r) (dl === "bn" ? r.bn : r.en).push(d); }
  const forms = new Map(); // representation → [form id]
  for (const [fid, rep] of raw.F) {
    (forms.get(rep) || forms.set(rep, []).get(rep)).push(fid);
    const r = byId.get(fid.split("-")[0]); if (r) r.forms.push(fid);
  }
  const list = [...byId.values()];
  for (const r of list) { r.lemma = r.lemmas.join(" / "); r.defs = r.bn.concat(r.en); r.gloss = r.bn[0] || r.en[0] || ""; }
  // Same order as SPARQL's ORDER BY STR(?lemma) (code-unit order), so browsing and prev/next agree.
  list.sort((a, b) => (a.lemmas[0] < b.lemmas[0] ? -1 : a.lemmas[0] > b.lemmas[0] ? 1 : a.id.localeCompare(b.id)));
  list.forEach((r, i) => (r.pos = i));
  const byLemma = new Map();
  for (const r of list) for (const l of r.lemmas) (byLemma.get(l) || byLemma.set(l, []).get(l)).push(r);
  return { lang: raw.lang, t: raw.t, list, byId, forms, byLemma, labels: raw.labels || {} };
}

const mem = {}; // lang → { ready, building }
async function load(lang, m) {
  if (!m.ready) {
    const raw = await store.get("idx-" + lang);
    if (raw && raw.v === VERSION) { m.ready = prepare(raw); if (Date.now() - raw.t < MAX_AGE) return; }
  }
  const raw = await fetchRaw(lang);
  m.ready = prepare(raw);
  store.set("idx-" + lang, raw);
}
// The index if it is ready (else null); starts loading / refreshing it in the background either way.
function get(lang) {
  if (!/^Q\d+$/.test(lang || "")) return null;
  const m = (mem[lang] = mem[lang] || { ready: null, building: null });
  if (!m.building && (!m.ready || Date.now() - m.ready.t > MAX_AGE)) m.building = load(lang, m).catch(e => { console.warn("index", lang, e.message); }).finally(() => { m.building = null; });
  return m.ready;
}
// The index only if already in memory — never starts a download.
const peek = lang => mem[lang]?.ready || null;
// Wait (up to `ms`) for the index; resolves to it or null.
async function ready(lang, ms = 0) {
  const ix = get(lang); if (ix || !ms) return ix;
  const m = mem[lang];
  await Promise.race([m.building, new Promise(r => setTimeout(r, ms))]);
  return m.ready;
}
// Keep the index current after an edit: replace one lexeme's row from its fresh entity.
function patch(e) {
  const ix = mem[e.language]?.ready; if (!ix) return;
  const old = ix.byId.get(e.id);
  const val = o => Object.values(o || {}).map(x => x.value);
  const lemmas = val(e.lemmas);
  const senses = e.senses || [];
  const r = old || { id: e.id, forms: [], pos: ix.list.length };
  Object.assign(r, { lemmas, lemma: lemmas.join(" / "), category: e.lexicalCategory,
    bn: senses.map(s => s.glosses?.bn?.value).filter(Boolean), en: senses.map(s => s.glosses?.en?.value).filter(Boolean) });
  r.defs = r.bn.concat(r.en); r.gloss = r.bn[0] || r.en[0] || "";
  for (const f of e.forms || []) for (const rep of val(f.representations)) { const a = ix.forms.get(rep) || ix.forms.set(rep, []).get(rep); if (!a.includes(f.id)) a.push(f.id); }
  r.forms = (e.forms || []).map(f => f.id);
  if (!old) { ix.byId.set(e.id, r); ix.list.push(r); }
  for (const l of lemmas) { const a = ix.byLemma.get(l) || ix.byLemma.set(l, []).get(l); if (!a.includes(r)) a.push(r); }
}

const __exp = { get, peek, ready, patch };
if (typeof module !== "undefined" && module.exports) module.exports = __exp; else (window.LX = window.LX || {}).index = __exp;
})();
