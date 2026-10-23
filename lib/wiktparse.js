"use strict";
(function () {
// Reads the Bengali section of a bn.wiktionary page (hand-written wikitext): word classes, meanings,
// pronunciation and etymology notes. Used only as *reference* — bn.wiktionary is CC BY-SA and Wikidata is CC0,
// so its text is shown to the user and never copied into a lexeme automatically.
const POS = [
  [/নামবাচক\s*বিশেষ্য|নামবাচক/, "proper_noun"], [/ক্রিয়া\s*বিশেষণ|ক্রিয়াবিশেষণ/, "adverb"], [/বিশেষ্য/, "noun"], [/বিশেষণ/, "adjective"],
  [/ক্রিয়া/, "verb"], [/সর্বনাম/, "pronoun"], [/অনুসর্গ/, "postposition"], [/সংযোজক|সমুচ্চয়ী/, "conjunction"],
  [/আবেগ|অনুভূতিসূচক|বিস্ময়সূচক/, "interjection"], [/সংখ্যা/, "numeral"], [/বাগধারা/, "idiom"], [/প্রবাদ/, "proverb"],
  [/উপসর্গ/, "prefix"], [/বাক্যাংশ|শব্দবন্ধ/, "phrase"],
];
const posOf = s => (POS.find(([rx]) => rx.test(s)) || [])[1] || "";
const SKIP_HEAD = /উচ্চারণ|ব্যুৎপত্তি|উদ্ভূত|তথ্যসূত্র|টীকা|টিকা|অনুবাদ|সমার্থক|বিপরীত|সম্পর্কিত|বহিঃসংযোগ|অন্যান্য|ভিন্ন বানান|রূপ|উদাহরণ|ব্যবহার/;

function clean(s) {
  return String(s)
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ").replace(/\s*[;,]\s*$/, "").trim();
}

function parse(wikitext, lang = "bn") {
  const text = String(wikitext || "");
  const start = text.search(new RegExp(`^==\\s*(\\{\\{ভাষা\\|${lang}\\}\\}|${lang === "bn" ? "বাংলা" : lang})\\s*==\\s*$`, "m"));
  if (start < 0) return null;
  const after = text.slice(start).split("\n").slice(1);
  const end = after.findIndex(l => /^==[^=].*==\s*$/.test(l));
  const lines = end < 0 ? after : after.slice(0, end);
  const out = { pos: [], pron: [], ety: [] };
  let head = "", cur = null;
  const open = key => { if (!key) return null; let p = out.pos.find(x => x.key === key && !x.defs.length); if (!p) { p = { key, label: head, defs: [], examples: [] }; out.pos.push(p); } return p; };
  for (const raw of lines) {
    const l = raw.trim();
    const h = l.match(/^(={3,6})\s*(.*?)\s*\1$/);
    if (h) { head = clean(h[2]); cur = SKIP_HEAD.test(head) ? null : open(posOf(head)); continue; }
    const tpl = l.match(/^\{\{\s*(বিশেষ্য|বিশেষণ|ক্রিয়া|ক্রিয়াবিশেষণ|সর্বনাম|অব্যয়|অনুসর্গ|সংখ্যা|বাগধারা|প্রবাদ)\s*\|/);
    if (tpl) { const k = posOf(tpl[1]); if (k) { cur = out.pos.find(x => x.key === k && !x.defs.length) || null; if (!cur) { cur = { key: k, label: tpl[1], defs: [], examples: [] }; out.pos.push(cur); } } continue; }
    if (/উচ্চারণ/.test(head) && /^[*#]/.test(l)) { const v = clean(l.replace(/^[*#:]+/, "")); if (v) out.pron.push(v); continue; }
    if (/ব্যুৎপত্তি|উদ্ভূত/.test(head) && l && !/^\{\{|^\[\[বিষয়শ্রেণী/.test(l)) { const v = clean(l.replace(/^[*#:]+/, "")); if (v) out.ety.push(v); continue; }
    if (cur && /^#[:*]/.test(l)) { const v = clean(l.replace(/^#[:*]+/, "")); if (v) cur.examples.push(v); continue; }
    if (cur && /^#\s*[^#:*]/.test(l)) { const v = clean(l.replace(/^#+/, "")); if (v) cur.defs.push(v); }
  }
  out.pos = out.pos.filter(p => p.defs.length || p.key);
  return out;
}

const __exp = { parse, posOf, clean };
if (typeof module !== "undefined" && module.exports) module.exports = __exp; else (window.LX = window.LX || {}).wikt = __exp;
})();
