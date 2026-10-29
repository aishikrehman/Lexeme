"use strict";
// Pages without JavaScript: the server puts the real content inside <noscript> — a plain menu, the search form
// with its results, the word list, a word's meanings and forms — so nothing is lost when scripts are blocked
// (search engines read it too). With JavaScript on, the browser ignores it and the normal page runs.
const R = require("./reader");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const LETTERS = "অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য়".split(" ");
const within = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]); // a slow source never holds up the page for long (1.5 s at most)
let CATS = null;
const cats = async () => (CATS ||= ((await R.config().catch(() => ({}))).categories || []));
const catBn = async qid => (await cats()).find(c => c.qid === qid)?.bn || "";

const nav = s => `<nav class="nojs-nav"><a href="/"><b>${esc(s.siteName)}</b></a><a href="/search">অনুসন্ধান</a><a href="/browse">শব্দক্রম</a><a href="/collection/idiom">বাগধারা</a><a href="/collection/proverb">প্রবাদ</a><a href="/docs">ডকুমেন্টেশন</a><a href="/feedback">ফিডব্যাক</a><a href="/settings">আমার সেটিংস</a></nav>`;
const form = q => `<form action="/search" method="get" class="nojs-form"><input name="q" value="${esc(q || "")}" placeholder="শব্দ বা অর্থ লিখুন" aria-label="শব্দ খুঁজুন"><button>খুঁজুন</button></form>`;
async function rows(list) {
  const out = [];
  for (const s of list) {
    const g = (s.glosses?.length ? s.glosses : s.gloss ? [s.gloss] : []).map((x, i, a) => (a.length > 1 ? `${bn(i + 1)}. ` : "") + esc(x)).join(" ");
    out.push(`<li><a href="/word/${s.id}"><b>${esc(s.lemma)}</b></a>${s.category ? ` <i>(${esc(await catBn(s.category))})</i>` : ""} ${g || "—"}</li>`);
  }
  return `<ol class="nojs-list">${out.join("")}</ol>`;
}
const PAGES = {
  async "index.html"() { return `<h1>বাংলা অভিধান</h1>${form()}<p>${LETTERS.map(l => `<a href="/browse?letter=${encodeURIComponent(l)}">${l}</a>`).join(" ")}</p>`; },
  async "search.html"(m, url) {
    const q = url.searchParams.get("q") || url.searchParams.get("exact") || "";
    if (!q) return `<h1>শব্দ খুঁজুন</h1>${form()}`;
    const r = await within(R.search({ q, field: url.searchParams.get("field") || "", limit: 100 }), 1500);
    return `<h1>“${esc(q)}” — অনুসন্ধান</h1>${form(q)}${r ? (r.list.length ? `<p>${bn(r.list.length)}টি ফল</p>${await rows(r.list)}` : "<p>কিছু পাওয়া যায়নি।</p>") : "<p>এখন ফল আনা গেল না — একটু পরে আবার চেষ্টা করুন।</p>"}`;
  },
  async "browse.html"(m, url) {
    const q = Object.fromEntries(url.searchParams), page = +q.page || 1;
    const r = await within(R.browse({ letter: q.letter || "", cat: q.cat || "", page, size: 100 }), 1500);
    const link = p => `/browse?${new URLSearchParams({ ...(q.letter ? { letter: q.letter } : {}), ...(q.cat ? { cat: q.cat } : {}), page: p })}`;
    return `<h1>শব্দক্রম${q.letter ? ` — “${esc(q.letter)}”` : ""}</h1><p>${LETTERS.map(l => `<a href="/browse?letter=${encodeURIComponent(l)}">${l}</a>`).join(" ")}</p>
      ${r ? `<p>${bn(r.total)}টি শব্দ · পাতা ${bn(r.page)} / ${bn(r.pages)}</p>${await rows(r.list)}<p>${r.page > 1 ? `<a href="${link(r.page - 1)}">← আগের পাতা</a> ` : ""}${r.page < r.pages ? `<a href="${link(r.page + 1)}">পরের পাতা →</a>` : ""}</p>` : "<p>এখন তালিকা আনা গেল না।</p>"}`;
  },
  async "collection.html"(m) {
    const cat = m[1] || "idiom", r = await within(R.collection({ cat }), 1500);
    return `<h1>${cat === "proverb" ? "প্রবাদ-প্রবচন" : "বাগধারা"}</h1>${r?.list ? await rows(r.list) : ""}`;
  },
  async "word.html"(m) {
    const r = await within(R.word(m[1], {}), 1500), e = r?.entity; if (!e) return `<p><a href="https://www.wikidata.org/wiki/Lexeme:${esc(m[1])}">উইকি উপাত্তে ${esc(m[1])} দেখুন</a></p>`;
    const val = o => o?.bn?.value || Object.values(o || {})[0]?.value || "";
    const senses = (e.senses || []).map(s => `<li>${esc(val(s.glosses)) || "—"}</li>`).join("");
    const forms = (e.forms || []).slice(0, 60).map(f => esc(val(f.representations))).filter(Boolean);
    return `<h1>${esc(val(e.lemmas))}</h1><p><i>${esc(await catBn(e.lexicalCategory))}</i> · <a href="https://www.wikidata.org/wiki/Lexeme:${e.id}">${e.id}</a></p>
      ${senses ? `<h2>অর্থ</h2><ol>${senses}</ol>` : ""}${forms.length ? `<h2>রূপ</h2><p>${forms.join(" · ")}</p>` : ""}<p><a href="/etymology/${e.id}">ব্যুৎপত্তি</a></p>`;
  },
  async "etymology.html"(m) { return `<p>ব্যুৎপত্তি-বৃক্ষ দেখাতে JavaScript লাগে। <a href="/word/${esc(m[1])}">শব্দের পাতা</a> · <a href="https://www.wikidata.org/wiki/Lexeme:${esc(m[1])}">উইকি উপাত্তে</a></p>`; },
};
const NEEDS_JS = { "wizard.html": "লেক্সিম উইজার্ড", "lexinary.html": "লেক্সিনারি", "sound.html": "অডিও স্টুডিও" };
async function noscript(file, m, url, site) {
  let body = "";
  try {
    if (PAGES[file]) body = await PAGES[file](m, url);
    else if (NEEDS_JS[file]) body = `<p><b>${esc(NEEDS_JS[file])}</b> চালাতে ব্রাউজারে JavaScript চালু থাকা দরকার${file === "sound.html" ? " (মাইক্রোফোন আর অডিও সম্পাদনা ব্রাউজারেই হয়)" : ""}। অভিধান পড়া, অনুসন্ধান, সেটিংস আর ফিডব্যাক JavaScript ছাড়াও চলে। <a href="/docs">ডকুমেন্টেশন</a></p>`;
  } catch (e) { body = ""; }
  return `<noscript>${nav(site)}<div class="wrap nojs">${body}</div></noscript>`;
}
module.exports = { noscript };
