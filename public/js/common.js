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
async function getJSON(url, { cache = !/\/api\/(random|config)|fresh=1/.test(url) } = {}) {
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
const configReady = getJSON("/api/config").then(c => (SITE = c)).then(c => { if (c.languages?.length && !c.languages.some(l => l.qid === getLang())) setLang("Q9610"); return c; }).catch(() => SITE);
// Without the Node server, load the local word index of the reading language (from IndexedDB, or build it once).
configReady.then(() => { if (serverOk === false && window.LX?.index) LX.index.get(getLang()); });
// Which dictionary to show — "both", "wd" (Wikidata lexemes) or "wikt" (bn.wiktionary) — one choice for the whole
// site (home, search, word list). Kept in this browser and, logged in, on the server (it arrives as LX_SOURCE).
const getSource = () => { try { return window.LX_SOURCE || localStorage.getItem("lx_source") || "wd"; } catch (e) { return window.LX_SOURCE || "wd"; } }; // default: Wikidata only
function setSource(v) {
  if (!/^(both|wd|wikt)$/.test(v) || v === getSource()) return; window.LX_SOURCE = v;
  try { localStorage.setItem("lx_source", v); } catch (e) {}
  if (window.LX_USER) fetch("/store/source", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: v }) }).catch(() => {});
}
/* ---------- export: the list on screen (or the whole list) as CSV, TSV, JSON, text or print/PDF ---------- */
const EXP = { name: "", rows: [], all: null };
const expRowLex = (s, labels) => ({ "শব্দ": s.lemma, "শব্দশ্রেণি": s.category ? catLabel(s.category, labels) : "", "অর্থ": (s.glosses?.length ? s.glosses : s.gloss ? [s.gloss] : []).join("; "), "আইডি": s.id, "উৎস": "উইকি উপাত্ত", "লিংক": new URL(wordUrl(s.id), location.href).href });
const expRowWikt = r => ({ "শব্দ": r.title, "শব্দশ্রেণি": "", "অর্থ": r.snippet || "", "আইডি": "", "উৎস": "উইকিঅভিধান", "লিংক": wiktUrl(r.title) });
// rows: what is shown; all (optional): async () => every row of the list, for lists longer than one page
function setExport(name, rows, all = null) { Object.assign(EXP, { name, rows, all }); document.querySelectorAll(".exp").forEach(d => { d.hidden = !rows.length; }); }
function mountExport(where) {
  const d = document.createElement("details"); d.className = "exp"; d.hidden = true;
  d.innerHTML = `<summary title="তালিকাটি ফাইল হিসেবে নামান"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>এক্সপোর্ট</summary>
    <div class="exp-menu"><label class="exp-scope" hidden><input type="checkbox" checked> পুরো তালিকা (সব পাতা)</label>
    ${[["csv", "CSV", "এক্সেল, গুগল শিট"], ["tsv", "TSV", "ট্যাব দিয়ে আলাদা"], ["json", "JSON", "প্রোগ্রামের জন্য"], ["txt", "লেখা (TXT)", "শুধু শব্দ ও অর্থ"], ["print", "ছাপুন / PDF", "ব্রাউজারের প্রিন্ট"]].map(([f, l, s]) => `<button type="button" data-f="${f}"><b>${l}</b><small>${s}</small></button>`).join("")}<span class="exp-msg muted"></span></div>`;
  where.appendChild(d);
  d.addEventListener("toggle", () => { d.querySelector(".exp-scope").hidden = !EXP.all; });
  d.addEventListener("click", async e => {
    const b = e.target.closest("button[data-f]"); if (!b) return;
    const msg = d.querySelector(".exp-msg"); let rows = EXP.rows;
    if (EXP.all && d.querySelector(".exp-scope input").checked) { msg.textContent = "পুরো তালিকা আনা হচ্ছে…"; try { rows = await EXP.all(m => { msg.textContent = m; }); } catch (err) { msg.textContent = "আনা গেল না: " + err.message; return; } }
    msg.textContent = ""; exportRows(rows, b.dataset.f, EXP.name); d.open = false;
  });
}
function exportRows(rows, f, name) {
  const cols = ["শব্দ", "শব্দশ্রেণি", "অর্থ", "আইডি", "উৎস", "লিংক"], file = `${(name || "তালিকা").replace(/[\\/:*?"<>|“”]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80)}-${new Date().toISOString().slice(0, 10)}`;
  if (f === "print") {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!doctype html><html lang="bn"><meta charset="utf-8"><title>${esc(name)}</title><style>body{font:14px/1.5 "Noto Serif Bengali",serif;margin:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left;vertical-align:top}th{background:#f1f3f8}</style><h1 style="font-size:20px">${esc(name)}</h1><p>${toBn(rows.length)}টি শব্দ · ${esc(location.host)}</p><table><thead><tr><th>#</th>${cols.slice(0, 5).map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td>${toBn(i + 1)}</td>${cols.slice(0, 5).map(c => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    w.document.close(); setTimeout(() => w.print(), 300); return;
  }
  const cell = (v, sep) => { v = String(v ?? ""); return sep === "," ? (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v) : v.replace(/[\t\n]/g, " "); };
  const body = f === "json" ? JSON.stringify(rows, null, 2)
    : f === "txt" ? rows.map((r, i) => `${i + 1}. ${r["শব্দ"]}${r["শব্দশ্রেণি"] ? ` (${r["শব্দশ্রেণি"]})` : ""} — ${r["অর্থ"] || "—"}`).join("\n")
    : (() => { const sep = f === "tsv" ? "\t" : ","; return [cols, ...rows.map(r => cols.map(c => r[c]))].map(line => line.map(v => cell(v, sep)).join(sep)).join("\r\n"); })();
  const type = { csv: "text/csv", tsv: "text/tab-separated-values", json: "application/json", txt: "text/plain" }[f];
  const blob = new Blob([f === "csv" || f === "tsv" ? "\uFEFF" + body : body], { type: type + ";charset=utf-8" }); // BOM: Excel reads Bengali right
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${file}.${f}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// bn.wiktionary entry row (opens the wiki page)
const wiktUrl = t => `https://bn.wiktionary.org/wiki/${encodeURIComponent(String(t).replace(/ /g, "_"))}`;
const wiktRow = (r, num) => `<a class="dent wk" href="${wiktUrl(r.title)}" target="_blank" rel="noopener">${num ? `<span class="sn">${toBn(num)}</span>` : ""}<span class="lem">${esc(r.title)}</span>${r.snippet ? ` <span class="g">${esc(r.snippet)}</span>` : ""} <span class="n" title="বাংলা উইকিঅভিধানে খুলবে">উইকিঅভিধান ↗</span></a>`;
// Both sources in one alphabetical list: a word found in both is one row (the lexeme, with a link to its
// Wiktionary page beside it).
function mergedRows(wdList, labels, wkList, startNum = 1) {
  const map = new Map(), key = s => String(s).normalize("NFC").trim();
  for (const s of wdList) { const k = key(s.lemma); if (!map.has(k)) map.set(k, { lemma: k, wd: [], wk: null }); map.get(k).wd.push(s); }
  for (const r of wkList) { const k = key(r.title); if (!map.has(k)) map.set(k, { lemma: k, wd: [], wk: null }); map.get(k).wk = r; }
  let n = startNum;
  return [...map.values()].sort((a, b) => a.lemma.localeCompare(b.lemma, "bn")).map(g => !g.wd.length ? wiktRow(g.wk, n++)
    : g.wd.map(s => `<div class="dent-grp">${rowItem(s, labels, n++)}${g.wk ? `<a class="wk-also" href="${wiktUrl(g.wk.title)}" target="_blank" rel="noopener" title="একই শব্দ বাংলা উইকিঅভিধানেও আছে">উইকিঅভিধানেও ↗</a>` : ""}</div>`).join("")).join("");
}const getLang = () => { try { return localStorage.getItem("reader_lang") || "Q9610"; } catch (e) { return "Q9610"; } };
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
// The footer comes from the server (lib/footer.js); this short one is only for pages opened as plain files.
function initChrome() { if (window.LX_NODE || document.querySelector(".site-foot")) return; document.body.insertAdjacentHTML("beforeend", `<footer class="footer"><div class="wrap"><span><b>লেক্সিম.বাংলা</b> · তথ্য: <a href="https://www.wikidata.org/wiki/Wikidata:Lexicographical_data" target="_blank" rel="noopener">উইকি উপাত্ত লেক্সিম</a> (CC0)</span><span>নির্মাতা: <a href="https://www.wikidata.org/wiki/User:Aishik_Rehman" target="_blank" rel="noopener">ঐশিক রেহমান (User:Aishik Rehman)</a></span></div></footer>`);
}

/* shared renderers */
// Word lists look like a printed dictionary: number in the margin, bold headword, abbreviated word class,
// definition, all as one running entry with a hanging indent. `num` (1, 2, …) is the serial number.
const POS_ABBR = { Q1084: "বি.", Q147276: "নাম.", Q36224: "সর্ব.", Q24905: "ক্রি.", Q34698: "বিণ.", Q380057: "ক্রি-বিণ.", Q161873: "অনু.", Q36484: "সংযো.",
  Q83034: "আবেগ.", Q63116: "সংখ্যা.", Q187931: "বাক্যাংশ", Q184511: "বাগ.", Q35102: "প্রবাদ", Q134830: "উপ.", Q10976085: "ক্রি-পদ.", Q102047: "প্রত্য.", Q184943: "অব্য.", Q170239: "ধ্বন্যা." };
const posAbbr = (q, labels) => POS_ABBR[q] || catLabel(q, labels);
// Entry layout follows the Accessible Dictionary (accessibledictionary.gov.bd): headword in a light box,
// the word class written out in (italics), then the definition; one entry per line, thin rule between.
const rowItem = (s, labels, num) => `<a class="dent" href="${hitUrl(s)}">${num ? `<span class="sn">${toBn(num)}</span>` : ""}<span class="lem">${esc(s.lemma)}</span>${s.form && s.form !== s.lemma ? ` <small class="muted">(${esc(s.form)})</small>` : ""}${s.category ? ` <em class="pos">(${esc(catLabel(s.category, labels))})</em>` : ""} <span class="g">${glossList(s)}</span><span class="n">${s.id}</span></a>`;
// All meanings: one plainly, several numbered ① ② … in one flowing line (as in a printed dictionary).
function glossList(s) {
  const all = (s.glosses?.length ? s.glosses : s.gloss ? [s.gloss] : []).map(g => esc(String(g).replace(/[।.]\s*$/, "")));
  if (!all.length) return '<span class="muted">—</span>';
  return all.length === 1 ? all[0] + "।" : all.map((g, i) => `<span class="gi"><b>${toBn(i + 1)}.</b> ${g}</span>`).join(" ");
}
// Card used on the home page (word of the day area, idioms, proverbs).
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
