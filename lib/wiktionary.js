"use strict";
// bn.wiktionary → Wikidata: which Bengali entries on bn.wiktionary have no lexeme yet, and what an entry says.
// The list is collected slowly (pauses between requests, Wikimedia rate limits) once a day and kept in
// cache/wikt-bn.json. Entry text is reference only (CC BY-SA); it is never copied into a lexeme.
const fs = require("fs"), path = require("path");
const CFG = require("./config");
const IX = require("./lexindex");
const P = require("./wiktparse");

const API = "https://bn.wiktionary.org/w/api.php";
const FILE = path.join(__dirname, "..", "cache", "wikt-bn.json");
const DAY = 24 * 60 * 60e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(params) {
  const q = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params });
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}?${q}`, { headers: { "User-Agent": CFG.userAgent } });
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (i + 1)); continue; }
    const j = await r.json();
    if (j.error?.code === "maxlag") { await sleep(5000); continue; }
    if (j.error) throw new Error(j.error.info || j.error.code);
    return j;
  }
  throw new Error("bn.wiktionary is busy");
}

let state = { t: 0, titles: [], building: null, error: "" };
try { const s = JSON.parse(fs.readFileSync(FILE, "utf8")); state.t = s.t; state.titles = s.titles; } catch (e) {}

// Titles of hand-written Bengali entries (no {{লে}} yet). Cirrus search pages up to offset 10 000.
async function build() {
  const seen = new Set();
  for (const query of ['insource:"{{ভাষা|bn}}" -hastemplate:"লে"', 'insource:"==বাংলা==" -hastemplate:"লে"']) {
    for (let off = 0; off < 10000; off += 500) {
      const j = await get({ action: "query", list: "search", srsearch: query, srnamespace: "0", srlimit: "500", sroffset: String(off), srprop: "", srinfo: "" });
      (j.query?.search || []).forEach(r => { if (/[ঀ-৿]/.test(r.title) && !r.title.includes(":")) seen.add(r.title); });
      if (!j.continue) break;
      await sleep(1500);
    }
    await sleep(1500);
  }
  state = { ...state, t: Date.now(), titles: [...seen].sort((a, b) => a.localeCompare(b, "bn")), error: "" };
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify({ t: state.t, titles: state.titles })); } catch (e) {}
}
function ensure() {
  if (!state.building && Date.now() - state.t > DAY) state.building = build().catch(e => { state.error = e.message; }).finally(() => { state.building = null; });
}

// Bengali bn.wiktionary entries whose spelling is not a Bengali lexeme lemma yet.
async function missing({ q = "", offset = 0, limit = 100 }) {
  ensure();
  const ix = IX.peek("Q9610");
  let list = state.titles;
  if (ix) list = list.filter(t => !ix.byLemma.has(t));
  if (q) list = list.filter(t => t.includes(q));
  offset = Math.max(0, +offset || 0); limit = Math.min(+limit || 100, 500);
  return { ready: !!state.titles.length, building: !!state.building, checked: !!ix, total: list.length, all: state.titles.length,
    updated: state.t ? new Date(state.t).toISOString() : null, error: state.error || undefined, list: list.slice(offset, offset + limit) };
}

// One entry, parsed (reference only).
const entryCache = new Map();
async function entry(title) {
  title = String(title || "").trim(); if (!title) throw Object.assign(new Error("title?"), { status: 400 });
  const c = entryCache.get(title); if (c && c.t > Date.now() - 60 * 60e3) return c.v;
  const j = await get({ action: "query", titles: title, prop: "revisions", rvprop: "content", rvslots: "main", redirects: "1" });
  const pg = j.query.pages[0];
  const text = pg.missing ? "" : pg.revisions?.[0]?.slots?.main?.content || "";
  const v = { title: pg.title || title, exists: !pg.missing, url: `https://bn.wiktionary.org/wiki/${encodeURIComponent((pg.title || title).replace(/ /g, "_"))}`,
    lexemes: [...text.matchAll(/\{\{\s*লে\s*\|\s*(L\d+)/g)].map(m => m[1]), bn: P.parse(text, "bn"), license: "CC BY-SA 4.0 — শুধু দেখার জন্য" };
  if (entryCache.size > 2000) entryCache.delete(entryCache.keys().next().value);
  entryCache.set(title, { t: Date.now(), v });
  return v;
}

module.exports = { missing, entry, ensure };
