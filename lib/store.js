"use strict";
// স্টুডিও লিব্রে server storage: every logged-in Wikimedia user keeps their recordings (WAV + details) and word
// list here, so a take made on a phone opens later on a PC, and the collection can later feed lexemes or other work.
// Layout: <DATA>/studio/<user>/clips/<id>.wav, <id>.json, words.json. DATA defaults to ./data (STORE_DIR overrides;
// on Render point it at a persistent disk, otherwise files vanish on every deploy).
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(process.env.STORE_DIR || path.join(__dirname, "..", "data"), "studio");
const MAX_AUDIO = 60 * 1024 * 1024; // one recording (≈ 10 min of 48 kHz mono WAV)

const safeUser = u => String(u || "").replace(/[^\p{L}\p{M}\p{N} ._-]/gu, "_").slice(0, 80);
const safeId = id => (/^[a-z0-9]{6,40}$/i.test(id || "") ? id : null);
const dir = (user, ...p) => path.join(ROOT, safeUser(user), ...p);
const ensure = d => fs.promises.mkdir(d, { recursive: true });
const readJSON = async (f, d) => { try { return JSON.parse(await fs.promises.readFile(f, "utf8")); } catch (e) { return d; } };
// Only these details are kept (no audio data, nothing the client invents beyond them).
const META = ["id", "word", "kind", "text", "lexeme", "dur", "status", "file", "linked", "error", "created", "speaker", "project", "extra", "info"];
const pick = o => Object.fromEntries(META.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

async function list(user) {
  const d = dir(user, "clips"); let names = [];
  try { names = await fs.promises.readdir(d); } catch (e) { return []; }
  const out = [];
  for (const n of names.filter(n => n.endsWith(".json"))) { const m = await readJSON(path.join(d, n), null); if (m) out.push(m); }
  return out.sort((a, b) => String(a.created).localeCompare(String(b.created)));
}
async function putMeta(user, id, meta) {
  if (!safeId(id)) throw new Error("bad id");
  await ensure(dir(user, "clips"));
  const f = dir(user, "clips", id + ".json"), old = await readJSON(f, {});
  const m = { ...old, ...pick(meta), id, updated: new Date().toISOString() };
  await fs.promises.writeFile(f, JSON.stringify(m));
  return m;
}
async function putAudio(user, id, buf) {
  if (!safeId(id)) throw new Error("bad id");
  if (buf.length > MAX_AUDIO) throw new Error("ফাইল অনেক বড়");
  if (buf.slice(0, 4).toString() !== "RIFF") throw new Error("শুধু WAV রাখা যায়");
  await ensure(dir(user, "clips"));
  await fs.promises.writeFile(dir(user, "clips", id + ".wav"), buf);
}
const audioPath = (user, id) => (safeId(id) ? dir(user, "clips", id + ".wav") : null);
async function remove(user, id) {
  if (!safeId(id)) return;
  for (const ext of [".json", ".wav"]) await fs.promises.rm(dir(user, "clips", id + ext), { force: true });
}
const getWords = user => readJSON(dir(user, "words.json"), []);
async function putWords(user, words) {
  await ensure(dir(user));
  const clean = (Array.isArray(words) ? words : []).slice(0, 5000).map(w => ({ word: String(w.word || "").slice(0, 200), gloss: String(w.gloss || "").slice(0, 500), lexeme: /^L\d+$/.test(w.lexeme || "") ? w.lexeme : "", done: !!w.done })).filter(w => w.word);
  await fs.promises.writeFile(dir(user, "words.json"), JSON.stringify(clean));
  return clean.length;
}
module.exports = { list, putMeta, putAudio, audioPath, remove, getWords, putWords, MAX_AUDIO };
