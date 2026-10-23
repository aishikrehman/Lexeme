"use strict";
// লিব্রে স্টুডিও server storage for logged-in Wikimedia users, in one SQLite file (Node's built-in node:sqlite, no
// packages): speakers and settings, the word list, and the upload history (details only). Audio never comes here —
// it stays in the browser that recorded it, and goes from there straight to Commons.
// The file is <DATA>/lexeme.db; DATA defaults to ./data (STORE_DIR overrides — keep it outside the code folder so
// updates never touch it).
const fs = require("fs"), path = require("path");
const { DatabaseSync } = require("node:sqlite");
const DATA = path.resolve(process.env.STORE_DIR || path.join(__dirname, "..", "data"));
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, "lexeme.db"));
db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS prefs (user TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS words (user TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS clips (user TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, created TEXT, updated TEXT NOT NULL, PRIMARY KEY (user, id));`);

const now = () => new Date().toISOString();
const safeUser = u => String(u || "").slice(0, 120);
const safeId = id => (/^[a-z0-9]{6,40}$/i.test(id || "") ? id : null);
const parse = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } };

// ---- speakers and settings: a small JSON object of known keys ----
const PREF_KEYS = ["speakers", "spcur", "pj", "mixplay", "wm", "auto", "autoq", "fx", "kindall", "editor"];
const MAX_PREFS = 200 * 1024;
function getPrefs(user) {
  const r = db.prepare("SELECT data, updated FROM prefs WHERE user = ?").get(safeUser(user));
  return r ? { data: parse(r.data, {}), updated: r.updated } : { data: null, updated: null };
}
function putPrefs(user, data) {
  const clean = Object.fromEntries(PREF_KEYS.filter(k => data && data[k] !== undefined).map(k => [k, data[k]]));
  const s = JSON.stringify(clean); if (s.length > MAX_PREFS) throw new Error("সেটিংস অনেক বড়");
  const t = now();
  db.prepare("INSERT INTO prefs (user, data, updated) VALUES (?, ?, ?) ON CONFLICT(user) DO UPDATE SET data = excluded.data, updated = excluded.updated").run(safeUser(user), s, t);
  return { updated: t };
}

// ---- word list ----
function getWords(user) {
  const r = db.prepare("SELECT data FROM words WHERE user = ?").get(safeUser(user));
  return r ? parse(r.data, []) : [];
}
function putWords(user, words) {
  const clean = (Array.isArray(words) ? words : []).slice(0, 5000).map(w => ({ word: String(w.word || "").slice(0, 200), gloss: String(w.gloss || "").slice(0, 500), lexeme: /^L\d+$/.test(w.lexeme || "") ? w.lexeme : "", done: !!w.done })).filter(w => w.word);
  db.prepare("INSERT INTO words (user, data, updated) VALUES (?, ?, ?) ON CONFLICT(user) DO UPDATE SET data = excluded.data, updated = excluded.updated").run(safeUser(user), JSON.stringify(clean), now());
  return clean.length;
}

// ---- upload history: details of each recording (no audio) ----
const META = ["id", "word", "kind", "text", "lexeme", "dur", "status", "file", "linked", "error", "created", "speaker", "project", "extra", "info"];
const pick = o => Object.fromEntries(META.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
function list(user) {
  return db.prepare("SELECT data FROM clips WHERE user = ? ORDER BY created").all(safeUser(user)).map(r => parse(r.data, null)).filter(Boolean);
}
function putMeta(user, id, meta) {
  if (!safeId(id)) throw new Error("bad id");
  const old = db.prepare("SELECT data FROM clips WHERE user = ? AND id = ?").get(safeUser(user), id);
  const m = { ...(old ? parse(old.data, {}) : {}), ...pick(meta || {}), id, updated: now() };
  db.prepare("INSERT INTO clips (user, id, data, created, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user, id) DO UPDATE SET data = excluded.data, updated = excluded.updated").run(safeUser(user), id, JSON.stringify(m), String(m.created || m.updated), m.updated);
  return m;
}
function remove(user, id) { if (safeId(id)) db.prepare("DELETE FROM clips WHERE user = ? AND id = ?").run(safeUser(user), id); }

module.exports = { getPrefs, putPrefs, getWords, putWords, list, putMeta, remove };
