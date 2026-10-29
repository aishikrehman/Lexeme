"use strict";
// লিব্রে স্টুডিও server storage for logged-in Wikimedia users, in one SQLite file (Node's built-in node:sqlite, no
// packages): speakers and settings, the word list, and the upload history (details only). Audio never comes here —
// it stays in the browser that recorded it, and goes from there straight to Commons.
// The file is lexeme.db in the data folder, outside the code (lib/datadir.js), so code updates never touch it.
const fs = require("fs"), path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { DATA, OLD } = require("./datadir");
const DB_FILE = path.join(DATA, "lexeme.db");
// first start with the data folder outside the code: bring over the database an older version kept inside it
if (!fs.existsSync(DB_FILE) && fs.existsSync(OLD.db) && path.resolve(OLD.db) !== path.resolve(DB_FILE)) {
  try { const old = new DatabaseSync(OLD.db); old.exec(`VACUUM INTO '${DB_FILE.replace(/'/g, "''")}'`); old.close(); console.log("database copied to", DB_FILE); }
  catch (e) { console.error("could not copy the old database:", e.message); }
}
const db = new DatabaseSync(DB_FILE);
db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS prefs (user TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS words (user TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS clips (user TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, created TEXT, updated TEXT NOT NULL, PRIMARY KEY (user, id));
  CREATE TABLE IF NOT EXISTS speakers (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, code TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS speaker_users (speaker TEXT NOT NULL, user TEXT NOT NULL, added TEXT NOT NULL, PRIMARY KEY (speaker, user));
  CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, user TEXT, action TEXT NOT NULL, detail TEXT);
  CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, user TEXT, page TEXT, kind TEXT, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', note TEXT);
  CREATE TABLE IF NOT EXISTS site (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);

const now = () => new Date().toISOString();
const safeUser = u => String(u || "").slice(0, 120);
const safeId = id => (/^[a-z0-9]{6,40}$/i.test(id || "") ? id : null);
const parse = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } };

// ---- speakers and settings: a small JSON object of known keys ----
const PREF_KEYS = ["speakers", "spcur", "pj", "mixplay", "wm", "auto", "autoq", "fx", "kindall", "editor", "noplayer", "menumini", "source"];
const MAX_PREFS = 200 * 1024;
function getPrefs(user) {
  const r = db.prepare("SELECT data, updated FROM prefs WHERE user = ?").get(safeUser(user));
  return r ? { data: parse(r.data, {}), updated: r.updated } : { data: null, updated: null };
}
function putPrefs(user, data) {
  // merged into what is there: the studio sends only its own keys, the settings page and the dictionary theirs
  const clean = { ...(getPrefs(user).data || {}), ...Object.fromEntries(PREF_KEYS.filter(k => data && data[k] !== undefined).map(k => [k, data[k]])) };
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

// ---- speakers, shared between accounts ----
// Every speaker has an id (made by the studio) and a 6-letter join code. Whoever made it owns it; another account
// that is given the id and the code can link it and record as that speaker too. The site admin can see and fix all.
const CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 6 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join("");
const SPK_FIELDS = ["id", "name", "lang", "other", "dialect", "district", "place", "gender", "age", "level", "learned", "license", "consent", "note"]; // as in the studio's speaker form
const cleanSpeaker = s => Object.fromEntries(SPK_FIELDS.filter(k => s && s[k] !== undefined).map(k => [k, typeof s[k] === "string" ? s[k].slice(0, 300) : s[k]]));
const canUse = (user, id) => !!db.prepare("SELECT 1 FROM speakers WHERE id = ? AND owner = ? UNION SELECT 1 FROM speaker_users WHERE speaker = ? AND user = ?").get(id, safeUser(user), id, safeUser(user));
function speakersOf(user) {
  const u = safeUser(user);
  return db.prepare("SELECT s.*, (s.owner = ?) AS mine FROM speakers s WHERE s.owner = ? OR s.id IN (SELECT speaker FROM speaker_users WHERE user = ?) ORDER BY s.created").all(u, u, u)
    .map(r => ({ ...parse(r.data, {}), id: r.id, owner: r.owner, mine: !!r.mine, code: r.mine ? r.code : undefined }));
}
// The studio's local list goes up: new ones are created (owned by this user), ones this user may use are updated.
function syncSpeakers(user, list) {
  const u = safeUser(user), t = now();
  for (const s of (Array.isArray(list) ? list : []).slice(0, 200)) {
    if (!s || !/^[\w-]{4,40}$/.test(s.id || "")) continue;
    const ex = db.prepare("SELECT owner FROM speakers WHERE id = ?").get(s.id), data = JSON.stringify(cleanSpeaker(s));
    if (!ex) { db.prepare("INSERT INTO speakers (id, owner, data, code, created, updated) VALUES (?, ?, ?, ?, ?, ?)").run(s.id, u, data, newCode(), t, t); log(u, "speaker.new", s.name || s.id); }
    else if (canUse(u, s.id)) db.prepare("UPDATE speakers SET data = ?, updated = ? WHERE id = ?").run(data, t, s.id);
  }
  return speakersOf(u);
}
function linkSpeaker(user, id, code) {
  const r = db.prepare("SELECT owner, code FROM speakers WHERE id = ?").get(String(id || "").trim());
  if (!r || r.code !== String(code || "").trim().toUpperCase()) throw new Error("আইডি বা কোড মেলেনি");
  if (r.owner !== safeUser(user)) db.prepare("INSERT OR IGNORE INTO speaker_users (speaker, user, added) VALUES (?, ?, ?)").run(id, safeUser(user), now());
  log(user, "speaker.link", id); return speakersOf(user);
}
function unlinkSpeaker(user, id) { db.prepare("DELETE FROM speaker_users WHERE speaker = ? AND user = ?").run(id, safeUser(user)); return speakersOf(user); }
function newSpeakerCode(user, id, admin) { const code = newCode(); db.prepare(`UPDATE speakers SET code = ? WHERE id = ?${admin ? "" : " AND owner = ?"}`).run(...(admin ? [code, id] : [code, id, safeUser(user)])); return code; }
const allSpeakers = () => db.prepare("SELECT * FROM speakers ORDER BY updated DESC").all().map(r => ({ ...parse(r.data, {}), id: r.id, owner: r.owner, code: r.code, created: r.created, updated: r.updated,
  users: db.prepare("SELECT user FROM speaker_users WHERE speaker = ?").all(r.id).map(x => x.user) }));
function adminSpeaker(id, data) { const r = db.prepare("SELECT data FROM speakers WHERE id = ?").get(id); if (!r) return; db.prepare("UPDATE speakers SET data = ?, updated = ? WHERE id = ?").run(JSON.stringify({ ...parse(r.data, {}), ...cleanSpeaker(data), id }), now(), id); }
function setSpeakerOwner(id, owner) { if (owner) db.prepare("UPDATE speakers SET owner = ? WHERE id = ?").run(safeUser(owner), id); }
function addSpeakerUser(id, user) { if (user) db.prepare("INSERT OR IGNORE INTO speaker_users (speaker, user, added) VALUES (?, ?, ?)").run(id, safeUser(user), now()); }
function deleteSpeaker(id) { db.prepare("DELETE FROM speaker_users WHERE speaker = ?").run(id); db.prepare("DELETE FROM speakers WHERE id = ?").run(id); }

// ---- activity log ----
function log(user, action, detail) { try { db.prepare("INSERT INTO activity (ts, user, action, detail) VALUES (?, ?, ?, ?)").run(now(), user ? safeUser(user) : null, String(action).slice(0, 60), detail == null ? null : String(detail).slice(0, 500)); } catch (e) {} }
const activity = ({ user, limit = 200 } = {}) => (user ? db.prepare("SELECT * FROM activity WHERE user = ? ORDER BY id DESC LIMIT ?").all(safeUser(user), limit) : db.prepare("SELECT * FROM activity ORDER BY id DESC LIMIT ?").all(limit));
// everyone who has used the site while logged in, newest first
const users = () => db.prepare(`SELECT user, MAX(ts) AS last, COUNT(*) AS n FROM activity WHERE user IS NOT NULL GROUP BY user
  UNION SELECT user, updated, 0 FROM prefs WHERE user NOT IN (SELECT user FROM activity WHERE user IS NOT NULL) ORDER BY last DESC`).all();

// ---- feedback ----
function addFeedback(user, page, kind, text) {
  text = String(text || "").trim(); if (text.length < 3) throw new Error("একটু বিস্তারিত লিখুন");
  db.prepare("INSERT INTO feedback (ts, user, page, kind, text) VALUES (?, ?, ?, ?, ?)").run(now(), user ? safeUser(user) : null, String(page || "").slice(0, 300), /^(bug|idea|data|other)$/.test(kind) ? kind : "other", text.slice(0, 5000));
  log(user, "feedback", kind);
}
const feedback = ({ user } = {}) => (user ? db.prepare("SELECT * FROM feedback WHERE user = ? ORDER BY id DESC").all(safeUser(user)) : db.prepare("SELECT * FROM feedback ORDER BY (status = 'done'), id DESC").all());
function setFeedback(id, status, note) { db.prepare("UPDATE feedback SET status = ?, note = ? WHERE id = ?").run(/^(new|seen|doing|done)$/.test(status) ? status : "seen", String(note || "").slice(0, 2000), +id); }

// ---- site settings (admin): tool names, notice banner, admins ----
const SITE_DEFAULTS = { siteName: "লেক্সিম.বাংলা", studioName: "লিব্রে স্টুডিও", wizardName: "লেক্সিম উইজার্ড", bulkName: "একসঙ্গে অনেক", lexinaryName: "লেক্সিনারি উইজার্ড", notice: "", footerNote: "", admins: "Aishik Rehman" }; // the site's maker is admin from the start; more can be added on /admin
function site() { const o = { ...SITE_DEFAULTS }; for (const r of db.prepare("SELECT key, value FROM site").all()) if (r.key in SITE_DEFAULTS) o[r.key] = r.value; return o; }
function setSite(values, by) { for (const k of Object.keys(SITE_DEFAULTS)) if (values[k] !== undefined) db.prepare("INSERT INTO site (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(k, String(values[k]).slice(0, 2000)); log(by, "site.settings", Object.keys(values).join(",")); }

const stats = () => ({ users: users().length, speakers: db.prepare("SELECT COUNT(*) n FROM speakers").get().n, clips: db.prepare("SELECT COUNT(*) n FROM clips").get().n,
  uploaded: db.prepare("SELECT COUNT(*) n FROM clips WHERE data LIKE '%\"status\":\"done\"%'").get().n, feedbackNew: db.prepare("SELECT COUNT(*) n FROM feedback WHERE status = 'new'").get().n,
  words: db.prepare("SELECT COALESCE(SUM(json_array_length(data)), 0) n FROM words").get().n, dbFile: DB_FILE });

// ---- daily backup: a consistent copy (VACUUM INTO) in <data>/backups, the last 14 kept ----
function backup() {
  try {
    const dir = path.join(DATA, "backups"), f = path.join(dir, `lexeme-${new Date().toISOString().slice(0, 10)}.db`);
    fs.mkdirSync(dir, { recursive: true }); if (fs.existsSync(f)) return;
    db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
    fs.readdirSync(dir).filter(n => /^lexeme-\d{4}-\d\d-\d\d\.db$/.test(n)).sort().slice(0, -14).forEach(n => fs.rmSync(path.join(dir, n)));
  } catch (e) { console.error("backup failed:", e.message); }
}
backup(); setInterval(backup, 6 * 3600e3).unref(); // checked every 6 h, one copy a day

module.exports = { getPrefs, putPrefs, getWords, putWords, list, putMeta, remove,
  speakersOf, syncSpeakers, linkSpeaker, unlinkSpeaker, newSpeakerCode, allSpeakers, adminSpeaker, setSpeakerOwner, addSpeakerUser, deleteSpeaker,
  log, activity, users, addFeedback, feedback, setFeedback, site, setSite, stats };
