"use strict";
// লিব্রে স্টুডিও — an audio studio on one screen. Record (free, or word by word from a list) or import a file,
// edit on a zoomable timeline (cut/copy/paste, crop, split/merge parts, fades, normalise, trim), clean it with an
// effects rack (noise reduction, high-pass, EQ, compressor, pitch, tempo, gain), mix in music, separate voice and
// music, name each part, then upload every part to Wikimedia Commons and link words to Wikidata lexemes (P443).
// Project and upload list live in IndexedDB, so nothing is lost on reload or offline. Uploads use the signed /proxy.

/* ================= data ================= */
const SD_LANGS = [
  ["ben", "Q9610", "বাংলা (প্রমিত)", "Bengali"], ["ctg", "Q33173", "চাটগাঁইয়া", "Chittagonian"], ["syl", "Q2044560", "সিলেটি", "Sylheti"],
  ["rkt", "", "রংপুরী", "Rangpuri"], ["", "", "নোয়াখাইল্যা", "Noakhailla"], ["", "", "বরিশাইল্যা", "Barishali"], ["", "", "ঢাকাইয়া কুট্টি", "Dhakaiya Kutti"],
  ["ccp", "Q32952", "চাকমা", "Chakma"], ["sat", "Q33965", "সাঁওতালি", "Santali"], ["rmz", "", "মারমা", "Marma"], ["grt", "", "গারো (আচিক)", "Garo"],
  ["trp", "", "ককবরক (ত্রিপুরা)", "Kokborok"], ["mni", "", "মৈতৈ মণিপুরী", "Meitei"], ["bpy", "", "বিষ্ণুপ্রিয়া মণিপুরী", "Bishnupriya Manipuri"],
  ["kha", "", "খাসি", "Khasi"], ["hje", "", "হাজং", "Hajong"], ["sck", "", "সাদরি", "Sadri"], ["kru", "", "কুড়ুখ (ওরাওঁ)", "Kurukh"],
  ["tnv", "", "তঞ্চঙ্গ্যা", "Tanchangya"], ["mro", "", "ম্রো", "Mru"], ["bgr", "", "বম", "Bawm"], ["rhg", "", "রোহিঙ্গা", "Rohingya"],
  ["", "", "অন্য ভাষা / উপভাষা", "other"],
];
const SD_DISTRICTS = "বাগেরহাট|Bagerhat,বান্দরবান|Bandarban,বরগুনা|Barguna,বরিশাল|Barisal,ভোলা|Bhola,বগুড়া|Bogra,ব্রাহ্মণবাড়িয়া|Brahmanbaria,চাঁদপুর|Chandpur,চাঁপাইনবাবগঞ্জ|Chapai Nawabganj,চট্টগ্রাম|Chittagong,চুয়াডাঙ্গা|Chuadanga,কুমিল্লা|Comilla,কক্সবাজার|Cox's Bazar,ঢাকা|Dhaka,দিনাজপুর|Dinajpur,ফরিদপুর|Faridpur,ফেনী|Feni,গাইবান্ধা|Gaibandha,গাজীপুর|Gazipur,গোপালগঞ্জ|Gopalganj,হবিগঞ্জ|Habiganj,জামালপুর|Jamalpur,যশোর|Jessore,ঝালকাঠি|Jhalokati,ঝিনাইদহ|Jhenaidah,জয়পুরহাট|Joypurhat,খাগড়াছড়ি|Khagrachhari,খুলনা|Khulna,কিশোরগঞ্জ|Kishoreganj,কুড়িগ্রাম|Kurigram,কুষ্টিয়া|Kushtia,লক্ষ্মীপুর|Lakshmipur,লালমনিরহাট|Lalmonirhat,মাদারীপুর|Madaripur,মাগুরা|Magura,মানিকগঞ্জ|Manikganj,মেহেরপুর|Meherpur,মৌলভীবাজার|Moulvibazar,মুন্সিগঞ্জ|Munshiganj,ময়মনসিংহ|Mymensingh,নওগাঁ|Naogaon,নড়াইল|Narail,নারায়ণগঞ্জ|Narayanganj,নরসিংদী|Narsingdi,নাটোর|Natore,নেত্রকোনা|Netrokona,নীলফামারী|Nilphamari,নোয়াখালী|Noakhali,পাবনা|Pabna,পঞ্চগড়|Panchagarh,পটুয়াখালী|Patuakhali,পিরোজপুর|Pirojpur,রাজবাড়ী|Rajbari,রাজশাহী|Rajshahi,রাঙ্গামাটি|Rangamati,রংপুর|Rangpur,সাতক্ষীরা|Satkhira,শরীয়তপুর|Shariatpur,শেরপুর|Sherpur,সিরাজগঞ্জ|Sirajganj,সুনামগঞ্জ|Sunamganj,সিলেট|Sylhet,টাঙ্গাইল|Tangail,ঠাকুরগাঁও|Thakurgaon"
  .split(",").map(x => x.split("|"));
const KINDS = { word: ["শব্দ", "pronunciation"], phrase: ["বাক্যাংশ / বাগধারা", "phrases"], proverb: ["প্রবাদ", "proverbs"], song: ["গান", "songs"], folk: ["লোকগীতি", "folk songs"], geet: ["গীত / ছড়া", "rhymes and chants"], story: ["কথা / গল্প", "speech"], other: ["অন্য", "recordings"] };
const LEVEL_BN = { native: "মাতৃভাষা", fluent: "সাবলীল", learner: "শিখছেন" };
const REG_COLORS = ["#4f8cff", "#2fbf71", "#f5a524", "#c56cf0", "#ff6b81", "#18c5c5", "#a3d13b", "#ff8a3d"];

const store = (k, v) => { try { v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const langOf = name => SD_LANGS.find(l => l[2] === name) || SD_LANGS[0];
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const msg = t => { $("#s-msg").textContent = t || ""; };
const tick0 = () => new Promise(r => setTimeout(r, 30)); // let the message paint before heavy work

/* IndexedDB: “clips” = upload list, “project” = the timeline */
const DB = (() => {
  let p = null;
  const open = () => p || (p = new Promise((ok, fail) => {
    const r = indexedDB.open("chapaswar", 2);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains("clips")) db.createObjectStore("clips", { keyPath: "id" }); if (!db.objectStoreNames.contains("project")) db.createObjectStore("project"); };
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  }));
  const tx = async (st, mode, fn) => { const db = await open(); return new Promise((ok, fail) => { const t = db.transaction(st, mode); const req = fn(t.objectStore(st)); t.oncomplete = () => ok(req?.result); t.onerror = () => fail(t.error); }); };
  return { all: () => tx("clips", "readonly", s => s.getAll()), put: c => tx("clips", "readwrite", s => s.put(c)), del: id => tx("clips", "readwrite", s => s.delete(id)),
    getProj: () => tx("project", "readonly", s => s.get("cur")), putProj: v => tx("project", "readwrite", s => s.put(v, "cur")) };
})();

/* ================= speaker ================= */
// Several speakers can be kept ready; the chosen one is used for new parts.
let SPK = load("lx_snd_speakers", null);
if (!SPK) { const one = load("lx_snd_speaker", null); SPK = one?.name ? [{ id: uid(), ...one }] : []; }
let SP = SPK.find(s => s.id === load("lx_snd_spcur", "")) || SPK[0] || { id: uid() };
const SP_FIELDS = { name: "#sp-name", lang: "#sp-lang", other: "#sp-other", dialect: "#sp-dialect", district: "#sp-district", place: "#sp-place", gender: "#sp-gender", age: "#sp-age", level: "#sp-level", learned: "#sp-learned", license: "#sp-license" };
$("#sp-lang").innerHTML = SD_LANGS.map(l => `<option>${esc(l[2])}</option>`).join("");
$("#sp-district").innerHTML = `<option value="">— বেছে নিন —</option>` + SD_DISTRICTS.map(d => `<option>${d[0]}</option>`).join("") + `<option>বাংলাদেশের বাইরে</option>`;
function fillSpeaker() {
  Object.entries(SP_FIELDS).forEach(([k, s]) => { const el = $(s); el.value = SP[k] ?? ""; if (el.tagName === "SELECT" && el.selectedIndex < 0) el.selectedIndex = 0; });
  $("#sp-consent").checked = !!SP.consent; $("#sp-other-l").hidden = langOf($("#sp-lang").value)[3] !== "other";
}
function saveSpeakers() { store("lx_snd_speakers", SPK); store("lx_snd_spcur", SP.id); drawPick(); }
function drawPick() {
  $("#sp-pick").innerHTML = SPK.map(s => `<option value="${s.id}"${s.id === SP.id ? " selected" : ""}>${esc(s.name)}${s.district ? " — " + esc(s.district) : ""}</option>`).join("")
    + (SPK.some(s => s.id === SP.id) ? "" : `<option value="" selected>— নতুন বক্তা —</option>`);
  const ch = $("#spk-chips"); if (ch) ch.innerHTML = SPK.map(s => `<button type="button" class="spk-chip${s.id === SP.id ? " on" : ""}" data-sid="${s.id}"><span>${esc(s.name)}</span>${s.district ? `<small>${esc(s.district)}</small>` : ""}</button>`).join("")
    + (SPK.some(s => s.id === SP.id) ? "" : `<button type="button" class="spk-chip on new"><span>নতুন বক্তা</span></button>`);
}
function readSpeaker() {
  SP = { id: SP.id, ...Object.fromEntries(Object.entries(SP_FIELDS).map(([k, s]) => [k, $(s).value.trim()])), consent: $("#sp-consent").checked };
  if (SP.name) { const i = SPK.findIndex(s => s.id === SP.id); if (i < 0) SPK.push(SP); else SPK[i] = SP; saveSpeakers(); }
  $("#sp-other-l").hidden = langOf(SP.lang)[3] !== "other"; drawSpeaker();
}
$("#spk-chips").addEventListener("click", e => { const b = e.target.closest("[data-sid]"); if (!b) return; $("#sp-pick").value = b.dataset.sid; $("#sp-pick").dispatchEvent(new Event("change")); });
$("#sp-pick").onchange = e => { const s = SPK.find(x => x.id === e.target.value); if (!s) return; SP = s; fillSpeaker(); saveSpeakers(); drawSpeaker(); };
$("#sp-new").onclick = () => { SP = { id: uid(), lang: SP.lang, district: SP.district, license: SP.license }; fillSpeaker(); drawPick(); drawSpeaker(); $("#sp-form").hidden = false; $("#sp-name").focus(); };
$("#sp-del").onclick = () => { if (!SPK.some(s => s.id === SP.id) || !confirm(`বক্তা “${SP.name}” মুছবেন?`)) return; SPK = SPK.filter(s => s.id !== SP.id); SP = SPK[0] || { id: uid() }; fillSpeaker(); saveSpeakers(); drawSpeaker(); };
fillSpeaker(); drawPick();
/* project name and extra Commons wikitext (templates, categories) for every upload */
let PJ = load("lx_snd_pj", { name: "", extra: "" });
$("#pj-name").value = PJ.name || ""; $("#pj-extra").value = PJ.extra || "";
$("#pn-proj").addEventListener("input", () => { PJ = { name: $("#pj-name").value.trim(), extra: $("#pj-extra").value.trim() }; store("lx_snd_pj", PJ); });
function speakerWhy() {
  if (!SP.name) return "ছদ্মনাম দিন";
  if (!/^[\p{L}\p{M}\p{N} _-]{2,40}$/u.test(SP.name)) return "ছদ্মনামে শুধু বর্ণ, সংখ্যা, ফাঁকা, - বা _";
  if (langOf(SP.lang)[3] === "other" && !SP.other) return "ভাষার নাম লিখুন";
  if (!SP.district) return "জেলা বেছে নিন";
  if (!SP.consent) return "সম্মতির ঘরে টিক দিন";
  return "";
}
function drawSpeaker() {
  const w = speakerWhy(), L = langOf(SP.lang);
  const sw = $("#ct-sw"); if (sw) sw.hidden = !w;
  const st = $("#sp-status"); if (st) { st.textContent = w ? "⚠ " + w : "✓ প্রস্তুত"; st.className = "spk-status " + (w ? "warn" : "ok"); }
  $("#sp-summary").innerHTML = SP.name ? `<b>${esc(SP.name)}</b><span>${esc(L[3] === "other" ? SP.other || "" : L[2])}${SP.dialect ? " · " + esc(SP.dialect) : ""}</span><span>${esc([SP.place, SP.district].filter(Boolean).join(", "))}</span>${w ? `<em>⚠ ${w}</em>` : `<em class="ok">✓ আপলোডের জন্য প্রস্তুত</em>`}`
    : `<em>⚠ আপলোডের আগে বক্তার তথ্য দিন</em>`;
}
$("#pn-speaker").addEventListener("input", readSpeaker); $("#pn-speaker").addEventListener("change", readSpeaker);
$("#sp-toggle").addEventListener("click", () => { $("#sp-form").hidden = !$("#sp-form").hidden; });
$("#sp-done").addEventListener("click", () => { readSpeaker(); const w = speakerWhy(); $("#sp-status").textContent = w ? "⚠ " + w : "✓ সংরক্ষিত"; $("#sp-status").className = "spk-status " + (w ? "warn" : "ok"); });
drawSpeaker(); // the form is always open in the setup tab

/* ================= word list ================= */
let WORDS = load("lx_snd_words", []); let wordPos = load("lx_snd_pos", 0);
const saveWords = () => { store("lx_snd_words", WORDS); store("lx_snd_pos", wordPos); drawWords(); pushWords(); };
function drawWords() {
  const done = WORDS.filter(w => w.done).length;
  $("#w-count").textContent = WORDS.length ? `${toBn(done)}/${toBn(WORDS.length)}` : "০";
  const ctwc = $("#ct-wc"); if (ctwc) ctwc.textContent = WORDS.length ? toBn(WORDS.length) : "";
  $("#w-bar").style.width = WORDS.length ? `${(done / WORDS.length) * 100}%` : "0";
  wordPos = Math.max(0, Math.min(wordPos, WORDS.length - 1));
  // one row per word: number, word (+ meaning), lexeme; recorded ✓, current highlighted
  $("#w-list").innerHTML = WORDS.map((w, i) => `<li class="${i === wordPos ? "cur" : ""}${w.done ? " done" : ""}" data-i="${i}"><span class="wn">${w.done ? "✓" : toBn(i + 1)}</span><span class="wt"><span class="t">${esc(w.word)}</span>${w.gloss ? `<small>${esc(w.gloss)}</small>` : ""}</span>${w.lexeme ? `<a href="https://www.wikidata.org/wiki/Lexeme:${esc(w.lexeme)}" target="_blank" rel="noopener">${esc(w.lexeme)}</a>` : ""}<button type="button" class="x" aria-label="সরান">✕</button></li>`).join("")
    || `<li class="empty">ওপরে শব্দ লিখে Enter চাপুন, বা ≡ চেপে অনেকগুলো একসঙ্গে দিন। প্রতিটি শব্দ আলাদা রেকর্ড হবে।</li>`;
  $("#w-list li.cur")?.scrollIntoView({ block: "nearest" });
  drawBatch();
}
/* batch recording through the word list: one big prompt above the timeline */
function drawBatch() {
  const on = $("#t-wordmode").checked; $("#batch").hidden = !on; document.body.classList.toggle("word-mode", on);
  if (!on) return;
  const w = WORDS[wordPos], done = WORDS.filter(x => x.done).length;
  $("#bt-pos").textContent = WORDS.length ? `${toBn(wordPos + 1)} / ${toBn(WORDS.length)}` : "তালিকা খালি";
  $("#bt-bar").style.width = WORDS.length ? `${(done / WORDS.length) * 100}%` : "0";
  $("#bt-done").textContent = `${toBn(done)}টি রেকর্ড হয়েছে`;
  $("#bt-word").textContent = w ? w.word : "আগে শব্দ-তালিকায় শব্দ যোগ করুন"; $("#bt-word").classList.toggle("empty", !w);
  $("#bt-gloss").textContent = w?.gloss || (w?.lexeme ? w.lexeme : "");
  $("#bt-word").classList.toggle("done", !!w?.done);
  $("#bt-upcoming").innerHTML = WORDS.slice(wordPos + 1, wordPos + 6).map(x => `<span${x.done ? " class=done" : ""}>${esc(x.word)}</span>`).join("");
  $("#bt-go").textContent = recording || chainT ? "■ থামান" : $("#t-auto").checked ? "● একটানা রেকর্ড শুরু" : "● এই শব্দ রেকর্ড"; $("#bt-go").classList.toggle("on", recording);
  $("#bt-hint").textContent = $("#t-auto").checked ? "শব্দটি বলে থামুন — রেকর্ড শেষে নিজে থেকে পরের শব্দ শুরু হবে। থামাতে R বা ■।" : "শব্দটি বলে থামুন — রেকর্ড শেষ হবে। ▶ শুনুন বা ↺ আবার নিন, তারপর ▶ পরের শব্দে যান।";
  $("#bt-go").disabled = !w;
}
$("#w-list").addEventListener("click", e => {
  const li = e.target.closest("li[data-i]"); if (!li) return;
  if (e.target.closest(".x")) { WORDS.splice(+li.dataset.i, 1); saveWords(); return; }
  if (!e.target.closest("a")) { wordPos = +li.dataset.i; saveWords(); }
});
async function findLexeme(word) {
  if (!word || langOf(SP.lang)[1] !== "Q9610") return "";
  try { const j = await getJSON(`/api/search?${qs({ exact: word, field: "lemma", limit: 1 })}`); return j.list?.[0]?.lemma === word ? j.list[0].id : ""; } catch (e) { return ""; }
}
async function addWords(items) {
  const have = new Set(WORDS.map(w => w.word)), list = [];
  for (const it of items) { const word = String(it.word || "").trim(); if (!word || have.has(word)) continue; have.add(word); list.push({ word, gloss: String(it.gloss || "").trim() }); }
  // show the words at once (list and wizard); look up their lexemes afterwards, a few at a time
  WORDS.push(...list); saveWords();
  $("#w-msg").textContent = items.length > 1 ? `${toBn(list.length)}টি শব্দ যোগ হলো` + (items.length > list.length ? ` (${toBn(items.length - list.length)}টি আগেই ছিল বা খালি)।` : "।") : "";
  (async () => {
    for (let i = 0; i < list.length; i += 6) {
      await Promise.all(list.slice(i, i + 6).map(async w => { try { w.lexeme = await findLexeme(w.word); } catch {} }));
      saveWords();
    }
  })();
  return list.length;
}
const addWordLines = text => addWords(text.split(/\r?\n+/).map(l => l.split("|")).map(([word, gloss]) => ({ word, gloss })));
// one box: Enter adds (Shift+Enter for a new line); a pasted list adds every line
const wText = $("#w-text"), wGrow = () => { wText.style.height = "auto"; wText.style.height = wText.scrollHeight + 2 + "px"; };
wText.addEventListener("input", wGrow);
wText.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#w-addf").requestSubmit(); } });
$("#w-addf").addEventListener("submit", async e => {
  e.preventDefault(); const v = wText.value.trim(); if (!v) return;
  const n = await addWordLines(v); wText.value = ""; wGrow(); if (!n) msg("এই শব্দ তালিকায় আগেই আছে");
});

// ---- from a file: CSV / TSV / JSON / TXT ----
const W_KEYS = { word: ["word", "lemma", "শব্দ", "term", "title", "headword"], gloss: ["gloss", "meaning", "অর্থ", "definition", "sense"] };
function splitRow(line, d) { // a CSV row with "quoted, fields"
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && !cur) q = true; else if (c === d) { out.push(cur); cur = ""; } else cur += c; }
  out.push(cur); return out.map(s => s.trim());
}
function parseWordFile(name, text) {
  text = text.replace(/^﻿/, "");
  const ext = (name.split(".").pop() || "").toLowerCase();
  const pick = (o, k) => { for (const key of Object.keys(o)) if (W_KEYS[k].includes(key.toLowerCase())) return o[key]; };
  if (ext === "json" || /^\s*[\[{]/.test(text)) {
    let j = JSON.parse(text); if (!Array.isArray(j)) j = j.words || j.items || Object.values(j).find(Array.isArray) || [];
    return j.map(x => typeof x === "string" ? { word: x } : Array.isArray(x) ? { word: x[0], gloss: x[1] } : { word: pick(x, "word") ?? Object.values(x)[0], gloss: pick(x, "gloss") });
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const d = ext === "tsv" || (ext !== "csv" && lines[0]?.includes("\t")) ? "\t" : ext === "csv" ? "," : null;
  if (!d) return lines.map(l => l.split("|")).map(([word, gloss]) => ({ word, gloss }));
  const rows = lines.map(l => splitRow(l, d)), head = rows[0].map(h => h.toLowerCase());
  let wi = head.findIndex(h => W_KEYS.word.includes(h)), gi = head.findIndex(h => W_KEYS.gloss.includes(h));
  if (wi >= 0) rows.shift(); else { wi = 0; gi = 1; }
  return rows.map(r => ({ word: r[wi], gloss: gi >= 0 ? r[gi] : "" }));
}
$("#w-file-b").onclick = () => $("#w-file").click();
$("#w-file").addEventListener("change", async e => {
  let total = 0;
  for (const f of e.target.files) {
    try { total += await addWords(parseWordFile(f.name, await f.text())); }
    catch (err) { $("#w-msg").textContent = `${f.name} পড়া যায়নি: ${err.message}`; }
  }
  e.target.value = ""; if (total) $("#w-msg").textContent = `${toBn(total)}টি শব্দ যোগ হলো।`;
});

// ---- from a wiki page or category (any Wikimedia wiki; default bn.wiktionary) ----
function wikiTarget(s) {
  s = s.trim(); let host = "bn.wiktionary.org", title = s;
  try { const u = new URL(s); if (/\.(wikipedia|wiktionary|wikimedia|wikisource|wikidata|wikibooks|wikiquote|wikivoyage)\.org$|^lingualibre\.org$/.test(u.hostname)) {
    host = u.hostname; title = u.searchParams.get("title") || decodeURIComponent(u.pathname.replace(/^\/wiki\//, "")); } } catch {}
  return { host, title: title.replace(/_/g, " ") };
}
function wordsFromWikitext(wt) {
  const link = s => { const m = s.match(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/); return m && !/:/.test(m[1]) ? m[1].trim() : null; };
  const strip = s => s.replace(/\{\{[^}]*\}\}|<[^>]+>|'''?|\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").trim();
  const items = wt.split("\n").filter(l => /^[#*]/.test(l)).map(l => l.replace(/^[#*:;]+\s*/, ""))
    .map(l => { const w = link(l) || strip(l.split(/\s[-–—:]\s|\s*[,،(]/)[0]); const g = l.match(/\s[-–—:]\s(.+)$/); return { word: w, gloss: g ? strip(g[1]) : "" }; });
  if (items.length >= 5) return items;
  // no real list (e.g. a table): every plain link and {{l|xx|word}}; if most are Bengali, keep only those
  let all = [...wt.matchAll(/\[\[([^\]|#:]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]|\{\{(?:l|m|link|mention)\|[\w-]+\|([^}|]+)/g)].map(m => (m[1] || m[2]).trim());
  const bn = all.filter(w => /[ঀ-৿]/.test(w));
  if (bn.length > all.length / 3) all = bn;
  return items.concat(all.map(word => ({ word })));
}
$("#w-page-b").onclick = () => { const f = $("#w-page"); f.hidden = !f.hidden; if (!f.hidden) $("#w-page-in").focus(); };
$("#w-page").addEventListener("submit", async e => {
  e.preventDefault(); const v = $("#w-page-in").value; if (!v.trim()) return;
  const { host, title } = wikiTarget(v), api = `https://${host}/w/api.php?format=json&formatversion=2&origin=*&`;
  $("#w-msg").textContent = "আনা হচ্ছে…";
  try {
    let items;
    if (/^(category|বিষ.{1,3}শ্রেণ[ীি]):/i.test(title)) {
      items = []; let cont = "";
      do { const j = await (await fetch(api + "action=query&list=categorymembers&cmnamespace=0&cmlimit=500&cmtitle=" + encodeURIComponent(title) + cont)).json();
        items.push(...(j.query?.categorymembers || []).map(m => ({ word: m.title })));
        cont = j.continue?.cmcontinue ? "&cmcontinue=" + encodeURIComponent(j.continue.cmcontinue) : "";
      } while (cont && items.length < 5000);
    } else {
      const j = await (await fetch(api + "action=parse&prop=wikitext&redirects=1&page=" + encodeURIComponent(title))).json();
      if (j.error) throw new Error(j.error.info);
      items = wordsFromWikitext(j.parse.wikitext);
    }
    if (!items.length) { $("#w-msg").textContent = "ওই পাতায় কোনো তালিকা পাওয়া গেল না।"; return; }
    await addWords(items); $("#w-page").hidden = true; $("#w-page-in").value = "";
  } catch (err) { $("#w-msg").textContent = "আনা যায়নি: " + err.message; }
});
$("#w-clear").addEventListener("click", () => { if (WORDS.length && confirm("তালিকার সব শব্দ সরাবেন?")) { WORDS = []; wordPos = 0; saveWords(); } });
$("#w-wd").addEventListener("click", async () => {
  const qid = langOf(SP.lang)[1];
  if (!qid) { $("#w-msg").textContent = "এই ভাষার লেক্সিম এখনো উইকি উপাত্তে খোঁজা যায় না।"; return; }
  $("#w-msg").textContent = "আনা হচ্ছে…";
  const sparql = `SELECT ?l ?lemma WHERE { ?l dct:language wd:${qid}; wikibase:lemma ?lemma. FILTER NOT EXISTS { ?l wdt:P443 [] } FILTER NOT EXISTS { ?l ontolex:lexicalForm/wdt:P443 [] } } LIMIT 100`;
  try {
    const url = (window.LX_PROXY ? "/proxy/sparql" : "https://query.wikidata.org/sparql") + "?format=json&query=" + encodeURIComponent(sparql);
    const j = await (await fetch(url, { headers: { Accept: "application/sparql-results+json" } })).json();
    const have = new Set(WORDS.map(w => w.word));
    const list = j.results.bindings.map(b => ({ word: b.lemma.value, lexeme: b.l.value.split("/").pop() })).filter(w => !have.has(w.word));
    WORDS.push(...list); saveWords(); $("#w-msg").textContent = `${toBn(list.length)}টি শব্দ যোগ হলো।`;
  } catch (e) { $("#w-msg").textContent = "আনা যায়নি: " + e.message; }
});

/* ================= project (timeline) ================= */
const P = { pcm: new Float32Array(0), rate: 48000, regions: [], sel: null, cursor: 0 };
// Tracks: P.pcm / P.regions always belong to the active track (all editing works on it); playback mixes the
// audible tracks (mute / solo / volume).
const TR = { list: [{ id: "t1", name: "ট্র্যাক ১", pcm: P.pcm, regions: P.regions, gain: 1, mute: false, solo: false }], cur: 0 };
const curTrack = () => TR.list[TR.cur];
function storeCur() { const t = curTrack(); t.pcm = P.pcm; t.regions = P.regions; }
function loadTrack(i) { storeCur(); TR.cur = Math.max(0, Math.min(TR.list.length - 1, i)); const t = curTrack(); P.pcm = t.pcm; P.regions = t.regions; P.sel = null; P.cursor = Math.min(P.cursor, t.pcm.length); }
const maxLen = () => { storeCur(); return Math.max(0, ...TR.list.map(t => t.pcm.length)); };
const audible = () => { storeCur(); const solo = TR.list.some(t => t.solo); return TR.list.filter(t => (solo ? t.solo : !t.mute) && t.pcm.length); };
function mixRange(a, b, tracks = audible()) { const out = new Float32Array(Math.max(0, b - a)); tracks.forEach(t => { const g = t.gain; for (let i = 0, n = Math.min(b, t.pcm.length) - a; i < n; i++) out[i] += t.pcm[a + i] * g; }); return out; }
function addTrack(pcm = new Float32Array(0), name, meta) {
  storeCur(); const id = "t" + uid();
  TR.list.push({ id, name: name || `ট্র্যাক ${toBn(TR.list.length + 1)}`, pcm, regions: pcm.length ? [newRegion(0, pcm.length, meta)] : [], gain: 1, mute: false, solo: false });
  loadTrack(TR.list.length - 1); normalize(); drawTracks(); drawAll(); drawRegions(); saveProject();
}
const H = { undo: [], redo: [] };
let clip = null; // clipboard
const N = () => P.pcm.length;
const snap = () => ({ tid: curTrack().id, pcm: P.pcm, regions: P.regions.map(r => ({ ...r })) });
// Undo/redo land on the track they were made on.
function restore(u) { const i = TR.list.findIndex(t => t.id === u.tid); if (i >= 0 && i !== TR.cur) { loadTrack(i); drawTracks(); } P.pcm = u.pcm; P.regions = u.regions; P.sel = null; normalize(); }
function commit(fn, label) {
  stop(); H.undo.push(snap()); if (H.undo.length > 30) H.undo.shift(); H.redo = [];
  fn(); normalize(); afterEdit(label);
}
function afterEdit(label) { if (label) msg(label); drawAll(); drawRegions(); saveProject(); if (typeof drawMenu === "function" && !psOpen.length) drawMenu(); }
// Regions always cover the whole timeline, in order, without gaps.
function normalize() {
  const n = N();
  const rs = P.regions.map(r => ({ ...r, a: Math.max(0, Math.min(n, Math.round(r.a))), b: Math.max(0, Math.min(n, Math.round(r.b))) })).filter(r => r.b - r.a > 0).sort((x, y) => x.a - y.a);
  const out = []; let at = 0;
  for (const r of rs) { if (r.a > at) out.push(newRegion(at, r.a)); r.a = Math.max(r.a, at); if (r.b > r.a) { out.push(r); at = r.b; } }
  if (at < n) out.push(newRegion(at, n));
  P.regions = out;
  if (P.sel) { P.sel = [Math.min(P.sel[0], n), Math.min(P.sel[1], n)]; if (P.sel[1] - P.sel[0] < 1) P.sel = null; }
  P.cursor = Math.min(P.cursor, n);
}
const newRegion = (a, b, o = {}) => ({ id: uid(), a, b, name: "", kind: $("#r-kindall")?.value || "word", text: "", skip: false, lexeme: "", ...o });
// Replace [a,b) with arr; region edges move with the audio (inside the range they are scaled).
function replaceRange(a, b, arr) {
  const len = arr.length, d = len - (b - a), ratio = b > a ? len / (b - a) : 1;
  const o = new Float32Array(N() + d); o.set(P.pcm.subarray(0, a)); o.set(arr, a); o.set(P.pcm.subarray(b), a + len);
  const map = x => (x <= a ? x : x >= b ? x + d : a + (x - a) * ratio);
  P.regions.forEach(r => { r.a = map(r.a); r.b = map(r.b); });
  P.pcm = o;
}
// Put new audio at the end of the timeline as its own part.
function appendPart(pcm, meta) { const at = N(); replaceRange(at, at, pcm); P.regions = P.regions.filter(r => r.b <= at); P.regions.push(newRegion(at, at + pcm.length, meta)); }
function splitAt(x) {
  const r = P.regions.find(r => x > r.a && x < r.b); if (!r) return;
  const r2 = newRegion(x, r.b, { kind: r.kind }); r.b = x; P.regions.push(r2);
}
let saveT;
function saveProject() { clearTimeout(saveT); saveT = setTimeout(() => { storeCur(); DB.putProj({ rate: P.rate, cur: TR.cur, tracks: TR.list.map(t => ({ ...t })) }).catch(() => {}); drawTracks(); }, 800); }

/* ================= audio helpers ================= */
async function decodeRaw(blob) {
  const c = new (window.AudioContext || window.webkitAudioContext)();
  try { return await c.decodeAudioData(await blob.arrayBuffer()); } finally { c.close(); }
}
async function decode(blob) {
  const buf = await decodeRaw(blob), n = buf.length, ch = buf.numberOfChannels, mono = new Float32Array(n);
  for (let k = 0; k < ch; k++) { const d = buf.getChannelData(k); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
  return { pcm: mono, rate: buf.sampleRate };
}
async function resample(pcm, from, to) {
  if (from === to || !pcm.length) return pcm;
  const oc = new OfflineAudioContext(1, Math.max(1, Math.round(pcm.length * to / from)), to);
  const b = oc.createBuffer(1, pcm.length, from); b.copyToChannel(pcm, 0);
  const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
  return (await oc.startRendering()).getChannelData(0).slice();
}
function encodeWav(pcm, rate) {
  const len = pcm.length, out = new DataView(new ArrayBuffer(44 + len * 2));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); out.setUint32(4, 36 + len * 2, true); w(8, "WAVEfmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) { const v = Math.max(-1, Math.min(1, pcm[i])); out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
  return new Blob([out], { type: "audio/wav" });
}
const peakOf = (pcm, a = 0, b = pcm.length) => { let p = 0; for (let i = a; i < b; i++) { const v = Math.abs(pcm[i]); if (v > p) p = v; } return p; };
// Quietest moment within ±win seconds of sample x (10 ms frames) — where a cut does not clip a word.
function quietNear(pcm, rate, x, win = 0.5) {
  const w = Math.max(1, Math.round(rate * 0.01)), r = Math.round(rate * win); let best = Math.round(x), low = Infinity;
  for (let c = Math.max(0, Math.round(x) - r); c <= Math.min(pcm.length - w, Math.round(x) + r); c += w) { let s = 0; for (let i = c; i < c + w; i++) s += pcm[i] * pcm[i]; if (s < low) { low = s; best = c + (w >> 1); } }
  return best;
}
// Marks tapped while recording (seconds) → [start, end) pieces, each cut at the nearest quiet moment.
function splitByMarks(pcm, rate, marks) {
  const cuts = [...new Set(marks.map(t => quietNear(pcm, rate, t * rate)))].filter(x => x > rate * 0.1 && x < pcm.length - rate * 0.1).sort((a, b) => a - b);
  const edges = [0, ...cuts, pcm.length]; return edges.slice(1).map((b, i) => [edges[i], b]).filter(([a, b]) => b - a > rate * 0.15);
}
const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`; };
const fmtS = s => toBn(s < 60 ? s.toFixed(1) + " সে." : fmt(s).slice(0, 5));
const pickFile = () => new Promise(ok => { const i = document.createElement("input"); i.type = "file"; i.accept = "audio/*"; i.onchange = () => ok(i.files[0] || null); i.click(); });

/* ================= view & drawing ================= */
const V = { start: 0, spp: 100, spec: false };
const cW = $("#c-wave"), cR = $("#c-ruler"), cO = $("#c-over");
const dpr = () => window.devicePixelRatio || 1;
function fit(c) { const r = c.getBoundingClientRect(), d = dpr(); const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return [c.width, c.height]; }
const viewW = () => cW.width || 1;
const xOf = i => (i - V.start) / V.spp, iOf = x => Math.round(V.start + x * V.spp);
function clampView() { const maxS = Math.max(0, N() - viewW() * V.spp); V.start = Math.max(0, Math.min(V.start, maxS)); }
function zoomFit() { fit(cW); V.spp = Math.max(0.5, N() / viewW()); V.start = 0; drawAll(); }
function zoom(f, at) { const w = viewW(); at ??= xOf(P.cursor) >= 0 && xOf(P.cursor) <= w ? xOf(P.cursor) : w / 2; const i = iOf(at); V.spp = Math.max(0.5, Math.min(Math.max(1, N() / w), V.spp * f)); V.start = i - at * V.spp; clampView(); drawAll(); }
let specCache = null, COL = {};
const readCols = () => { const cs = getComputedStyle($("#studio")); ["tx", "mu", "ln2", "sub", "ac", "warn", "rec", "ok", "wave", "wave2"].forEach(k => { COL[k] = cs.getPropertyValue("--" + k).trim(); }); };
new MutationObserver(() => { readCols(); drawAll(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { readCols(); drawAll(); });
function drawAll(play) {
  if (!COL.tx) readCols();
  const shown = !document.body.classList.contains("has-audio") && N() > 0;
  document.body.classList.toggle("has-audio", N() > 0); // may unhide the stage, so before measuring
  const [W, Hh] = fit(cW);
  if (shown && viewW() > 0) { V.spp = Math.max(0.5, N() / viewW()); V.start = 0; } // the stage just appeared: show all of it
  clampView();
  const g = cW.getContext("2d"); g.clearRect(0, 0, W, Hh);
  $("#drop").hidden = N() > 0;
  $("#t-total").textContent = "/ " + fmt(maxLen() / P.rate);
  if (!N()) { drawRuler(); drawOver(); status(); return; }
  const d = dpr();
  P.regions.forEach((r, k) => { const x0 = Math.max(0, xOf(r.a)), x1 = Math.min(W, xOf(r.b)); if (x1 < 0 || x0 > W) return;
    const col = REG_COLORS[k % REG_COLORS.length]; g.fillStyle = col + (r.skip ? "0d" : "1f"); g.fillRect(x0, 0, x1 - x0, Hh);
    g.fillStyle = r.skip ? COL.ln2 : col; g.fillRect(x0, 0, x1 - x0, 4 * d);
    g.font = `${11 * d}px "Tiro Bangla", sans-serif`; g.fillStyle = r.skip ? COL.mu : COL.tx;
    if (x1 - x0 > 30 * d) g.fillText(`${toBn(k + 1)}${r.name ? " · " + r.name : ""}${r.skip ? " (বাদ)" : ""}`.slice(0, Math.floor((x1 - x0) / (6 * d))), x0 + 6 * d, 18 * d);
    if (k) { g.fillStyle = COL.ln2; g.fillRect(x0, 0, d, Hh); } });
  if (V.spec) drawSpec(g, W, Hh);
  else {
    const mid = Hh / 2 + 8 * d, amp = (Hh - 30 * d) / 2;
    const grad = g.createLinearGradient(0, mid - amp, 0, mid + amp); grad.addColorStop(0, COL.wave2); grad.addColorStop(0.5, COL.wave); grad.addColorStop(1, COL.wave2);
    g.fillStyle = grad;
    for (let x = 0; x < W; x++) {
      const a = Math.floor(iOf(x)), b = Math.min(N(), Math.floor(iOf(x + 1)) + 1); if (a >= N()) break; if (b <= 0) continue;
      let mn = 1, mx = -1; const st = Math.max(1, (b - a) >> 7);
      for (let i = Math.max(0, a); i < b; i += st) { const v = P.pcm[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      g.fillRect(x, mid - mx * amp, 1, Math.max(d, (mx - mn) * amp));
    }
    g.fillStyle = COL.sub; g.fillRect(0, mid, W, d);
  }
  if (P.sel) { const x0 = xOf(P.sel[0]), x1 = xOf(P.sel[1]); g.globalAlpha = 0.16; g.fillStyle = COL.ac; g.fillRect(x0, 0, x1 - x0, Hh); g.globalAlpha = 1; g.fillStyle = COL.ac; g.fillRect(x0, 0, d, Hh); g.fillRect(x1, 0, d, Hh); }
  g.fillStyle = COL.warn; g.fillRect(xOf(P.cursor), 0, 1.5 * d, Hh);
  if (markIn != null) { g.fillStyle = COL.ok || "#14866d"; g.fillRect(xOf(markIn), 0, 2 * d, Hh); g.globalAlpha = 0.12; g.fillRect(xOf(markIn), 0, Math.max(0, xOf(play ?? P.cursor) - xOf(markIn)), Hh); g.globalAlpha = 1; }
  if (play != null) { g.fillStyle = COL.rec; g.fillRect(xOf(play), 0, 2 * d, Hh); }
  drawRuler(); drawOver(play); status();
}
function drawRuler() {
  const [W, Hh] = fit(cR), g = cR.getContext("2d"), d = dpr(); g.clearRect(0, 0, W, Hh);
  if (!N()) return;
  const secPerPx = V.spp / P.rate, steps = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const step = steps.find(s => s / secPerPx > 80 * d) || 600;
  g.fillStyle = COL.mu; g.font = `${10 * d}px "JetBrains Mono", monospace`;
  for (let t = Math.floor(V.start / P.rate / step) * step; ; t += step) {
    const x = xOf(t * P.rate); if (x > W) break;
    if (x >= 0) { g.fillRect(x, Hh - 9 * d, d, 9 * d); g.fillText(step < 1 ? t.toFixed(2) : fmt(t).slice(0, 5), x + 3 * d, Hh - 11 * d); }
    for (let k = 1; k < 5; k++) { const xs = xOf((t + step * k / 5) * P.rate); if (xs >= 0 && xs <= W) g.fillRect(xs, Hh - 4 * d, d, 4 * d); }
  }
}
function drawOver(play) {
  const [W, Hh] = fit(cO), g = cO.getContext("2d"); g.clearRect(0, 0, W, Hh);
  if (!N()) return;
  const spp = N() / W; g.fillStyle = COL.ln2;
  for (let x = 0; x < W; x++) { const a = Math.floor(x * spp), b = Math.min(N(), Math.floor((x + 1) * spp)); let p = 0; for (let i = a; i < b; i += Math.max(1, (b - a) >> 5)) p = Math.max(p, Math.abs(P.pcm[i])); g.fillRect(x, Hh / 2 - p * Hh / 2, 1, Math.max(1, p * Hh)); }
  const v0 = V.start / spp, v1 = (V.start + viewW() * V.spp) / spp;
  g.globalAlpha = 0.12; g.fillStyle = COL.ac; g.fillRect(v0, 0, Math.max(4, v1 - v0), Hh); g.globalAlpha = 1;
  g.strokeStyle = COL.ac; g.lineWidth = dpr() * 1.5; g.strokeRect(v0, 1, Math.max(4, v1 - v0), Hh - 2);
  if (play != null) { g.fillStyle = COL.rec; g.fillRect(play / spp, 0, 2, Hh); }
}
// Spectrogram of the visible part (log frequency up to 8 kHz).
function drawSpec(g, W, Hh) {
  const key = `${V.start}|${V.spp}|${W}|${Hh}|${N()}|${H.undo.length}`;
  if (specCache?.key !== key) {
    const img = g.createImageData(W, Hh), NN = 512, re = new Float32Array(NN), im = new Float32Array(NN);
    const win = new Float32Array(NN).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NN));
    const maxBin = Math.min(NN / 2, Math.floor(8000 / (P.rate / NN))), step = Math.max(1, Math.round(W / 900));
    for (let x = 0; x < W; x += step) {
      const c = Math.floor(iOf(x)); if (c >= N()) break;
      for (let i = 0; i < NN; i++) { re[i] = (P.pcm[c - NN / 2 + i] || 0) * win[i]; im[i] = 0; }
      fft(re, im);
      for (let y = 0; y < Hh; y++) {
        const k = Math.min(maxBin - 1, Math.max(1, Math.round(Math.pow(maxBin, 1 - y / Hh))));
        const v = Math.max(0, Math.min(1, (20 * Math.log10(Math.hypot(re[k], im[k]) + 1e-9) + 40) / 70));
        const [r, gg, b] = v < 0.33 ? [0, v * 360, v * 765] : v < 0.66 ? [(v - 0.33) * 765, 120 + (v - 0.33) * 300, 255 - (v - 0.33) * 600] : [255, 220 + (v - 0.66) * 100, 55 + (v - 0.66) * 590];
        for (let s = 0; s < step && x + s < W; s++) { const o = (y * W + x + s) * 4; img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 210; }
      }
    }
    specCache = { key, img };
  }
  g.putImageData(specCache.img, 0, 0);
}
function status() {
  const s = P.sel;
  $("#s-sel").textContent = s ? `নির্বাচিত ${fmt(s[0] / P.rate)} – ${fmt(s[1] / P.rate)} (${fmtS((s[1] - s[0]) / P.rate)})` : `কার্সর ${fmt(P.cursor / P.rate)}`;
  $("#s-info").textContent = N() ? `${TR.list.length > 1 ? curTrack().name + " · " : ""}${toBn(P.rate)} Hz · ${toBn(P.regions.length)}টি অংশ` : "";
  if (!recording) $("#t-clock").textContent = fmt((src && !previewing ? playPos() : P.cursor) / P.rate);
  $$("[data-sel]").forEach(b => { b.disabled = !s; });
  $("#e-undo").disabled = !H.undo.length; $("#e-redo").disabled = !H.redo.length; $("#e-paste").disabled = !clip;
  $("#fx-target").textContent = `প্রয়োগ হবে: ${s ? "নির্বাচিত অংশে" : "পুরো রেকর্ডে"}`;
}
new ResizeObserver(() => drawAll()).observe($("#stage"));

/* pointer: select / cursor / region pick; overview drag */
let drag = null;
cW.addEventListener("pointerdown", e => {
  if (!N()) return; cW.setPointerCapture(e.pointerId);
  const i = Math.max(0, Math.min(N(), iOf(e.offsetX * dpr())));
  if (e.shiftKey && P.sel) { P.sel = [Math.min(P.sel[0], i), Math.max(P.sel[1], i)]; drawAll(); return; }
  drag = { i }; P.sel = null; P.cursor = i; if (src && !previewing) playFromCursor(); drawAll();
});
cW.addEventListener("pointermove", e => { if (!drag) return; const i = Math.max(0, Math.min(N(), iOf(e.offsetX * dpr()))); if (Math.abs(i - drag.i) > V.spp * 3) { P.sel = [Math.min(i, drag.i), Math.max(i, drag.i)]; drawAll(); } });
cW.addEventListener("pointerup", () => { drag = null; });
cW.addEventListener("dblclick", e => { const i = iOf(e.offsetX * dpr()), r = P.regions.find(r => i >= r.a && i < r.b); if (r) { P.sel = [r.a, r.b]; drawAll(); highlightRow(r.id); } });
cW.addEventListener("wheel", e => {
  if (!N()) return; e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoom(e.deltaY > 0 ? 1.25 : 0.8, e.offsetX * dpr());
  else { V.start += (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) ? (e.deltaX || e.deltaY) : e.deltaY) * V.spp * dpr(); clampView(); drawAll(); }
}, { passive: false });
let odrag = false;
const overTo = e => { const spp = N() / cO.width; V.start = e.offsetX * dpr() * spp - viewW() * V.spp / 2; clampView(); drawAll(); };
cO.addEventListener("pointerdown", e => { if (!N()) return; odrag = true; cO.setPointerCapture(e.pointerId); overTo(e); });
cO.addEventListener("pointermove", e => { if (odrag) overTo(e); });
cO.addEventListener("pointerup", () => { odrag = false; });
$("#z-in").onclick = () => zoom(0.5); $("#z-out").onclick = () => zoom(2); $("#z-fit").onclick = zoomFit;
$("#v-spec").onclick = () => { V.spec = !V.spec; $("#v-spec").setAttribute("aria-pressed", String(V.spec)); drawAll(); };

/* ================= playback ================= */
let actx = null, src = null, playT0 = 0, playA = 0, playB = 0, raf = 0, previewing = false;
const ctxA = () => actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
const looping = () => $("#t-loop").getAttribute("aria-pressed") === "true";
let pRate = 1;
const playPos = () => { if (!src) return P.cursor; const t = (ctxA().currentTime - playT0) * P.rate * pRate, len = playB - playA; return playA + (looping() && P.sel ? t % len : Math.min(t, len)); };
function playBuffer(pcm, a, b, { loop = false, preview = false, data = null } = {}) {
  stop(); const c = ctxA(); if (c.state === "suspended") c.resume();
  const buf = c.createBuffer(1, Math.max(1, b - a), P.rate); buf.copyToChannel(data || pcm.slice(a, b), 0);
  src = c.createBufferSource(); src.buffer = buf; src.loop = loop; pRate = preview ? 1 : +$("#t-rate").value || 1; src.playbackRate.value = pRate; src.connect(c.destination); src.start();
  playT0 = c.currentTime; playA = a; playB = b; previewing = preview; $("#t-play").classList.add("on");
  src.onended = () => { if (!previewing) P.cursor = Math.min(maxLen(), playB); stop(); };
  const tick = () => { if (!src) return; if (!previewing) { const p = playPos(); followPlay(p); drawAll(p); $("#t-clock").textContent = fmt(p / P.rate); } raf = requestAnimationFrame(tick); }; tick();
}
function followPlay(p) { const x = xOf(p); if (x > viewW() * 0.95 || x < 0) { V.start = p - viewW() * V.spp * 0.1; clampView(); } }
function playFromCursor() {
  const end = maxLen(); if (!end) return;
  const [a, b] = P.sel || [P.cursor >= end - 10 ? 0 : P.cursor, end];
  // only the active track plays, unless “সব ট্র্যাক একসঙ্গে” is on (then mute, solo and volume apply)
  const multi = TR.list.length > 1 && load("lx_snd_mixplay", false);
  playBuffer(P.pcm, a, b, { loop: looping() && !!P.sel, data: multi ? mixRange(a, b) : null });
}
// Clip previews (upload list, simple mode) share one player, so only one thing sounds at a time.
let clipPlayer = null;
function playBlob(blob) { stop(); clipPlayer = new Audio(URL.createObjectURL(blob)); clipPlayer.onended = () => URL.revokeObjectURL(clipPlayer.src); clipPlayer.play(); }
function stop() { if (clipPlayer) { clipPlayer.pause(); clipPlayer = null; } cancelAnimationFrame(raf); if (src) { src.onended = null; try { src.stop(); } catch (e) {} } src = null; previewing = false; $("#t-play").classList.remove("on"); $("#fx-preview").classList.remove("on"); drawAll(); }
$("#t-play").onclick = () => (src ? stop() : playFromCursor());
$("#t-stop").onclick = () => { if (recording || chainT) userStop(); stop(); };
$("#t-home").onclick = () => { stop(); P.cursor = 0; V.start = 0; drawAll(); };
// previous / next part of the active track
function jumpRegion(dir) {
  const starts = P.regions.map(r => r.a), c = src && !previewing ? playPos() : P.cursor;
  const to = dir > 0 ? starts.find(a => a > c + P.rate * 0.05) : [...starts].reverse().find(a => a < c - P.rate * 0.3);
  const playing = src && !previewing; stop(); P.cursor = to ?? (dir > 0 ? N() : 0); P.sel = null;
  if (xOf(P.cursor) < 0 || xOf(P.cursor) > viewW()) { V.start = P.cursor - viewW() * V.spp * 0.1; clampView(); }
  drawAll(); if (playing) playFromCursor();
}
$("#t-prev").onclick = () => jumpRegion(-1); $("#t-next").onclick = () => jumpRegion(1);
$("#t-loop").onclick = () => { const b = $("#t-loop"); b.setAttribute("aria-pressed", String(!looping())); };

/* ================= recording ================= */
let stream = null, an = null, rec = null, chunks = [], recording = false, meterRaf = 0, recT0 = 0, recMarks = [];
// “⏐ দাগ” while recording: where one word or verse ends; the take is split there afterwards.
function addMark() {
  if (!recording) return; recMarks.push((Date.now() - recT0) / 1000); vad = null; // marks mean a long take: no auto-stop
  const b = $("#t-mark"); b.textContent = `⏐ দাগ (${toBn(recMarks.length)})`; b.classList.remove("blink"); void b.offsetWidth; b.classList.add("blink");
  msg(`দাগ ${toBn(recMarks.length)} — বলতে থাকুন`);
}
async function listInputs() {
  try { const ds = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput");
    const cur = $("#t-input").value; $("#t-input").innerHTML = `<option value="">ডিফল্ট মাইক</option>` + ds.filter(d => d.deviceId && d.deviceId !== "default").map(d => `<option value="${esc(d.deviceId)}">${esc(d.label || "মাইক্রোফোন")}</option>`).join(""); $("#t-input").value = cur; } catch (e) {}
}
async function openMic() {
  if (stream) return;
  const id = $("#t-input").value;
  stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const c = ctxA(); if (c.state === "suspended") await c.resume();
  an = c.createAnalyser(); an.fftSize = 2048; c.createMediaStreamSource(stream).connect(an);
  listInputs(); meter();
}
$("#t-input").onchange = () => { if (stream && !recording) { cancelAnimationFrame(meterRaf); stream.getTracks().forEach(t => t.stop()); stream = null; openMic().catch(() => {}); } };
let peakHold = -60, peakT = 0;
function meter() {
  if (!an) return;
  const a = new Float32Array(an.fftSize); an.getFloatTimeDomainData(a);
  let s = 0, p = 0; for (const v of a) { s += v * v; p = Math.max(p, Math.abs(v)); }
  const rms = Math.sqrt(s / a.length), db = 20 * Math.log10(rms + 1e-9), pdb = 20 * Math.log10(p + 1e-9);
  const pct = v => Math.max(0, Math.min(100, (v + 60) / 60 * 100));
  $("#t-meter").style.width = pct(db) + "%"; $("#t-meter").classList.toggle("hot", pdb > -3);
  $("#bt-meter").style.width = pct(db) + "%"; $("#bt-meter").classList.toggle("hot", pdb > -3); // the same level inside the word card (phones)
  if (pdb > peakHold || performance.now() - peakT > 1500) { peakHold = pdb; peakT = performance.now(); }
  $("#t-peak").style.left = pct(peakHold) + "%"; $("#t-db").textContent = `${toBn(Math.max(-60, Math.round(pdb)))} dB`;
  vadTick(rms);
  if (recording) { const s = (Date.now() - recT0) / 1000; $("#t-clock").textContent = fmt(s); $("#bt-clock").textContent = fmt(s).slice(0, 8); } // time in the word card too
  meterRaf = requestAnimationFrame(meter);
}
// Word-list mode: stop by itself after the word is said (silence after speech).
let vad = null;
function vadTick(rms) {
  if (!recording || !vad) return;
  const now = performance.now();
  if (rms > 0.03) { vad.spoke = true; vad.quiet = 0; } else if (vad.spoke && !vad.quiet) vad.quiet = now;
  if ((vad.spoke && vad.quiet && now - vad.quiet > 800) || now - vad.t0 > 10000) stopRec();
}
async function startRec() {
  if (recording) return;
  const wordMode = $("#t-wordmode").checked;
  if (wordMode && !WORDS[wordPos]) { msg("শব্দ-তালিকা খালি — বাঁ দিকে শব্দ যোগ করুন।"); return; }
  try { await openMic(); } catch (e) { msg("মাইক্রোফোন চালু করা যায়নি: " + e.message); return; }
  stop(); chunks = []; rec = new MediaRecorder(stream); rec.ondataavailable = e => chunks.push(e.data);
  const word = wordMode ? WORDS[wordPos] : null;
  rec.onstop = () => finishRec(word);
  recByHand = false; rec.start(); recording = true; recT0 = Date.now(); recMarks = []; $("#t-rec").classList.add("on"); document.body.classList.add("is-rec");
  $("#t-mark").hidden = false; $("#t-mark").textContent = "⏐ দাগ";
  vad = wordMode && $("#t-auto").checked ? { t0: performance.now(), spoke: false, quiet: 0 } : null;
  msg(word ? `বলুন: “${word.word}”` : "রেকর্ড হচ্ছে… থামাতে R বা ● চাপুন"); drawBatch();
}
// একটানা goes on to the next word by itself only after the speaker falls silent; a stop by hand (R, ●/■) ends the run.
let chainT = 0;
const nextTake = ms => { clearTimeout(chainT); chainT = setTimeout(() => { chainT = 0; startRec(); }, ms); };
function userStop() { const was = !!chainT || recording; clearTimeout(chainT); chainT = 0; if (vad) vad.byHand = true; recByHand = true; stopRec(); drawBatch(); if (was) msg("■ থামানো হলো — আবার শুরু করতে ● চাপুন"); }
let recByHand = false;
const toggleRec = () => (recording || chainT ? userStop() : startRec());
function stopRec() { if (!recording) return; recording = false; $("#t-mark").hidden = true; $("#t-rec").classList.remove("on"); document.body.classList.remove("is-rec"); if (rec?.state !== "inactive") rec.stop(); drawBatch(); }
async function finishRec(word) {
  let a; try { a = await decode(new Blob(chunks, { type: rec.mimeType })); } catch (e) { msg("রেকর্ড পড়া যায়নি: " + e.message); return; }
  let pcm = a.pcm;
  if (!N()) P.rate = a.rate; else pcm = await resample(pcm, a.rate, P.rate);
  if (word) { // trim the silence around a single word
    const pk = peakOf(pcm); if (pk < 0.02) { msg("কিছু শোনা যায়নি — আবার বলুন।"); if ($("#t-auto").checked && !recByHand) nextTake(400); return; }
    const thr = pk * 0.08, pad = Math.round(P.rate * 0.2); let s = 0, e = pcm.length - 1; while (s < e && Math.abs(pcm[s]) < thr) s++; while (e > s && Math.abs(pcm[e]) < thr) e--;
    pcm = pcm.slice(Math.max(0, s - pad), Math.min(pcm.length, e + pad));
  }
  const atEnd = word || !P.sel && P.cursor >= N(), marks = word ? [] : recMarks.slice();
  const base = atEnd ? N() : P.sel ? P.sel[0] : P.cursor;
  commit(() => {
    if (atEnd) appendPart(pcm, word ? { name: word.word, kind: "word", lexeme: word.lexeme || "", info: word.gloss ? { gloss: word.gloss } : undefined } : {});
    else if (P.sel) replaceRange(P.sel[0], P.sel[1], pcm); else replaceRange(P.cursor, P.cursor, pcm);
    P.cursor = atEnd ? N() : (P.sel ? P.sel[0] : P.cursor) + pcm.length; P.sel = null;
    if (marks.length) { // split at the marks; name the pieces from the word list if asked
      const pieces = splitByMarks(pcm, P.rate, marks);
      pieces.slice(1).forEach(([a]) => splitAt(base + a)); normalize();
      const mine = P.regions.filter(r => r.a >= base && r.b <= base + pcm.length), pk = peakOf(pcm);
      let wi = wordPos; const named = $("#m-names").checked && WORDS.length;
      mine.forEach(r => { if (peakOf(P.pcm, r.a, r.b) < pk * 0.1) { r.skip = true; return; }
        if (named && WORDS[wi]) { const w = WORDS[wi++]; r.name = w.word; r.lexeme = w.lexeme || ""; r.kind = "word"; if (w.gloss) r.info = { gloss: w.gloss }; w.done = true; } });
      if (named) { wordPos = Math.min(WORDS.length - 1, wi); saveWords(); }
    }
  }, marks.length ? `✓ রেকর্ড ${toBn(marks.length + 1)} ভাগে ভাগ হলো (দাগ ধরে)` : word ? `✓ “${word.word}” রেকর্ড হলো` : `✓ ${fmtS(pcm.length / P.rate)} রেকর্ড যোগ হলো`);
  zoomFit();
  if (word && $("#t-autoq").checked) { const r = [...P.regions].reverse().find(x => x.name === word.word); if (r) exportRegion(r).then(() => { drawQueue(); saveProject(); }); }
  // একটানা: on to the next word and record it; otherwise stay (listen, retake) until ▶ is pressed.
  if (word) { word.done = true; if ($("#t-auto").checked && !recByHand && wordPos < WORDS.length - 1) { wordPos++; saveWords(); nextTake(450); } else if (recByHand && $("#t-auto").checked && wordPos < WORDS.length - 1) { wordPos++; saveWords(); msg(`✓ “${word.word}” রেকর্ড হলো — থামানো আছে; চালু করতে ●`); } else { saveWords(); msg(wordPos >= WORDS.length - 1 ? "✓ তালিকা শেষ!" : `✓ “${word.word}” রেকর্ড হলো — শুনে নিন, তারপর ▶ পরের শব্দ`); } }
}
$("#t-rec").onclick = toggleRec;
$("#t-mark").onclick = addMark;
$("#t-wordmode").onchange = () => { store("lx_snd_wm", $("#t-wordmode").checked); drawBatch(); };
$("#t-wordmode").checked = load("lx_snd_wm", true); // word list is the default mode
$("#t-auto").checked = load("lx_snd_auto", false);
$("#t-auto").onchange = () => { store("lx_snd_auto", $("#t-auto").checked); drawBatch(); };
$("#bt-play").onclick = () => { const w = WORDS[wordPos], r = w && [...P.regions].reverse().find(x => x.name === w.word); if (r) playBuffer(P.pcm, r.a, r.b); else msg("এই শব্দের রেকর্ড নেই"); };
$("#bt-go").onclick = toggleRec;
$("#bt-prev").onclick = () => { if (recording) return; wordPos = Math.max(0, wordPos - 1); saveWords(); };
$("#bt-next").onclick = () => { if (recording) stopRecCancel(); wordPos = Math.min(WORDS.length - 1, wordPos + 1); saveWords(); };
// Retake: the earlier take of this word leaves the timeline, then record again.
$("#bt-redo").onclick = () => {
  if (recording) return; const w = WORDS[wordPos]; if (!w) return;
  const old = [...P.regions].reverse().find(r => r.name === w.word);
  if (old) { const c = sentClip(old); if (c && c.status !== "done") { DB.del(c.id); Q = Q.filter(x => x !== c); drawQueue(); } const { a, b } = old; commit(() => replaceRange(a, b, EMPTY), `“${w.word}”-এর আগের রেকর্ড সরানো হলো`); }
  w.done = false; saveWords(); startRec();
};
$("#bt-export").onclick = () => $("#r-export").click();
// Skip: stop without keeping the take.
function stopRecCancel() { if (!recording) return; recording = false; $("#t-rec").classList.remove("on"); document.body.classList.remove("is-rec"); if (rec) { rec.onstop = null; if (rec.state !== "inactive") rec.stop(); } drawBatch(); }

/* ================= import ================= */
// Several files: one after another on the active track, or each on its own track.
async function importFiles(files) {
  files = [...files].filter(f => /^audio\/|\.(wav|mp3|ogg|oga|opus|m4a|aac|flac|webm)$/i.test(f.type || f.name)); if (!files.length) return;
  let sep = false;
  const where = files.length > 1 || N() ? await choose(`${toBn(files.length)}টি অডিও কোথায় যাবে?`, [["queue", "সরাসরি আপলোড তালিকায় — নাম পরে লিখব"], ["same", files.length > 1 ? "টাইমলাইনে, একই ট্র্যাকে পরপর" : "সক্রিয় ট্র্যাকের শেষে"], ["sep", files.length > 1 ? "টাইমলাইনে, প্রতিটি আলাদা ট্র্যাকে" : "নতুন ট্র্যাকে"]]) : "same";
  if (!where) return; sep = where === "sep";
  if (where === "queue") { // each file becomes one upload, named after the file until renamed
    for (const f of files) { try { msg(`“${f.name}” পড়া হচ্ছে…`); await tick0(); const a = await decode(f); await window.StudioLibre.addClip({ word: f.name.replace(/\.[^.]+$/, ""), kind: $("#r-kindall").value || "word", dur: a.pcm.length / a.rate, blob: encodeWav(a.pcm, a.rate) }); } catch (e) { msg(`“${f.name}” পড়া যায়নি`); } }
    msg(`✓ ${toBn(files.length)}টি অডিও আপলোড তালিকায় — ডানে নাম লিখুন (Enter চাপলে পরেরটিতে যায়)`); $("#q-list [data-f=word]")?.focus(); return;
  }
  for (const f of files) {
    msg(`“${f.name}” পড়া হচ্ছে…`); await tick0();
    try {
      const a = await decode(f); if (!maxLen()) P.rate = Math.min(a.rate, 48000);
      const pcm = await resample(a.pcm, a.rate, P.rate), name = f.name.replace(/\.[^.]+$/, "");
      if (sep && (N() || TR.list.length > 1 || f !== files[0])) addTrack(pcm, name, { name }); else commit(() => appendPart(pcm, { name }));
    } catch (e) { msg(`“${f.name}” পড়া যায়নি: ${e.message}`); }
  }
  zoomFit(); msg(`✓ ${toBn(files.length)}টি অডিও যোগ হলো`);
}
// A small question with buttons; resolves to the chosen value (or null).
function choose(title, options) {
  return new Promise(ok => {
    const d = document.createElement("div"); d.className = "st-help";
    d.innerHTML = `<div class="st-help-in ch-in"><h3>${esc(title)}</h3><div class="ch-opts">${options.map(([v, l]) => `<button type="button" class="sbtn" data-v="${esc(v)}">${esc(l)}</button>`).join("")}</div><button type="button" class="sbtn ghost" data-v="">বাতিল</button></div>`;
    document.body.appendChild(d);
    d.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b && e.target !== d) return; d.remove(); ok(b ? b.dataset.v || null : null); });
  });
}
async function importFile(f) {
  msg("ফাইল পড়া হচ্ছে…"); await tick0();
  try {
    const a = await decode(f); if (!N()) P.rate = Math.min(a.rate, 48000);
    const pcm = await resample(a.pcm, a.rate, P.rate);
    commit(() => appendPart(pcm, { name: f.name.replace(/\.[^.]+$/, "") }), `✓ “${f.name}” যোগ হলো`); zoomFit();
  } catch (e) { msg("এই ফাইলটি পড়া যায়নি: " + e.message); }
}
$("#f-file").addEventListener("change", e => { importFiles(e.target.files); e.target.value = ""; });
$("#e-import").onclick = () => { const i = document.createElement("input"); i.type = "file"; i.accept = "audio/*"; i.multiple = true; i.onchange = () => importFiles(i.files); i.click(); };
$("#stage").addEventListener("dragover", e => { e.preventDefault(); $("#stage").classList.add("over"); });
$("#stage").addEventListener("dragleave", () => $("#stage").classList.remove("over"));
$("#stage").addEventListener("drop", e => { e.preventDefault(); $("#stage").classList.remove("over"); importFiles(e.dataTransfer.files); });
const saveAs = (pcm, name) => { const u = URL.createObjectURL(encodeWav(pcm, P.rate)); const l = document.createElement("a"); l.href = u; l.download = name.replace(/[\\/:*?"<>|]/g, "_") + ".wav"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
$("#e-export").onclick = async () => {
  if (!maxLen()) { msg("নামানোর মতো অডিও নেই"); return; }
  const day = new Date().toISOString().slice(0, 10), base = (PJ.name || "libre-studio") + "-" + day;
  const opts = [...(P.sel ? [["sel", "নির্বাচিত অংশ"]] : []), ["track", `সক্রিয় ট্র্যাক (${curTrack().name})`], ...(TR.list.length > 1 ? [["mix", "সব ট্র্যাক মিশিয়ে একটি ফাইল"], ["tracks", "প্রতিটি ট্র্যাক আলাদা ফাইল"]] : []), ["parts", "প্রতিটি অংশ আলাদা ফাইল (“বাদ” ছাড়া)"]];
  const c = await choose("কী নামাবেন? (WAV)", opts); if (!c) return;
  const pause = () => new Promise(r => setTimeout(r, 350)); // browsers allow a series of downloads with small gaps
  if (c === "sel") saveAs(P.pcm.slice(P.sel[0], P.sel[1]), base + "-নির্বাচিত");
  if (c === "track") saveAs(P.pcm, base + "-" + curTrack().name);
  if (c === "mix") saveAs(mixRange(0, maxLen()), base + "-মিক্স");
  if (c === "tracks") { storeCur(); for (const t of TR.list) { if (t.pcm.length) { saveAs(t.pcm, base + "-" + t.name); await pause(); } } }
  if (c === "parts") { let k = 0; for (const r of P.regions) { if (r.skip) continue; k++; saveAs(P.pcm.slice(r.a, r.b), `${base}-${String(k).padStart(2, "0")}${r.name ? "-" + r.name : ""}`); await pause(); } }
};
// Remove every track (all audio); the word list, speakers and upload list stay.
function clearAll(question, label) {
  stop(); if (recording) stopRecCancel();
  if (question && maxLen() && !confirm(question)) return;
  stop(); H.undo = []; H.redo = []; P.pcm = new Float32Array(0); P.regions = []; P.sel = null; P.cursor = 0; V.start = 0; markIn = null;
  TR.list = [{ id: "t" + uid(), name: "ট্র্যাক ১", pcm: P.pcm, regions: P.regions, gain: 1, mute: false, solo: false }]; TR.cur = 0;
  afterEdit(label); drawTracks();
}
// Empty the upload list: only what is already on Commons, or everything.
async function clearQueue(all) {
  const gone = Q.filter(c => all || c.status === "done"); if (!gone.length) { msg("সরানোর মতো কিছু নেই"); return 0; }
  for (const c of gone) { await DB.del(c.id); if (SYNC()) fetch(`/store/clips/${c.id}`, { method: "DELETE" }).catch(() => {}); }
  Q = Q.filter(c => !gone.includes(c)); P.regions.forEach(r => { if (gone.some(c => c.id === r.clipId)) r.clipId = ""; });
  drawQueue(); saveProject(); return gone.length;
}
$("#e-new").onclick = async () => {
  stop(); if (recording) stopRecCancel();
  const c = await choose("নতুন প্রজেক্ট", [["all", "সব নতুন করে — অডিও, অংশ আর আপলোড তালিকা"], ["audio", "শুধু অডিও ও অংশ — আপলোড তালিকা থাকবে"]]); if (!c) return;
  const left = Q.filter(x => x.status !== "done").length;
  if (c === "all" && left && !confirm(`আপলোড তালিকায় ${toBn(left)}টি এখনো কমন্সে ওঠেনি — এগুলোও মুছে যাবে। নিশ্চিত?`)) return;
  clearAll(null, "নতুন প্রজেক্ট"); if (c === "all") await clearQueue(true);
};
$("#q-clear-done").onclick = async () => { const n = await clearQueue(false); if (n) msg(`✓ কমন্সে ওঠা ${toBn(n)}টি তালিকা থেকে সরানো হলো`); };
$("#q-clear-all").onclick = async () => { const left = Q.filter(x => x.status !== "done").length; if (!Q.length) return; if (!confirm(left ? `আপলোড তালিকার সব সরাবেন? ${toBn(left)}টি এখনো ওঠেনি — সেগুলোও মুছে যাবে।` : "আপলোড তালিকার সব সরাবেন?")) return; const n = await clearQueue(true); msg(`✓ আপলোড তালিকা খালি (${toBn(n)}টি সরানো হলো)`); };
$("#r-unsplit").onclick = () => { if (P.regions.length < 2) return; P.sel = null; $("#e-merge").click(); };
$("#r-clear").onclick = () => $("#e-clear").click();
$("#e-clear").onclick = () => clearAll("সব অডিও ট্র্যাক মুছবেন? (শব্দ-তালিকা, বক্তা আর আপলোড তালিকা থাকবে)", "সব ট্র্যাক মুছে ফেলা হলো");

/* ================= edits ================= */
const selOrAll = () => (P.sel ? P.sel.slice() : [0, N()]);
const EMPTY = new Float32Array(0);
$("#e-undo").onclick = () => { const u = H.undo.pop(); if (!u) return; stop(); const i = TR.list.findIndex(t => t.id === u.tid); if (i >= 0 && i !== TR.cur) { loadTrack(i); drawTracks(); } H.redo.push(snap()); restore(u); afterEdit("পূর্বাবস্থায় ফেরানো হলো"); };
$("#e-redo").onclick = () => { const u = H.redo.pop(); if (!u) return; stop(); const i = TR.list.findIndex(t => t.id === u.tid); if (i >= 0 && i !== TR.cur) { loadTrack(i); drawTracks(); } H.undo.push(snap()); restore(u); afterEdit("পুনরায় করা হলো"); };
$("#e-copy").onclick = () => { if (!P.sel) return; clip = P.pcm.slice(P.sel[0], P.sel[1]); msg(`কপি: ${fmtS(clip.length / P.rate)}`); status(); };
$("#e-cut").onclick = () => { if (!P.sel) return; clip = P.pcm.slice(P.sel[0], P.sel[1]); const [a, b] = P.sel; commit(() => { replaceRange(a, b, EMPTY); P.cursor = a; P.sel = null; }, "কাটা হলো"); };
$("#e-paste").onclick = () => { if (!clip) return; const [a, b] = P.sel || [P.cursor, P.cursor]; commit(() => { replaceRange(a, b, clip); P.sel = [a, a + clip.length]; }, "পেস্ট হলো"); };
$("#e-del").onclick = () => { if (!P.sel) return; const [a, b] = P.sel; commit(() => { replaceRange(a, b, EMPTY); P.cursor = a; P.sel = null; }, "মুছে ফেলা হলো"); };
$("#e-crop").onclick = () => { if (!P.sel) return; const [a, b] = P.sel; commit(() => { replaceRange(b, N(), EMPTY); replaceRange(0, a, EMPTY); P.cursor = 0; P.sel = null; }, "ক্রপ হলো"); zoomFit(); };
$("#e-silence").onclick = () => { if (!P.sel) return; const [a, b] = P.sel; commit(() => replaceRange(a, b, new Float32Array(b - a)), "নিঃশব্দ করা হলো"); };
$("#e-insil").onclick = () => { const n = Math.round(P.rate * 0.5); commit(() => replaceRange(P.cursor, P.cursor, new Float32Array(n)), "আধা সেকেন্ড নীরবতা যোগ হলো"); };
$("#e-reverse").onclick = () => { if (!P.sel) return; const [a, b] = P.sel; commit(() => replaceRange(a, b, P.pcm.slice(a, b).reverse()), "উল্টো করা হলো"); };
$("#e-split").onclick = () => { if (src && !previewing) { const x = snapQuiet(playPos()); markEdit(() => splitAt(x), "চলার মধ্যেই ভাগ হলো"); mapWords(true); return; } const pts = P.sel ? P.sel : [P.cursor]; commit(() => pts.forEach(splitAt), "ভাগ হলো"); mapWords(true); };

/* mark words while listening: A = word starts, D = word ends (snapped to the nearest quiet moment) */
var markIn = null; // var: drawAll may run before this line
// Edits that only move part borders: playback keeps going.
function markEdit(fn, label) { H.undo.push(snap()); H.redo = []; fn(); normalize(); if (label) msg(label); drawRegions(); saveProject(); if (!src) drawAll(); }
function snapQuiet(x, win = 0.12) {
  const w = Math.round(P.rate * 0.01), r = Math.round(P.rate * win); let best = x, low = Infinity;
  for (let c = Math.max(0, x - r); c <= Math.min(N() - w, x + r); c += w) { let s = 0; for (let i = c; i < c + w; i++) s += P.pcm[i] * P.pcm[i]; if (s < low) { low = s; best = c + (w >> 1); } }
  return best;
}
const nowPos = () => (src && !previewing ? playPos() : P.cursor);
function markStart() { if (!N()) return; markIn = snapQuiet(nowPos()); msg(`শুরু দাগানো হলো ${fmt(markIn / P.rate)} — শব্দ শেষ হলে D`); $("#m-in").classList.add("on"); if (!src) drawAll(); }
function markEnd() {
  if (!N()) return;
  const end = snapQuiet(nowPos());
  if (markIn == null || end - markIn < P.rate * 0.08) { msg("আগে শব্দের শুরুতে A চাপুন।"); return; }
  const a = markIn, useList = $("#m-names").checked && WORDS[wordPos]; const w = useList ? WORDS[wordPos] : null;
  markEdit(() => {
    splitAt(a); splitAt(end); normalize();
    const r = P.regions.find(x => x.a === a && x.b === end) || P.regions.find(x => x.a <= a && x.b >= end);
    if (r) { r.skip = false; r.kind = "word"; if (w) { r.name = w.word; r.lexeme = w.lexeme || ""; if (w.gloss) r.info = { ...(r.info || {}), gloss: w.gloss }; } }
    // The unnamed stretch just before the word is a gap: leave it out of uploads.
    const prev = P.regions[P.regions.indexOf(r) - 1]; if (prev && !prev.name && !prev.marked) prev.skip = true;
    if (r) r.marked = true;
  }, w ? `✓ “${w.word}” দাগানো হলো` : `✓ অংশ দাগানো হলো (${fmtS((end - a) / P.rate)})`);
  if (w) { w.done = true; wordPos = Math.min(WORDS.length - 1, wordPos + 1); saveWords(); }
  markIn = null; $("#m-in").classList.remove("on");
}
$("#m-in").onclick = markStart; $("#m-out").onclick = markEnd;
$("#t-rate").onchange = () => { if (src && !previewing) { const p = playPos(); P.cursor = p; stop(); playFromCursor(); } };
$("#e-merge").onclick = () => {
  // With a selection: join the parts it touches; without: everything into one part.
  commit(() => {
    const [a, b] = P.sel || [0, N()];
    const hit = P.regions.filter(r => r.b > a && r.a < b); if (hit.length < 2) return;
    const first = hit[0]; first.b = hit[hit.length - 1].b; P.regions = P.regions.filter(r => !hit.includes(r) || r === first);
  }, P.sel ? "নির্বাচিত অংশগুলো জোড়া হলো" : "সব অংশ একত্র");
};
const rampEdit = fin => { const [a, b] = selOrAll(), n = P.sel ? b - a : Math.min(b - a, Math.round(P.rate * 0.5)); commit(() => { const o = P.pcm.slice(); for (let i = 0; i < n; i++) { const g = i / n; if (fin) o[a + i] *= g; else o[b - 1 - i] *= g; } P.pcm = o; }, fin ? "ফেড-ইন" : "ফেড-আউট"); };
$("#e-fadein").onclick = () => rampEdit(true); $("#e-fadeout").onclick = () => rampEdit(false);
$("#e-norm").onclick = () => { const [a, b] = selOrAll(), p = peakOf(P.pcm, a, b); if (p < 1e-4) return; commit(() => { const o = P.pcm.slice(), g = 0.891 / p; for (let i = a; i < b; i++) o[i] *= g; P.pcm = o; }, "নর্মালাইজ হলো (−১ dB)"); };
$("#e-trim").onclick = () => {
  const p = peakOf(P.pcm); if (p < 1e-4) return; const thr = p * 0.05, pad = Math.round(P.rate * 0.15);
  let s = 0, e = N() - 1; while (s < e && Math.abs(P.pcm[s]) < thr) s++; while (e > s && Math.abs(P.pcm[e]) < thr) e--;
  commit(() => { replaceRange(Math.min(N(), e + pad), N(), EMPTY); replaceRange(0, Math.max(0, s - pad), EMPTY); P.cursor = 0; }, "শুরু-শেষের নীরবতা ছাঁটা হলো"); zoomFit();
};
// Split by silences: for many words or verses in one long take. Silent parts start as “বাদ”.
$("#e-autosplit").onclick = () => {
  if (!N()) return;
  const win = Math.round(P.rate * 0.02), env = [];
  for (let i = 0; i < N(); i += win) { let s = 0; const e = Math.min(N(), i + win); for (let j = i; j < e; j++) s += P.pcm[j] * P.pcm[j]; env.push(Math.sqrt(s / (e - i))); }
  const sorted = env.slice().sort((x, y) => x - y), floor = sorted[Math.floor(sorted.length * 0.1)] || 0, top = sorted[Math.floor(sorted.length * 0.98)] || 0;
  const thr = floor + (top - floor) * 0.12, gap = Math.round(+$("#e-gap").value / 0.02);
  const cuts = []; let run = 0, sound = false, runStart = 0;
  env.forEach((v, k) => { if (v < thr) { if (!run) runStart = k; run++; } else { if (sound && run >= gap) cuts.push([runStart * win, k * win]); run = 0; sound = true; } });
  commit(() => {
    cuts.forEach(([a, b]) => { splitAt(a + Math.round(P.rate * 0.1)); splitAt(b - Math.round(P.rate * 0.1)); });
    normalize(); const pk = peakOf(P.pcm);
    P.regions.forEach(r => { if (peakOf(P.pcm, r.a, r.b) < pk * 0.12) r.skip = true; });
  }, `${toBn(cuts.length + 1)}টি কথার অংশ পাওয়া গেছে (নীরব অংশ “বাদ”)`);
  mapWords(true);
};

/* ================= DSP ================= */
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI / len) * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
const HANN = n => new Float32Array(n).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
// Generic STFT → per-bin gain → overlap-add. gainFn(k, mag, frameIndex, extra) returns a gain for bin k.
function stftGain(pcm, gainFn, side) {
  const NN = 2048, Hp = NN / 4, win = HANN(NN), frames = Math.max(1, Math.ceil((pcm.length - NN) / Hp) + 1);
  const re = new Float32Array(NN), im = new Float32Array(NN), sr = side ? new Float32Array(NN) : null, si = side ? new Float32Array(NN) : null;
  const out = new Float32Array(pcm.length), norm = new Float32Array(pcm.length);
  for (let f = 0; f < frames; f++) {
    re.fill(0); im.fill(0); for (let i = 0; i < NN; i++) re[i] = (pcm[f * Hp + i] || 0) * win[i]; fft(re, im);
    if (side) { sr.fill(0); si.fill(0); for (let i = 0; i < NN; i++) sr[i] = (side[f * Hp + i] || 0) * win[i]; fft(sr, si); }
    for (let k = 0; k <= NN / 2; k++) { const g = gainFn(k, Math.hypot(re[k], im[k]) || 1e-9, f, side ? Math.hypot(sr[k], si[k]) : 0, NN); re[k] *= g; im[k] *= g; if (k && k < NN / 2) { re[NN - k] = re[k]; im[NN - k] = -im[k]; } }
    fft(re, im, true);
    for (let i = 0; i < NN; i++) { const p = f * Hp + i; if (p < out.length) { out[p] += re[i] * win[i]; norm[p] += win[i] * win[i]; } }
  }
  for (let i = 0; i < out.length; i++) out[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0;
  return out;
}
let noiseProfile = null;
function spectrum(pcm) { // average magnitude per bin (NN = 2048)
  const NN = 2048, Hp = NN / 4, win = HANN(NN), re = new Float32Array(NN), im = new Float32Array(NN), prof = new Float32Array(NN / 2 + 1); let n = 0;
  for (let f = 0; f * Hp + NN <= pcm.length; f++, n++) { re.fill(0); im.fill(0); for (let i = 0; i < NN; i++) re[i] = pcm[f * Hp + i] * win[i]; fft(re, im); for (let k = 0; k <= NN / 2; k++) prof[k] += Math.hypot(re[k], im[k]); }
  if (n) prof.forEach((v, k) => { prof[k] = v / n; }); return n ? prof : null;
}
function denoise(pcm, strength, prof) {
  if (!prof) { // quietest 10 % of 2048-sample frames make the noise print
    const NN = 2048, en = []; for (let i = 0; i + NN <= pcm.length; i += NN / 2) { let s = 0; for (let j = i; j < i + NN; j += 8) s += pcm[j] * pcm[j]; en.push([s, i]); }
    en.sort((a, b) => a[0] - b[0]); const pick = en.slice(0, Math.max(3, Math.floor(en.length * 0.1)));
    const quiet = new Float32Array(pick.length * NN); pick.forEach(([, i], k) => quiet.set(pcm.subarray(i, i + NN), k * NN));
    prof = spectrum(quiet); if (!prof) return pcm;
  }
  const prev = new Float32Array(1025).fill(1);
  return stftGain(pcm, (k, m) => { let g = Math.max(0.03, 1 - strength * 2 * prof[k] / m); g = 0.5 * g + 0.5 * prev[k]; prev[k] = g; return g; });
}
// Pitch and tempo by overlap-add of resampled grains: pitch ratio r, length factor 1/tempo.
function pitchTempo(pcm, semis, tempo) {
  const r = Math.pow(2, semis / 12), outLen = Math.round(pcm.length / tempo); if (r === 1 && tempo === 1) return pcm;
  const G = 2048, Hp = G / 4, out = new Float32Array(outLen), norm = new Float32Array(outLen), win = HANN(G);
  for (let t = 0; t < outLen; t += Hp) {
    const start = t * tempo - (G * r - G) / 2;
    for (let i = 0; i < G && t + i < outLen; i++) { const sp = start + i * r, k = Math.floor(sp), fr = sp - k; out[t + i] += ((pcm[k] || 0) * (1 - fr) + (pcm[k + 1] || 0) * fr) * win[i]; norm[t + i] += win[i]; }
  }
  for (let i = 0; i < outLen; i++) out[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0;
  return out;
}
async function filters(pcm) {
  const on = id => $(id).checked, val = id => +$(id).value;
  if (!on("#fx-hp-on") && !on("#fx-eq-on") && !on("#fx-comp-on") && !on("#fx-gain-on")) return pcm;
  const oc = new OfflineAudioContext(1, pcm.length, P.rate), buf = oc.createBuffer(1, pcm.length, P.rate); buf.copyToChannel(pcm, 0);
  const s = oc.createBufferSource(); s.buffer = buf; let node = s;
  const bq = (type, f, gain, q) => { const b = oc.createBiquadFilter(); b.type = type; b.frequency.value = f; if (gain != null) b.gain.value = gain; if (q) b.Q.value = q; node.connect(b); node = b; };
  if (on("#fx-hp-on")) bq("highpass", val("#fx-hp"), null, 0.7);
  if (on("#fx-eq-on")) { bq("lowshelf", 200, val("#fx-bass")); bq("peaking", 1500, val("#fx-mid"), 0.9); bq("highshelf", 4500, val("#fx-treble")); }
  if (on("#fx-comp-on")) { const c = oc.createDynamicsCompressor(); c.threshold.value = val("#fx-comp"); c.ratio.value = 4; c.attack.value = 0.005; c.release.value = 0.15; c.knee.value = 6; node.connect(c); node = c;
    const mk = oc.createGain(); mk.gain.value = Math.pow(10, (-val("#fx-comp") / 4) / 20); node.connect(mk); node = mk; }
  if (on("#fx-gain-on")) { const g = oc.createGain(); g.gain.value = Math.pow(10, val("#fx-gain") / 20); node.connect(g); node = g; }
  node.connect(oc.destination); s.start();
  return (await oc.startRendering()).getChannelData(0).slice();
}
async function processFx(pcm) {
  let o = pcm;
  if ($("#fx-nr-on").checked) o = denoise(o, +$("#fx-nr").value / 100, noiseProfile);
  if ($("#fx-pitch-on").checked) o = pitchTempo(o, +$("#fx-pitch").value, +$("#fx-tempo").value / 100);
  return filters(o);
}

/* ================= effects rack UI ================= */
const FX_FMT = { "#fx-nr": v => toBn(v) + "%", "#fx-hp": v => toBn(v), "#fx-bass": v => toBn(v) + " dB", "#fx-mid": v => toBn(v) + " dB", "#fx-treble": v => toBn(v) + " dB", "#fx-comp": v => toBn(v) + " dB", "#fx-pitch": v => (v > 0 ? "+" : "") + toBn(v), "#fx-tempo": v => toBn(v) + "%", "#fx-gain": v => (v > 0 ? "+" : "") + toBn(v) + " dB", "#mx-vol": v => toBn(v) + " dB", "#mx-tvol": v => (v > 0 ? "+" : "") + toBn(v) + " dB", "#sp-vstr": v => toBn(v) + "%" };
function fxLabels() {
  Object.entries(FX_FMT).forEach(([id, f]) => { const el = $(id); if (el) el.nextElementSibling.textContent = f(+el.value); });
  $$(".fx-mod").forEach(m => { const c = m.querySelector(".fx-h input"); if (c) m.classList.toggle("on", c.checked); });
  store("lx_snd_fx", Object.fromEntries($$(".fx input").map(i => [i.id, i.type === "checkbox" ? i.checked : i.value])));
}
$$(".fx input[type=range]").forEach(i => i.addEventListener("input", () => { const c = i.closest(".fx-mod").querySelector(".fx-h input"); if (c) c.checked = true; fxLabels(); }));
$$(".fx-h input").forEach(i => i.addEventListener("change", fxLabels));
$$("#pn-mix input[type=range]").forEach(i => i.addEventListener("input", fxLabels));
Object.entries(load("lx_snd_fx", {})).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.type === "checkbox" ? (el.checked = v) : (el.value = v); });
fxLabels();
const PRESETS = {
  voice: { "fx-nr-on": true, "fx-nr": 45, "fx-hp-on": true, "fx-hp": 80, "fx-eq-on": true, "fx-bass": -2, "fx-mid": 2, "fx-treble": 3, "fx-comp-on": true, "fx-comp": -22, "fx-pitch-on": false, "fx-gain-on": false },
  field: { "fx-nr-on": true, "fx-nr": 75, "fx-hp-on": true, "fx-hp": 120, "fx-eq-on": true, "fx-bass": -4, "fx-mid": 3, "fx-treble": 2, "fx-comp-on": true, "fx-comp": -26, "fx-pitch-on": false, "fx-gain-on": false },
  song: { "fx-nr-on": true, "fx-nr": 25, "fx-hp-on": true, "fx-hp": 60, "fx-eq-on": true, "fx-bass": 1, "fx-mid": 0, "fx-treble": 2, "fx-comp-on": true, "fx-comp": -18, "fx-pitch-on": false, "fx-gain-on": false },
  phone: { "fx-nr-on": true, "fx-nr": 55, "fx-hp-on": true, "fx-hp": 150, "fx-eq-on": true, "fx-bass": 3, "fx-mid": -2, "fx-treble": 4, "fx-comp-on": true, "fx-comp": -20, "fx-pitch-on": false, "fx-gain-on": false },
  flat: { "fx-nr-on": false, "fx-nr": 50, "fx-hp-on": false, "fx-hp": 80, "fx-eq-on": false, "fx-bass": 0, "fx-mid": 0, "fx-treble": 0, "fx-comp-on": false, "fx-comp": -24, "fx-pitch-on": false, "fx-pitch": 0, "fx-tempo": 100, "fx-gain-on": false, "fx-gain": 0 },
};
$("#fx-preset").onchange = e => { const p = PRESETS[e.target.value]; if (!p) return; Object.entries(p).forEach(([id, v]) => { const el = document.getElementById(id); el.type === "checkbox" ? (el.checked = v) : (el.value = v); }); fxLabels(); e.target.value = ""; msg("প্রিসেট বসানো হলো — প্রিভিউ শুনে প্রয়োগ করুন"); };
$("#fx-profile").onclick = () => { if (!P.sel) return; noiseProfile = spectrum(P.pcm.slice(P.sel[0], P.sel[1])); $("#fx-prof").textContent = noiseProfile ? "✓ নয়েজ ধরা হয়েছে" : "আরও লম্বা অংশ বাছুন"; if (noiseProfile) { $("#fx-nr-on").checked = true; fxLabels(); } };
$("#fx-preview").onclick = async () => {
  if (!N()) return; if (previewing) { stop(); return; }
  const [a, b] = P.sel || [P.cursor, Math.min(N(), P.cursor + P.rate * 10)]; msg("প্রিভিউ তৈরি হচ্ছে…"); await tick0();
  const out = await processFx(P.pcm.slice(a, b)); msg("প্রিভিউ চলছে (ইফেক্টসহ) — আবার চাপলে থামবে");
  playBuffer(out, 0, out.length, { preview: true }); $("#fx-preview").classList.add("on");
};
$("#fx-apply").onclick = async () => {
  if (!N()) return; const [a, b] = selOrAll();
  msg("প্রয়োগ হচ্ছে… বড় রেকর্ডে কয়েক সেকেন্ড লাগতে পারে"); await tick0();
  const out = await processFx(P.pcm.slice(a, b));
  commit(() => { replaceRange(a, b, out); if (P.sel) P.sel = [a, a + out.length]; }, "✓ ইফেক্ট প্রয়োগ হয়েছে — পছন্দ না হলে ↶");
};

/* ================= mix & separate ================= */
// Add music under the voice: from the cursor (or across the selection), looped if asked, with its own volume and fades.
$("#mx-add").onclick = async () => {
  if (!N()) { msg("আগে কণ্ঠ রেকর্ড করুন বা ফাইল আনুন।"); return; }
  const f = await pickFile(); if (!f) return; msg("মিউজিক মেশানো হচ্ছে…"); await tick0();
  try {
    const a = await decode(f), m = await resample(a.pcm, a.rate, P.rate);
    const [s, e] = P.sel || [P.cursor >= N() ? 0 : P.cursor, N()], len = e - s, g = Math.pow(10, +$("#mx-vol").value / 20), loop = $("#mx-loop").checked;
    const fade = Math.min(Math.round(P.rate * 1.5), len >> 2);
    commit(() => {
      const o = P.pcm.slice();
      for (let i = 0; i < len; i++) {
        const k = loop ? i % m.length : i; if (k >= m.length) break;
        const env = Math.min(1, i / fade, (len - i) / fade);
        o[s + i] += m[k] * g * env;
      }
      const pk = peakOf(o, s, e); if (pk > 0.99) for (let i = s; i < e; i++) o[i] *= 0.98 / pk;
      P.pcm = o;
    }, `✓ “${f.name}” মিউজিক হিসেবে মেশানো হলো`);
  } catch (err) { msg("মিউজিক ফাইল পড়া যায়নি: " + err.message); }
};
// Stereo separation (a song file): voices usually sit in the middle, instruments are spread to the sides.
async function separate(keepVoice) {
  const f = await pickFile(); if (!f) return;
  msg(keepVoice ? "কণ্ঠ আলাদা করা হচ্ছে…" : "কণ্ঠ সরানো হচ্ছে…"); await tick0();
  try {
    const buf = await decodeRaw(f);
    if (buf.numberOfChannels < 2) { msg("এটি মোনো ফাইল — আলাদা করতে স্টেরিও গান লাগবে। মোনোর জন্য “কণ্ঠ-ব্যান্ড” বোতাম ব্যবহার করুন।"); return; }
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length, mid = new Float32Array(n), side = new Float32Array(n);
    for (let i = 0; i < n; i++) { mid[i] = (L[i] + R[i]) / 2; side[i] = (L[i] - R[i]) / 2; }
    const str = +$("#sp-vstr").value / 100;
    let out;
    if (keepVoice) { // music remover: take the middle, subtract what also appears on the sides, keep the voice band
      const bin = 1 / 2048 * buf.sampleRate;
      out = stftGain(mid, (k, m, f, s) => { const hz = k * bin, band = hz < 90 || hz > 8000 ? 0.15 : 1; return band * Math.max(0.04, 1 - str * 1.6 * s / m); }, side);
    } else { // voice remover: the sides only (centre cancelled), plus the bass from the middle so the music keeps its body
      const oc = new OfflineAudioContext(1, n, buf.sampleRate), b = oc.createBuffer(1, n, buf.sampleRate); b.copyToChannel(mid, 0);
      const s = oc.createBufferSource(); s.buffer = b; const lp = oc.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 150; s.connect(lp); lp.connect(oc.destination); s.start();
      const bass = (await oc.startRendering()).getChannelData(0);
      out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = side[i] * (1 + str) + bass[i];
    }
    const pk = peakOf(out); if (pk > 1e-4) for (let i = 0; i < n; i++) out[i] *= 0.89 / pk;
    if (!N()) P.rate = Math.min(buf.sampleRate, 48000);
    const pcm = await resample(out, buf.sampleRate, P.rate);
    commit(() => appendPart(pcm, { name: `${f.name.replace(/\.[^.]+$/, "")} — ${keepVoice ? "কণ্ঠ" : "মিউজিক"}`, kind: keepVoice ? "song" : "other" }), keepVoice ? "✓ কণ্ঠ আলাদা হলো (নতুন অংশ হিসেবে যোগ)" : "✓ কণ্ঠ সরানো হলো (নতুন অংশ হিসেবে যোগ)");
    zoomFit();
  } catch (err) { msg("ফাইল পড়া যায়নি: " + err.message); }
}
$("#sp-voice").onclick = () => separate(true);
$("#sp-music").onclick = () => separate(false);
// Mono material: keep only the voice band (~120 Hz – 4 kHz, emphasised) or cut it out.
async function voiceBand(keep) {
  if (!N()) return; const [a, b] = selOrAll(); msg("প্রক্রিয়া চলছে…"); await tick0();
  const pcm = P.pcm.slice(a, b), oc = new OfflineAudioContext(1, pcm.length, P.rate), buf = oc.createBuffer(1, pcm.length, P.rate); buf.copyToChannel(pcm, 0);
  const s = oc.createBufferSource(); s.buffer = buf; let node = s;
  const bq = (type, f, q, gain) => { const x = oc.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; if (gain != null) x.gain.value = gain; node.connect(x); node = x; };
  if (keep) { bq("highpass", 120, 0.8); bq("lowpass", 4000, 0.8); bq("peaking", 1800, 0.8, 3); } else { bq("notch", 1000, 0.35); bq("peaking", 1000, 0.5, -18); }
  node.connect(oc.destination); s.start();
  const out = (await oc.startRendering()).getChannelData(0).slice();
  commit(() => replaceRange(a, b, out), keep ? "✓ কণ্ঠ-ব্যান্ড রাখা হলো" : "✓ কণ্ঠ-ব্যান্ড কমানো হলো");
}
$("#sp-band").onclick = () => voiceBand(true);
$("#sp-noband").onclick = () => voiceBand(false);

/* ================= regions table ================= */
const kindOpts = sel => Object.entries(KINDS).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${v[0]}</option>`).join("");
$("#r-kindall").innerHTML = `<option value="">সব অংশের ধরন…</option>` + kindOpts("");
// Compact cards in the right column: name and play on top; time, kind and the small tools below.
function drawRegions() {
  $("#r-count").textContent = toBn(P.regions.length); $("#rt-r").textContent = P.regions.length ? toBn(P.regions.length) : "";
  $("#r-body").innerHTML = P.regions.map((r, k) => `<div class="rg${r.skip ? " skip" : ""}" data-id="${r.id}">
    <div class="rg-top"><span class="dot" style="background:${REG_COLORS[k % REG_COLORS.length]}"></span><span class="rg-n">${toBn(k + 1)}</span>
      <input data-f="name" value="${esc(r.name)}" placeholder="শব্দ বা শিরোনাম">
      <button type="button" class="ib" data-act="play" title="শুনুন">▶</button></div>
    <div class="rg-sub"><span class="mono">${fmt(r.a / P.rate).slice(0, 8)} · ${fmtS((r.b - r.a) / P.rate)}</span>
      <select data-f="kind">${kindOpts(r.kind)}</select>
      ${r.lexeme ? `<a class="lx" href="https://www.wikidata.org/wiki/Lexeme:${esc(r.lexeme)}" target="_blank" rel="noopener">${esc(r.lexeme)}</a>` : ""}
      <span class="s-fill"></span>
      <button type="button" class="ib${infoCount(r) ? " has" : ""}" data-act="info" title="শব্দের বিস্তারিত (অর্থ ইত্যাদি)">ⓘ</button>
      <button type="button" class="ib" data-act="sel" title="টাইমলাইনে নির্বাচন">⌖</button>
      ${k < P.regions.length - 1 ? `<button type="button" class="ib" data-act="join" title="পরের অংশের সঙ্গে জোড়া">⤓</button>` : ""}
      <label class="rg-skip" title="আপলোডে বাদ"><input type="checkbox" data-f="skip"${r.skip ? " checked" : ""}>বাদ</label></div>
    ${r.kind !== "word" ? `<input class="rg-text" data-f="text" value="${esc(r.text)}" placeholder="কথা / লিরিক (ঐচ্ছিক)">` : ""}</div>`).join("") || `<p class="hint">রেকর্ড করলে বা ফাইল আনলে অংশগুলো এখানে আসবে। ✂ দিয়ে ভাগ করুন, ⤓ দিয়ে জোড়া দিন।</p>`;
}
const regOf = el => P.regions.find(r => r.id === el.closest("[data-id]")?.dataset.id);
$("#r-body").addEventListener("change", async e => {
  const r = regOf(e.target), f = e.target.dataset.f; if (!r || !f) return;
  r[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value.trim();
  if (f === "name" || f === "kind") { r.lexeme = r.kind === "word" ? await findLexeme(r.name) : ""; drawRegions(); }
  if (f === "skip") e.target.closest(".rg").classList.toggle("skip", r.skip);
  drawAll(); saveProject();
});
// Enter in a name box moves to the next part's name — quick naming of many recordings.
$("#r-body").addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.target.dataset.f !== "name") return; e.preventDefault();
  const all = $$("#r-body [data-f=name]"), i = all.indexOf(e.target); e.target.blur(); setTimeout(() => all[i + 1]?.focus() || $$("#r-body [data-f=name]")[i + 1]?.focus(), 30);
});
$("#r-body").addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const r = regOf(b);
  if (b.dataset.act === "play") playBuffer(P.pcm, r.a, r.b);
  if (b.dataset.act === "sel") { P.sel = [r.a, r.b]; if (xOf(r.a) < 0 || xOf(r.b) > viewW()) V.start = r.a - (viewW() * V.spp - (r.b - r.a)) / 2; drawAll(); }
  if (b.dataset.act === "info") { r.word = r.name; openInfo(r, () => { delete r.word; drawRegions(); saveProject(); }); return; }
  if (b.dataset.act === "join") commit(() => { const i = P.regions.indexOf(r), nx = P.regions[i + 1]; if (nx) { r.b = nx.b; P.regions.splice(i + 1, 1); } }, "অংশ জোড়া হলো");
});
function highlightRow(id) { const tr = $(`#r-body [data-id="${id}"]`); if (tr) { tr.scrollIntoView({ block: "nearest" }); tr.classList.add("hl"); setTimeout(() => tr.classList.remove("hl"), 900); } }
// The chosen kind stays shown: it is set on every part now and used for new parts.
$("#r-kindall").onchange = e => { const k = e.target.value; store("lx_snd_kindall", k); if (!k) return; P.regions.forEach(r => { r.kind = k; if (k !== "word") r.lexeme = ""; }); drawRegions(); saveProject(); msg(`সব অংশের ধরন: ${KINDS[k][0]}`); };
$("#r-kindall").value = load("lx_snd_kindall", "");
/* word list → parts: unnamed parts take the list's next unrecorded words, in order */
function mapWords(quiet) {
  const open = () => { for (let k = 0; k < WORDS.length; k++) if (!WORDS[k].done) return k; return -1; };
  let n = 0;
  P.regions.forEach(r => {
    if (r.name || r.skip) return; const i = open(); if (i < 0) return; const w = WORDS[i];
    r.name = w.word; r.kind = "word"; r.lexeme = w.lexeme || ""; if (w.gloss) r.info = { ...(r.info || {}), gloss: w.gloss }; w.done = true; n++;
  });
  if (n) { wordPos = Math.max(0, open()); saveWords(); drawRegions(); drawAll(); saveProject(); }
  if (!quiet || n) msg(n ? `✓ ${toBn(n)}টি অংশে শব্দ-তালিকার নাম বসল (ক্রমানুসারে)` : WORDS.some(w => !w.done) ? "নামহীন অংশ নেই" : "শব্দ-তালিকায় বাকি শব্দ নেই");
  return n;
}
$("#r-map").onclick = () => mapWords(false);
const sentClip = r => r.clipId && Q.find(c => c.id === r.clipId);
async function exportRegion(r, name) {
  const old = sentClip(r); if (old) { if (old.status === "done") return null; await DB.del(old.id); Q = Q.filter(x => x !== old); } // re-sent: the newer audio wins
  let pcm = P.pcm.slice(r.a, r.b); const pk = peakOf(pcm); if (pk > 0.99) pcm = pcm.map(v => v * 0.98 / pk);
  const c = { id: uid(), word: name ?? r.name, kind: r.kind || "word", text: r.text || "", lexeme: r.lexeme || "", info: r.info || (r.text && r.kind === "word" ? { gloss: r.text } : undefined), dur: (r.b - r.a) / P.rate, blob: encodeWav(pcm, P.rate), status: "new", created: new Date().toISOString(), speaker: { ...SP }, project: PJ.name, extra: PJ.extra };
  await DB.put(c); Q.push(c); syncClip(c, true); r.clipId = c.id; return c;
}
$("#r-export").onclick = async () => {
  const list = P.regions.filter(r => !r.skip && r.b - r.a > P.rate * 0.15 && !sentClip(r));
  if (!list.length) { msg(P.regions.some(sentClip) ? "সব অংশ আগেই আপলোড তালিকায় আছে" : "পাঠানোর মতো কোনো অংশ নেই।"); return; }
  const base = $("#r-title").value.trim();
  for (const [i, r] of list.entries()) await exportRegion(r, r.name || (base ? (list.length > 1 ? `${base} (${toBn(i + 1)})` : base) : ""));
  drawQueue(); drawRegions(); saveProject(); setRTab("pn-queue"); msg(`✓ ${toBn(list.length)}টি অংশ আপলোড তালিকায় গেছে`);
};

/* ================= upload list ================= */
let Q = [];
const ST_BN = { new: "বাকি", uploading: "উঠছে…", done: "✓ উঠেছে", error: "সমস্যা" };
function drawQueue() {
  Q.sort((a, b) => a.created.localeCompare(b.created));
  $("#q-count").textContent = toBn(Q.length);
  const html = Q.map(c => `<div class="q-item st-${c.status}" data-id="${c.id}">
      <button type="button" class="ib" data-act="play">▶</button>
      <div class="q-main">${c.status === "done" ? `<b>${esc(c.word)}</b>` : `<input data-f="word" value="${esc(c.word)}" placeholder="শব্দ বা শিরোনাম *">`}
        <small>${esc(c.speaker?.name || "")} · ${esc(KINDS[c.kind]?.[0] || "")} · ${fmtS(c.dur || 0)} · <span class="st">${ST_BN[c.status]}</span>${c.file ? ` · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c.file)}" target="_blank" rel="noopener">কমন্স</a>` : ""}${c.linked ? ` · <a href="https://www.wikidata.org/wiki/Lexeme:${esc(c.linked.split("-")[0])}" target="_blank" rel="noopener">${esc(c.linked)}</a>` : ""}${c.error ? `<br><em>${esc(c.error)}</em>` : ""}</small></div>
      <button type="button" class="ib${infoCount(c) ? " has" : ""}" data-act="info" title="শব্দের বিস্তারিত">ⓘ${infoCount(c) ? `<sup>${toBn(infoCount(c))}</sup>` : ""}</button><button type="button" class="ib q-open" data-act="open" title="স্টুডিওর টাইমলাইনে খুলুন">↗</button><button type="button" class="ib" data-act="del" title="${c.status === "done" ? "তালিকা থেকে সরান" : "মুছুন"}">✕</button></div>`).join("") || `<p class="hint">অংশগুলো “আপলোড তালিকায় পাঠান” চাপলে এখানে আসবে। ইন্টারনেট ছাড়াও জমা থাকে।</p>`;
  $$(".q-list").forEach(el => { el.innerHTML = html; }); // full studio and the simple mode
  const left = Q.filter(c => c.status !== "done").length;
  $$(".q-up").forEach(b => { b.disabled = !left; }); $$(".q-msg").forEach(m => { m.textContent = left ? `${toBn(left)}টি আপলোড বাকি` : Q.length ? "সব উঠেছে।" : ""; });
  $("#rt-q").textContent = left ? toBn(left) : ""; // upload tab: how many are waiting
  document.dispatchEvent(new CustomEvent("sl-queue", { detail: { total: Q.length, left } }));
}
const qOf = el => Q.find(c => c.id === el.closest(".q-item")?.dataset.id);
document.addEventListener("click", async e => {
  const b = e.target.closest(".q-list [data-act]"); if (!b) return; const c = qOf(b);
  if (b.dataset.act === "info") { if (c.status === "done") { msg("আপলোড হয়ে গেছে — বিস্তারিত কমন্সে সরাসরি বদলান।"); } openInfo(c, async () => { await DB.put(c); drawQueue(); syncClip(c, false); }); return; }
  if (b.dataset.act === "open") { try { const a = await decode(await getBlob(c)); if (!N()) P.rate = a.rate; const pcm = await resample(a.pcm, a.rate, P.rate); commit(() => appendPart(pcm, { name: c.word, kind: c.kind, text: c.text, lexeme: c.lexeme }), `✓ “${c.word || "নামহীন"}” টাইমলাইনে খোলা হলো`); setEditor(true); zoomFit(); } catch (err) { msg("খোলা যায়নি: " + err.message); } return; }
  if (b.dataset.act === "play") playBlob(await getBlob(c));
  if (b.dataset.act === "del") { if (c.status !== "done" && !confirm(`“${c.word || "নামহীন"}” মুছবেন?`)) return; await DB.del(c.id); Q = Q.filter(x => x !== c); drawQueue(); if (SYNC()) fetch(`/store/clips/${c.id}`, { method: "DELETE" }).catch(() => {}); }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.closest(".q-list") || e.target.dataset.f !== "word") return; e.preventDefault();
  const list = e.target.closest(".q-list"), all = [...list.querySelectorAll("[data-f=word]")], i = all.indexOf(e.target); e.target.blur();
  setTimeout(() => [...list.querySelectorAll("[data-f=word]")][i + 1]?.focus(), 60);
});
document.addEventListener("change", async e => { if (!e.target.closest(".q-list")) return; const c = qOf(e.target); if (!c || e.target.dataset.f !== "word") return; c.word = e.target.value.trim(); c.lexeme = c.kind === "word" ? await findLexeme(c.word) : ""; await DB.put(c); syncClip(c, false); });

async function api(base, params, post) {
  let r;
  if (post) { const fd = new FormData(); Object.entries({ format: "json", ...params }).forEach(([k, v]) => fd.append(k, v)); r = await fetch(base, { method: "POST", body: fd }); }
  else r = await fetch(`${base}?${new URLSearchParams({ format: "json", ...params })}`);
  const j = await r.json(); if (j.error) throw new Error(j.error.info || j.error.code); return j;
}
const token = async base => (await api(base, { action: "query", meta: "tokens" })).query.tokens.csrftoken;
const safe = s => String(s).replace(/[#<>\[\]|{}\/:\\]/g, "").replace(/\s+/g, " ").trim();
function fileName(c) { const code = langOf(c.speaker.lang)[0] || "mis"; return `Libre Studio-${code}-${safe(c.speaker.name)}-${safe(c.word).slice(0, 80)}${c.kind !== "word" ? "-" + c.id.slice(-5) : ""}.wav`; }
function wikitext(c) {
  const s = c.speaker, L = langOf(s.lang), lang = L[3] === "other" ? s.other : L[2], langEn = L[3] === "other" ? s.other : L[3];
  const dist = SD_DISTRICTS.find(d => d[0] === s.district), where = [s.place, s.district].filter(Boolean).join(", ");
  const kind = c.kind || "word", K = KINDS[kind] || KINDS.word;
  const info = [`ভাষা: ${lang}`, s.dialect && `উপভাষা: ${s.dialect}`, where && `অঞ্চল: ${where}`, s.gender && `লিঙ্গ: ${{ female: "নারী", male: "পুরুষ", other: "অন্য" }[s.gender]}`, s.age && `বয়স: ${s.age}`, `ভাষাটি বক্তার: ${LEVEL_BN[s.level] || ""}`, s.learned && `শিখেছেন: ${s.learned}`].filter(Boolean).join("; ");
  const cats = ["Libre Studio recordings", kind === "word" ? L[3] !== "other" && `${langEn} pronunciation` : `Libre Studio ${K[1]}`, kind !== "word" && L[3] !== "other" && `${langEn}-language audio files`, dist && `Libre Studio recordings from ${dist[1]} District`].filter(Boolean);
  return `== {{int:filedesc}} ==
{{Information
|description={{bn|1=${kind === "word" ? `“${c.word}” শব্দের উচ্চারণ` : `${K[0]}: “${c.word}”`} — ${lang}${s.dialect ? ` (${s.dialect})` : ""}।${Object.entries(c.info || {}).map(([k, v]) => `<br>${INFO_BN[k] || k}: ${String(v).replace(/[{}|]/g, "")}`).join("")}<br>বক্তা: ${s.name}। ${info}।${c.project ? `<br>প্রজেক্ট: ${c.project}` : ""}${c.text ? `<br><poem>${c.text.replace(/[{}|]/g, "")}</poem>` : ""}}}{{en|1=${kind === "word" ? "Pronunciation of" : `Recording (${K[1]}):`} “${c.word}”${c.info?.en ? ` (“${c.info.en.replace(/[{}|]/g, "")}”)` : ""} in ${langEn}${dist ? `, speaker from ${dist[1]} District, Bangladesh` : ""}. Speaker: ${s.name}.}}
|date=${c.created.slice(0, 10)}
|source={{own}} — লিব্রে স্টুডিও (lexeme.bnwp.org/studio)
|author=[[User:${window.LX_USER}|${window.LX_USER}]] (বক্তা: ${s.name})
}}${c.lexeme ? `\nWikidata: [[d:Lexeme:${c.lexeme}|${c.lexeme}]]` : ""}

== {{int:license-header}} ==
{{self|${s.license || "cc-by-sa-4.0"}}}

${c.extra ? c.extra + "\n" : ""}${cats.map(x => `[[Category:${x}]]`).join("\n")}`;
}
async function linkLexeme(c, file, wdTok) {
  const j = await api("/proxy/wd", { action: "wbgetentities", ids: c.lexeme }); const e = j.entities[c.lexeme]; if (!e || e.missing !== undefined) return "";
  const form = (e.forms || []).find(f => Object.values(f.representations || {}).some(r => r.value === c.word)), target = form ? form.id : c.lexeme;
  if ((((form ? form.claims : e.claims) || {}).P443 || []).some(s => s.mainsnak?.datavalue?.value === file)) return target;
  await api("/proxy/wd", { action: "wbcreateclaim", entity: target, property: "P443", snaktype: "value", value: JSON.stringify(file), token: wdTok, summary: "লিব্রে স্টুডিও: উচ্চারণ যোগ" }, true);
  return target;
}
// ids: upload only these (the simple mode's ticked list); otherwise everything not yet uploaded.
async function uploadAll(ids) {
  if (!Array.isArray(ids)) ids = null;
  const say = t => { $$(".q-msg").forEach(m => { m.textContent = t; }); };
  const bad = Q.find(c => c.status !== "done" && (!ids || ids.includes(c.id)) && (!c.speaker?.name || !c.speaker?.consent || !c.speaker?.district));
  if (bad) { say(`“${bad.word || "নামহীন"}”-এর বক্তার তথ্য অসম্পূর্ণ — বক্তা বেছে অংশটি আবার পাঠান।`); $("#sp-form").hidden = false; return; }
  if (!window.LX_NODE) { say("আপলোড শুধু সাইটের সার্ভার থেকে চলে (lexeme.bnwp.org)।"); return; }
  if (!window.LX_USER) { say("আপলোডের আগে লগ ইন করুন — রেকর্ডগুলো জমা থাকবে।"); window.LXAuth?.login(); return; }
  if (!navigator.onLine) { say("ইন্টারনেট নেই — সংযোগ ফিরলে আবার চাপুন।"); return; }
  $$(".q-up").forEach(b => { b.disabled = true; }); let cTok, wTok;
  try { cTok = await token("/proxy/commons"); } catch (e) { say("কমন্সের অনুমতি পাওয়া যায়নি: " + e.message); $$(".q-up").forEach(b => { b.disabled = false; }); return; }
  for (const c of Q.filter(x => x.status !== "done" && (!ids || ids.includes(x.id)))) {
    if (!c.word) { c.status = "error"; c.error = "শব্দ বা শিরোনাম লিখুন"; await DB.put(c); drawQueue(); continue; }
    c.status = "uploading"; c.error = ""; drawQueue();
    try {
      if (!c.file) {
        const name = fileName(c), fd = new FormData();
        Object.entries({ action: "upload", format: "json", filename: name, text: wikitext(c), comment: `লিব্রে স্টুডিও: “${c.word}”`, token: cTok }).forEach(([k, v]) => fd.append(k, v));
        fd.append("file", await getBlob(c), name);
        const j = await (await fetch("/proxy/commons", { method: "POST", body: fd })).json();
        if (j.error) throw new Error(j.error.info || j.error.code);
        if (j.upload?.result !== "Success") { const w = j.upload?.warnings || {}; throw new Error(w.exists || w.duplicate ? "এই নামে বা এই একই ফাইল কমন্সে আগেই আছে" : "কমন্স সতর্ক করেছে: " + Object.keys(w).join(", ")); }
        c.file = j.upload.filename; await DB.put(c);
      }
      if (c.lexeme && !c.linked && c.kind === "word") { wTok ||= await token("/proxy/wd"); c.linked = await linkLexeme(c, c.file, wTok); }
      c.status = "done";
    } catch (e) { c.status = "error"; c.error = e.message; }
    await DB.put(c); drawQueue(); syncClip(c, false);
  }
};

/* ================= word details (any mode) ================= */
// Meaning, English, word class, pronunciation, standard form, example and a note travel with a recording:
// into the Commons description, the server copy, and later into lexemes.
const INFO_FIELDS = [["gloss", "অর্থ", "শব্দটির মানে", true], ["en", "ইংরেজি", "English meaning"], ["pos", "শব্দশ্রেণি", "", false, ["", "বিশেষ্য", "বিশেষণ", "ক্রিয়া", "ক্রিয়াবিশেষণ", "সর্বনাম", "অব্যয়", "বাগধারা", "প্রবাদ", "অন্য"]],
  ["ipa", "উচ্চারণ", "আধ্বব বা বাংলা হরফে, যেমন /ɟɔl/"], ["standard", "প্রমিত রূপ", "আঞ্চলিক শব্দ হলে প্রমিত বাংলায় কী"], ["example", "উদাহরণ বাক্য", "", true], ["note", "টীকা", "কোথায়, কারা, কখন বলে…", true]];
const INFO_BN = Object.fromEntries(INFO_FIELDS.map(f => [f[0], f[1]]));
const infoCount = o => Object.values(o?.info || {}).filter(Boolean).length;
function openInfo(target, onSave) {
  let d = $("#info-dlg");
  if (!d) { d = document.createElement("div"); d.id = "info-dlg"; d.className = "st-help info-dlg"; document.body.appendChild(d); d.addEventListener("click", e => { if (e.target === d) d.hidden = true; }); }
  const inf = { ...(target.info || {}) };
  d.innerHTML = `<form class="st-help-in info-in"><h3>শব্দের বিস্তারিত — “${esc(target.word || target.name || "নামহীন")}”</h3>
    ${INFO_FIELDS.map(([k, label, ph, long, opts]) => `<label>${label}${opts ? `<select name="${k}">${opts.map(o => `<option${o === (inf[k] || "") ? " selected" : ""}>${o}</option>`).join("")}</select>`
      : long ? `<textarea name="${k}" rows="2" placeholder="${esc(ph)}">${esc(inf[k] || "")}</textarea>` : `<input name="${k}" value="${esc(inf[k] || "")}" placeholder="${esc(ph)}">`}</label>`).join("")}
    <div class="info-acts"><button type="button" class="sbtn" data-x>বাতিল</button><button class="sbtn pri">সংরক্ষণ</button></div></form>`;
  d.hidden = false; d.querySelector("[name=gloss]").focus();
  d.querySelector("[data-x]").onclick = () => { d.hidden = true; };
  d.querySelector("form").onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); target.info = Object.fromEntries(INFO_FIELDS.map(([k]) => [k, String(f.get(k) || "").trim()]).filter(([, v]) => v)); d.hidden = true; onSave?.(target); };
}

/* ================= server storage (logged-in users) ================= */
// Recordings and the word list are kept on the server too, so a take made on a phone opens on a PC later.
const SYNC = () => !!(window.LX_NODE && window.LX_USER);
const META_KEYS = ["id", "word", "kind", "text", "lexeme", "dur", "status", "file", "linked", "error", "created", "speaker", "project", "extra", "info"];
async function syncClip(c, withAudio) {
  if (!SYNC()) return;
  try {
    if (withAudio || !c.synced) { const b = c.blob; if (b) { const r = await fetch(`/store/clips/${c.id}/audio`, { method: "PUT", headers: { "Content-Type": "audio/wav" }, body: b }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status); } }
    await fetch(`/store/clips/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(META_KEYS.map(k => [k, c[k]]))) });
    if (!c.synced) { c.synced = true; await DB.put(c); }
    cloud("☁ সার্ভারে সংরক্ষিত");
  } catch (e) { cloud("☁ সার্ভারে রাখা যায়নি — পরে আবার চেষ্টা হবে"); }
}
// Audio of a clip made on another device is fetched when first needed, then kept here.
async function getBlob(c) {
  if (c.blob) return c.blob;
  const r = await fetch(`/store/clips/${c.id}.wav`); if (!r.ok) throw new Error("সার্ভার থেকে অডিও আনা যায়নি");
  c.blob = await r.blob(); await DB.put(c); return c.blob;
}
function cloud(t) { $$(".q-cloud").forEach(el => { el.textContent = t; }); }
async function syncDown() {
  if (!SYNC()) { cloud(window.LX_NODE ? "লগ ইন করলে রেকর্ড সার্ভারেও জমা থাকবে — অন্য ডিভাইস থেকেও খোলা যাবে" : ""); return; }
  try {
    const list = await (await fetch("/store/clips")).json(); const have = new Map(Q.map(c => [c.id, c]));
    for (const m of list) { const c = have.get(m.id); if (!c) { const n = { ...m, synced: true, blob: null }; await DB.put(n); Q.push(n); } else if ((m.status === "done") && c.status !== "done") { Object.assign(c, m); await DB.put(c); } }
    const onServer = new Set(list.map(m => m.id));
    for (const c of Q) if (!onServer.has(c.id)) syncClip(c, true); // made here before logging in
    drawQueue(); cloud(`☁ সার্ভারে ${toBn(Q.length)}টি রেকর্ড`);
    const sw = await (await fetch("/store/words")).json();
    if (Array.isArray(sw) && sw.length) { const have2 = new Map(WORDS.map(w => [w.word, w])); let added = 0; sw.forEach(w => { const l = have2.get(w.word); if (!l) { WORDS.push(w); added++; } else if (w.done) l.done = true; }); if (added || sw.some(w => w.done)) { store("lx_snd_words", WORDS); drawWords(); } }
    if (WORDS.length) pushWords();
  } catch (e) { cloud("☁ সার্ভারের সঙ্গে মেলানো যায়নি"); }
}
let wordsT;
function pushWords() { if (!SYNC()) return; clearTimeout(wordsT); wordsT = setTimeout(() => fetch("/store/words", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(WORDS) }).catch(() => {}), 1500); }

/* ================= open audio from Wikimedia Commons ================= */
function commonsDialog() {
  let d = $("#cm-dlg");
  if (!d) {
    d = document.createElement("div"); d.id = "cm-dlg"; d.className = "st-help";
    d.innerHTML = `<div class="st-help-in cm-in"><h3>কমন্স থেকে অডিও আনুন</h3>
      <form class="row" id="cm-f"><input id="cm-q" placeholder="শব্দ, File:… বা Category:…" style="flex:1"><button class="sbtn pri">খুঁজুন</button></form>
      <div class="cm-list" id="cm-list"><p class="hint">নাম দিয়ে খুঁজুন (যেমন “Bengali pronunciation”), একটি ফাইল (File:…), বা পুরো বিষয়শ্রেণি (Category:…)। শুধু অডিও আসবে।</p></div>
      <div class="cm-bar" id="cm-bar" hidden><label><input type="checkbox" id="cm-all"> সব বাছুন</label><span class="s-fill"></span><button type="button" class="sbtn pri" id="cm-get" disabled>ফাইল বাছুন</button></div>
      <button type="button" class="sbtn" id="cm-x">বন্ধ</button></div>`;
    document.body.appendChild(d);
    d.addEventListener("click", e => { if (e.target === d || e.target.id === "cm-x") d.hidden = true; });
    const api = o => fetch("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", ...o })).then(r => r.json());
    $("#cm-f").onsubmit = async e => {
      e.preventDefault(); const q = $("#cm-q").value.trim(); if (!q) return; $("#cm-list").innerHTML = `<p class="hint">খোঁজা হচ্ছে…</p>`;
      try {
        const j = /^file:/i.test(q) ? await api({ action: "query", titles: q, prop: "imageinfo", iiprop: "url|size|mime" })
          : /^(category|বিষয়শ্রেণী|বিষয়শ্রেণি):/i.test(q) ? await api({ action: "query", generator: "categorymembers", gcmtitle: "Category:" + q.replace(/^[^:]+:/, ""), gcmtype: "file", gcmlimit: 100, prop: "imageinfo", iiprop: "url|size|mime" })
          : await api({ action: "query", generator: "search", gsrsearch: `${q} filetype:audio`, gsrnamespace: 6, gsrlimit: 40, prop: "imageinfo", iiprop: "url|size|mime" });
        const pages = Object.values(j.query?.pages || {}).filter(p => p.imageinfo?.[0]?.mime?.startsWith("audio") || /\.(ogg|oga|wav|mp3|flac|opus|webm)$/i.test(p.title));
        $("#cm-list").innerHTML = pages.map(p => { const i = p.imageinfo?.[0] || {}; return `<div class="cm-item"><input type="checkbox" class="cm-pick" data-url="${esc(i.url || "")}" data-title="${esc(p.title)}"><audio controls preload="none" src="${esc(i.url || "")}"></audio><div><b>${esc(p.title.replace(/^File:/, ""))}</b><small>${i.size ? toBn(Math.round(i.size / 1024)) + " KB" : ""} · <a href="${esc(i.descriptionurl || "https://commons.wikimedia.org/wiki/" + encodeURIComponent(p.title))}" target="_blank" rel="noopener">কমন্স</a></small></div></div>`; }).join("") || `<p class="hint">কিছু পাওয়া যায়নি।</p>`;
        $("#cm-bar").hidden = !pages.length; $("#cm-all").checked = false; cmCount();
      } catch (err) { $("#cm-list").innerHTML = `<p class="hint">খোঁজা যায়নি: ${esc(err.message)}</p>`; }
    };
    const cmCount = () => { const n = $$(".cm-pick:checked").length; $("#cm-get").disabled = !n; $("#cm-get").textContent = n ? `নির্বাচিত ${toBn(n)}টি আনুন` : "ফাইল বাছুন"; };
    $("#cm-list").addEventListener("change", cmCount);
    $("#cm-all").onchange = e => { $$(".cm-pick").forEach(c => { c.checked = e.target.checked; }); cmCount(); };
    $("#cm-get").onclick = async () => {
      const picks = $$(".cm-pick:checked"); if (!picks.length) return;
      const sep = picks.length > 1 ? (await choose(`${toBn(picks.length)}টি ফাইল কোথায় বসবে?`, [["same", "একই ট্র্যাকে, পরপর"], ["sep", "প্রতিটি আলাদা ট্র্যাকে"]])) : "same"; if (!sep) return;
      let ok = 0;
      for (const [k, c] of picks.entries()) {
        $("#cm-get").textContent = `আনা হচ্ছে ${toBn(k + 1)}/${toBn(picks.length)}…`;
        try {
          const a = await decode(await (await fetch(c.dataset.url)).blob()); if (!maxLen()) P.rate = Math.min(a.rate, 48000);
          const pcm = await resample(a.pcm, a.rate, P.rate), name = c.dataset.title.replace(/^File:/, "").replace(/\.[^.]+$/, ""), meta = { name, text: `উৎস: ${c.dataset.title}` };
          if (sep === "sep" && (N() || k > 0)) addTrack(pcm, name, meta); else commit(() => appendPart(pcm, meta));
          ok++; c.closest(".cm-item").classList.add("got");
        } catch (err) { c.closest(".cm-item").classList.add("bad"); }
      }
      zoomFit(); msg(`✓ কমন্স থেকে ${toBn(ok)}টি ফাইল আনা হলো${ok < picks.length ? ` (${toBn(picks.length - ok)}টি এই ব্রাউজারে চালানো যায়নি)` : ""}`); if (ok) d.hidden = true; cmCount();
    };
  }
  d.hidden = false; $("#cm-q").focus();
}
$("#e-commons").onclick = commonsDialog;

/* ================= tracks strip ================= */
function drawTracks() {
  const el = $("#tracks"); if (!el) return; storeCur();
  el.hidden = TR.list.length < 2; // one track needs no track list
  el.innerHTML = `<div class="trk-head"><label class="trk-mix" title="বন্ধ থাকলে শুধু সক্রিয় ট্র্যাক বাজে"><input type="checkbox" id="trk-mixplay"${load("lx_snd_mixplay", false) ? " checked" : ""}> সব ট্র্যাক একসঙ্গে শুনুন</label><button type="button" class="trk-clear" id="trk-clear" title="সব অডিও ট্র্যাক মুছুন">সব ট্র্যাক মুছুন ✕</button></div>` + TR.list.map((t, i) => `<div class="trk${i === TR.cur ? " on" : ""}${t.mute ? " muted" : ""}" data-i="${i}">
      <button type="button" class="trk-pick" title="এই ট্র্যাক সম্পাদনা করুন">${i === TR.cur ? "●" : "○"}</button>
      <input class="trk-name" value="${esc(t.name)}" title="নাম বদলান">
      <span class="trk-len">${t.pcm.length ? fmtS(t.pcm.length / P.rate) : "খালি"}</span>
      <button type="button" class="trk-b${t.mute ? " act" : ""}" data-a="mute" title="বন্ধ (মিউট)">M</button>
      <button type="button" class="trk-b${t.solo ? " act" : ""}" data-a="solo" title="শুধু এটি (সোলো)">S</button>
      <input type="range" class="trk-vol" min="0" max="150" value="${Math.round(t.gain * 100)}" title="ভলিউম ${toBn(Math.round(t.gain * 100))}%">
      ${TR.list.length > 1 ? `<button type="button" class="trk-b" data-a="del" title="ট্র্যাক মুছুন">✕</button>` : ""}</div>`).join("")
    ;
  // the mix source list
  const src2 = $("#mx-src"); if (src2) src2.innerHTML = TR.list.map((t, i) => i === TR.cur ? "" : `<option value="${i}">${esc(t.name)}</option>`).join("") || `<option value="">অন্য ট্র্যাক নেই</option>`;
}
$("#tracks").addEventListener("click", e => {
  if (e.target.id === "trk-clear") { $("#e-clear").click(); return; }
  const row = e.target.closest(".trk"); if (!row) return; const i = +row.dataset.i, t = TR.list[i], a = e.target.closest("[data-a]")?.dataset.a;
  if (a === "mute") t.mute = !t.mute;
  else if (a === "solo") t.solo = !t.solo;
  else if (a === "del") { if (t.pcm.length && !confirm(`“${t.name}” ট্র্যাক মুছবেন?`)) return; stop(); storeCur(); TR.list.splice(i, 1); TR.cur = Math.min(TR.cur >= i ? Math.max(0, TR.cur - (TR.cur > i ? 1 : 0)) : TR.cur, TR.list.length - 1); const c = curTrack(); P.pcm = c.pcm; P.regions = c.regions; P.sel = null; H.undo = H.undo.filter(x => x.tid !== t.id); H.redo = []; normalize(); drawRegions(); zoomFit(); }
  else if (!e.target.matches(".trk-vol")) {
    if (i !== TR.cur) {
      stop(); loadTrack(i); normalize(); drawRegions(); zoomFit(); msg(`“${t.name}” সম্পাদনা হচ্ছে`);
      if (e.target.matches(".trk-name")) { drawTracks(); const inp = $(`.trk[data-i="${i}"] .trk-name`); inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); return; } // the click was meant for the name: keep typing there
    } else if (e.target.matches(".trk-name")) return;
  }
  drawTracks(); saveProject();
});
$("#tracks").addEventListener("change", e => { if (e.target.id === "trk-mixplay") { store("lx_snd_mixplay", e.target.checked); return; } const row = e.target.closest(".trk"); if (!row) return; const t = TR.list[+row.dataset.i];
  if (e.target.matches(".trk-name")) t.name = e.target.value.trim() || t.name;
  if (e.target.matches(".trk-vol")) t.gain = +e.target.value / 100;
  drawTracks(); saveProject(); status(); });

/* ================= mix tracks ================= */
$("#mx-track").onclick = () => {
  const i = +$("#mx-src").value; if (!Number.isInteger(i) || !TR.list[i] || i === TR.cur) { msg("মেশানোর মতো অন্য ট্র্যাক নেই — ＋ নতুন ট্র্যাক বা একাধিক ফাইল আনুন"); return; }
  storeCur(); const s = TR.list[i].pcm, g = Math.pow(10, +$("#mx-tvol").value / 20);
  const a = P.sel ? P.sel[0] : P.cursor >= N() ? 0 : P.cursor, len = P.sel ? Math.min(P.sel[1] - P.sel[0], s.length) : s.length;
  commit(() => { const o = new Float32Array(Math.max(N(), a + len)); o.set(P.pcm); for (let k = 0; k < len; k++) o[a + k] += s[k] * g; const pk = peakOf(o, a, a + len); if (pk > 0.99) for (let k = a; k < a + len; k++) o[k] *= 0.98 / pk; P.pcm = o; }, `✓ “${TR.list[i].name}” সক্রিয় ট্র্যাকে মেশানো হলো`);
};
$("#trk-new").onclick = () => { stop(); addTrack(); msg("নতুন ট্র্যাক — এখন রেকর্ড বা ফাইল এখানে আসবে"); };
$("#mx-bounce").onclick = () => { const end = maxLen(); if (!end) return; const m = mixRange(0, end), pk = peakOf(m); if (pk > 0.99) for (let k = 0; k < m.length; k++) m[k] *= 0.98 / pk; addTrack(m, "মিক্স", { name: "মিক্স" }); msg("✓ সব শোনা-যায় এমন ট্র্যাক মিশিয়ে নতুন ট্র্যাক হলো"); };

/* ================= one studio: simple view, or with the editor ================= */
// Without the editor: word list, record (listen, retake, skip), parts and the upload list — the old লিব্রে.
// With it: timeline, toolbar, effects, mix and tracks as well. /libre opens it without the editor.
function setEditor(on) {
  if (typeof drawMenu === "function") setTimeout(() => { if (!psOpen.length) drawMenu(); });
  document.body.classList.toggle("no-editor", !on); $("#t-editor").setAttribute("aria-pressed", String(on)); store("lx_snd_editor", on);
  if (on) requestAnimationFrame(() => zoomFit());
}
$("#t-editor").onclick = () => setEditor(!document.body.classList.contains("no-editor") ? false : true);
if (/\/libre\/?$/.test(location.pathname)) { store("lx_snd_editor", false); if (window.LX_NODE) history.replaceState(null, "", "/studio" + location.search); }
setEditor(load("lx_snd_editor", false));
// Microphone test: 3 seconds, then played back; the level shows in the top bar.
$("#t-mictest").onclick = async () => {
  const b = $("#t-mictest"); try { await openMic(); } catch (e) { msg("মাইক্রোফোন চালু করা যায়নি: " + e.message); return; }
  const r = new MediaRecorder(stream), ch = []; r.ondataavailable = e => ch.push(e.data);
  r.onstop = () => { playBlob(new Blob(ch, { type: r.mimeType })); b.disabled = false; b.textContent = "🎙 আবার পরীক্ষা"; msg("শুনুন — পরিষ্কার শোনা গেলে ঠিক আছে"); };
  r.start(); b.disabled = true; b.textContent = "রেকর্ড হচ্ছে… ৩ সেকেন্ড"; msg("কিছু বলুন — ওপরের মিটার সবুজে নড়বে"); setTimeout(() => r.stop(), 3000);
};
$("#t-autoq").checked = load("lx_snd_autoq", true);
$("#t-autoq").onchange = () => store("lx_snd_autoq", $("#t-autoq").checked);

/* ================= tabs: one bar for five panes ================= */
// Wide screens show one centre pane (setup, words, wizard) and one right pane (regions, queue) side by side;
// narrower screens show a single pane. The same buttons and the same state serve both.
const C_TABS = ["setup", "words", "wizard"], R_TABS = ["regions", "queue"];
const TAB = { c: load("lx_snd_ctab", speakerWhy() ? "setup" : WORDS.length ? "wizard" : "words"), r: load("lx_snd_rtab3", "regions") };
TAB.one = load("lx_snd_one", TAB.c);
const WIDE = matchMedia("(min-width: 1251px)");
function applyTabs() {
  const w = WIDE.matches, on = t => (w ? t === TAB.c || t === TAB.r : t === TAB.one);
  $$(".pane").forEach(p => { p.hidden = !on(p.dataset.pane); });
  $$("#st-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(on(b.dataset.tab))));
  document.body.dataset.col = w ? "" : R_TABS.includes(TAB.one) ? "right" : "center";
  document.body.classList.toggle("on-wizard", on("wizard")); // the player bar belongs to the wizard only
  if (on("wizard")) {
    // words waiting in the list: open the wizard straight on them (word card, ◀ ▶, upcoming)
    if (WORDS.length && !$("#t-wordmode").checked) { $("#t-wordmode").checked = true; store("lx_snd_wm", true); setTimeout(() => { if (!psOpen.length) drawMenu(); }); }
    drawBatch(); requestAnimationFrame(() => drawAll());
  }
}
function setTab(id) {
  if (C_TABS.includes(id)) TAB.c = id; else if (R_TABS.includes(id)) TAB.r = id; else return;
  TAB.one = id; store("lx_snd_ctab", TAB.c); store("lx_snd_rtab3", TAB.r); store("lx_snd_one", TAB.one);
  applyTabs();
  if (id === "setup" && speakerWhy()) $("#sp-form").hidden = false; // speaker details still missing: show the form
}
const setCTab = setTab, setRTab = id => setTab(id === "pn-queue" ? "queue" : "regions"), setMView = () => {}; // older call sites
$("#st-tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
WIDE.addEventListener?.("change", applyTabs);
applyTabs();
$("#w-go").onclick = () => setTab("wizard");
// double-click a word: record it now
$("#w-list").addEventListener("dblclick", e => { const li = e.target.closest("li[data-i]"); if (li) { wordPos = +li.dataset.i; saveWords(); setCTab("wizard"); } });

/* ================= left: a Photoshop-like menu (menu › submenu › submenu) ================= */
// Every item drives the existing controls (kept, hidden, in the settings panel), so all behaviour stays in one place.
const clickEl = sel => () => $(sel).click();
const toggleEl = sel => () => { const el = $(sel); el.checked = !el.checked; el.dispatchEvent(new Event("change", { bubbles: true })); };
const isOn = sel => () => !!$(sel).checked;
// speaker and project live in the centre “সেটআপ” tab
const openPanel = id => () => { setCTab("setup"); setMView("center"); requestAnimationFrame(() => $("#" + id).scrollIntoView({ behavior: "smooth", block: "start" })); };
// line icons for the top-level menu
const MI = {
  file: '<path d="M3 7h6l2 2h10v10H3z"/>', edit: '<path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/>', rec: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/>',
  timeline: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2M21 12h0"/>', autoup: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  proj: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>' };
const micon = k => `<svg viewBox="0 0 24 24">${MI[k]}</svg>`;
const MENU = () => [
  { label: "পূর্বাবস্থা", key: "Ctrl+Z", icon: micon("undo"), run: clickEl("#e-undo"), off: () => !H.undo.length },
  { label: "পুনরায়", key: "Ctrl+Y", icon: micon("redo"), run: clickEl("#e-redo"), off: () => !H.redo.length },
  { sep: true },
  { label: "ফাইল", icon: micon("file"), items: [
    { label: "নতুন প্রজেক্ট…", run: clickEl("#e-new") },
    { label: "অডিও ফাইল আনুন…", run: clickEl("#e-import") },
    { label: "কমন্স থেকে আমদানি…", run: clickEl("#e-commons") },
    { label: "ডাউনলোড…", run: clickEl("#e-export") },
    { sep: true },
    { label: "সব অডিও মুছুন", run: clickEl("#e-clear"), danger: true } ] },
  { label: "সম্পাদনা", icon: micon("edit"), items: [
    { label: "পূর্বাবস্থা", key: "Ctrl+Z", run: clickEl("#e-undo"), off: () => !H.undo.length },
    { label: "পুনরায়", key: "Ctrl+Y", run: clickEl("#e-redo"), off: () => !H.redo.length },
    { sep: true },
    { label: "টাইমলাইন ও সম্পাদনা", check: () => !document.body.classList.contains("no-editor"), run: clickEl("#t-editor") },
    { label: "প্রক্রিয়া", items: [
      { label: "ইফেক্ট…", run: () => { setEditor(true); setCTab("wizard"); $("#tg-fx").click(); } },
      { label: "মিক্স ও আলাদা করা…", run: () => { setEditor(true); setCTab("wizard"); $("#tg-mix").click(); } },
      { label: "নীরবতায় ভাগ", run: () => { setCTab("wizard"); $("#e-autosplit").click(); } },
      { label: "শব্দ-তালিকা থেকে নাম বসান", run: clickEl("#r-map") } ] },
    { label: "ট্র্যাক", items: [
      { label: "নতুন ট্র্যাক", run: clickEl("#trk-new") },
      { label: "সব ট্র্যাক একসঙ্গে শুনুন", check: () => load("lx_snd_mixplay", false), run: () => { store("lx_snd_mixplay", !load("lx_snd_mixplay", false)); drawTracks(); } } ] } ] },
  { label: "রেকর্ড", icon: micon("rec"), items: [
    { label: "শব্দ-তালিকা মোড", check: isOn("#t-wordmode"), run: toggleEl("#t-wordmode") },
    { label: "একটানা (থামলেই পরের শব্দ)", check: isOn("#t-auto"), run: toggleEl("#t-auto") },
    { label: "রেকর্ড হলেই আপলোড তালিকায়", check: isOn("#t-autoq"), run: toggleEl("#t-autoq") },
    { sep: true },
    { label: "শোনার গতি", items: [["1", "১×"], ["0.85", "০.৮৫×"], ["0.7", "০.৭×"], ["0.5", "০.৫×"]].map(([v, l]) => ({ label: l, check: () => $("#t-rate").value === v, run: () => { $("#t-rate").value = v; $("#t-rate").dispatchEvent(new Event("change")); } })) } ] },
  { label: "মাইক", icon: micon("mic"), items: [
    { label: "মাইক্রোফোন", items: () => [...$("#t-input").options].map(o => ({ label: o.textContent, check: () => $("#t-input").value === o.value, run: () => { $("#t-input").value = o.value; $("#t-input").dispatchEvent(new Event("change")); } })) },
    { label: "মাইক পরীক্ষা (৩ সেকেন্ড)", run: clickEl("#t-mictest") } ] },
  { label: "বক্তা", icon: micon("user"), items: () => [
    ...SPK.map(s => ({ label: s.name + (s.district ? ` — ${s.district}` : ""), check: () => s.id === SP.id, run: () => { $("#sp-pick").value = s.id; $("#sp-pick").dispatchEvent(new Event("change")); } })),
    ...(SPK.length ? [{ sep: true }] : []),
    { label: "নতুন বক্তা…", run: () => { $("#sp-new").click(); openPanel("pn-speaker")(); } },
    { label: "বক্তার তথ্য সম্পাদনা…", run: () => { $("#sp-form").hidden = false; openPanel("pn-speaker")(); } } ] },
  { label: "প্রজেক্ট", icon: micon("proj"), items: [
    { label: "প্রজেক্ট ও কমন্সের তথ্য…", run: openPanel("pn-proj") },
    { label: "অংশসমূহ দেখুন", run: () => { setRTab("pn-regions"); setMView("right"); } },
    { label: "আপলোড তালিকা দেখুন", run: () => { setRTab("pn-queue"); setMView("right"); } } ] },
  { label: "সাহায্য", icon: micon("help"), items: [
    { label: "কিবোর্ড শর্টকাট", run: clickEl("#t-help") },
    { label: "প্যানেল আগের জায়গায় ফেরান", run: clickEl("#t-layout") } ] },
];
// switches with an icon and an on/off slider, shown above the mode pills
const SWITCHES = () => [
  { icon: "timeline", label: "টাইমলাইন", tip: "টাইমলাইন ও সম্পাদনার যন্ত্র দেখান", on: !document.body.classList.contains("no-editor"), run: clickEl("#t-editor") },
  { icon: "autoup", label: "সরাসরি আপলোড", tip: "রেকর্ড হলেই আপলোড তালিকায় পাঠান", on: $("#t-autoq").checked, run: toggleEl("#t-autoq") },
];
const PS = $("#ps-menu");
const kids = it => (typeof it.items === "function" ? it.items() : it.items);
function menuHtml(items, depth) {
  return items.map((it, i) => it.sep ? `<div class="ps-sep"></div>`
    : `<button type="button" class="ps-it${it.danger ? " danger" : ""}" data-path="${depth}.${i}"${it.off?.() ? " disabled" : ""}>
        <span class="ps-ic${it.check ? " ck" : ""}">${it.check ? (it.check() ? "✓" : "") : it.icon || ""}</span><span class="ps-l">${esc(it.label)}</span>
        ${it.key ? `<kbd>${it.key}</kbd>` : ""}${it.items ? `<span class="ps-arr">▸</span>` : ""}</button>`).join("");
}
let psOpen = []; // open submenus, one per level
const narrow = () => matchMedia("(max-width: 860px)").matches;
function closeFrom(level) { psOpen.splice(level).forEach(m => m.el.remove()); $$(".ps-it.open").forEach(b => { if (+b.dataset.lvl >= level) b.classList.remove("open"); }); }
function openSub(btn, items, level) {
  closeFrom(level); btn.classList.add("open"); btn.dataset.lvl = level;
  const el = document.createElement("div"); el.className = "ps-sub"; el.innerHTML = menuHtml(items, level + 1);
  if (narrow()) { btn.after(el); el.classList.add("inline"); } // phones: submenus open in place, inside the open menu
  if (!el.isConnected) {
    document.body.appendChild(el); const r = btn.getBoundingClientRect(), lr = btn.querySelector(".ps-l").getBoundingClientRect();
    el.style.left = `${Math.min(r.right - 6, lr.right + 28)}px`; // right beside the words, not at the far edge
    el.style.top = `${r.top - 5}px`; const h = el.getBoundingClientRect().height; if (r.top - 5 + h > innerHeight - 70) el.style.top = `${Math.max(8, innerHeight - 70 - h)}px`; // level with the row; up only if it would run off the screen
  }
  psOpen[level] = { el, items };
}
function itemAt(btn) {
  const [lvl, i] = btn.dataset.path.split(".").map(Number);
  return { lvl, it: (lvl === 0 ? MENU() : psOpen[lvl - 1]?.items || [])[i] };
}
function onItem(btn, fromHover) {
  const { lvl, it } = itemAt(btn); if (!it || btn.disabled) return;
  if (it.items) { if (btn.classList.contains("open") && !fromHover) closeFrom(lvl); else openSub(btn, kids(it), lvl); return; }
  if (fromHover) { closeFrom(lvl); return; } // hovering a plain item closes deeper submenus
  closeFrom(0); if (narrow()) PS.classList.remove("open"); it.run?.(); drawMenu();
}
function drawMenu() {
  PS.innerHTML = `<div class="ps-title">মেনু</div><button type="button" class="ps-toggle" id="ps-toggle" aria-expanded="${PS.classList.contains("open")}"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>মেনু</button>` + menuHtml(MENU(), 0)
    + `<div class="ps-sep"></div>` + SWITCHES().map((s, i) => `<button type="button" class="ps-sw" data-sw="${i}" role="switch" aria-checked="${s.on}" title="${s.tip}"><span class="ps-ic">${micon(s.icon)}</span><span class="ps-l">${s.label}</span><span class="tgl"></span></button>`).join("")
    ;
  drawModes();
}
// the two recording modes sit at the top of the record wizard as pills
function drawModes() {
  $("#wz-modes").innerHTML = `<button type="button" class="ps-pill" data-mode="#t-wordmode" aria-pressed="${$("#t-wordmode").checked}">শব্দ-তালিকা</button><button type="button" class="ps-pill" data-mode="#t-auto" aria-pressed="${$("#t-auto").checked}">একটানা</button>`;
}
$("#wz-modes").addEventListener("click", e => { const b = e.target.closest(".ps-pill"); if (b) { toggleEl(b.dataset.mode)(); drawMenu(); } });
$("#wz-clear").onclick = () => $("#e-clear").click();
PS.addEventListener("click", e => {
  if (e.target.closest("#ps-toggle")) { e.stopPropagation(); closeFrom(0); PS.classList.toggle("open"); drawMenu(); return; }
  const s = e.target.closest(".ps-sw"); if (s) { SWITCHES()[+s.dataset.sw].run(); setTimeout(drawMenu); return; }
});
document.addEventListener("click", e => { const b = e.target.closest(".ps-it"); if (b) { e.stopPropagation(); onItem(b, false); return; } if (!e.target.closest(".ps-sub")) closeFrom(0); });

document.addEventListener("keydown", e => { if (e.key === "Escape") closeFrom(0); });
addEventListener("resize", () => closeFrom(0));
["#t-wordmode", "#t-auto", "#t-autoq"].forEach(s => $(s).addEventListener("change", () => { if (!psOpen.length) drawMenu(); }));
drawMenu();

/* the time sits on the timeline itself (top right), not in the bottom bar */
$("#stage").appendChild($(".st-clock"));
$("#stage").appendChild($(".st-player .st-meter")); // the input level goes with it


/* ================= layout: file menu, tabs, drawers ================= */
[["#tg-fx", "#pane-fx"], ["#tg-mix", "#pane-mix"]].forEach(([b, p]) => $(b).addEventListener("click", () => {
  const open = $(p).hidden; $$(".st-drawer").forEach(d => { d.hidden = true; }); $$("#tg-fx, #tg-mix").forEach(x => x.setAttribute("aria-pressed", "false"));
  $(p).hidden = !open; $(b).setAttribute("aria-pressed", String(open)); if (open) drawTracks();
}));

/* ================= keys, help, start ================= */
$("#t-help").onclick = () => { $("#help").hidden = false; }; $("#help-x").onclick = () => { $("#help").hidden = true; };
$("#help").addEventListener("click", e => { if (e.target.id === "help") $("#help").hidden = true; });
document.addEventListener("keydown", e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  const go = fn => { e.preventDefault(); fn(); };
  if (k === " ") go(() => (src ? stop() : playFromCursor()));
  else if (k === "r" && !mod) go(toggleRec);
  else if ((k === "m" || k === "enter") && recording) go(addMark);
  else if (k === "s" && !mod) go(() => $("#e-split").click());
  else if ((k === "a" || k === "[") && !mod) go(markStart);
  else if ((k === "d" || k === "]") && !mod) go(markEnd);
  else if (k === "l" && !mod) go(() => $("#t-loop").click());
  else if ((k === "delete" || k === "backspace") && P.sel) go(() => $("#e-del").click());
  else if (mod && k === "z") go(() => (e.shiftKey ? $("#e-redo") : $("#e-undo")).click());
  else if (mod && k === "y") go(() => $("#e-redo").click());
  else if (mod && k === "c" && P.sel) go(() => $("#e-copy").click());
  else if (mod && k === "x" && P.sel) go(() => $("#e-cut").click());
  else if (mod && k === "v" && clip) go(() => $("#e-paste").click());
  else if (mod && k === "a") go(() => { P.sel = N() ? [0, N()] : null; drawAll(); });
  else if (k === "+" || k === "=") go(() => zoom(0.5));
  else if (k === "-") go(() => zoom(2));
  else if (k === "0" && !mod) go(zoomFit);
  else if (k === "home") go(() => $("#t-home").click());
  else if (k === "end") go(() => { stop(); P.cursor = N(); V.start = N(); drawAll(); });
  else if (k === "arrowright" && mod) go(() => jumpRegion(1));
  else if (k === "arrowleft" && mod) go(() => jumpRegion(-1));
  else if (k === "escape") { P.sel = null; drawAll(); }
});
addEventListener("online", () => msg("ইন্টারনেট ফিরেছে — আপলোড করা যাবে।")); addEventListener("offline", () => msg("ইন্টারনেট নেই — কাজ চালিয়ে যান, সব এই ব্রাউজারে জমা থাকছে।"));

/* “প্যানেল আগের জায়গায় ফেরান”: forget the remembered tabs and switches of the layout */
$("#t-layout").onclick = () => { ["lx_snd_ctab", "lx_snd_rtab3", "lx_snd_one"].forEach(k => store(k)); location.reload(); };

// For tests and power users.
$$(".q-up").forEach(b => { b.onclick = uploadAll; });
window.StudioLibre = { P, encodeWav, appendPart: (pcm, meta) => commit(() => appendPart(pcm, meta)), zoomFit,
  // for the simple (mobile) mode, studio-easy.js
  KINDS, SD_LANGS, SD_DISTRICTS, decode, splitByMarks, denoise, peakOf, fmtS, findLexeme, speakerWhy, readSpeaker, fillSpeaker, uid,
  get SP() { return SP; }, get SPK() { return SPK; }, get PJ() { return PJ; }, get WORDS() { return WORDS; }, get wordPos() { return wordPos; },
  setWordPos(i) { wordPos = Math.max(0, Math.min(WORDS.length - 1, i)); saveWords(); }, addWords: addWordLines,
  async addClip(o) { const c = { id: uid(), word: "", kind: "word", text: "", lexeme: "", status: "new", created: new Date().toISOString(), speaker: { ...SP }, project: PJ.name, extra: PJ.extra, ...o }; if (c.kind === "word" && c.word && !c.lexeme) c.lexeme = await findLexeme(c.word); await DB.put(c); Q.push(c); syncClip(c, true); drawQueue(); return c; },
  saveWords, uploadAll, openInfo, playBlob, stop, infoCount, get Q() { return Q; }, async putClip(c) { await DB.put(c); drawQueue(); syncClip(c, false); }, async delClip(c) { await DB.del(c.id); Q = Q.filter(x => x !== c); drawQueue(); if (SYNC()) fetch(`/store/clips/${c.id}`, { method: "DELETE" }).catch(() => {}); }, getBlob };
drawWords(); listInputs();
Promise.all([DB.getProj().catch(() => null), DB.all().catch(() => [])]).then(([proj, clips]) => {
  if (proj?.tracks?.length) { P.rate = proj.rate; TR.list = proj.tracks; TR.cur = Math.min(proj.cur || 0, TR.list.length - 1); const t = curTrack(); P.pcm = t.pcm; P.regions = t.regions || []; normalize(); }
  else if (proj?.pcm?.length) { P.pcm = proj.pcm; P.rate = proj.rate; P.regions = proj.regions || []; normalize(); }
  drawTracks();
  Q = clips; drawQueue(); drawRegions(); zoomFit(); syncDown();
});
