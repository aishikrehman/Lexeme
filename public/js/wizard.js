"use strict";
const ICONS = {"book": "<path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z\"/><path d=\"M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5\"/>", "tag": "<path d=\"M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.5\"/>", "link": "<path d=\"M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1\"/><path d=\"M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1\"/>", "branch": "<circle cx=\"6\" cy=\"5\" r=\"2\"/><circle cx=\"6\" cy=\"19\" r=\"2\"/><circle cx=\"18\" cy=\"7\" r=\"2\"/><path d=\"M6 7v10\"/><path d=\"M18 9c0 5-6 4-11.5 8.5\"/>", "quote": "<path d=\"M6 7h4v4c0 3-1.5 5-4 6\"/><path d=\"M14 7h4v4c0 3-1.5 5-4 6\"/>", "bookmark": "<path d=\"M6 3h12v18l-6-4-6 4z\"/>", "list": "<path d=\"M4 6h11M4 12h11M4 18h7\"/><path d=\"M18 15v6M15 18h6\"/>", "layers": "<path d=\"M12 3 2 8l10 5 10-5z\"/><path d=\"m2 13 10 5 10-5\"/>", "bulb": "<path d=\"M9 18h6M10 21h4\"/><path d=\"M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z\"/>", "check": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12 3 3 5-6\"/>", "upload": "<path d=\"M12 15V4M7 9l5-5 5 5\"/><path d=\"M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4\"/>", "code": "<path d=\"m8 8-5 4 5 4M16 8l5 4-5 4\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7.5v.5\"/>", "volume": "<path d=\"M4 9h4l5-4v14l-5-4H4z\"/><path d=\"M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12\"/>", "plus": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><path d=\"M12 8v8M8 12h8\"/>", "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>", "moon": "<path d=\"M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z\"/>", "auto": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 3v18a9 9 0 0 0 0-18z\" fill=\"currentColor\" stroke=\"none\"/>", "pen": "<path d=\"M4 20h4L19 9l-4-4L4 16z\"/><path d=\"m13.5 6.5 4 4\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/>", "pin": "<path d=\"M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z\"/><circle cx=\"12\" cy=\"9.5\" r=\"2.5\"/>", "image": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"m21 16-5-5-9 9\"/>", "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6\"/>"};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
/* =====================================================================
   CONFIG — every Wikidata ID the tool writes lives here.
   Use “Check IDs on Wikidata” (account dialog) to confirm labels.
   ===================================================================== */
const CFG = {
  // Behind the Node server (window.LX_PROXY) every call goes through /proxy/*; opened any other way, straight to Wikimedia.
  wd: window.LX_PROXY ? "/proxy/wd" : "https://www.wikidata.org/w/api.php",
  commons: window.LX_PROXY ? "/proxy/commons" : "https://commons.wikimedia.org/w/api.php",
  sparql: window.LX_PROXY ? "/proxy/sparql" : "https://query.wikidata.org/sparql",
  oauth: {
    clientId: "", // set to your OAuth 2.0 consumer's client ID so “লগ ইন” goes straight to Wikimedia
    authorize: "https://meta.wikimedia.org/w/rest.php/oauth2/authorize",
    token: "https://meta.wikimedia.org/w/rest.php/oauth2/access_token",
  },
  // Languages written in Bengali script. The item is looked up live by ISO 639-3 code (P220) and the lemma
  // language code is taken from existing Wikidata lexemes of that language; qid/code below are fallbacks.
  languages: [
    { iso3: "ben", qid: "Q9610", code: "bn", en: "Bengali", bn: "বাংলা" },
    { iso3: "asm", qid: "Q29401", code: "as", en: "Assamese", bn: "অসমীয়া" },
    { iso3: "kyw", qid: "", code: "", en: "Kurmali", bn: "কুড়মালি" },
    { iso3: "syl", qid: "Q2044", code: "syl", en: "Sylheti", bn: "সিলেটি" },
    { iso3: "ctg", qid: "Q33173", code: "", en: "Chittagonian", bn: "চাটগাঁইয়া" },
  ],
  categories: [
    { key: "noun", qid: "Q1084", en: "Noun", bn: "বিশেষ্য", nominal: true },
    { key: "proper_noun", qid: "Q147276", en: "Proper noun", bn: "নামবাচক বিশেষ্য", nominal: true },
    { key: "pronoun", qid: "Q36224", en: "Pronoun", bn: "সর্বনাম", nominal: true },
    { key: "verb", qid: "Q24905", en: "Verb", bn: "ক্রিয়া" },
    { key: "adjective", qid: "Q34698", en: "Adjective", bn: "বিশেষণ" },
    { key: "adverb", qid: "Q380057", en: "Adverb", bn: "ক্রিয়াবিশেষণ" },
    { key: "postposition", qid: "Q161873", en: "Postposition", bn: "অনুসর্গ" },
    { key: "conjunction", qid: "Q36484", en: "Conjunction", bn: "সংযোজক অব্যয়" },
    { key: "interjection", qid: "Q83034", en: "Interjection", bn: "আবেগসূচক অব্যয়" },
    { key: "numeral", qid: "Q63116", en: "Numeral", bn: "সংখ্যাবাচক শব্দ" },
    { key: "phrase", qid: "Q187931", en: "Phrase", bn: "বাক্যাংশ" },
    { key: "idiom", qid: "Q184511", en: "Idiom", bn: "বাগধারা" },
    { key: "proverb", qid: "Q35102", en: "Proverb", bn: "প্রবাদ" },
    { key: "prefix", qid: "Q134830", en: "Prefix", bn: "উপসর্গ" },
  ],
  // Grammatical features offered in the quick-add menu (any other item can be searched).
  // Grammatical features. IDs follow the Wikidata Lexeme Forms Bengali templates.
  features: {
    nominative: { qid: "Q131105", en: "nominative", bn: "কর্তৃ" },
    accusative: { qid: "Q146078", en: "accusative", bn: "কর্ম" },
    instrumental: { qid: "Q192997", en: "instrumental", bn: "করণ" },
    dative: { qid: "Q145599", en: "dative", bn: "সম্প্রদান" },
    ablative: { qid: "Q156986", en: "ablative", bn: "অপাদান" },
    locative: { qid: "Q202142", en: "locative", bn: "অধিকরণ" },
    genitive: { qid: "Q146233", en: "genitive", bn: "সম্বন্ধ" },
    vocative: { qid: "Q185077", en: "vocative", bn: "সম্বোধন" },
    singular: { qid: "Q110786", en: "singular", bn: "একবচন" },
    plural: { qid: "Q146786", en: "plural", bn: "বহুবচন" },
    positive: { qid: "Q3482678", en: "positive", bn: "সাধারণ" },
    comparative: { qid: "Q14169499", en: "comparative", bn: "তুলনামূলক" },
    superlative: { qid: "Q1817208", en: "superlative", bn: "অতিশয়ার্থ" },
    verbal_noun: { qid: "Q1350145", en: "verbal noun", bn: "ভাববাচক বিশেষ্য" },
    simple_present: { qid: "Q3910936", en: "simple present", bn: "সাধারণ বর্তমান" },
    present_continuous: { qid: "Q7240943", en: "present continuous", bn: "ঘটমান বর্তমান" },
    present_perfect: { qid: "Q1240211", en: "present perfect", bn: "পুরাঘটিত বর্তমান" },
    present_imperative: { qid: "Q52434162", en: "present imperative", bn: "বর্তমান অনুজ্ঞা" },
    simple_past: { qid: "Q1392475", en: "simple past", bn: "সাধারণ অতীত" },
    past_continuous: { qid: "Q56650537", en: "past continuous", bn: "ঘটমান অতীত" },
    pluperfect: { qid: "Q623742", en: "pluperfect", bn: "পুরাঘটিত অতীত" },
    habitual_past: { qid: "Q75243920", en: "habitual past", bn: "নিত্যবৃত্ত অতীত" },
    simple_future: { qid: "Q96323395", en: "simple future", bn: "সাধারণ ভবিষ্যৎ" },
    future_imperative: { qid: "Q75244800", en: "future imperative", bn: "ভবিষ্যৎ অনুজ্ঞা" },
    first_person: { qid: "Q21714344", en: "first person", bn: "উত্তম পুরুষ" },
    second_familiar: { qid: "Q56650487", en: "second person (familiar)", bn: "সাধারণ মধ্যম পুরুষ" },
    second_informal: { qid: "Q56650485", en: "second person (very informal)", bn: "তুচ্ছার্থ মধ্যম পুরুষ" },
    third_person: { qid: "Q51929074", en: "third person", bn: "প্রথম পুরুষ" },
    polite: { qid: "Q56650512", en: "polite form", bn: "সম্ভ্রমার্থ রূপ" },
    chalit: { qid: "Q75242466", en: "Chalit bhasha", bn: "চলিত ভাষা" },
    sadhu: { qid: "Q20613396", en: "Sadhu bhasha", bn: "সাধু ভাষা" },
    non_finite: { qid: "Q1050494", en: "non-finite verb", bn: "অসমাপিকা ক্রিয়া" },
    progressive: { qid: "Q1423674", en: "progressive", bn: "ঘটমান" },
    perfective: { qid: "Q1424306", en: "perfective", bn: "পুরাঘটিত" },
    conditional: { qid: "Q625581", en: "conditional", bn: "শর্তজ্ঞাপক" },
  },
  qualities: { animate: "Q51927507", inanimate: "Q51927539" },
  derivationModes: {
    inheritance: { label: "উত্তরাধিকার (তদ্ভব, inheritance)", qid: "Q200586" },
    borrowing: { label: "কৃতঋণ (borrowing)", qid: "Q1455220" },
    learned: { label: "শাস্ত্রীয় কৃতঋণ (তৎসম, learned borrowing)", term: "learned borrowing" },
    calque: { label: "অনুবাদঋণ (calque)", term: "calque" },
  },
  headRelations: {
    adjectival: { label: "বিশেষণমূলক", term: "adjectival modifier" },
    possessive: { label: "সম্বন্ধমূলক", term: "possessive nominal modifier" },
    subject: { label: "কর্তা", term: "nominal subject" },
    intensifier: { label: "জোর-বোধক", term: "intensifier" },
    root: { label: "মূল (root)", term: "root" },
  },
  origins: {
    tatsama: { label: "তৎসম", hint: "sanskrit", mode: "learned" },
    ardhatatsama: { label: "অর্ধতৎসম", hint: "sanskrit", mode: "inheritance" },
    tadbhava: { label: "তদ্ভব", hint: "prakrit|pali|sanskrit", mode: "inheritance" },
    deshi: { label: "দেশি", hint: "", mode: "" },
    persoarabic: { label: "আরবি-ফারসি", hint: "persian|arabic|turkish", mode: "borrowing" },
    european: { label: "বিদেশি (ইউরোপীয়)", hint: "english|portuguese|dutch|french", mode: "borrowing" },
  },
  // One-click suggestions in “Other statements”. IDs are checked live; missing ones are hidden.
  // `terms` are looked up by English label (property search) because their IDs weren't pinned down.
  suggest: {
    lexeme: { ids: ["P5185", "P31", "P5402", "P5920", "P8530", "P5911", "P5976", "P1343"], terms: ["anagram", "homophone"] },
    form: { ids: ["P898", "P5279", "P2440", "P5237"], terms: [] },
    sense: { ids: ["P5974", "P6593", "P5975", "P8471", "P6191"], terms: ["field of usage"] },
  },
  limits: { termLength: 1000, entityBytes: 2000000, maxlag: 5, maxRetries: 5, batchWarn: 500 },
};
const P = {
  hasQuality: "P1552", variety: "P7481", sameAs: "P460", combines: "P5238", ordinal: "P1545",
  objectForm: "P5548", headPos: "P9763", headRel: "P9764", derivedFrom: "P5191", derivMode: "P5886",
  usage: "P5831", subjForm: "P5830", subjSense: "P6072", attestedIn: "P5323", attestedAs: "P1932",
  item: "P5137", synonym: "P5973", translation: "P5972", statedIn: "P248", statedAs: "P1932",
  pages: "P304", describedBy: "P1343", namedAs: "P1810", location: "P6084", image: "P18", audio: "P443", refUrl: "P854", glossQuote: "P8394", describedAt: "P973", wordStem: "P5187", conjClass: "P5186", createsType: "P5923", officializedBy: "P5194", requiresFeature: "P5713",
};
// Fallbacks only; replaced by live datatypes/labels from Wikidata.
const DT = { P1552:"wikibase-item",P7481:"wikibase-item",P460:"wikibase-item",P5238:"wikibase-lexeme",P1545:"string",
  P5548:"wikibase-form",P9763:"string",P9764:"wikibase-item",P5191:"wikibase-lexeme",P5886:"wikibase-item",
  P5831:"monolingualtext",P5830:"wikibase-form",P6072:"wikibase-sense",P5323:"wikibase-item",P1932:"string",
  P5137:"wikibase-item",P5973:"wikibase-sense",P5972:"wikibase-sense",P248:"wikibase-item",P304:"string",
  P1343:"wikibase-item",P1810:"string",P6084:"wikibase-item",P18:"commonsMedia",P443:"commonsMedia",P854:"url",P8394:"monolingualtext",P973:"url",P5187:"monolingualtext",P5186:"wikibase-item",P5923:"wikibase-item",P5194:"wikibase-item",P5713:"wikibase-item",P1476:"monolingualtext",P813:"time" };
const PLABEL = { P1552:"has characteristic",P7481:"variety of lexeme, form or sense",P460:"said to be the same as",
  P5238:"combines lexemes",P1545:"series ordinal",P5548:"object form",P9763:"syntactic dependency head position",
  P9764:"syntactic dependency head relationship",P5191:"derived from lexeme",P5886:"mode of derivation",
  P5831:"usage example",P5830:"subject form",P6072:"subject sense",P5323:"attested in",P1932:"object named as",
  P5137:"item for this sense",P5973:"synonym",P5972:"translation",P248:"stated in",P304:"page(s)",
  P1343:"described by source",P1810:"subject named as",P6084:"location of sense usage",P18:"image",P443:"pronunciation audio",P854:"reference URL",P8394:"gloss quote",P973:"described at URL",P5187:"word stem",P5186:"conjugation class",P5923:"creates lexeme type",P5194:"officialized by",P5713:"requires grammatical feature",P1476:"title",P813:"retrieved",P518:"applies to part",P407:"language of work or name",P580:"start time",P582:"end time",P585:"point in time",P3831:"object has role",P5185:"grammatical gender",P11053:"grammatical person",P5402:"homograph lexeme",P5976:"false friend",P8530:"alternative form",P5920:"root",P5911:"paradigm class",P31:"instance of",P898:"IPA transcription",P2440:"transliteration",P5279:"hyphenation" };
// Bengali labels for the properties this tool uses (Wikidata's own Bengali label is used for others).
const PLABEL_BN = { P1552: "বৈশিষ্ট্য", P7481: "রূপভেদ", P460: "একই বলে কথিত", P5238: "খণ্ডাংশ", P1545: "ক্রমিক সংখ্যা",
  P5548: "নির্দিষ্ট রূপ", P9763: "প্রধান অংশের অবস্থান", P9764: "প্রধান অংশের সঙ্গে সম্পর্ক", P5191: "যে শব্দ থেকে উদ্ভূত", P5886: "উদ্ভবের ধরন",
  P5831: "প্রয়োগের উদাহরণ", P5830: "উদাহরণে ব্যবহৃত রূপ", P6072: "উদাহরণে ব্যবহৃত অর্থ", P5323: "যেখানে পাওয়া যায়", P1932: "উৎসে যেভাবে আছে",
  P5137: "এই অর্থের আইটেম", P5973: "সমার্থক শব্দ", P5972: "অনুবাদ", P248: "উৎস", P304: "পৃষ্ঠা", P1343: "বর্ণিত উৎস", P1810: "যে নামে উল্লিখিত",
  P6084: "ব্যবহারের অঞ্চল", P8394: "সংজ্ঞার উদ্ধৃতি", P973: "বর্ণনার URL", P5187: "শব্দমূল", P5186: "ক্রিয়ারূপের শ্রেণি", P5923: "যে ধরনের লেক্সিম গড়ে", P5194: "স্বীকৃতিদাতা", P5713: "আবশ্যিক ব্যাকরণগত বৈশিষ্ট্য", P11053: "ব্যাকরণগত পুরুষ", P518: "যে অংশে প্রযোজ্য", P407: "ভাষা", P580: "শুরুর সময়", P582: "শেষের সময়", P585: "সময়", P3831: "ভূমিকা", P18: "ছবি", P443: "উচ্চারণের অডিও", P854: "তথ্যসূত্রের URL", P5185: "ব্যাকরণগত লিঙ্গ", P31: "নিদর্শন (instance of)",
  P5402: "সমবানান শব্দ", P5920: "ধাতু/মূল", P8530: "বিকল্প রূপ", P5911: "রূপসাধন শ্রেণি", P5976: "ভ্রান্ত মিত্র (false friend)", P898: "আইপিএ উচ্চারণ",
  P5279: "অক্ষরবিভাজন", P2440: "প্রতিবর্ণীকরণ", P5237: "উচ্চারণভেদ", P5974: "বিপরীত শব্দ", P6593: "ঊর্ধ্বতন শব্দ (hyperonym)", P5975: "যার সুনির্দিষ্ট রূপ (troponym of)",
  P8471: "সম্পর্কিত বিশেষণ (pertainym of)", P6191: "ভাষার রীতি" };
const WDBN = {};
const pl = id => PLABEL_BN[id] || WDBN[id] || PLABEL[id] || id;
const ETYPE_BN = { item: "আইটেম", lexeme: "লেক্সিম", form: "রূপ", sense: "অর্থ", property: "প্রপার্টি", unknown: "অজানা" };
const toBn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
// Which properties have their own fields on each level; everything else is listed under “Other statements”.
const COVERED = {
  lexeme: [P.variety, P.sameAs, P.combines, P.derivedFrom, P.usage, P.attestedIn, P.audio, P.describedBy, P.describedAt, P.wordStem, P.conjClass, P.createsType, P.officializedBy, P.requiresFeature],
  form: [P.audio],
  sense: [P.item, P.synonym, P.translation, P.describedBy, P.describedAt, P.variety, P.attestedIn, P.location, P.image, P.audio, P.glossQuote],
};
let dtSource = "টুলের নিজস্ব তালিকা";
const SUGGEST = { lexeme: [], form: [], sense: [] };
const POPULAR = { lexeme: [], form: [], sense: [] };

/* ---------------- utilities ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const getPath = (o, p) => (p === "" ? o : p.split(".").reduce((a, k) => (a == null ? a : a[k]), o));
function setPath(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nfc = s => String(s ?? "").normalize("NFC").trim();
const catBy = q => CFG.categories.find(c => c.qid === q);
const langBy = q => CFG.languages.find(l => l.qid === q);
const FKEY = Object.fromEntries(Object.entries(CFG.features).map(([k, v]) => [v.qid, k]));
const FQ = Object.fromEntries(Object.entries(CFG.features).map(([k, v]) => [k, v.qid]));
const featName = q => (FKEY[q] ? CFG.features[FKEY[q]].en : q);
const isAnimacyVal = v => v === CFG.qualities.animate || v === CFG.qualities.inanimate;
function download(name, text, type = "application/json") {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const commonsUrl = f => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(String(f).replace(/ /g, "_"));
const commonsPage = f => "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(String(f).replace(/ /g, "_"));

/* ---------------- values (datatype-aware) ---------------- */
function defaultValue(dt) {
  switch (dt) {
    case "monolingualtext": { let lc = "bn"; try { lc = draft.langCode || "bn"; } catch (e) {} return { text: "", language: lc }; }
    case "quantity": return { amount: "", unit: "" };
    case "time": return { time: "" };
    case "globe-coordinate": return { lat: "", lon: "" };
    default: return "";
  }
}
function present(v) {
  if (v == null) return false;
  if (typeof v !== "object") return String(v).trim() !== "";
  if (v.special) return true;
  if ("text" in v) return !!String(v.text).trim();
  if ("amount" in v) return String(v.amount).trim() !== "";
  if ("time" in v) return !!String(v.time).trim();
  if ("lat" in v) return String(v.lat).trim() !== "" && String(v.lon).trim() !== "";
  return false;
}
function fmtValue(v) {
  if (v == null) return "";
  if (typeof v !== "object") return String(v);
  if (v.special) return v.special === "somevalue" ? "unknown value" : v.special === "novalue" ? "no value" : v.display || "(not editable here)";
  if ("text" in v) return `${v.text} (${v.language})`;
  if ("amount" in v) return v.amount + (v.unit ? " " + v.unit : "");
  if ("time" in v) return v.time;
  if ("lat" in v) return `${v.lat}, ${v.lon}`;
  return JSON.stringify(v);
}
function entVal(id) {
  id = String(id).trim(); let t = "unknown";
  if (/^Q\d+$/.test(id)) t = "item"; else if (/^P\d+$/.test(id)) t = "property";
  else if (/^(L\d+-|@)F\d+$/.test(id)) t = "form"; else if (/^(L\d+-|@)S\d+$/.test(id)) t = "sense";
  else if (/^L\d+$/.test(id)) t = "lexeme";
  const v = { "entity-type": t, id }; if (["item", "property", "lexeme"].includes(t)) v["numeric-id"] = +id.slice(1);
  return v;
}
function snak(prop, v) {
  if (v && v.special) return { snaktype: v.special === "unsupported" ? "value" : v.special, property: prop };
  const dt = DT[prop] || "string"; let dv;
  if (dt.startsWith("wikibase-")) dv = { type: "wikibase-entityid", value: entVal(v) };
  else if (dt === "monolingualtext") dv = { type: "monolingualtext", value: { text: nfc(v.text), language: v.language } };
  else if (dt === "quantity") {
    const n = String(v.amount ?? v).trim(); const unit = v.unit ? "http://www.wikidata.org/entity/" + v.unit : "1";
    dv = { type: "quantity", value: { amount: /^[+-]/.test(n) ? n : "+" + n, unit } };
  } else if (dt === "time") {
    const m = String(v.time ?? v).trim().match(/^(-?)(\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
    if (!m) dv = { type: "time", value: { time: "INVALID:" + (v.time ?? v) } };
    else {
      const prec = m[4] ? 11 : m[3] ? 10 : 9, pad = x => String(x || 0).padStart(2, "0");
      dv = { type: "time", value: { time: `${m[1] || "+"}${m[2].padStart(4, "0")}-${pad(m[3])}-${pad(m[4])}T00:00:00Z`, timezone: 0, before: 0, after: 0, precision: prec, calendarmodel: "http://www.wikidata.org/entity/Q1985727" } };
    }
  } else if (dt === "globe-coordinate") dv = { type: "globecoordinate", value: { latitude: +v.lat, longitude: +v.lon, precision: 0.0001, globe: "http://www.wikidata.org/entity/Q2" } };
  else dv = { type: "string", value: nfc(typeof v === "object" ? fmtValue(v) : v) };
  return { snaktype: "value", property: prop, datavalue: dv };
}
function parseSnak(sn) {
  if (sn.snaktype !== "value") return { special: sn.snaktype };
  const dv = sn.datavalue, v = dv.value;
  switch (dv.type) {
    case "wikibase-entityid": return v.id || ((v["entity-type"] === "property" ? "P" : v["entity-type"] === "lexeme" ? "L" : "Q") + v["numeric-id"]);
    case "string": return v;
    case "monolingualtext": return { text: v.text, language: v.language };
    case "quantity": return { amount: v.amount.replace(/^\+/, ""), unit: v.unit === "1" ? "" : v.unit.split("/").pop() };
    case "time": {
      const m = v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);
      if (!m || v.precision < 9) return { special: "unsupported", display: v.time };
      const y = (m[1] === "-" ? "-" : "") + m[2].replace(/^0+(?=\d{4})/, "");
      return { time: v.precision >= 11 ? `${y}-${m[3]}-${m[4]}` : v.precision === 10 ? `${y}-${m[3]}` : y };
    }
    case "globecoordinate": return { lat: v.latitude, lon: v.longitude };
    default: return { special: "unsupported", display: JSON.stringify(v) };
  }
}

/* ---------------- draft model ---------------- */
let keySeq = 1;
const newClaim = (prop, value, quals = []) => ({ prop, value: value ?? defaultValue(DT[prop]), quals: quals.map(([p, v]) => ({ prop: p, value: v ?? defaultValue(DT[p]) })), rank: "normal" });
const newForm = (rep = "", features = []) => ({ _key: keySeq++, rep, features, claims: [], example: "" });
const newSense = () => ({ _key: keySeq++, gloss: { bn: "", en: "" }, claims: [], cites: [], existingCites: [], showTranslations: false });
// sources: a lexeme-wide library of dictionaries/books; each sense cites any number of them (cites[].src = source _key)
const newSource = (statedIn = "", url = "") => ({ _key: keySeq++, statedIn, url });
const newCite = src => ({ src, pages: "", statedAs: "" });
const newDraft = () => ({ lemma: "", language: "Q9610", langCode: "bn", category: "", existingId: null, baserevid: null, orig: null,
  claims: [], _removed: [], forms: [], senses: [], sources: [], _removedForms: [], _removedSenses: [],
  _lookupFor: "", _formHits: [], _baseHits: [], _allowDup: false });
const formRef = f => f._id || "@F" + f._key;
const senseRef = s => s._id || "@S" + s._key;
let draft = newDraft();

const holderOf = hp => getPath(draft, hp);
const cp = (hp, rest) => (hp ? `${hp}.${rest}` : rest);
const idxOf = (h, prop, pred = () => true) => h.claims.map((c, i) => [c, i]).filter(([c]) => c.prop === prop && pred(c)).map(([, i]) => i);
function qualIdx(c, prop) { let j = c.quals.findIndex(q => q.prop === prop); if (j < 0) { c.quals.push({ prop, value: defaultValue(DT[prop]) }); j = c.quals.length - 1; } return j; }
function setVal(path, v) {
  setPath(draft, path, v);
  let o = draft; for (const k of path.split(".")) { o = o?.[k]; if (o && typeof o === "object" && !Array.isArray(o) && "prop" in o) o._dirty = true; }
}
function isCovered(level, c) {
  if (level === "lexeme" && c.prop === P.hasQuality) return isAnimacyVal(c.value) || !present(c.value);
  return COVERED[level].includes(c.prop);
}
const animacyClaim = () => draft.claims.find(c => c.prop === P.hasQuality && (isAnimacyVal(c.value) || !present(c.value)));
const isAnimate = () => animacyClaim()?.value === CFG.qualities.animate;
function setAnimacy(q) {
  const c = animacyClaim();
  if (!q) { if (c) { const i = draft.claims.indexOf(c); draft.claims.splice(i, 1); if (c._id) draft._removed.push(c._id); } }
  else if (c) { c.value = q; c._dirty = true; }
  else draft.claims.push(newClaim(P.hasQuality, q));
}
function walkClaims(fn) {
  const all = [draft, ...draft.forms, ...draft.senses];
  for (const h of all) for (const c of h.claims) { fn(c, "value"); c.quals.forEach(q => fn(q, "value")); }
}
function clearRef(ref) { walkClaims(o => { if (o.value === ref) { o.value = ""; o._dirty = true; } }); }

/* ---------------- loading an existing lexeme ---------------- */
function claimsFromEntity(obj) {
  const out = [];
  for (const [p, arr] of Object.entries(obj || {})) for (const s of arr) {
    if (s.mainsnak.datatype) DT[p] = s.mainsnak.datatype;
    const quals = [];
    for (const qp of s["qualifiers-order"] || Object.keys(s.qualifiers || {})) for (const q of s.qualifiers?.[qp] || []) {
      if (q.datatype) DT[qp] = q.datatype;
      quals.push({ prop: qp, value: parseSnak(q), _raw: q });
    }
    out.push({ _id: s.id, _orig: s, prop: p, value: parseSnak(s.mainsnak), quals, rank: s.rank });
  }
  return out;
}
function draftFromEntity(e) {
  const d = newDraft(); const lc = e.lemmas.bn ? "bn" : Object.keys(e.lemmas)[0];
  Object.assign(d, { lemma: e.lemmas[lc].value, langCode: lc, language: e.language, category: e.lexicalCategory, existingId: e.id, baserevid: e.lastrevid,
    orig: { lemma: e.lemmas[lc].value, language: e.language, category: e.lexicalCategory, otherLemmas: Object.values(e.lemmas).filter(l => l.language !== lc) },
    claims: claimsFromEntity(e.claims) });
  d.forms = (e.forms || []).map(f => {
    const rl = f.representations[lc] ? lc : Object.keys(f.representations)[0];
    return { _key: keySeq++, _id: f.id, rep: f.representations[rl]?.value || "", _repLang: rl, _origRep: f.representations[rl]?.value || "",
      otherReps: Object.values(f.representations).filter(r => r.language !== rl), features: [...f.grammaticalFeatures], _origFeatures: [...f.grammaticalFeatures], claims: claimsFromEntity(f.claims), example: "" };
  });
  d.senses = (e.senses || []).map(s => {
    const gloss = { bn: "", en: "" }; for (const [k, v] of Object.entries(s.glosses || {})) gloss[k] = v.value;
    const orig = {}; for (const [k, v] of Object.entries(s.glosses || {})) orig[k] = v.value;
    const claims = claimsFromEntity(s.claims);
    const existingCites = [];
    for (const c of claims) for (const r of c._orig?.references || []) {
      const one = p => { const sn = r.snaks?.[p]?.[0]; return sn ? fmtValue(parseSnak(sn)) : ""; };
      if (one(P.statedIn) || one(P.refUrl)) existingCites.push({ statedIn: one(P.statedIn), url: one(P.refUrl), pages: one(P.pages), statedAs: one(P.statedAs), on: c.prop });
    }
    return { _key: keySeq++, _id: s.id, gloss, _origGloss: orig, claims, cites: [], existingCites, showTranslations: false };
  });
  // Offer every source already used on this lexeme's senses for re-use.
  const seen = new Set();
  for (const s of d.senses) for (const c of s.existingCites) {
    const k = c.statedIn + "|" + c.url; if (seen.has(k) || (!/^Q\d+$/.test(c.statedIn) && !c.url)) continue; seen.add(k);
    d.sources.push({ ...newSource(/^Q\d+$/.test(c.statedIn) ? c.statedIn : "", c.url), _fromWd: true });
  }
  return d;
}

/* ---------------- Bengali form generator ---------------- */
function detectEnding(w) {
  w = nfc(w);
  if (/[\u09BE\u09C7\u09CB\u09C8]$/.test(w) || /[অআএওঐ]$/.test(w)) return "a";
  if (/[\u09BF\u09C0\u09C1\u09C2\u09CC\u09C3]$/.test(w) || /[ইঈউঊঔ]$/.test(w)) return "i";
  return "c";
}
const YA = "য\u09BC";
function inflect(w, animate, end, singular = true) {
  w = nfc(w); const sg = singular ? [FQ.singular] : [];
  const C = (kase, rep, f) => ({ kase, rep, feats: [...f, ...sg] });
  const out = [C("Nominative (কর্তৃ)", w, [FQ.nominative]), C("Genitive (সম্বন্ধ)", end === "c" ? w + "ের" : w + "র", [FQ.genitive])];
  if (animate) out.push(C("Accusative (কর্ম)", w + "কে", [FQ.accusative]), C("Dative (সম্প্রদান)", w + "কে", [FQ.dative]));
  else {
    if (end !== "i") out.push(C("Accusative (কর্ম)", w, [FQ.accusative]));
    out.push(C("Accusative (কর্ম)", w + "কে", [FQ.accusative]));
    if (end === "a") out.push(C("Locative (অধিকরণ)", w + YA, [FQ.locative]), C("Locative (অধিকরণ)", w + "তে", [FQ.locative]));
    else if (end === "i") out.push(C("Locative (অধিকরণ)", w + "তে", [FQ.locative]));
    else out.push(C("Locative (অধিকরণ)", w + "ে", [FQ.locative]));
  }
  return out;
}
function extras(w, animate, end) {
  w = nfc(w); const x = [];
  if (animate) {
    x.push({ kase: "বহুবচন, কর্তৃকারক", rep: w + (end === "c" ? "েরা" : "রা"), feats: [FQ.plural, FQ.nominative] });
    x.push({ kase: "বহুবচন, সম্বন্ধ পদ", rep: w + "দের", feats: [FQ.plural, FQ.genitive] });
    x.push({ kase: "বহুবচন, কর্ম কারক", rep: w + "দেরকে", feats: [FQ.plural, FQ.accusative] });
  } else {
    x.push({ kase: "বহুবচন (-গুলো), কর্তৃকারক", rep: w + "গুলো", feats: [FQ.plural, FQ.nominative] });
    x.push({ kase: "বহুবচন, সম্বন্ধ পদ", rep: w + "গুলোর", feats: [FQ.plural, FQ.genitive] });
    x.push({ kase: "বহুবচন, অধিকরণ কারক", rep: w + "গুলোতে", feats: [FQ.plural, FQ.locative] });
  }
  x.push({ kase: "নির্দিষ্টতাবাচক (-টা)", rep: w + "টা", feats: [FQ.singular] }, { kase: "নির্দিষ্টতাবাচক (-টি)", rep: w + "টি", feats: [FQ.singular] });
  return x;
}
const genOpts = { ending: "auto", template: "auto", extras: true, autoAudio: false, animacy: "" };
// Animacy used only for choosing/pre-filling the noun template. It starts from “has characteristic” (P1552)
// but choosing it on the Forms tab never changes that statement.
const tplAnimate = () => (genOpts.animacy ? genOpts.animacy === "animate" : isAnimate());
const curEnding = () => (genOpts.ending === "auto" ? detectEnding(draft.lemma) : genOpts.ending);
const isNominal = () => !!catBy(draft.category)?.nominal;

// Templates copied from Wikidata Lexeme Forms (tool-lexeme-forms, templates.py), the source of
// https://www.wikidata.org/wiki/Wikidata:Wikidata_Lexeme_Forms/Bengali.
// Synced with the wiki page text (labels, example sentences, features). The tool's source code had Q1305037 for
// verb-ano "সাধারণ অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা"; the wiki page has Q1392475 (simple past), which is used here. Form entry: [label, example, features, sectionBreak?]
const TEMPLATES = {"bengali-noun-animate":{"label":"প্রাণীবাচক বিশেষ্য","cat":"Q1084","base":"কুকুর","forms":[["কর্তৃকারক","আমার [কুকুর] ওখানে গিয়েছে।",["Q131105"]],["সম্বন্ধ পদ","এটা আমার [কুকুরের] নাম।",["Q146233"]],["কর্ম কারক","আমার [কুকুরকে] পছন্দ হয়েছে?",["Q146078"]],["সম্প্রদান কারক","আমার [কুকুরকে] মাংস দিন।",["Q145599"]]]},"bengali-noun-inanimate-othervowels":{"label":"অপ্রাণীবাচক বিশেষ্য (—আ/এ/ও-কারান্ত শব্দ)","cat":"Q1084","base":"জামা","forms":[["কর্তৃকারক","আমার [জামা] রঙিন।",["Q131105"]],["সম্বন্ধ পদ","এই [জামার] রঙ নীল।",["Q146233"]],["কর্ম কারক","সে তার [জামাকে] ছিঁড়ে দিয়েছে।",["Q146078"]],["অধিকরণ কারক (—য়-কারান্ত/—তে অক্ষরান্ত)","ওর [জামায়/জামাতে] একটা দাগ আছে।",["Q202142"]]]},"bengali-noun-inanimate-highvowels":{"label":"অপ্রাণীবাচক বিশেষ্য (-ই/ঈ/উ/ঊ/ঐ/ঔ-কারান্ত শব্দ)","cat":"Q1084","base":"গাড়ি","forms":[["কর্তৃকারক","এই [গাড়ি] চলছে।",["Q131105"]],["সম্বন্ধ পদ","এই [গাড়ির] রঙ লাল।",["Q146233"]],["কর্ম কারক","তার [গাড়িকে] লাল রঙ করে দিয়েছে।",["Q146078"]],["অধিকরণ কারক","শীঘ্রই [গাড়িতে] উঠুন!",["Q202142"]]]},"bengali-noun-inanimate-consonants":{"label":"অপ্রাণীবাচক বিশেষ্য (ব্যঞ্জনান্ত শব্দ)","cat":"Q1084","base":"আম","forms":[["কর্তৃকারক","এই [আম] পেকে গেছে।",["Q131105"]],["সম্বন্ধ পদ","এই [আমের] খোসা লাল।",["Q146233"]],["কর্ম কারক","সে [আমকে] একটু আগে কাটল।",["Q146078"]],["অধিকরণ কারক","ওই [আমে] একটা দাগ আছে।",["Q202142"]]]},"bengali-adjective-tatsama-property":{"label":"তৎসম গুণবাচক বিশেষণ","cat":"Q34698","base":"ক্ষুদ্র","forms":[["সাধারণ","এটি একটি [ক্ষুদ্র] জলাশয়।",["Q3482678"]],["তুলনামূলক","দুটির মধ্যে এটি [ক্ষুদ্রতর] জলাশয়।",["Q14169499"]],["অতিশয়ার্থমূলক","এই এলাকায় এটি [ক্ষুদ্রতম] জলাশয়।",["Q1817208"]]]},"bengali-adjective-others":{"label":"অন্যান্য বিশেষণ","cat":"Q34698","base":"ছোট","forms":[["সাধারণ","এটি একটি [ছোট] ডোবা।",["Q3482678"]]]},"bengali-adverb":{"label":"ক্রিয়া বিশেষণ","cat":"Q380057","base":"দ্রুত","forms":[["সাধারণ","ইনি [দ্রুত] করে দেবেন।",["Q3482678"]]]},"bengali-verb":{"label":"ক্রিয়াপদ","cat":"Q24905","base":"দেখ","forms":[["ভাববাচক বিশেষ্য","আমার [দেখা] হল।",["Q1350145"]],["সাধারণ বর্তমান, উত্তম পুরুষ","আমি [দেখি]।",["Q3910936","Q21714344"],1],["সাধারণ বর্তমান, সাধারণ মধ্যমপুরুষ","তুমি [দেখ]।",["Q3910936","Q56650487"]],["সাধারণ বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ","তুই [দেখিস]।",["Q3910936","Q56650485"]],["সাধারণ বর্তমান, প্রথম পুরুষ","সে [দেখে]।",["Q3910936","Q51929074"]],["সাধারণ বর্তমান, সম্ভ্রমার্থ রূপ","তিনি [দেখেন]।",["Q3910936","Q56650512"]],["ঘটমান বর্তমান, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখছি]।",["Q7240943","Q21714344","Q75242466"],1],["ঘটমান বর্তমান, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিতেছি]।",["Q7240943","Q21714344","Q20613396"]],["ঘটমান বর্তমান, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখছ]।",["Q7240943","Q56650487","Q75242466"]],["ঘটমান বর্তমান, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিতেছ]।",["Q7240943","Q56650487","Q20613396"]],["ঘটমান বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখছিস]।",["Q7240943","Q56650485","Q75242466"]],["ঘটমান বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিতেছিস]।",["Q7240943","Q56650485","Q20613396"]],["ঘটমান বর্তমান, প্রথম পুরুষ, চলিত ভাষা","সে [দেখছে]।",["Q7240943","Q51929074","Q75242466"]],["ঘটমান বর্তমান, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিতেছে]।",["Q7240943","Q51929074","Q20613396"]],["ঘটমান বর্তমান, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখছেন]।",["Q7240943","Q56650512","Q75242466"]],["ঘটমান বর্তমান, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিতেছেন]।",["Q7240943","Q56650512","Q20613396"]],["পুরাঘটিত বর্তমান, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখেছি]।",["Q1240211","Q21714344","Q75242466"],1],["পুরাঘটিত বর্তমান, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিয়াছি]।",["Q1240211","Q21714344","Q20613396"]],["পুরাঘটিত বর্তমান, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখেছ]।",["Q1240211","Q56650487","Q75242466"]],["পুরাঘটিত বর্তমান, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিয়াছ]।",["Q1240211","Q56650487","Q20613396"]],["পুরাঘটিত বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখেছিস]।",["Q1240211","Q56650485","Q75242466"]],["পুরাঘটিত বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিয়াছিস]।",["Q1240211","Q56650485","Q20613396"]],["পুরাঘটিত বর্তমান, প্রথম পুরুষ, চলিত ভাষা","সে [দেখেছে]।",["Q1240211","Q51929074","Q75242466"]],["পুরাঘটিত বর্তমান, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিয়াছে]।",["Q1240211","Q51929074","Q20613396"]],["পুরাঘটিত বর্তমান, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখেছেন]।",["Q1240211","Q56650512","Q75242466"]],["পুরাঘটিত বর্তমান, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিয়াছেন]।",["Q1240211","Q56650512","Q20613396"]],["বর্তমান অনুজ্ঞা, সাধারণ মধ্যমপুরুষ","তুমি [দেখো]।",["Q56650487","Q52434162"],1],["বর্তমান অনুজ্ঞা, তুচ্ছার্থ মধ্যমপুরুষ","তুই [দেখ]।",["Q56650485","Q52434162"]],["বর্তমান অনুজ্ঞা, প্রথম পুরুষ, চলিত ভাষা","সে [দেখুক]।",["Q52434162","Q51929074","Q75242466"]],["বর্তমান অনুজ্ঞা, প্রথম পুরুষ, সাধু ভাষা","সে [দেখুক]।",["Q52434162","Q51929074","Q20613396"]],["বর্তমান অনুজ্ঞা, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখুন]।",["Q52434162","Q56650512","Q75242466"]],["বর্তমান অনুজ্ঞা, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখুন]।",["Q52434162","Q56650512","Q20613396"]],["সাধারণ অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখলাম]।",["Q1392475","Q21714344","Q75242466"],1],["সাধারণ অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিলাম]।",["Q1392475","Q21714344","Q20613396"]],["সাধারণ অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখলে]।",["Q1392475","Q56650487","Q75242466"]],["সাধারণ অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিলে]।",["Q1392475","Q56650487","Q20613396"]],["সাধারণ অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখলি]।",["Q1392475","Q56650485","Q75242466"]],["সাধারণ অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিলি]।",["Q1392475","Q56650485","Q20613396"]],["সাধারণ অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখল]।",["Q1392475","Q51929074","Q75242466"]],["সাধারণ অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিল]।",["Q1392475","Q51929074","Q20613396"]],["সাধারণ অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখলেন]।",["Q1392475","Q56650512","Q75242466"]],["সাধারণ অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিলেন]।",["Q1392475","Q56650512","Q20613396"]],["ঘটমান অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখছিলাম]।",["Q56650537","Q21714344","Q75242466"],1],["ঘটমান অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিতেছিলাম]।",["Q56650537","Q21714344","Q20613396"]],["ঘটমান অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখছিলে]।",["Q56650537","Q56650487","Q75242466"]],["ঘটমান অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিতেছিলে]।",["Q56650537","Q56650487","Q20613396"]],["ঘটমান অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখছিলি]।",["Q56650537","Q56650485","Q75242466"]],["ঘটমান অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিতেছিলি]।",["Q56650537","Q56650485","Q20613396"]],["ঘটমান অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখছিল]।",["Q56650537","Q51929074","Q75242466"]],["ঘটমান অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিতেছিল]।",["Q56650537","Q51929074","Q20613396"]],["ঘটমান অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখছিলেন]।",["Q56650537","Q56650512","Q75242466"]],["ঘটমান অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিতেছিলেন]।",["Q56650537","Q56650512","Q20613396"]],["পুরাঘটিত অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখেছিলাম]।",["Q623742","Q21714344","Q75242466"],1],["পুরাঘটিত অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিয়াছিলাম]।",["Q623742","Q21714344","Q20613396"]],["পুরাঘটিত অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখেছিলে]।",["Q623742","Q56650487","Q75242466"]],["পুরাঘটিত অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিয়াছিলে]।",["Q623742","Q56650487","Q20613396"]],["পুরাঘটিত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখেছিলি]।",["Q623742","Q56650485","Q75242466"]],["পুরাঘটিত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিয়াছিলি]।",["Q623742","Q56650485","Q20613396"]],["পুরাঘটিত অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখেছিল]।",["Q623742","Q51929074","Q75242466"]],["পুরাঘটিত অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিয়াছিল]।",["Q623742","Q51929074","Q20613396"]],["পুরাঘটিত অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখেছিলেন]।",["Q623742","Q56650512","Q75242466"]],["পুরাঘটিত অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিয়াছিলেন]।",["Q623742","Q56650512","Q20613396"]],["নিত্যবৃত্ত অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখতাম]।",["Q75243920","Q21714344","Q75242466"],1],["নিত্যবৃত্ত অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিতাম]।",["Q75243920","Q21714344","Q20613396"]],["নিত্যবৃত্ত অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখতে]।",["Q75243920","Q56650487","Q75242466"]],["নিত্যবৃত্ত অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিতে]।",["Q75243920","Q56650487","Q20613396"]],["নিত্যবৃত্ত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখতিস]।",["Q75243920","Q56650485","Q75242466"]],["নিত্যবৃত্ত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিতিস]।",["Q75243920","Q56650485","Q20613396"]],["নিত্যবৃত্ত অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখত]।",["Q75243920","Q51929074","Q75242466"]],["নিত্যবৃত্ত অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিত]।",["Q75243920","Q51929074","Q20613396"]],["নিত্যবৃত্ত অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখতেন]।",["Q75243920","Q56650512","Q75242466"]],["নিত্যবৃত্ত অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিতেন]।",["Q75243920","Q56650512","Q20613396"]],["সাধারণ ভবিষ্যৎ, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখব]।",["Q96323395","Q21714344","Q75242466"],1],["সাধারণ ভবিষ্যৎ, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখিব]।",["Q96323395","Q21714344","Q20613396"]],["সাধারণ ভবিষ্যৎ, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখবে]।",["Q96323395","Q56650487","Q75242466"]],["সাধারণ ভবিষ্যৎ, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিবে]।",["Q96323395","Q56650487","Q20613396"]],["সাধারণ ভবিষ্যৎ, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখবি]।",["Q96323395","Q56650485","Q75242466"]],["সাধারণ ভবিষ্যৎ, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিবি]।",["Q96323395","Q56650485","Q20613396"]],["সাধারণ ভবিষ্যৎ, প্রথম পুরুষ, চলিত ভাষা","সে [দেখবে]।",["Q96323395","Q51929074","Q75242466"]],["সাধারণ ভবিষ্যৎ, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিবে]।",["Q96323395","Q51929074","Q20613396"]],["সাধারণ ভবিষ্যৎ, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখবেন]।",["Q96323395","Q56650512","Q75242466"]],["সাধারণ ভবিষ্যৎ, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিবেন]।",["Q96323395","Q56650512","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখো]।",["Q75244800","Q56650487","Q75242466"],1],["ভবিষ্যৎ অনুজ্ঞা, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখিও]।",["Q75244800","Q56650487","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখিস]।",["Q75244800","Q56650485","Q75242466"]],["ভবিষ্যৎ অনুজ্ঞা, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখিস]।",["Q75244800","Q56650485","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, প্রথম পুরুষ, চলিত ভাষা","সে [দেখবে]।",["Q75244800","Q51929074","Q75242466"]],["ভবিষ্যৎ অনুজ্ঞা, প্রথম পুরুষ, সাধু ভাষা","সে [দেখিবে]।",["Q75244800","Q51929074","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখবেন]।",["Q75244800","Q56650512","Q75242466"]],["ভবিষ্যৎ অনুজ্ঞা, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখিবেন]।",["Q75244800","Q56650512","Q20613396"]],["ঘটমান অসমাপিকা ক্রিয়া, চলিত ভাষা","আমি [দেখতে] চাই।",["Q1423674","Q1050494","Q75242466"],1],["ঘটমান অসমাপিকা ক্রিয়া, সাধু ভাষা","আমি [দেখিতে] চাই।",["Q1423674","Q1050494","Q20613396"]],["পুরাঘটিত অসমাপিকা ক্রিয়া, চলিত ভাষা","[দেখে] গেছি।",["Q1424306","Q1050494","Q75242466"]],["পুরাঘটিত অসমাপিকা ক্রিয়া, সাধু ভাষা","[দেখিয়া] গিয়াছি।",["Q1424306","Q1050494","Q20613396"]],["সর্তজ্ঞাপক অসমাপিকা ক্রিয়া, চলিত ভাষা","এটা [দেখলে] ভালো লাগে।",["Q625581","Q1050494","Q75242466"]],["সর্তজ্ঞাপক অসমাপিকা ক্রিয়া, সাধু ভাষা","ইহা [দেখিলে] ভালো লাগে।",["Q625581","Q1050494","Q20613396"]],["সম্বন্ধবাচক ভাববিশেষ্য, চলিত ভাষা","আমি সেটা [দেখার/দেখবার] জন্য গেছিলাম।",["Q146233","Q1350145","Q75242466"]],["সম্বন্ধবাচক ভাববিশেষ্য, সাধু ভাষা","আমি তাহা [দেখিবার] জন্য গিয়াছিলাম।",["Q146233","Q1350145","Q20613396"]]]},"bengali-verb-ano":{"label":"ক্রিয়াপদ (সাধিত ধাতু)","cat":"Q24905","base":"দেখ","forms":[["ভাববাচক বিশেষ্য","আমার [দেখানো] হল।",["Q1350145"]],["সাধারণ বর্তমান, উত্তম পুরুষ","আমি [দেখাই]।",["Q3910936","Q21714344"],1],["সাধারণ বর্তমান, সাধারণ মধ্যমপুরুষ","তুমি [দেখাও]।",["Q3910936","Q56650487"]],["সাধারণ বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ","তুই [দেখাস]।",["Q3910936","Q56650485"]],["সাধারণ বর্তমান, প্রথম পুরুষ","সে [দেখায়]।",["Q3910936","Q51929074"]],["সাধারণ বর্তমান, সম্ভ্রমার্থ রূপ","তিনি [দেখান]।",["Q3910936","Q56650512"]],["ঘটমান বর্তমান, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখাচ্ছি]।",["Q7240943","Q21714344","Q75242466"],1],["ঘটমান বর্তমান, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইতেছি]।",["Q7240943","Q21714344","Q20613396"]],["ঘটমান বর্তমান, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখাচ্ছ]।",["Q7240943","Q56650487","Q75242466"]],["ঘটমান বর্তমান, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইতেছ]।",["Q7240943","Q56650487","Q20613396"]],["ঘটমান বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখাচ্ছিস]।",["Q7240943","Q56650485","Q75242466"]],["ঘটমান বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইতেছিস]।",["Q7240943","Q56650485","Q20613396"]],["ঘটমান বর্তমান, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাচ্ছে]।",["Q7240943","Q51929074","Q75242466"]],["ঘটমান বর্তমান, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইতেছে]।",["Q7240943","Q51929074","Q20613396"]],["ঘটমান বর্তমান, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখাচ্ছেন]।",["Q7240943","Q56650512","Q75242466"]],["ঘটমান বর্তমান, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইতেছেন]।",["Q7240943","Q56650512","Q20613396"]],["পুরাঘটিত বর্তমান, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখিয়েছি]।",["Q1240211","Q21714344","Q75242466"],1],["পুরাঘটিত বর্তমান, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইয়াছি]।",["Q1240211","Q21714344","Q20613396"]],["পুরাঘটিত বর্তমান, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখিয়েছ]।",["Q1240211","Q56650487","Q75242466"]],["পুরাঘটিত বর্তমান, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইয়াছ]।",["Q1240211","Q56650487","Q20613396"]],["পুরাঘটিত বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখিয়েছিস]।",["Q1240211","Q56650485","Q75242466"]],["পুরাঘটিত বর্তমান, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইয়াছিস]।",["Q1240211","Q56650485","Q20613396"]],["পুরাঘটিত বর্তমান, প্রথম পুরুষ, চলিত ভাষা","সে [দেখিয়েছে]।",["Q1240211","Q51929074","Q75242466"]],["পুরাঘটিত বর্তমান, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইয়াছে]।",["Q1240211","Q51929074","Q20613396"]],["পুরাঘটিত বর্তমান, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখিয়েছেন]।",["Q1240211","Q56650512","Q75242466"]],["পুরাঘটিত বর্তমান, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইয়াছেন]।",["Q1240211","Q56650512","Q20613396"]],["বর্তমান অনুজ্ঞা, সাধারণ মধ্যমপুরুষ","তুমি [দেখাও]।",["Q56650487","Q52434162"],1],["বর্তমান অনুজ্ঞা, তুচ্ছার্থ মধ্যমপুরুষ","তুই [দেখা]।",["Q56650485","Q52434162"]],["বর্তমান অনুজ্ঞা, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাক]।",["Q52434162","Q51929074","Q75242466"]],["বর্তমান অনুজ্ঞা, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাক]।",["Q52434162","Q51929074","Q20613396"]],["বর্তমান অনুজ্ঞা, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখান]।",["Q52434162","Q56650512","Q75242466"]],["বর্তমান অনুজ্ঞা, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখান]।",["Q52434162","Q56650512","Q20613396"]],["সাধারণ অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখালাম]।",["Q1392475","Q21714344","Q75242466"],1],["সাধারণ অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইলাম]।",["Q1392475","Q21714344","Q20613396"]],["সাধারণ অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখালে]।",["Q1392475","Q56650487","Q75242466"]],["সাধারণ অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইলে]।",["Q1392475","Q56650487","Q20613396"]],["সাধারণ অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখালি]।",["Q1392475","Q56650485","Q75242466"]],["সাধারণ অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইলি]।",["Q1392475","Q56650485","Q20613396"]],["সাধারণ অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাল]।",["Q1392475","Q51929074","Q75242466"]],["সাধারণ অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইল]।",["Q1392475","Q51929074","Q20613396"]],["সাধারণ অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখালেন]।",["Q1392475","Q56650512","Q75242466"]],["সাধারণ অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইলেন]।",["Q1392475","Q56650512","Q20613396"]],["ঘটমান অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখাচ্ছিলাম]।",["Q56650537","Q21714344","Q75242466"],1],["ঘটমান অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইতেছিলাম]।",["Q56650537","Q21714344","Q20613396"]],["ঘটমান অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখাচ্ছিলে]।",["Q56650537","Q56650487","Q75242466"]],["ঘটমান অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইতেছিলে]।",["Q56650537","Q56650487","Q20613396"]],["ঘটমান অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখাচ্ছিলি]।",["Q56650537","Q56650485","Q75242466"]],["ঘটমান অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইতেছিলি]।",["Q56650537","Q56650485","Q20613396"]],["ঘটমান অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাচ্ছিল]।",["Q56650537","Q51929074","Q75242466"]],["ঘটমান অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইতেছিল]।",["Q56650537","Q51929074","Q20613396"]],["ঘটমান অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখাচ্ছিলেন]।",["Q56650537","Q56650512","Q75242466"]],["ঘটমান অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইতেছিলেন]।",["Q56650537","Q56650512","Q20613396"]],["পুরাঘটিত অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখিয়েছিলাম]।",["Q623742","Q21714344","Q75242466"],1],["পুরাঘটিত অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইয়াছিলাম]।",["Q623742","Q21714344","Q20613396"]],["পুরাঘটিত অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখিয়েছিলে]।",["Q623742","Q56650487","Q75242466"]],["পুরাঘটিত অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইয়াছিলে]।",["Q623742","Q56650487","Q20613396"]],["পুরাঘটিত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখিয়েছিলি]।",["Q623742","Q56650485","Q75242466"]],["পুরাঘটিত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইয়াছিলি]।",["Q623742","Q56650485","Q20613396"]],["পুরাঘটিত অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখিয়েছিল]।",["Q623742","Q51929074","Q75242466"]],["পুরাঘটিত অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইয়াছিল]।",["Q623742","Q51929074","Q20613396"]],["পুরাঘটিত অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখিয়েছিলেন]।",["Q623742","Q56650512","Q75242466"]],["পুরাঘটিত অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইয়াছিলেন]।",["Q623742","Q56650512","Q20613396"]],["নিত্যবৃত্ত অতীত, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখাতাম]।",["Q75243920","Q21714344","Q75242466"],1],["নিত্যবৃত্ত অতীত, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইতাম]।",["Q75243920","Q21714344","Q20613396"]],["নিত্যবৃত্ত অতীত, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখাতে]।",["Q75243920","Q56650487","Q75242466"]],["নিত্যবৃত্ত অতীত, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইতে]।",["Q75243920","Q56650487","Q20613396"]],["নিত্যবৃত্ত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখাতিস]।",["Q75243920","Q56650485","Q75242466"]],["নিত্যবৃত্ত অতীত, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইতিস]।",["Q75243920","Q56650485","Q20613396"]],["নিত্যবৃত্ত অতীত, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাত]।",["Q75243920","Q51929074","Q75242466"]],["নিত্যবৃত্ত অতীত, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইত]।",["Q75243920","Q51929074","Q20613396"]],["নিত্যবৃত্ত অতীত, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখাতেন]।",["Q75243920","Q56650512","Q75242466"]],["নিত্যবৃত্ত অতীত, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইতেন]।",["Q75243920","Q56650512","Q20613396"]],["সাধারণ ভবিষ্যৎ, উত্তম পুরুষ, চলিত ভাষা","আমি [দেখাব]।",["Q96323395","Q21714344","Q75242466"],1],["সাধারণ ভবিষ্যৎ, উত্তম পুরুষ, সাধু ভাষা","আমি [দেখাইব]।",["Q96323395","Q21714344","Q20613396"]],["সাধারণ ভবিষ্যৎ, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখাবে]।",["Q96323395","Q56650487","Q75242466"]],["সাধারণ ভবিষ্যৎ, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইবে]।",["Q96323395","Q56650487","Q20613396"]],["সাধারণ ভবিষ্যৎ, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখাবি]।",["Q96323395","Q56650485","Q75242466"]],["সাধারণ ভবিষ্যৎ, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাইবি]।",["Q96323395","Q56650485","Q20613396"]],["সাধারণ ভবিষ্যৎ, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাবে]।",["Q96323395","Q51929074","Q75242466"]],["সাধারণ ভবিষ্যৎ, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইবে]।",["Q96323395","Q51929074","Q20613396"]],["সাধারণ ভবিষ্যৎ, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখাবেন]।",["Q96323395","Q56650512","Q75242466"]],["সাধারণ ভবিষ্যৎ, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইবেন]।",["Q96323395","Q56650512","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, সাধারণ মধ্যমপুরুষ, চলিত ভাষা","তুমি [দেখাও]।",["Q75244800","Q56650487","Q75242466"],1],["ভবিষ্যৎ অনুজ্ঞা, সাধারণ মধ্যমপুরুষ, সাধু ভাষা","তুমি [দেখাইও]।",["Q75244800","Q56650487","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, তুচ্ছার্থ মধ্যমপুরুষ, চলিত ভাষা","তুই [দেখাস]।",["Q75244800","Q56650485","Q75242466"]],["ভবিষ্যৎ অনুজ্ঞা, তুচ্ছার্থ মধ্যমপুরুষ, সাধু ভাষা","তুই [দেখাস]।",["Q75244800","Q56650485","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, প্রথম পুরুষ, চলিত ভাষা","সে [দেখাবে]।",["Q75244800","Q51929074","Q75242466"]],["ভবিষ্যৎ অনুজ্ঞা, প্রথম পুরুষ, সাধু ভাষা","সে [দেখাইবে]।",["Q75244800","Q51929074","Q20613396"]],["ভবিষ্যৎ অনুজ্ঞা, সম্ভ্রমার্থ রূপ, চলিত ভাষা","তিনি [দেখাবেন]।",["Q75244800","Q56650512","Q75242466"]],["ভবিষ্যৎ অনুজ্ঞা, সম্ভ্রমার্থ রূপ, সাধু ভাষা","তিনি [দেখাইবেন]।",["Q75244800","Q56650512","Q20613396"]],["ঘটমান অসমাপিকা ক্রিয়া, চলিত ভাষা","আমি [দেখাতে] চাই।",["Q1423674","Q1050494","Q75242466"],1],["ঘটমান অসমাপিকা ক্রিয়া, সাধু ভাষা","আমি [দেখাইতে] চাই।",["Q1423674","Q1050494","Q20613396"]],["পুরাঘটিত অসমাপিকা ক্রিয়া, চলিত ভাষা","[দেখিয়ে] গেছি।",["Q1424306","Q1050494","Q75242466"]],["পুরাঘটিত অসমাপিকা ক্রিয়া, সাধু ভাষা","[দেখাইয়া] গিয়াছি।",["Q1424306","Q1050494","Q20613396"]],["সর্তজ্ঞাপক অসমাপিকা ক্রিয়া, চলিত ভাষা","এটা [দেখালে] ভালো লাগে।",["Q625581","Q1050494","Q75242466"]],["সর্তজ্ঞাপক অসমাপিকা ক্রিয়া, সাধু ভাষা","ইহা [দেখাইলে] ভালো লাগে।",["Q625581","Q1050494","Q20613396"]],["সম্বন্ধবাচক ভাববিশেষ্য, চলিত ভাষা","আমি সেটা [দেখাবার] জন্য গেছিলাম।",["Q146233","Q1350145","Q75242466"]],["সম্বন্ধবাচক ভাববিশেষ্য, সাধু ভাষা","আমি তাহা [দেখাইবার] জন্য গিয়াছিলাম।",["Q146233","Q1350145","Q20613396"]]]}};
/* ---------------- Lexeme Forms templates, case questions and tooltips ---------------- */
const QSHORT = { Q131105: "কে? কী?", Q146233: "কার? কীসের?", Q146078: "কাকে? কী?", Q145599: "কাকে? (দান)", Q202142: "কোথায়? কখন?", Q192997: "কী দিয়ে?", Q156986: "কোথা থেকে?", Q185077: "ডাকা",
  Q3482678: "কেমন?", Q14169499: "দুটির মধ্যে", Q1817208: "সবার মধ্যে", Q1350145: "কাজের নাম", Q3910936: "সাধারণত", Q7240943: "এখন চলছে", Q1240211: "শেষ হয়েছে", Q52434162: "এখন আদেশ",
  Q1392475: "আগে ঘটেছে", Q56650537: "আগে চলছিল", Q623742: "আগেই শেষ হয়েছিল", Q75243920: "আগে প্রায়ই", Q96323395: "পরে ঘটবে", Q75244800: "পরে আদেশ", Q1050494: "অসমাপিকা" };
const TIP = {
  Q131105: "কর্তৃকারক: যে কাজটি করে। ক্রিয়াকে “কে?” বা “কী?” দিয়ে প্রশ্ন করলে যে উত্তর মেলে। যেমন: কুকুর ডাকছে। কে ডাকছে? কুকুর।",
  Q146233: "সম্বন্ধ পদ: একটির সঙ্গে আরেকটির সম্পর্ক বোঝায়; “কার?” বা “কীসের?” প্রশ্নের উত্তর। প্রথাগত ব্যাকরণে এটি কারক নয়, পদ। যেমন: কুকুরের নাম। কার নাম? কুকুরের।",
  Q146078: "কর্ম কারক: যাকে বা যা নিয়ে কাজ করা হয়; “কাকে?” বা “কী?” প্রশ্নের উত্তর। যেমন: আমি কুকুরকে দেখলাম। কাকে দেখলাম? কুকুরকে।",
  Q145599: "সম্প্রদান কারক: যাকে স্বত্ব ত্যাগ করে কিছু দেওয়া হয়; “কাকে দিলাম?” প্রশ্নের উত্তর। যেমন: কুকুরকে মাংস দিন।",
  Q202142: "অধিকরণ কারক: কাজের স্থান, কাল বা বিষয়; “কোথায়?”, “কখন?”, “কীসে?” প্রশ্নের উত্তর। যেমন: জামায় দাগ আছে। কোথায়? জামায়।",
  Q192997: "করণ কারক: যা দিয়ে কাজ করা হয়; “কী দিয়ে?” বা “কীসের দ্বারা?” প্রশ্নের উত্তর। যেমন: কলমে লেখো।",
  Q156986: "অপাদান কারক: যা থেকে কিছু সরে যায়, জন্মায় বা ভয় পায়; “কোথা থেকে?” বা “কী হতে?” প্রশ্নের উত্তর। যেমন: গাছ থেকে পাতা পড়ে।",
  Q185077: "সম্বোধন পদ: কাউকে ডাকা বা আহ্বান করা। যেমন: ওহে বন্ধু, শোনো!",
  Q146786: "বহুবচন: একাধিক বোঝায় (-রা, -দের, -গুলো, -গুলি)।", Q110786: "একবচন: একটি বোঝায়।",
  Q3482678: "সাধারণ রূপ: তুলনা ছাড়া গুণ বা ভাব; “কেমন?” প্রশ্নের উত্তর।",
  Q14169499: "তুলনামূলক: দুটির মধ্যে তুলনা (তৎসম শব্দে সাধারণত -তর)।", Q1817208: "অতিশয়ার্থ: সবার মধ্যে সবচেয়ে বেশি (তৎসম শব্দে সাধারণত -তম)।",
  Q1350145: "ভাববাচক বিশেষ্য: ক্রিয়ার নাম বা ভাব (দেখা, করা)।",
  Q3910936: "সাধারণ বর্তমান: সাধারণত বা অভ্যাসে যা ঘটে।", Q7240943: "ঘটমান বর্তমান: কাজটি এখন চলছে।", Q1240211: "পুরাঘটিত বর্তমান: কাজ শেষ হয়েছে, তার ফল এখনও আছে।",
  Q52434162: "বর্তমান অনুজ্ঞা: এখনই আদেশ, অনুরোধ বা উপদেশ।", Q1392475: "সাধারণ অতীত: অতীতে কাজটি ঘটেছিল।", Q56650537: "ঘটমান অতীত: অতীতে কাজটি চলছিল।",
  Q623742: "পুরাঘটিত অতীত: অতীতের কোনো সময়ের আগেই কাজ শেষ হয়েছিল।", Q75243920: "নিত্যবৃত্ত অতীত: অতীতে অভ্যাসবশত বারবার ঘটত।",
  Q96323395: "সাধারণ ভবিষ্যৎ: কাজটি পরে ঘটবে।", Q75244800: "ভবিষ্যৎ অনুজ্ঞা: পরে করার আদেশ বা অনুরোধ।",
  Q21714344: "উত্তম পুরুষ: বক্তা নিজে (আমি, আমরা)।", Q56650487: "সাধারণ মধ্যম পুরুষ: তুমি, তোমরা।", Q56650485: "তুচ্ছার্থ মধ্যম পুরুষ: তুই, তোরা (ঘনিষ্ঠ বা তুচ্ছার্থে)।",
  Q51929074: "প্রথম পুরুষ: সে, তারা।", Q56650512: "সম্ভ্রমার্থ রূপ: আপনি, তিনি (সম্মানসূচক)।",
  Q75242466: "চলিত ভাষা: আধুনিক মান্য রূপ।", Q20613396: "সাধু ভাষা: পুরোনো লিখিত রূপ।",
  Q1050494: "অসমাপিকা ক্রিয়া: বাক্য শেষ করে না; আরেকটি ক্রিয়ার সঙ্গে বসে।", Q1423674: "ঘটমান (চলমান) ভাব।", Q1424306: "পুরাঘটিত (সম্পন্ন) ভাব।", Q625581: "শর্তজ্ঞাপক: শর্ত বোঝায় (দেখলে, করলে)।",
};
const tipText = feats => feats.map(q => TIP[q]).filter(Boolean).join("\n");
const shortQ = feats => feats.map(q => QSHORT[q]).filter(Boolean)[0] || "";
const tipHtml = feats => { const t = tipText(feats); return t ? `<span class="tip" tabindex="0" role="note" aria-label="${esc(t)}" data-tip="${esc(t)}">i</span>` : ""; };
// One floating tooltip, positioned in the viewport so scrolling tables don't clip it.
(() => {
  const box = document.createElement("div"); box.className = "tipfloat"; box.setAttribute("aria-hidden", "true"); document.body.appendChild(box);
  const show = el => { box.innerHTML = esc(el.dataset.tip).replace(/\n/g, "<br>"); box.style.display = "block";
    const r = el.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.bottom + 6; if (y + h > innerHeight - 8) y = r.top - h - 6;
    box.style.left = x + "px"; box.style.top = y + "px"; };
  const hide = () => (box.style.display = "none");
  document.addEventListener("mouseover", e => { const t = e.target.closest?.(".tip"); t ? show(t) : hide(); });
  document.addEventListener("focusin", e => { const t = e.target.closest?.(".tip"); t ? show(t) : hide(); });
  document.addEventListener("scroll", hide, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
})();
const fillX = (tpl, rep) => tpl.replace(/\[[^\]]*\]/, `[${nfc(rep) || "…"}]`);
const markX = s => esc(s).replace(/\[([^\]]*)\]/g, "<mark>$1</mark>");

const NOUN_TPLS = ["bengali-noun-animate", "bengali-noun-inanimate-othervowels", "bengali-noun-inanimate-highvowels", "bengali-noun-inanimate-consonants"];
const TPL_FOR_CAT = { Q1084: NOUN_TPLS, Q147276: NOUN_TPLS, Q34698: ["bengali-adjective-tatsama-property", "bengali-adjective-others"], Q380057: ["bengali-adverb"], Q24905: ["bengali-verb", "bengali-verb-ano"] };
const tplList = () => (draft.language === "Q9610" ? TPL_FOR_CAT[draft.category] || [] : []);
function autoTemplate() {
  const cat = draft.category, list = tplList(); if (!list.length) return "";
  if (list === NOUN_TPLS) { if (tplAnimate()) return NOUN_TPLS[0]; const e = curEnding(); return e === "a" ? NOUN_TPLS[1] : e === "i" ? NOUN_TPLS[2] : NOUN_TPLS[3]; }
  if (cat === "Q24905") return /ানো$/.test(nfc(draft.lemma)) ? "bengali-verb-ano" : "bengali-verb";
  if (cat === "Q34698") return draft.claims.some(c => c._origin === "tatsama") ? "bengali-adjective-tatsama-property" : "bengali-adjective-others";
  return list[0];
}
const curTemplate = () => { const l = tplList(); return genOpts.template !== "auto" && l.includes(genOpts.template) ? genOpts.template : autoTemplate(); };
function prefill(key, w, form) {
  w = nfc(w); if (!w) return "";
  const feats = form[2], T = TEMPLATES[key];
  if (key.startsWith("bengali-noun")) {
    const end = key.endsWith("othervowels") ? "a" : key.endsWith("highvowels") ? "i" : key.endsWith("consonants") ? "c" : curEnding();
    if (feats.includes(FQ.nominative)) return w;
    if (feats.includes(FQ.genitive)) return end === "c" ? w + "ের" : w + "র";
    if (feats.includes(FQ.accusative) || feats.includes(FQ.dative)) return w + "কে";
    if (feats.includes(FQ.locative)) return end === "a" ? `${w}${YA}/${w}তে` : end === "i" ? w + "তে" : w + "ে";
  }
  if (key === "bengali-adjective-tatsama-property") return feats.includes(FQ.comparative) ? w + "তর" : feats.includes(FQ.superlative) ? w + "তম" : w;
  if (key.startsWith("bengali-verb")) {
    // Swap the template's ending (after the stem দেখ) onto this verb's stem.
    const stem = key === "bengali-verb-ano" ? w.replace(/ানো$/, "") : w.replace(/া$/, "");
    const m = form[1].match(/\[([^\]]*)\]/); if (!m) return "";
    return m[1].split("/").map(a => stem + a.slice(T.base.length)).join("/");
  }
  return w;
}
// Fallback sentences for forms that no template row matches.
const CASES = {
  nominative: pl => ({ q: pl ? "কারা? কী কী?" : "কে? কী?", name: "কর্তৃকারক", s: "আমার [X] লাল রঙের।" }),
  genitive: pl => ({ q: pl ? "কাদের? কীসের?" : "কার? কীসের?", name: "সম্বন্ধ পদ", s: "[X] রংটা লাল।" }),
  accusative: pl => ({ q: pl ? "কাদের? কী কী?" : "কাকে? কী?", name: "কর্ম কারক", s: "আমি [X] দেখলাম।" }),
  dative: () => ({ q: "কাকে? (দান)", name: "সম্প্রদান কারক", s: "আমি [X] খাবার দিলাম।" }),
  locative: () => ({ q: "কোথায়? কখন?", name: "অধিকরণ কারক", s: "[X] একটা দাগ আছে।" }),
  instrumental: () => ({ q: "কী দিয়ে?", name: "করণ কারক", s: "[X] কাজটা সহজ হলো।" }),
  ablative: () => ({ q: "কোথা থেকে?", name: "অপাদান কারক", s: "[X] আওয়াজ এল।" }),
  vocative: () => ({ q: "ডাকা", name: "সম্বোধন পদ", s: "ওহে [X], শোনো!" }),
};
function sentenceGuide(f) {
  const set = f.features.filter(q => q !== FQ.singular).sort().join();
  const keys = [curTemplate(), ...tplList(), ...Object.keys(TEMPLATES)].filter(Boolean);
  for (const k of keys) { const row = TEMPLATES[k].forms.find(r => [...r[2]].sort().join() === set); if (row) return { q: shortQ(row[2]), name: row[0], s: row[1], feats: row[2] }; }
  const k = new Set(f.features.map(q => FKEY[q]).filter(Boolean)); const pl = k.has("plural"); const cat = catBy(draft.category)?.key;
  if (cat === "adjective") return { q: "কেমন?", name: "বিশেষণ", s: "এটা খুব [X] জিনিস।", feats: f.features };
  if (cat === "adverb") return { q: "কীভাবে?", name: "ক্রিয়াবিশেষণ", s: "সে [X] হাঁটছে।", feats: f.features };
  if (cat === "postposition") return { q: "সম্পর্ক", name: "অনুসর্গ", s: "বাড়ির [X] একটা গাছ আছে।", feats: f.features };
  for (const c of ["genitive", "accusative", "dative", "locative", "instrumental", "ablative", "vocative", "nominative"]) if (k.has(c)) return { ...CASES[c](pl), feats: f.features };
  return { ...CASES.nominative(pl), feats: f.features };
}

/* ---------------- plan builder ---------------- */
function buildStmt(c, extraRefs = []) {
  const s = { mainsnak: c.value?.special && c._orig ? c._orig.mainsnak : snak(c.prop, c.value), type: "statement", rank: c.rank || "normal" };
  if (c._id) s.id = c._id;
  const qs = {}, order = [];
  for (const q of c.quals) {
    let sn = null;
    if (q._raw && !q._dirty) sn = q._raw;
    else if (q.prop && present(q.value)) sn = q.value.special && q._raw ? q._raw : snak(q.prop, q.value);
    if (!sn) continue;
    if (!qs[q.prop]) { qs[q.prop] = []; order.push(q.prop); } qs[q.prop].push(sn);
  }
  if (order.length) { s.qualifiers = qs; s["qualifiers-order"] = order; }
  const refs = [...(c._orig?.references || [])];
  for (const g of [...extraRefs, ...(c._id ? [] : c.refs || [])]) {
    const pairs = g.filter(([, v]) => present(v)); if (!pairs.length) continue;
    const snaks = {}, so = []; for (const [rp, rv] of pairs) { if (!snaks[rp]) { snaks[rp] = []; so.push(rp); } snaks[rp].push(snak(rp, rv)); }
    refs.push({ snaks, "snaks-order": so });
  }
  if (refs.length) s.references = refs;
  return s;
}
function buildClaims(h, newRefs = []) {
  const out = [];
  for (const c of h.claims) {
    if (!c.prop) continue;
    if (c._id) {
      if (!present(c.value)) { out.push({ id: c._id, remove: "" }); continue; }
      if (!c._dirty) continue;
      out.push(buildStmt(c));
    } else if (present(c.value)) out.push(buildStmt(c, newRefs));
  }
  for (const id of h._removed || []) out.push({ id, remove: "" });
  return out;
}
const hasLocal = s => /"@[FS]\d+"/.test(JSON.stringify(s));
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function buildPlan(d) {
  const lc = d.langCode || "bn", isNew = !d.existingId, o = d.orig;
  const data = {}, phase2 = [];
  const split = (arr, target) => { const keep = [], later = []; arr.forEach(s => (hasLocal(s) ? later : keep).push(s)); if (later.length) phase2.push({ target, claims: later }); return keep; };
  if (isNew) { data.type = "lexeme"; data.lemmas = { [lc]: { language: lc, value: nfc(d.lemma) } }; data.language = d.language; data.lexicalCategory = d.category; }
  else if (o) {
    if (nfc(d.lemma) !== nfc(o.lemma)) data.lemmas = { [lc]: { language: lc, value: nfc(d.lemma) } };
    if (d.language !== o.language) data.language = d.language;
    if (d.category !== o.category) data.lexicalCategory = d.category;
  }
  const lcl = split(buildClaims(d), "lexeme"); if (lcl.length) data.claims = lcl;

  const forms = [], newFormKeys = [];
  for (const f of d.forms) {
    const fc = split(buildClaims(f), formRef(f));
    if (!f._id) {
      if (!present(f.rep)) continue;
      const x = { representations: { [lc]: { language: lc, value: nfc(f.rep) } }, grammaticalFeatures: f.features.filter(present) };
      if (fc.length) x.claims = fc; if (!isNew) x.add = "";
      forms.push(x); newFormKeys.push(f._key);
    } else {
      const x = { id: f._id }; let ch = false;
      if (present(f.rep) && nfc(f.rep) !== nfc(f._origRep)) { x.representations = { [f._repLang]: { language: f._repLang, value: nfc(f.rep) } }; ch = true; }
      if (!sameSet(f.features.filter(present), f._origFeatures)) { x.grammaticalFeatures = f.features.filter(present); ch = true; }
      if (fc.length) { x.claims = fc; ch = true; }
      if (ch) forms.push(x);
    }
  }
  d._removedForms.forEach(id => forms.push({ id, remove: "" }));
  if (forms.length) data.forms = forms;

  const senses = [], newSenseKeys = [];
  const srcBy = Object.fromEntries((d.sources || []).map(x => [x._key, x]));
  for (const s of d.senses) {
    const cites = (s.cites || []).map(c => ({ ...c, source: srcBy[c.src] })).filter(c => c.source && (present(c.source.statedIn) || present(c.source.url)));
    const refs = cites.map(c => [[P.statedIn, c.source.statedIn], [P.refUrl, c.source.url], [P.pages, c.pages], [P.statedAs, c.statedAs]]);
    const built = buildClaims(s, refs);
    // A reference needs a statement to sit on. If this sense gets no new statement, record each
    // cited source as “described by source” (P1343) instead, with page(s) and the printed form.
    const carriers = s.claims.filter(c => !c._id && c.prop && present(c.value)).length;
    if (!carriers) for (const c of cites) {
      if (!present(c.source.statedIn)) continue;
      const dupe = s.claims.some(x => x.prop === P.describedBy && x.value === c.source.statedIn);
      if (!dupe) built.push(buildStmt(newClaim(P.describedBy, c.source.statedIn, [[P.pages, c.pages], [P.namedAs, c.statedAs]]), c.source.url ? [[[P.refUrl, c.source.url]]] : []));
    }
    const sc = split(built, senseRef(s));
    const glosses = {}; const og = s._origGloss || {};
    for (const [k, v] of Object.entries(s.gloss)) { const t = nfc(v); if (t && t !== og[k]) glosses[k] = { language: k, value: t }; else if (!t && og[k]) glosses[k] = { language: k, remove: "" }; }
    if (!s._id) { const x = { glosses }; if (sc.length) x.claims = sc; if (!isNew) x.add = ""; senses.push(x); newSenseKeys.push(s._key); }
    else { const x = { id: s._id }; let ch = false; if (Object.keys(glosses).length) { x.glosses = glosses; ch = true; } if (sc.length) { x.claims = sc; ch = true; } if (ch) senses.push(x); }
  }
  d._removedSenses.forEach(id => senses.push({ id, remove: "" }));
  if (senses.length) data.senses = senses;
  return { phase1: { id: d.existingId || null, baserevid: d.baserevid || null, data, newFormKeys, newSenseKeys }, phase2, lemma: nfc(d.lemma) };
}

/* ---------------- validation ---------------- */
const EXPECT = { "wikibase-item": "item", "wikibase-lexeme": "lexeme", "wikibase-form": "form", "wikibase-sense": "sense", "wikibase-property": "property" };
const art = w => (/^[aeiou]/.test(w) ? "an " : "a ") + w;
function walkSnaks(obj, fn) {
  if (Array.isArray(obj)) return obj.forEach(x => walkSnaks(x, fn));
  if (obj && typeof obj === "object") { if (obj.snaktype && obj.property) fn(obj); else Object.values(obj).forEach(x => walkSnaks(x, fn)); }
}
// Each message can carry a location so the review list can jump to the place to fix it.
function validate(d, plan = buildPlan(d)) {
  const errors = [], warnings = [], locs = new Map(), lim = CFG.limits;
  const E = (m, loc) => { errors.push(m); if (loc) locs.set(m, loc); }, W = (m, loc) => { warnings.push(m); if (loc) locs.set(m, loc); };
  const HERO = sel => ({ kind: "hero", sel });
  if (!nfc(d.lemma)) E("শব্দ (lemma) খালি।", HERO("#lemma"));
  else if (d.langCode === "bn" && !/[\u0980-\u09FF]/.test(d.lemma)) W("ভাষার কোড bn, কিন্তু শব্দে কোনো বাংলা অক্ষর নেই।", HERO("#lemma"));
  if (!/^Q\d+$/.test(d.language)) E("ভাষা একটি আইটেম আইডি হতে হবে, যেমন Q9610।", HERO("#lang-preset"));
  if (d.langCode && !/^[a-z]{2,3}(-[a-z0-9-]+)?$/i.test(d.langCode)) E("ভাষার কোড ঠিক মনে হচ্ছে না (যেমন bn হওয়ার কথা)।", HERO("#lang-preset"));
  if (!d.category) E("শব্দশ্রেণি বাছা হয়নি।", HERO("#cat"));
  else if (!/^Q\d+$/.test(d.category)) E("শব্দশ্রেণি একটি আইটেম আইডি হতে হবে।", HERO("#cat"));
  if (!d.language || !d.langCode) E("এই ভাষার উইকি উপাত্ত আইটেম বা কোড পাওয়া যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন বা অন্য ভাষা বাছুন।", HERO("#lang-preset"));
  if (d.existingId && !/^L\d+$/.test(d.existingId)) E("লেক্সিম আইডি L12345-এর মতো হতে হবে।");
  if (nfc(d.lemma).length > lim.termLength) E(`শব্দটি ${lim.termLength} অক্ষরের বেশি লম্বা।`, HERO("#lemma"));
  // statement values, checked where they live so each message knows its place
  const checkVal = (prop, v, name, loc) => {
    if (!prop || !present(v) || v.special) return;
    const sn = snak(prop, v), dv = sn.datavalue; if (!dv) return;
    const want = EXPECT[DT[prop]];
    if (want && dv.type === "wikibase-entityid") {
      const got = dv.value["entity-type"];
      if (got === "unknown") E(`${name}: ${plbi(prop)}-এ “${dv.value.id}” সঠিক আইডি নয়।`, loc);
      else if (got !== want) E(`${name}: ${plbi(prop)}-এ ${ETYPE_BN[want]} দরকার, কিন্তু “${dv.value.id}” একটি ${ETYPE_BN[got]}।`, loc);
    }
    if (dv.type === "time" && String(dv.value.time).startsWith("INVALID")) E(`${name}: ${plbi(prop)}-এর তারিখ YYYY, YYYY-MM বা YYYY-MM-DD আকারে লিখুন।`, loc);
    if (dv.type === "quantity" && isNaN(+dv.value.amount)) E(`${name}: ${plbi(prop)}-এ “${dv.value.amount}” সংখ্যা নয়।`, loc);
    if (DT[prop] === "commonsMedia" && !/\.(ogg|oga|wav|flac|mp3|opus|webm|jpe?g|png|svg|tiff?|gif|webp)$/i.test(dv.value)) W(`${name}: ${plbi(prop)}-এ “${dv.value}” ফাইলের এক্সটেনশন অস্বাভাবিক।`, loc);
  };
  const holders = [["শব্দের তথ্য", d, ci => ({ kind: "claim", i: ci })], ...d.forms.map((f, i) => [`রূপ “${f.rep || toBn(i + 1)}”`, f, () => ({ kind: "form", i })]), ...d.senses.map((s, i) => [`অর্থ ${toBn(i + 1)}`, s, () => ({ kind: "sense", i })])];
  for (const [name, h, at] of holders) h.claims.forEach((c, ci) => {
    const loc = at(ci);
    if (!c.prop && present(c.value)) E(`${name}: একটি বিবৃতিতে মান আছে কিন্তু প্রপার্টি বাছা হয়নি।`, loc);
    if (c._id && !c._dirty) return; // untouched statements from Wikidata are not re-checked
    checkVal(c.prop, c.value, name, loc);
    c.quals.forEach(q => { if (!q.prop && present(q.value)) E(`${name}: ${plbi(c.prop)}-এর একটি কোয়ালিফায়ারে মান আছে কিন্তু প্রপার্টি নেই।`, loc); else checkVal(q.prop, q.value, name, loc); });
  });
  const seen = new Set();
  d.forms.forEach((f, i) => {
    const loc = { kind: "form", i };
    if (!present(f.rep)) { f._id ? E(`রূপ ${toBn(i + 1)} (${f._id})-এর বানান খালি রাখা যাবে না।`, loc) : W(`রূপ ${toBn(i + 1)}-এর বানান খালি, তাই বাদ যাবে।`, loc); return; }
    if (!f.features.filter(present).length) W(`রূপ “${f.rep}”-এর কোনো ব্যাকরণগত বৈশিষ্ট্য নেই।`, loc);
    const k = nfc(f.rep) + "|" + [...f.features].sort().join(","); if (seen.has(k)) W(`রূপ “${f.rep}” একই বৈশিষ্ট্যের আরেকটি রূপের পুনরাবৃত্তি।`, loc); seen.add(k);
  });
  d.senses.forEach((s, i) => { if (!Object.values(s.gloss).some(present)) E(`অর্থ ${toBn(i + 1)}-এ অন্তত একটি সংজ্ঞা (gloss) লিখুন।`, { kind: "sense", i }); });
  if (!d.existingId && d._lookupFor === nfc(d.lemma)) {
    if (d._formHits.length && !d._allowDup) d._formHits.forEach(h => E(`“${nfc(d.lemma)}” ইতিমধ্যে ${h.lexeme} (${h.lemma})-এর একটি রূপ${h.feats ? ` (${h.feats})` : ""}। নতুন লেক্সিম না বানিয়ে ওই লেক্সিমে অর্থ বা বিবৃতি যোগ করুন, অথবা “এটি একই বানানের ভিন্ন শব্দ” চাপুন।`, HERO("#found")));
    d._baseHits.forEach(h => W(`“${nfc(d.lemma)}” দেখতে ${h.lemma} + ${h.suffix} (${h.featText})-এর মতো। এটি হয়তো ${h.id}-এর একটি রূপ।`, HERO("#found")));
  }
  const bytes = new TextEncoder().encode(JSON.stringify(plan.phase1.data)).length;
  if (bytes > lim.entityBytes) E(`সম্পাদনাটি ${bytes} বাইট, সীমা ${lim.entityBytes} বাইট।`);
  const nothing = d.existingId && !Object.keys(plan.phase1.data).length && !plan.phase2.length;
  if (nothing) W("এখনো কিছু বদলানো হয়নি। কিছু বদলালে এখানে দেখা যাবে।");
  if (!d.existingId && !plan.phase1.data.forms && !plan.phase1.data.senses) W("এই লেক্সিমে এখনো কোনো রূপ বা অর্থ নেই।", { kind: "tab", tab: "senses" });
  return { errors, warnings, bytes, nothing, locs };
}

/* ---------------- auth + API ---------------- */
const auth = { token: "", user: "" };
try { auth.token = sessionStorage.getItem("wd_token") || ""; } catch (e) {}
async function api(base, params = {}, { post = false, body = null } = {}) {
  const q = new URLSearchParams({ format: "json", formatversion: "2" });
  if (auth.token) q.set("crossorigin", "1"); else q.set("origin", "*");
  const headers = auth.token ? { Authorization: "Bearer " + auth.token } : {};
  let res;
  if (post) {
    if (body instanceof FormData) { for (const [k, v] of Object.entries(params)) body.append(k, v); res = await fetch(base + "?" + q, { method: "POST", headers, body }); }
    else res = await fetch(base + "?" + q, { method: "POST", headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  } else { for (const [k, v] of Object.entries(params)) q.set(k, v); res = await fetch(base + "?" + q, { headers }); }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(base, location.href).host}`);
  const j = await res.json();
  // Wikibase puts the real reason of generic errors (failed-save, modification-failed…) in error.messages.
  const why = j.error && (j.error.messages || []).map(m => [m.name, ...(m.parameters || []).map(p => typeof p === "string" ? p.replace(/<[^>]+>/g, "") : JSON.stringify(p))].join(": ")).join(" · ");
  if (j.error) { const e = new Error(`${j.error.code}: ${j.error.info}${why ? " — " + why : ""}`); e.code = j.error.code; e.data = j; throw e; }
  return j;
}
async function csrf(base) { const j = await api(base, { action: "query", meta: "tokens", type: "csrf" }); return j.query.tokens.csrftoken; }
async function withMaxlag(fn, log = () => {}) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) { if (e.code === "maxlag" && i <= CFG.limits.maxRetries) { const w = 5000 * i; log(`সার্ভার ব্যস্ত; ${w / 1000} সেকেন্ড পরে আবার চেষ্টা (${i} নম্বর)`); await sleep(w); continue; } throw e; }
  }
}
function b64url(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
const redirectUri = () => location.origin + location.pathname;
async function startOAuth() {
  const clientId = CFG.oauth.clientId || localStorage.getItem("oa_client") || "";
  if (!clientId) { alert("আগে OAuth 2.0 client ID লিখুন।"); return; }
  if (location.protocol === "file:") { alert("OAuth-এর জন্য পাতাটি http(s) দিয়ে খুলতে হবে। লোকাল সার্ভার চালান (যেমন python -m http.server) বা কোথাও হোস্ট করুন।"); return; }
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem("oa_pkce", JSON.stringify({ verifier, state, clientId })); localStorage.setItem("oa_client", clientId);
  const u = new URL(CFG.oauth.authorize);
  u.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri(), code_challenge: challenge, code_challenge_method: "S256", state });
  location.href = u;
}
async function finishOAuth() {
  const q = new URLSearchParams(location.search); const code = q.get("code"); if (!code) return;
  history.replaceState(null, "", location.pathname);
  let saved; try { saved = JSON.parse(sessionStorage.getItem("oa_pkce") || "null"); } catch (e) {}
  if (!saved || saved.state !== q.get("state")) { alert("লগ ইন শেষ হয়নি (state মেলেনি)। আবার চেষ্টা করুন।"); return; }
  const res = await fetch(CFG.oauth.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: saved.clientId, code_verifier: saved.verifier, redirect_uri: redirectUri() }) });
  const j = await res.json();
  if (!j.access_token) { alert("লগ ইন ব্যর্থ: " + (j.error_description || j.error || res.status)); return; }
  setToken(j.access_token);
}
function setToken(t) { auth.token = t; try { t ? sessionStorage.setItem("wd_token", t) : sessionStorage.removeItem("wd_token"); } catch (e) {} refreshUser(); }
async function refreshUser() {
  auth.user = "";
  if (auth.token) { try { const j = await api(CFG.wd, { action: "query", meta: "userinfo" }); if (!j.query.userinfo.anon) auth.user = j.query.userinfo.name; } catch (e) { console.warn(e); } }
  const b = $("#acct"); b.querySelector("span").textContent = auth.user ? auth.user : (auth.token ? "টোকেন গ্রহণ হয়নি" : "লগ ইন"); b.classList.toggle("on", !!auth.user);
  const ds = $("#dlg-status"); if (ds) ds.textContent = auth.user ? `${auth.user} হিসেবে লগ ইন করা আছে। সম্পাদনা এই অ্যাকাউন্টে জমা হবে।` : "লগ ইন করা নেই। তবু খোঁজা, খসড়া তৈরি, যাচাই ও সম্পাদনা-পরিকল্পনা ডাউনলোড করা যাবে।";
  renderReview();
}

/* ---------------- submit ---------------- */
async function submitPlan(plan, summary, log = () => {}) {
  if (!auth.token) throw new Error("আগে লগ ইন করুন।");
  const token = await csrf(CFG.wd); const p1 = plan.phase1; const ml = String(CFG.limits.maxlag);
  let ent;
  if (Object.keys(p1.data).length || !p1.id) {
    const params = { action: "wbeditentity", data: JSON.stringify(p1.data), token, summary, maxlag: ml };
    if (p1.id) { params.id = p1.id; if (p1.baserevid) params.baserevid = String(p1.baserevid); } else params.new = "lexeme";
    log(p1.id ? `${p1.id} হালনাগাদ হচ্ছে…` : `“${plan.lemma}” লেক্সিম তৈরি হচ্ছে…`);
    const r = await withMaxlag(() => api(CFG.wd, params, { post: true }), log);
    ent = r.entity; log(`${ent.id} সংরক্ষিত (সংস্করণ ${ent.lastrevid})।`);
  } else ent = { id: p1.id, forms: [], senses: [] };
  const map = { lexeme: ent.id };
  const nf = p1.newFormKeys?.length || 0, ns = p1.newSenseKeys?.length || 0, ef = ent.forms || [], es = ent.senses || [];
  (p1.newFormKeys || []).forEach((k, i) => (map["@F" + k] = ef[ef.length - nf + i]?.id));
  (p1.newSenseKeys || []).forEach((k, i) => (map["@S" + k] = es[es.length - ns + i]?.id));
  for (const g of plan.phase2) {
    let json = JSON.stringify(g.claims);
    for (const [k, v] of Object.entries(map)) if (k.startsWith("@")) json = json.split(`"${k}"`).join(`"${v}"`);
    const target = map[g.target] || g.target;
    log(`${target}-এ ${g.claims.length}টি যুক্ত বিবৃতি যোগ হচ্ছে…`);
    await withMaxlag(() => api(CFG.wd, { action: "wbeditentity", id: target, data: JSON.stringify({ claims: JSON.parse(json) }), token, summary, maxlag: ml }, { post: true }), log);
  }
  return { id: ent.id, map };
}

/* ---------------- lookups, labels, properties ---------------- */
const lexCache = new Map(), labelCache = new Map(), termCache = new Map();
async function getLexeme(id, fresh = false) {
  if (!fresh && lexCache.has(id)) return lexCache.get(id);
  const j = await api(CFG.wd, { action: "wbgetentities", ids: id }); const e = j.entities[id];
  if (!e || e.missing !== undefined) throw new Error(`${id} not found`); lexCache.set(id, e); return e;
}
const firstVal = o => Object.values(o || {})[0]?.value || "";
const glossOf = s => s.glosses?.bn?.value || s.glosses?.en?.value || firstVal(s.glosses);
async function labelFor(id) {
  if (!id) return ""; if (labelCache.has(id)) return labelCache.get(id); let lab = "";
  try {
    const m = id.match(/^(L\d+)(?:-([FS])\d+)?$/);
    if (m) {
      const e = await getLexeme(m[1]); const lem = firstVal(e.lemmas);
      if (m[2] === "F") { const f = (e.forms || []).find(x => x.id === id); lab = f ? `${firstVal(f.representations)} (${lem}-এর রূপ)` : "রূপ পাওয়া যায়নি"; }
      else if (m[2] === "S") { const s = (e.senses || []).find(x => x.id === id); lab = s ? `${glossOf(s)} (${lem}-এর অর্থ)` : "অর্থ পাওয়া যায়নি"; }
      else lab = `${lem} (${e.language === "Q9610" ? "Bengali" : e.language}, ${catBy(e.lexicalCategory)?.en || e.lexicalCategory})`;
    } else if (/^[QP]\d+$/.test(id)) {
      const j = await api(CFG.wd, { action: "wbgetentities", ids: id, props: "labels|descriptions", languages: "en|bn", languagefallback: "1" });
      const e = j.entities[id]; lab = e?.missing !== undefined ? "পাওয়া যায়নি" : [e.labels?.en?.value || e.labels?.bn?.value, e.descriptions?.en?.value].filter(Boolean).join(", ");
    } else if (/^@F\d+$/.test(id)) { const f = draft.forms.find(f => "@F" + f._key === id); lab = f ? `${f.rep} (নতুন রূপ)` : ""; return lab; }
    else if (/^@S\d+$/.test(id)) { const s = draft.senses.find(s => "@S" + s._key === id); lab = s ? `${s.gloss.bn || s.gloss.en} (নতুন অর্থ)` : ""; return lab; }
  } catch (e) { lab = "লোড করা যায়নি"; }
  labelCache.set(id, lab); return lab;
}
async function ensureProps(ids) {
  const need = [...new Set(ids.filter(id => /^P\d+$/.test(id) && (!DT[id] || !PLABEL[id])))];
  for (let i = 0; i < need.length; i += 50) {
    const j = await api(CFG.wd, { action: "wbgetentities", ids: need.slice(i, i + 50).join("|"), props: "datatype|labels", languages: "bn|en" });
    for (const [id, e] of Object.entries(j.entities)) { if (e.missing !== undefined) { PLABEL[id] = null; continue; } if (e.datatype) DT[id] = e.datatype; if (e.labels?.en) PLABEL[id] = e.labels.en.value; if (e.labels?.bn) WDBN[id] = e.labels.bn.value; }
  }
}
async function resolveTerm(term, type = "item") {
  const k = type + ":" + term; if (termCache.has(k)) return termCache.get(k);
  const j = await api(CFG.wd, { action: "wbsearchentities", type, search: term, language: "en", uselang: "en", limit: 3 });
  const hit = type === "property" ? j.search.find(r => (r.label || "").toLowerCase() === term.toLowerCase()) : j.search[0];
  const q = hit?.id || ""; termCache.set(k, q); return q;
}
const resolveOpt = async o => (o ? (o.qid || (o.term ? await resolveTerm(o.term) : "")) : "");
async function loadPopular() {
  const lang = /^Q\d+$/.test(draft.language) ? draft.language : "Q9610";
  const q = path => `SELECT ?prop (COUNT(?st) AS ?n) WHERE { ?l dct:language wd:${lang} ${path} ?p ?st . ?prop wikibase:claim ?p . } GROUP BY ?prop ORDER BY DESC(?n) LIMIT 25`;
  const run = async (lvl, path) => {
    const r = await fetch(CFG.sparql + "?format=json&query=" + encodeURIComponent(q(path)), { headers: { Accept: "application/sparql-results+json" } });
    const j = await r.json(); POPULAR[lvl] = j.results.bindings.map(b => ({ id: b.prop.value.split("/").pop(), n: +b.n.value }));
  };
  await Promise.allSettled([run("lexeme", ";"), run("form", "; ontolex:lexicalForm ?x . ?x"), run("sense", "; ontolex:sense ?x . ?x")]);
  await ensureProps(Object.values(POPULAR).flat().map(p => p.id));
}

/* ---------------- pickers ---------------- */
const KIND_BY_DT = { "wikibase-item": "item", "wikibase-lexeme": "lexeme", "wikibase-form": "form", "wikibase-sense": "sense", "wikibase-property": "property", commonsMedia: "file" };
const ID_RE = { item: /^Q\d+$/, lexeme: /^L\d+$/, form: /^L\d+-F\d+$/, sense: /^L\d+-S\d+$/, property: /^P\d+$/ };
const PH = { item: "আইটেম খুঁজুন বা Q… লিখুন", lexeme: "লেক্সিম খুঁজুন বা L… লিখুন", form: "লেক্সিম খুঁজে তার রূপ বাছুন", sense: "লেক্সিম খুঁজে তার অর্থ বাছুন", file: "কমন্সে ফাইল খুঁজুন", property: "প্রপার্টি খুঁজুন বা P… লিখুন" };
async function subItems(kind, lexId) {
  const e = await getLexeme(lexId);
  if (kind === "form") return (e.forms || []).map(f => ({ id: f.id, label: firstVal(f.representations), desc: f.grammaticalFeatures.map(featName).join(", ") }));
  return (e.senses || []).map(s => ({ id: s.id, label: glossOf(s) || s.id, desc: "" }));
}
async function searchKind(kind, q, { scope, hint } = {}) {
  const lang = /[\u0980-\u09FF]/.test(q) ? "bn" : "en";
  if (kind === "item" || kind === "property") { const j = await api(CFG.wd, { action: "wbsearchentities", type: kind, search: q, language: lang, uselang: "en", limit: 10 }); return j.search.map(r => ({ id: r.id, label: r.label || r.id, desc: r.description || "" })); }
  if (kind === "file") { const j = await api(CFG.commons, { action: "query", list: "search", srsearch: q, srnamespace: "6", srlimit: "10" }); return j.query.search.map(r => { const t = r.title.replace(/^File:/, ""); return { id: t, label: t, desc: "" }; }); }
  if ((kind === "form" || kind === "sense") && /^L\d+$/.test(scope || "")) { const all = await subItems(kind, scope); return all.filter(it => (it.label + it.id).includes(q)); }
  const j = await api(CFG.wd, { action: "wbsearchentities", type: "lexeme", search: q, language: lang, uselang: "en", limit: 15 });
  let res = j.search.map(r => ({ id: r.id, label: r.label || r.id, desc: r.description || "", stage: kind !== "lexeme" }));
  if (hint) { const hs = hint.split("|"); const m = res.filter(r => hs.some(h => r.desc.toLowerCase().includes(h))); res = [...m, ...res.filter(r => !m.includes(r))]; }
  return res;
}
const PICK = {
  prop: async (path, v, el) => {
    try { await ensureProps([v]); } catch (e) {}
    const o = getPath(draft, path.replace(/\.prop$/, "")); o.value = defaultValue(DT[v]); o._dirty = true;
    rerender(el.dataset.rerender || "lexeme");
  },
};
function mountPicker(el) {
  const prop = el.dataset.prop, kind = el.dataset.kind || KIND_BY_DT[DT[prop]] || "string";
  const path = el.dataset.path, scopePath = el.dataset.scope, hint = el.dataset.hint || "";
  const cur = getPath(draft, path) || "";
  if (kind === "string") { el.innerHTML = `<input class="in" data-bind="${path}" value="${esc(cur)}" placeholder="${esc(el.dataset.ph || "মান")}">`; return; }
  el.classList.add("pk");
  el.innerHTML = `<input class="in" value="${esc(cur)}" placeholder="${esc(el.dataset.ph || PH[kind])}" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list"><small class="pk-lab"></small><ul class="pk-list" role="listbox" hidden></ul>`;
  const inp = el.querySelector("input"), lab = el.querySelector(".pk-lab"), list = el.querySelector("ul");
  let items = [], active = -1, timer;
  const showLabel = async v => { if (!v) { lab.textContent = ""; return; } if (kind === "file") { lab.innerHTML = `<a href="${commonsPage(v)}" target="_blank" rel="noopener">কমন্সে দেখুন</a>`; return; } lab.textContent = "…"; const t = await labelFor(v); lab.innerHTML = `${esc(t)} ${wdUrl(v) ? wdLink(v, v + " ↗") : ""}`; };
  const close = () => { list.hidden = true; inp.setAttribute("aria-expanded", "false"); active = -1; };
  const commit = v => {
    setVal(path, v); inp.value = v; close(); showLabel(v); schedulePreview();
    if (el.dataset.onpick) PICK[el.dataset.onpick](path, v, el); else if (el.dataset.rerender) rerender(el.dataset.rerender);
  };
  const draw = () => {
    list.innerHTML = items.length ? items.map((it, i) => `<li role="option" data-i="${i}" class="${i === active ? "on" : ""}"><b>${esc(it.label)}</b><span>${esc(it.id)}${it.stage ? (kind === "form" ? ", বাছলে রূপগুলো দেখাবে" : ", বাছলে অর্থগুলো দেখাবে") : ""}</span>${it.desc ? `<em>${esc(it.desc)}</em>` : ""}</li>`).join("") : `<li class="none">কিছু পাওয়া যায়নি</li>`;
    list.hidden = false; inp.setAttribute("aria-expanded", "true");
  };
  const pick = async it => { if (it.stage) { items = await subItems(kind, it.id); active = -1; draw(); inp.focus(); } else commit(it.id); };
  list.addEventListener("mousedown", e => { const li = e.target.closest("li[data-i]"); if (!li) return; e.preventDefault(); pick(items[+li.dataset.i]); });
  inp.addEventListener("keydown", e => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { active = Math.min(items.length - 1, active + 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { pick(items[active]); e.preventDefault(); }
    else if (e.key === "Escape") close();
  });
  inp.addEventListener("blur", () => setTimeout(close, 150));
  inp.addEventListener("focus", async () => {
    const scope = scopePath ? getPath(draft, scopePath) : "";
    if (!inp.value && /^L\d+$/.test(scope || "") && (kind === "form" || kind === "sense")) { try { items = await subItems(kind, scope); draw(); } catch (e) {} }
  });
  inp.addEventListener("input", () => {
    clearTimeout(timer); const q = inp.value.trim();
    if (!q) { setVal(path, ""); lab.textContent = ""; close(); schedulePreview(); return; }
    if (ID_RE[kind]?.test(q)) { if (kind === "property") { commit(q); return; } setVal(path, q); showLabel(q); schedulePreview(); }
    else if (kind === "file") { setVal(path, q); schedulePreview(); }
    timer = setTimeout(async () => {
      try { items = await searchKind(kind, q, { scope: scopePath ? getPath(draft, scopePath) : "", hint }); active = -1; draw(); }
      catch (err) { list.innerHTML = `<li class="none">${esc(err.message)}</li>`; list.hidden = false; }
    }, 250);
  });
  showLabel(cur);
}

/* ---------------- render helpers ---------------- */
const plbi = p => { const bn = PLABEL_BN[p] || WDBN[p], en = PLABEL[p]; return bn && en && bn !== en ? `${bn} (${en})` : bn || en || p; };
const wdUrl = id => {
  id = String(id || "");
  if (/^P\d+$/.test(id)) return `https://www.wikidata.org/wiki/Property:${id}`;
  if (/^Q\d+$/.test(id)) return `https://www.wikidata.org/wiki/${id}`;
  const m = id.match(/^(L\d+)(-[FS]\d+)?$/); return m ? `https://www.wikidata.org/wiki/Lexeme:${m[1]}${m[2] ? "#" + id : ""}` : "";
};
const wdLink = (id, text = id) => (wdUrl(id) ? `<a class="wdl" href="${wdUrl(id)}" target="_blank" rel="noopener" title="উইকি উপাত্তে ${esc(id)} দেখুন">${esc(text)}</a>` : esc(text));
const plab = p => `${esc(plbi(p))}<span class="pid">${p}</span>`;
const tipI = t => (t ? `<span class="tip" tabindex="0" role="note" aria-label="${esc(t)}" data-tip="${esc(t)}">i</span>` : "");
const field = (label, inner, help = "") => `<div class="f"><span class="fl">${label}${tipI(help)}</span>${inner}</div>`;
const sectionHead = (title, tip = "", extra = "") => `<h3>${title}${tipI(tip)}${extra}</h3>`;
const pk = (path, prop, o = {}) => `<div class="pkw" data-path="${path}" data-prop="${prop || ""}"${o.kind ? ` data-kind="${o.kind}"` : ""}${o.scope ? ` data-scope="${o.scope}"` : ""}${o.hint ? ` data-hint="${esc(o.hint)}"` : ""}${o.rr ? ` data-rerender="${o.rr}"` : ""}${o.onpick ? ` data-onpick="${o.onpick}"` : ""}${o.ph ? ` data-ph="${esc(o.ph)}"` : ""}></div>`;
const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
const tagOf = c => (c._id ? `<span class="tag">উইকি উপাত্তে আছে</span>` : `<span class="tag new">নতুন</span>`);
// Fixed value lists for item-valued properties (shown as a dropdown; “অন্য…” switches to search).
const VALUE_CHOICES = {
  P5185: [["Q499327", "পুংলিঙ্গ (masculine)"], ["Q1775415", "স্ত্রীলিঙ্গ (feminine)"], ["Q1775461", "ক্লীবলিঙ্গ (neuter)"], ["Q1305037", "উভলিঙ্গ (common)"]],
  P11053: [["Q21714344", "উত্তম পুরুষ (first person)"], ["Q51929049", "মধ্যম পুরুষ (second person)"], ["Q56650487", "সাধারণ মধ্যম পুরুষ"], ["Q56650485", "তুচ্ছার্থ মধ্যম পুরুষ"], ["Q56650512", "সম্ভ্রমার্থ রূপ (polite)"], ["Q51929074", "প্রথম পুরুষ (third person)"]],
  P5713: Object.values(CFG.features).map(x => [x.qid, `${x.bn} (${x.en})`]),
};
const NUMBER_CHOICES = [["Q110786", "একবচন (singular)"], ["Q146786", "বহুবচন (plural)"], ["Q110022", "দ্বিবচন (dual)"]];
const freeEntry = new Set();
function choiceSelect(path, prop, v) {
  const list = VALUE_CHOICES[prop]; const known = list.some(([q]) => q === v);
  return `<div class="row2 choice"><select data-hook="choice" data-path="${path}" aria-label="${esc(plbi(prop))}"><option value="">বাছুন…</option>${opts(list, v)}<option value="__other">অন্য… (খুঁজুন)</option></select>${known ? wdLink(v, v + " ↗") : ""}</div>`;
}
function valueEditor(path, prop, o = {}) {
  let v = getPath(draft, path); const dt = DT[prop];
  if (VALUE_CHOICES[prop] && (dt || "").startsWith("wikibase-item") && !freeEntry.has(path) && (!present(v) || VALUE_CHOICES[prop].some(([q]) => q === v))) return choiceSelect(path, prop, v);
  if (v && v.special) return `<div class="ro">${esc(fmtValue(v))}</div>`;
  if (!prop) return `<div class="muted">আগে প্রপার্টি বাছুন।</div>`;
  if (["monolingualtext", "quantity", "time", "globe-coordinate"].includes(dt) && (v == null || typeof v !== "object")) { v = defaultValue(dt); setPath(draft, path, v); }
  switch (dt) {
    case "wikibase-item": case "wikibase-lexeme": case "wikibase-form": case "wikibase-sense": case "wikibase-property": return pk(path, prop, o);
    case "commonsMedia": return pk(path, prop, { ...o, kind: "file" });
    case "monolingualtext": return `<div class="row2"><textarea rows="2" lang="${esc(v.language)}" data-bind="${path}.text">${esc(v.text)}</textarea><input class="in lc" data-bind="${path}.language" value="${esc(v.language)}" aria-label="ভাষার কোড"></div>`;
    case "quantity": return `<div class="row2"><input class="in" type="number" step="any" data-bind="${path}.amount" value="${esc(v.amount)}" placeholder="পরিমাণ">${pk(path + ".unit", "", { kind: "item", ph: "একক (ঐচ্ছিক)" })}</div>`;
    case "time": return `<input class="in" data-bind="${path}.time" value="${esc(v.time)}" placeholder="YYYY, YYYY-MM বা YYYY-MM-DD">`;
    case "globe-coordinate": return `<div class="row2"><input class="in" type="number" step="any" data-bind="${path}.lat" value="${esc(v.lat)}" placeholder="অক্ষাংশ"><input class="in" type="number" step="any" data-bind="${path}.lon" value="${esc(v.lon)}" placeholder="দ্রাঘিমাংশ"></div>`;
    case undefined: return `<div class="muted">ডেটাটাইপ লোড হচ্ছে…</div>`;
    default: return `<input class="in" data-bind="${path}" value="${esc(typeof v === "string" ? v : "")}"${o.lang ? ` lang="${o.lang}"` : ""}${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}>`;
  }
}
function extraQualChips(c, managed) {
  const extra = c.quals.filter(q => q.prop && !managed.includes(q.prop) && present(q.value));
  return extra.length ? `<div class="chips" style="margin:2px 0 6px">${extra.map(q => `<span class="chip" title="এই কোয়ালিফায়ার যেমন আছে তেমনই থাকবে">${esc(plbi(q.prop))}: ${esc(fmtValue(q.value))}</span>`).join("")}</div>` : "";
}
const refNote = c => (c._orig?.references?.length ? `<small class="muted">${c._orig.references.length} টি তথ্যসূত্র অপরিবর্তিত থাকবে</small>` : "");
function propList(hp, prop, sec, o = {}) {
  const h = holderOf(hp); let items = idxOf(h, prop);
  if (!items.length && o.noAuto) return "";
  if (!items.length) { h.claims.push(newClaim(prop)); items = idxOf(h, prop); }
  return `<div class="multi">${items.map(i => {
    const c = h.claims[i], base = cp(hp, `claims.${i}`);
    const qf = (o.quals || []).map(qp => { const j = qualIdx(c, qp); return field(plab(qp), valueEditor(`${base}.quals.${j}.value`, qp, { lang: "bn" })); }).join("");
    return `<div class="mi"><div class="mi-body">${valueEditor(base + ".value", prop, o)}${qf ? `<div class="row">${qf}</div>` : ""}${extraQualChips(c, o.quals || [])}${c._id ? tagOf(c) + " " + refNote(c) : ""}</div><button class="x" data-act="removeClaim" data-hp="${hp}" data-i="${i}" data-sec="${sec}" aria-label="সরান">×</button></div>`;
  }).join("")}<button class="add" data-act="addClaim" data-hp="${hp}" data-prop="${prop}" data-sec="${sec}">+ আরও একটি</button></div>`;
}
// Fields that only appear once added: chips for the empty ones, full editors for the rest.
function optParts(hp, sec, specs) {
  const h = holderOf(hp);
  const shown = specs.filter(sp => h.claims.some(c => c.prop === sp.prop)), hidden = specs.filter(sp => !shown.includes(sp));
  return {
    shown: shown.length ? `<div class="row">${shown.map(sp => field(plab(sp.prop), propList(hp, sp.prop, sec, { quals: sp.quals || [], noAuto: true }) + (sp.extra ? sp.extra() : ""), sp.help || "")).join("")}</div>` : "",
    chips: hidden.map(sp => `<button class="pchip" data-act="addClaim" data-hp="${hp}" data-prop="${sp.prop}" data-sec="${sec}"${sp.help ? ` title="${esc(sp.help)}"` : ""}>+ ${esc(plbi(sp.prop))}</button>`).join(""),
  };
}
function optFields(hp, sec, specs) {
  const h = holderOf(hp);
  const shown = specs.filter(sp => h.claims.some(c => c.prop === sp.prop)), hidden = specs.filter(sp => !shown.includes(sp));
  return `${shown.length ? `<div class="row">${shown.map(sp => field(plab(sp.prop), propList(hp, sp.prop, sec, { quals: sp.quals || [], noAuto: true }) + (sp.extra ? sp.extra() : ""), sp.help || "")).join("")}</div>` : ""}
    ${hidden.length ? `<div class="chips addchips">${hidden.map(sp => `<button class="pchip" data-act="addClaim" data-hp="${hp}" data-prop="${sp.prop}" data-sec="${sec}"${sp.help ? ` title="${esc(sp.help)}"` : ""}>+ ${esc(plbi(sp.prop))}</button>`).join("")}</div>` : ""}`;
}
// Qualifiers offered with one click under any statement.
const QUAL_SUGGEST = ["P5830", "P6072", "P518", "P7481", "P1810", "P1932", "P304", "P407", "P580", "P582", "P585", "P1545", "P3831"];
function claimEditor(hp, i, sec) {
  const c = holderOf(hp).claims[i], base = cp(hp, `claims.${i}`);
  return `<div class="rowcard claim">
    ${c.prop ? `<div class="cl-head">${plab(c.prop)} ${tagOf(c)} <span class="muted" style="font-size:12px">${esc(DT[c.prop] || "")}</span></div>`
      : field("প্রপার্টি", pk(base + ".prop", "", { kind: "property", onpick: "prop", rr: sec }))}
    ${c.prop ? `<div class="f">${valueEditor(base + ".value", c.prop)}</div>` : ""}
    ${c.quals.map((q, j) => `<div class="qual"><div class="qual-p">${q.prop ? plab(q.prop) : pk(`${base}.quals.${j}.prop`, "", { kind: "property", onpick: "prop", rr: sec })}</div><div class="qual-v">${q.prop ? valueEditor(`${base}.quals.${j}.value`, q.prop) : ""}</div><button class="x" data-act="removeQual" data-path="${base}" data-j="${j}" data-sec="${sec}" aria-label="কোয়ালিফায়ার সরান">×</button></div>`).join("")}
    ${c.prop ? `<div class="qsugg"><span class="fl">কোয়ালিফায়ার যোগ:</span>${QUAL_SUGGEST.filter(q => q !== c.prop && !c.quals.some(x => x.prop === q)).map(q => `<button class="pchip small" data-act="addQual" data-path="${base}" data-prop="${q}" data-sec="${sec}" title="${q}">+ ${esc(plbi(q))}</button>`).join("")}<button class="pchip small" data-act="addQual" data-path="${base}" data-sec="${sec}">+ অন্য</button>${refNote(c)}</div>` : ""}
    <button class="x" data-act="removeClaim" data-hp="${hp}" data-i="${i}" data-sec="${sec}" aria-label="বিবৃতি সরান">×</button>
  </div>`;
}
const audioFinds = {};
const audioKey = hp => (hp ? "k" + holderOf(hp)?._key : "lex");
async function searchCommonsAudio(word) {
  const w = nfc(word); if (!w) return [];
  const seen = new Set(); const titles = [];
  for (const q of [`intitle:"${w}" filetype:audio`, `"${w}" filetype:audio`]) {
    try { const j = await api(CFG.commons, { action: "query", list: "search", srsearch: q, srnamespace: "6", srlimit: "20" }); for (const r of j.query.search) { const t = r.title.replace(/^File:/, ""); if (!seen.has(t)) { seen.add(t); titles.push(t); } } } catch (e) {}
  }
  const stem = t => nfc(t.replace(/\.[^.]+$/, "").replace(/_/g, " "));
  const score = t => { const b = stem(t); if (b === w || b === "Bn-" + w || b.endsWith("-" + w)) return 3; if (b.split(/[-_ ()]+/).includes(w)) return 2; return b.includes(w) ? 1 : 0; };
  return titles.map(t => ({ title: t, score: score(t), ll: /^LL-Q9610/.test(t) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}
async function findAudioFor(hp, sec, word) {
  const k = audioKey(hp); audioFinds[k] = { loading: true, word: nfc(word) }; rerender(sec);
  const items = await searchCommonsAudio(word);
  audioFinds[k] = { items, word: nfc(word) }; rerender(sec);
}
function audioBlock(hp, sec, word) {
  const h = holderOf(hp); const items = idxOf(h, P.audio); const fr = audioFinds[audioKey(hp)];
  const attached = new Set(h.claims.filter(c => c.prop === P.audio).map(c => nfc(String(c.value).replace(/_/g, " "))));
  return `<div class="audio-blk" data-afind="${audioKey(hp)}"><div class="fl">${plab(P.audio)}</div>
    ${items.map(i => { const c = h.claims[i]; return `<div class="aud">${present(c.value) && c._id ? `<audio controls preload="none" src="${commonsUrl(c.value)}"></audio><a href="${commonsPage(c.value)}" target="_blank" rel="noopener">${esc(c.value)}</a>` : `<div style="flex:1">${pk(cp(hp, `claims.${i}.value`), P.audio, { kind: "file", rr: sec })}</div>`} ${tagOf(c)}<button class="x" data-act="removeClaim" data-hp="${hp}" data-i="${i}" data-sec="${sec}" aria-label="অডিও সরান">×</button></div>`; }).join("")}
    <div class="row" style="gap:8px;margin-top:6px"><button class="btn small" data-act="audioDlg" data-hp="${hp}" data-sec="${sec}" data-word="${esc(word)}">রেকর্ড বা আপলোড</button><button class="btn ghost small" data-act="findAudio" data-hp="${hp}" data-sec="${sec}" data-word="${esc(word)}">কমন্সে খুঁজুন</button><button class="btn ghost small" data-act="addClaim" data-hp="${hp}" data-prop="${P.audio}" data-sec="${sec}">ফাইলের নাম দিয়ে যুক্ত করুন</button></div>
    ${fr ? fr.loading ? `<p class="hint" style="margin-top:6px">কমন্সে “${esc(fr.word)}” খোঁজা হচ্ছে…</p>`
      : fr.items.length ? `<ul class="afind">${fr.items.map(x => `<li><audio controls preload="none" src="${commonsUrl(x.title)}"></audio><a href="${commonsPage(x.title)}" target="_blank" rel="noopener">${esc(x.title)}</a>${x.score === 3 ? '<span class="tag">নাম মিলেছে</span>' : ""}${x.ll ? '<span class="tag">Lingua Libre</span>' : ""}${attached.has(nfc(x.title)) ? '<span class="muted">যুক্ত</span>' : `<button class="btn ghost small" data-act="attachAudio" data-hp="${hp}" data-sec="${sec}" data-file="${esc(x.title)}">যুক্ত করুন</button>`}</li>`).join("")}</ul>`
      : `<p class="hint" style="margin-top:6px">কমন্সে “${esc(fr.word)}”-এর অডিও এখনো নেই। “রেকর্ড বা আপলোড” দিয়ে যোগ করুন।</p>` : ""}
  </div>`;
}
function localFormOpts(cur) { return opts([["", "যুক্ত নয়"], ...draft.forms.map((f, i) => [formRef(f), `${f.rep || "(খালি)"} (${f._id || "নতুন রূপ " + toBn(i + 1)})`])], cur); }
function localSenseOpts(cur) { return opts([["", "যুক্ত নয়"], ...draft.senses.map((s, i) => [senseRef(s), `${s.gloss.bn || s.gloss.en || "(সংজ্ঞা নেই)"} (${s._id || "নতুন অর্থ " + toBn(i + 1)})`])], cur); }

/* ---------------- panels ---------------- */

/* ---------------- Forms: the Lexeme Forms template is the form editor ----------------
   Each template row is linked to the draft form(s) it produces (f._tplKey / f._tplRow).
   Ticking a row creates the form, typing edits it, unticking removes it (new forms only). */
const tpl = { key: "", sig: "", rows: [], vals: [], on: [], edited: [], open: new Set() };
const repsOf = v => String(v || "").split("/").map(nfc).filter(Boolean);
const featSig = feats => [...feats].filter(q => q !== FQ.singular).sort().join();
const formsOfRow = i => draft.forms.filter(f => f._tplKey === tpl.key && f._tplRow === i);
const customForms = () => draft.forms.filter(f => !tpl.key || f._tplKey !== tpl.key);
function tplRows(key) {
  const rows = TEMPLATES[key].forms.map((r, i) => ({ label: r[0], ex: r[1], feats: r[2], sec: r[3] ? r[0].split(",")[0] : "", ti: i }));
  if (key.startsWith("bengali-verb") && rows[0]) rows[0].sec = "ভাববাচক বিশেষ্য";
  if (key.startsWith("bengali-noun") && genOpts.extras)
    extras("", false, "c").forEach((x, j) => { const fx = extras("x", tplAnimate(), curEnding())[j]; if (fx) rows.push({ label: fx.kase, ex: sentenceGuide({ features: fx.feats }).s, feats: fx.feats, sec: j ? "" : "টেমপ্লেটের বাইরে (ঐচ্ছিক)", xi: j, extra: true }); });
  return rows;
}
function rowPrefill(key, r, lemma) {
  if (r.xi !== undefined) return extras(lemma, tplAnimate(), curEnding())[r.xi]?.rep || "";
  return prefill(key, lemma, TEMPLATES[key].forms[r.ti]);
}
function setRowForms(i, value) {
  const r = tpl.rows[i], reps = repsOf(value), linked = formsOfRow(i); let k = 0;
  for (const f of linked) {
    if (k < reps.length) { if (nfc(f.rep) !== reps[k]) f.rep = reps[k]; k++; }
    else if (!f._id) { draft.forms.splice(draft.forms.indexOf(f), 1); clearRef(formRef(f)); }
  }
  for (; k < reps.length; k++) draft.forms.push({ ...newForm(reps[k], [...r.feats]), _tplKey: tpl.key, _tplRow: i });
}
function ensureTpl() {
  if (tpl.draftRef !== draft) { tpl.draftRef = draft; tpl.sig = ""; tpl.key = ""; }
  const key = curTemplate(), lemma = nfc(draft.lemma);
  const keySig = `${key}|${key.startsWith("bengali-noun") && genOpts.extras}|${tplAnimate()}`;
  const keyChanged = keySig !== tpl.sig.split("#")[0];
  const sig = `${keySig}#${lemma}|${curEnding()}`;
  if (sig === tpl.sig) return key;
  if (keyChanged) {
    // Forms made from another template: drop untouched new ones; keep edited or saved ones as other forms.
    draft.forms = draft.forms.filter(f => {
      if (!f._tplKey || f._tplKey === key) return true;
      if (f._id || f._tplEdited) { delete f._tplKey; delete f._tplRow; return true; }
      clearRef(formRef(f)); return false;
    });
    tpl.key = key; tpl.rows = key ? tplRows(key) : []; tpl.open = new Set();
    tpl.edited = tpl.rows.map(() => false); tpl.vals = tpl.rows.map(() => ""); tpl.on = tpl.rows.map(() => false);
    // Attach forms that already exist (on Wikidata or added by hand) to the row with the same features.
    for (const f of draft.forms) if (!f._tplKey) { const i = tpl.rows.findIndex(r => featSig(r.feats) === featSig(f.features)); if (i >= 0) { f._tplKey = key; f._tplRow = i; } }
    tpl.rows.forEach((r, i) => { const linked = formsOfRow(i); if (linked.length) { tpl.on[i] = true; tpl.edited[i] = linked.some(f => f._id || f._tplEdited); } else tpl.on[i] = !draft.existingId && !r.extra; });
  }
  tpl.sig = sig;
  tpl.rows.forEach((r, i) => {
    const pre = rowPrefill(key, r, lemma);
    if (tpl.edited[i]) { tpl.vals[i] = formsOfRow(i).map(f => f.rep).join("/") || tpl.vals[i]; return; }
    tpl.vals[i] = pre;
    if (tpl.on[i]) setRowForms(i, pre);
  });
  scheduleAutoAudio();
  return key;
}

/* Automatic Commons search for every form (badge in the row, results in its details). */
let autoAudioTimer, autoAudioRunning = false;
function scheduleAutoAudio() { if (!genOpts.autoAudio) return; clearTimeout(autoAudioTimer); autoAudioTimer = setTimeout(runAutoAudio, 1500); }
async function runAutoAudio() {
  if (autoAudioRunning) return; autoAudioRunning = true;
  try {
    for (const f of [...draft.forms]) {
      if (!genOpts.autoAudio || !draft.forms.includes(f) || !nfc(f.rep)) continue;
      const k = "k" + f._key, fr = audioFinds[k];
      if (fr && fr.word === nfc(f.rep)) continue;
      if (f.claims.some(c => c.prop === P.audio && present(c.value))) continue;
      audioFinds[k] = { loading: true, word: nfc(f.rep) }; updateAudioBadges();
      const items = await searchCommonsAudio(f.rep);
      audioFinds[k] = { items, word: nfc(f.rep) }; updateAudioBadges();
      await sleep(250);
    }
  } finally { autoAudioRunning = false; }
}
function audioBadge(f) {
  const has = f.claims.filter(c => c.prop === P.audio && present(c.value)).length; const fr = audioFinds["k" + f._key];
  if (has) return `<span class="ab ok" title="উচ্চারণের অডিও যুক্ত আছে">🔊 ${toBn(has)}</span>`;
  if (!fr || fr.word !== nfc(f.rep)) return "";
  if (fr.loading) return `<span class="ab">খোঁজা হচ্ছে…</span>`;
  return fr.items.length ? `<span class="ab found" title="কমন্সে পাওয়া অডিও; বিস্তারিত খুলে যুক্ত করুন">কমন্সে ${toBn(fr.items.length)}টি অডিও</span>` : "";
}
function updateAudioBadges() {
  $$("[data-abadge]").forEach(el => { const f = draft.forms.find(x => String(x._key) === el.dataset.abadge); if (f) el.innerHTML = audioBadge(f); });
  $$("[data-afind]").forEach(el => {
    const i = draft.forms.findIndex(x => "k" + x._key === el.dataset.afind); if (i < 0) return;
    const tmp = document.createElement("div"); tmp.innerHTML = audioBlock(`forms.${i}`, "forms", draft.forms[i].rep);
    const n = tmp.firstElementChild; el.replaceWith(n); $$(".pkw", n).forEach(mountPicker);
  });
}

function featureEditor(i) {
  const f = draft.forms[i];
  return `<div class="chips">${f.features.map((q, j) => `<span class="chip fchip" data-q="${esc(q)}">${esc(FKEY[q] ? CFG.features[FKEY[q]].bn : q)} ${wdLink(q, "↗")}<button data-act="removeFeature" data-i="${i}" data-j="${j}" aria-label="বৈশিষ্ট্য সরান">×</button></span>`).join("")}
    <select class="mini" data-hook="featAdd" data-i="${i}" aria-label="ব্যাকরণগত বৈশিষ্ট্য যোগ করুন"><option value="">+ বৈশিষ্ট্য</option>${opts(Object.values(CFG.features).filter(x => !f.features.includes(x.qid)).map(x => [x.qid, `${x.bn} (${x.en})`]), "")}<option value="__other">অন্য… (খুঁজুন)</option></select></div>
    ${f._featSearch ? pk(`forms.${i}._newFeat`, "", { kind: "item", ph: "বৈশিষ্ট্য খুঁজুন", onpick: "feat" }) : ""}`;
}
PICK.feat = (path, v) => { const i = +path.split(".")[1]; const f = draft.forms[i]; if (v && !f.features.includes(v)) f.features.push(v); f._newFeat = ""; f._featSearch = false; rerender("forms"); };
// Everything about one form except its spelling: features, sentence, audio, other statements.
function formDetail(i, exampleTpl) {
  const f = draft.forms[i], hp = `forms.${i}`; const g = sentenceGuide(f);
  const sent = f.example || fillX(exampleTpl || g.s, f.rep);
  return `<div class="fdetail">
    <div class="fd-row"><span class="fd-l">বৈশিষ্ট্য</span><div class="fd-v">${featureEditor(i)}</div></div>
    <div class="fd-row"><span class="fd-l">বাক্যে</span><div class="fd-v">
      <div class="ex-line"><span class="sq">${esc(g.q || g.name)}</span>${tipHtml(g.feats)}<span class="ex-s" lang="bn">${markX(sent)}</span></div>
      <div class="ex-acts">
        <button class="lnk" data-act="usageFromForm" data-i="${i}">উদাহরণ হিসেবে যোগ</button>
        <button class="lnk" data-act="editSentence" data-i="${i}">বাক্য বদলান</button>
        <button class="lnk" data-act="findExamples" data-word="${esc(f.rep)}" data-form="${esc(formRef(f))}">উদাহরণ খুঁজুন</button>
      </div>
      ${f._editSentence ? `<input class="in" lang="bn" data-bind="forms.${i}.example" data-rerender-lazy="1" value="${esc(sent)}" aria-label="উদাহরণ বাক্য; রূপটি [ ] বন্ধনীতে রাখুন">` : ""}
    </div></div>
    <div class="fd-row"><span class="fd-l">উচ্চারণ</span><div class="fd-v">${audioBlock(hp, "forms", f.rep)}</div></div>
    <div class="fd-row"><span class="fd-l">অন্যান্য বিবৃতি</span><div class="fd-v">${otherBlock(hp, "form", "forms", "")}</div></div>
    <div class="fd-row"><span class="fd-l"></span><div class="fd-v"><button class="lnk danger" data-act="removeForm" data-i="${i}">${f._id ? "উইকি উপাত্ত থেকে এই রূপ মুছুন" : "এই রূপ বাদ দিন"}</button></div></div>
  </div>`;
}
function templateTable() {
  const cat = catBy(draft.category); const w = nfc(draft.lemma);
  const list = tplList();
  if (!draft.category) { tpl.key = ""; tpl.sig = ""; return `<p class="note">আগে ওপরে শব্দশ্রেণি বাছুন; তারপর সেই শ্রেণির সব রূপ এখানে আসবে।</p>`; }
  if (draft.language !== "Q9610") { tpl.key = ""; tpl.sig = ""; return `<p class="note">উইকি উপাত্ত লেক্সিম ফর্মসের টেমপ্লেটগুলো শুধু বাংলার জন্য। ${esc(langBy(draft.language)?.bn || "এই ভাষা")}র রূপ নিচে “নতুন রূপ যোগ করুন” দিয়ে যোগ করুন।</p>`; }
  if (!list.length) { tpl.key = ""; tpl.sig = ""; return `<p class="note">${esc(cat ? cat.bn : draft.category)} শব্দশ্রেণির জন্য উইকি উপাত্ত লেক্সিম ফর্মসে কোনো টেমপ্লেট নেই। নিচে “নতুন রূপ যোগ করুন” দিয়ে রূপ যোগ করুন।</p>`; }
  if (!w) return `<p class="hint">ওপরে শব্দটি লিখুন; টেমপ্লেটের সব রূপ নিজে থেকেই পূরণ হবে।</p>`;
  const key = ensureTpl(); const isVerb = key.startsWith("bengali-verb"); const isNoun = key.startsWith("bengali-noun");
  const total = tpl.rows.length, onCount = tpl.rows.filter((r, i) => formsOfRow(i).length).length;
  return `
    <div class="row">
      ${field("টেমপ্লেট <span class=\"en\">template</span>", `<select data-hook="tpl"><option value="auto"${genOpts.template === "auto" ? " selected" : ""}>স্বয়ংক্রিয়: ${esc(TEMPLATES[autoTemplate()]?.label || "")}</option>${list.map(k => `<option value="${k}"${genOpts.template === k ? " selected" : ""}>${esc(TEMPLATES[k].label)}</option>`).join("")}</select>`, "")}
      ${isNoun ? field("প্রাণীবাচক কি না (টেমপ্লেটের জন্য)", `<select data-hook="tplAnimacy"><option value=""${genOpts.animacy ? "" : " selected"}>বৈশিষ্ট্য অনুযায়ী: ${isAnimate() ? "প্রাণীবাচক" : animacyClaim()?.value ? "অপ্রাণীবাচক" : "ঠিক করা হয়নি (অপ্রাণীবাচক ধরা হবে)"}</option>${opts([["animate", "প্রাণীবাচক"], ["inanimate", "অপ্রাণীবাচক"]], genOpts.animacy)}</select>`, "শুধু কোন টেমপ্লেট লাগবে তা বাছতে; শব্দের “বৈশিষ্ট্য (has characteristic)” বিবৃতি বদলায় না।") : ""}
      ${isNoun ? field("শব্দের শেষ ধ্বনি", `<select data-hook="ending">${opts([["auto", `নিজে থেকে বোঝা (${{ a: "আ/এ/ও-কারান্ত", i: "ই/উ-কারান্ত", c: "ব্যঞ্জনান্ত" }[detectEnding(w)]})`], ["a", "আ/এ/ও-কারান্ত"], ["i", "ই/উ-কারান্ত"], ["c", "ব্যঞ্জনান্ত"]], genOpts.ending)}</select>`) : ""}
    </div>
    <div class="opts">
      ${isNoun ? `<label><input type="checkbox" data-hook="extras" ${genOpts.extras ? "checked" : ""}> বহুবচন ও -টা/-টি রূপও দেখান</label>` : ""}
      <label><input type="checkbox" data-hook="autoAudio" ${genOpts.autoAudio ? "checked" : ""}> প্রতিটি রূপের উচ্চারণ কমন্সে নিজে থেকে খুঁজুন</label>
    </div>
    ${isVerb ? `<p class="note">প্রস্তাবিত রূপগুলো টেমপ্লেটের “দেখা” ক্রিয়ার বিভক্তি আপনার ধাতুতে বসিয়ে তৈরি। প্রতিটি মিলিয়ে নিন: স্বরের বদল (লেখা → লিখি, শেখানো → শিখিয়েছি) আর অনিয়মিত ক্রিয়া (যাওয়া, আসা, খাওয়া) হাতে ঠিক করতে হবে।</p>` : ""}
    
    <div class="tbl-wrap"><table class="tpl"><thead><tr><th><input type="checkbox" data-hook="tplAll" aria-label="সব রূপ বেছে নিন" ${onCount === total ? "checked" : ""}></th><th>রূপের ধরন</th><th>রূপ</th><th>বাক্যে ব্যবহার</th><th><span class="sr-only">বিস্তারিত</span></th></tr></thead><tbody>
    ${tpl.rows.map((r, i) => { const linked = formsOfRow(i); const v = linked.length ? linked.map(f => f.rep).join("/") : tpl.vals[i]; const saved = linked.some(f => f._id); const q = shortQ(r.feats); const open = tpl.open.has(i);
      return `${r.sec ? `<tr class="sec"><td colspan="5">${esc(r.sec)}</td></tr>` : ""}<tr class="${linked.length ? "on" : "off"}${open ? " open" : ""}">
        <td><input type="checkbox" data-tpl-on="${i}" ${linked.length || (tpl.on[i] && !v) ? "checked" : ""} ${saved ? 'disabled title="উইকি উপাত্তে আছে; মুছতে বিস্তারিত খুলুন"' : ""} aria-label="${esc(r.label)} যোগ করুন"></td>
        <td class="case"><span class="cl">${esc(r.label)}</span>${q ? `<span class="sq">${esc(q)}</span>` : ""}${tipHtml(r.feats)}${saved ? ' <span class="tag">উইকি উপাত্তে আছে</span>' : ""}</td>
        <td><input class="in" lang="bn" data-tpl-i="${i}" value="${esc(v)}" aria-label="${esc(r.label)}">${linked.map(f => `<span data-abadge="${f._key}">${audioBadge(f)}</span>`).join("")}</td>
        <td class="bn" data-tpl-s="${i}">${markX(fillX(r.ex, v))}</td>
        <td>${linked.length ? `<button class="btn ghost small" data-act="toggleRow" data-i="${i}" aria-expanded="${open}">${open ? "বন্ধ" : "বিস্তারিত"}</button>` : ""}</td></tr>
        ${open ? `<tr class="detail"><td colspan="5">${linked.map(f => formDetail(draft.forms.indexOf(f), r.ex)).join("")}</td></tr>` : ""}`; }).join("")}
    </tbody></table></div>`;
}
function renderForms() {
  const others = customForms();
  $("#p-forms").innerHTML = `
  <section class="blk">${sectionHead("রূপ <span class=\"en\">Forms</span>", "টিক দেওয়া প্রতিটি সারি একটি রূপ হিসেবে সংরক্ষিত হবে। রূপ বদলাতে ঘরে লিখুন; একাধিক বানান থাকলে “/” দিয়ে আলাদা করুন। টিক তুলে দিলে রূপটি বাদ যাবে। “বিস্তারিত” খুলে বৈশিষ্ট্য, বাক্য, অডিও ও অন্যান্য বিবৃতি দেখুন।")}
    ${templateTable()}
  </section>
  <section class="blk">${sectionHead("অন্যান্য রূপ", "টেমপ্লেটে নেই এমন রূপ, বা টেমপ্লেটের সঙ্গে না মেলা উইকি উপাত্তের রূপ।")}
    ${others.map(f => { const i = draft.forms.indexOf(f); return `<div class="form-card rowcard" style="display:block" id="form-${f._key}">
      <div class="fc-head"><h3 class="bn-big">${esc(f.rep) || '<span class="muted">নতুন রূপ</span>'}</h3>${f._id ? `<span class="tag">${f._id}</span>` : '<span class="tag new">নতুন</span>'}</div>
      ${field("বানান <span class=\"en\">representation</span>", `<input class="in" lang="bn" data-bind="forms.${i}.rep" data-rerender-lazy="1" value="${esc(f.rep)}">`, f.otherReps?.length ? `উইকি উপাত্তে আরও আছে: ${f.otherReps.map(r => `${esc(r.value)} (${r.language})`).join(", ")}` : "")}
      ${formDetail(i)}</div>`; }).join("")}
    <div class="row" style="gap:8px"><button class="add" data-act="addForm">+ নতুন রূপ যোগ করুন</button>${draft.forms.length ? `<button class="btn ghost small" data-act="findAllAudio">সব রূপের উচ্চারণ কমন্সে খুঁজুন</button>` : ""}</div>
  </section>
  ${nextStep("review", "পরের ধাপ: যাচাই ও সংরক্ষণ")}`;
  mountAll("#p-forms");
  $$(".fchip[data-q]", $("#p-forms")).forEach(async el => { const q = el.dataset.q; if (FKEY[q]) return; const t = await labelFor(q); el.firstChild.textContent = (t.split(",")[0] || q) + " "; });
}
const nextStep = (tab, label) => `<div class="next"><button class="btn" data-act="goTab" data-tab="${tab}">${label}</button></div>`;

function renderLexeme() {
  const d = draft; const an = animacyClaim();
  const comps = idxOf(d, P.combines), ders = idxOf(d, P.derivedFrom), uses = idxOf(d, P.usage);
  $("#p-lexeme").innerHTML = `
  <section class="blk" id="sec-core">${sectionHead("মূল তথ্য")}
    <div class="row">
      ${field(plab(P.hasQuality), `<div class="row2 choice"><select data-hook="animacy"><option value="">ঠিক করা হয়নি</option>${opts([[CFG.qualities.animate, "প্রাণীবাচক (animate)"], [CFG.qualities.inanimate, "অপ্রাণীবাচক (inanimate)"]], an?.value || "")}</select>${an?.value ? wdLink(an.value, an.value + " ↗") : ""}</div>`, an?._id ? "উইকি উপাত্তে আছে।" : "")}
    </div>
    ${optFields("", "lexeme", [
      { prop: P.wordStem, help: "প্রত্যয় বা বিভক্তি বাদে শব্দের যে অংশ অপরিবর্তিত থাকে।" },
      { prop: P.conjClass, help: "ক্রিয়ার রূপ যে শ্রেণি অনুযায়ী বদলায়।" },
      { prop: P.createsType, help: "উপসর্গ বা প্রত্যয় হলে: এটি যোগ করে কোন ধরনের লেক্সিম তৈরি হয়।" },
      { prop: P.officializedBy, help: "যে প্রতিষ্ঠান বানান বা শব্দটি স্বীকৃতি দিয়েছে, যেমন বাংলা একাডেমি।" },
      { prop: P.requiresFeature, help: "এই শব্দের প্রতিটি রূপে যে ব্যাকরণগত বৈশিষ্ট্য থাকা দরকার।" },
      { prop: P.variety, help: "উপভাষা বা আঞ্চলিক রূপ।" },
      { prop: P.sameAs, help: "একই শব্দ বলে গণ্য অন্য আইটেম।" },
    ])}
    ${audioBlock("", "lexeme", d.lemma)}
  </section>

  <section class="blk" id="sec-comp">${sectionHead("খণ্ডাংশ <span class=\"en\">compound parts</span>", "সমাসবদ্ধ বা একাধিক শব্দে গঠিত হলে প্রতিটি অংশের জন্য একটি সারি, পড়ার ক্রমে (P5238); নম্বরটি ক্রমিক সংখ্যা (P1545)।")}
    ${comps.map(i => { const c = d.claims[i], b = `claims.${i}`; const oj = qualIdx(c, P.ordinal), fj = qualIdx(c, P.objectForm), pj = qualIdx(c, P.headPos), rj = qualIdx(c, P.headRel);
      return `<div class="rowcard"><span class="ord">${esc(fmtValue(c.quals[oj].value)) || "?"}</span>
      ${field("অংশের লেক্সিম", valueEditor(`${b}.value`, P.combines))}
      ${field(plab(P.ordinal), valueEditor(`${b}.quals.${oj}.value`, P.ordinal))}
      ${field(plab(P.objectForm), valueEditor(`${b}.quals.${fj}.value`, P.objectForm, { scope: `${b}.value` }))}
      ${field(plab(P.headPos), valueEditor(`${b}.quals.${pj}.value`, P.headPos), "প্রধান অংশের ক্রমিক নম্বর; মূল (root) হলে ০।")}
      ${field(plab(P.headRel), `<select data-hook="rel" data-i="${i}"><option value="">বাছুন…</option>${opts(Object.entries(CFG.headRelations).map(([k, v]) => [k, v.label]), c._relKey || "")}</select>${valueEditor(`${b}.quals.${rj}.value`, P.headRel)}`)}
      <div style="flex-basis:100%">${extraQualChips(c, [P.ordinal, P.objectForm, P.headPos, P.headRel])}${tagOf(c)} ${refNote(c)}</div>
      <button class="x" data-act="removeClaim" data-hp="" data-i="${i}" data-sec="lexeme" aria-label="অংশ সরান">×</button></div>`; }).join("")}
    <button class="add" data-act="addComponent">+ অংশ যোগ করুন</button>
  </section>

  <section class="blk" id="sec-ety">${sectionHead("উৎপত্তি ও ব্যুৎপত্তি <span class=\"en\">etymology</span>", "যে শব্দ থেকে উদ্ভূত (P5191)। একই শব্দের আলাদা অর্থের আলাদা ব্যুৎপত্তি থাকতে পারে: টিক দিয়ে দেখান কোন অর্থের জন্য প্রযোজ্য। কোনো অর্থে টিক না দিলে পুরো শব্দের ব্যুৎপত্তি। শব্দের উৎস বাছলে সেই ভাষার লেক্সিম খোঁজায় আগে আসে।")}
    ${ders.map(i => { const c = d.claims[i], b = `claims.${i}`, o = CFG.origins[c._origin]; const mj = qualIdx(c, P.derivMode), fj = qualIdx(c, P.objectForm);
      return `<div class="rowcard">
      ${field("শব্দের উৎস", `<select data-hook="origin" data-i="${i}"><option value="">ঠিক করা হয়নি</option>${opts(Object.entries(CFG.origins).map(([k, v]) => [k, v.label]), c._origin || "")}</select>`)}
      ${field("মূল শব্দ (লেক্সিম)", valueEditor(`${b}.value`, P.derivedFrom, { hint: o?.hint || "" }), o?.hint ? `আগে দেখানো হবে: ${o.hint.split("|").join(", ")}` : "")}
      ${field(plab(P.derivMode), `<select data-hook="mode" data-i="${i}"><option value="">বাছুন…</option>${opts(Object.entries(CFG.derivationModes).map(([k, v]) => [k, v.label]), c._modeKey || "")}</select>${valueEditor(`${b}.quals.${mj}.value`, P.derivMode)}`)}
      ${field(plab(P.objectForm), valueEditor(`${b}.quals.${fj}.value`, P.objectForm, { scope: `${b}.value` }), "ঐচ্ছিক: মূল শব্দের নির্দিষ্ট রূপ।")}
      <div class="f" style="flex-basis:100%"><span class="fl">কোন অর্থের ব্যুৎপত্তি ${plab(P.subjSense)}</span>${etySenseChecks(i)}</div>
      <div style="flex-basis:100%">${extraQualChips(c, [P.derivMode, P.objectForm, P.subjSense])}${tagOf(c)} ${refNote(c)}</div>
      <button class="x" data-act="removeClaim" data-hp="" data-i="${i}" data-sec="lexeme" aria-label="উৎপত্তি সরান">×</button></div>`; }).join("")}
    <button class="add" data-act="addClaim" data-hp="" data-prop="${P.derivedFrom}" data-sec="lexeme">+ মূল শব্দ যোগ করুন</button>
  </section>

  <section class="blk" id="sec-usage">${sectionHead("প্রয়োগের উদাহরণ <span class=\"en\">usage examples</span>", "প্রয়োগের উদাহরণ (P5831)। রূপ ট্যাবে প্রতিটি রূপের বাক্য এক ক্লিকে উদাহরণ হিসেবে যোগ করা যায়।")}
    ${uses.map(i => { const c = d.claims[i], b = `claims.${i}`; const fj = qualIdx(c, P.subjForm), sj = qualIdx(c, P.subjSense);
      return `<div class="rowcard">
      <div class="f" style="flex-basis:100%"><span class="fl">উদাহরণ বাক্য</span>${valueEditor(`${b}.value`, P.usage)}</div>
      ${field(plab(P.subjForm), `<select data-bind="${b}.quals.${fj}.value">${localFormOpts(c.quals[fj].value)}</select>`)}
      ${field(plab(P.subjSense), `<select data-bind="${b}.quals.${sj}.value">${localSenseOpts(c.quals[sj].value)}</select>`)}
      <div style="flex-basis:100%">${extraQualChips(c, [P.subjForm, P.subjSense])}${c._srcLabel ? `<span class="chip">সূত্র: ${esc(c._srcLabel)}</span> ` : ""}${tagOf(c)} ${refNote(c)}</div>
      <button class="x" data-act="removeClaim" data-hp="" data-i="${i}" data-sec="lexeme" aria-label="উদাহরণ সরান">×</button></div>`; }).join("")}
    <div class="row" style="gap:8px"><button class="add" data-act="addClaim" data-hp="" data-prop="${P.usage}" data-sec="lexeme">+ উদাহরণ যোগ করুন</button><button class="add" data-act="findExamples" data-word="${esc(d.lemma)}">উদাহরণ খুঁজুন (উইকিসংকলন, গুগল বুকস…)</button></div>
  </section>

  <section class="blk" id="sec-src">${sectionHead("উৎস ও প্রমাণ <span class=\"en\">sources</span>", "যে অভিধান, বই বা ওয়েবপাতায় শব্দটি বর্ণিত বা পাওয়া যায়, সব এক জায়গায়।")}
    ${optFields("", "lexeme", SOURCE_SPECS)}
  </section>
  ${otherBlock("", "lexeme", "lexeme", "লেক্সিমের অন্যান্য বিবৃতি")}
  ${nextStep("senses", "পরের ধাপ: অর্থ")}`;
  mountAll("#p-lexeme");
}
// Source-type statements, kept together on the lexeme and on each sense.
const SOURCE_SPECS = [
  { prop: "P1343", quals: ["P304", "P1810"], help: "যে অভিধান বা বইয়ে এটি বর্ণিত; পৃষ্ঠা ও সেখানে যে নামে আছে।" },
  { prop: "P973", help: "যে ওয়েবপাতায় এটি বর্ণিত (described at URL)।" },
  { prop: "P5323", quals: ["P1932"], help: "যে বই বা লেখায় শব্দটি পাওয়া যায়, আর সেখানে যেভাবে লেখা আছে।" },
];
const SENSE_SOURCE_SPECS = [{ prop: "P8394", help: "অভিধানে সংজ্ঞাটি হুবহু যেভাবে লেখা (gloss quote)।" }, ...SOURCE_SPECS];

function senseSummary(s) { return s.gloss.bn || s.gloss.en || Object.values(s.gloss).find(Boolean) || "(সংজ্ঞা নেই)"; }
function renderSenses() {
  const d = draft;
  $("#p-senses").innerHTML = `
  ${d.senses.length > 1 ? `<div class="row" style="justify-content:flex-end;gap:8px;margin-bottom:8px"><button class="btn ghost small" data-act="collapseAll" data-v="1">সব গুটিয়ে রাখুন</button><button class="btn ghost small" data-act="collapseAll" data-v="0">সব খুলুন</button></div>` : ""}
  ${d.senses.map((s, i) => { const hp = `senses.${i}`; const hasItem = present(s.claims.find(c => c.prop === P.item)?.value);
    const hasTr = s.claims.some(c => c.prop === P.translation);
    const langs = [...new Set(["bn", "en", ...Object.keys(s.gloss)])];
    const head = `<div class="sense-head"><button class="fold" data-act="toggleSense" data-i="${i}" aria-expanded="${!s._collapsed}" aria-label="${s._collapsed ? "খুলুন" : "গুটিয়ে রাখুন"}">${s._collapsed ? "▸" : "▾"}</button>
      <h3>অর্থ ${toBn(i + 1)}</h3>${s._collapsed ? `<span class="sum" lang="bn">${esc(senseSummary(s))}</span>` : ""}${s._id ? wdLink(s._id, s._id) : '<span class="tag new">নতুন</span>'}
      <button class="x" data-act="removeSense" data-i="${i}" aria-label="অর্থ ${toBn(i + 1)} সরান">×</button></div>`;
    if (s._collapsed) return `<section class="blk sense-card collapsed tone-${i % 6}" id="sense-${s._key}">${head}</section>`;
    return `<section class="blk sense-card tone-${i % 6}" id="sense-${s._key}">${head}
    <div class="row">${langs.map(l => field(`সংজ্ঞা <span class="en">gloss</span> (${l})`, `<textarea lang="${l}" rows="2" data-bind="${hp}.gloss.${l}">${esc(s.gloss[l] || "")}</textarea>`)).join("")}</div>
    <div class="row">${field(plab(P.item), propList(hp, P.item, "senses", { rr: "senses" }), "এই অর্থ যে উইকি উপাত্ত আইটেমকে বোঝায়।")}</div>
    ${optFields(hp, "senses", [{ prop: P.synonym, help: "একই অর্থের অন্য শব্দের অর্থ।" }, ...(hasItem && !hasTr ? [] : [{ prop: P.translation, help: "অন্য ভাষার লেক্সিম খুঁজে তার অর্থ বাছুন।" }])])}
    ${etyBlockForSense(s, i)}
    <div class="subgrp"><div class="subhead">প্রয়োগের উদাহরণ</div>${idxOf(draft, P.usage).filter(ci => draft.claims[ci].quals.some(q => q.prop === P.subjSense && q.value === senseRef(s))).map(ci => `<p class="ex-s small" lang="bn">${esc(fmtValue(draft.claims[ci].value).replace(/ \([a-z-]+\)$/, ""))}</p>`).join("")}
      <button class="pchip" data-act="findExamples" data-word="${esc(d.lemma)}" data-sense="${esc(senseRef(s))}">+ উদাহরণ খুঁজুন</button></div>
    <div class="subgrp"><div class="subhead">উৎস ও প্রমাণ${tipI("এই অর্থের সংজ্ঞার উদ্ধৃতি, অভিধান, ওয়েবপাতা ও প্রমাণসূত্র এক জায়গায়।")}</div>${optFields(hp, "senses", SENSE_SOURCE_SPECS)}</div>
    ${audioBlock(hp, "senses", d.lemma)}
    ${(() => { const o = optParts(hp, "senses", [
      { prop: P.variety, help: "উপভাষা বা আঞ্চলিক রূপ।" },
      { prop: P.location, help: "যে অঞ্চলে শব্দটি এই অর্থে ব্যবহৃত হয়।" },
      { prop: P.image, help: "উইকিমিডিয়া কমন্সের ছবি।", extra: () => senseThumbs(s) },
    ]); return otherBlock(hp, "sense", "senses", "অর্থের অন্যান্য বিবৃতি", o.shown, o.chips); })()}
  </section>`; }).join("")}
  <button class="add" data-act="addSense">+ নতুন অর্থ যোগ করুন</button>
  ${nextStep("forms", "পরের ধাপ: রূপ")}`;
  mountAll("#p-senses");
  $$("[data-lab]", $("#p-senses")).forEach(async el => { const t = await labelFor(el.dataset.lab); if (t) el.textContent = `${t} (${el.dataset.lab})`; });
}

// One-click property suggestions, grouped by kind. “@label” = looked up by its English label.
const SUGGEST_GROUPS = {
  lexeme: [["ব্যাকরণগত বৈশিষ্ট্য", ["P5185", "@grammatical number", "P11053", "P5911"]],
    ["প্রতিবর্ণীকরণ ও উচ্চারণ", ["@ISO 15919 transliteration", "P2440", "P898", "P5279"]],
    ["সম্পর্কিত লেক্সিম", ["P5402", "@said to be the same as lexeme", "@nominalized form", "P5976", "P8530", "P5920", "@anagram", "@homophone"]],
    ["বাহ্যিক আইডি", ["@DiACL lexeme ID", "@Intercontinental Dictionary Series unit ID", "@Sõnaveeb entry ID"]],
    ["অন্যান্য", ["P31"]]],
  form: [["প্রতিবর্ণীকরণ ও উচ্চারণ", ["@pronunciation", "@ISO 15919 transliteration", "@ITRANS", "@IAST transliteration", "@National Library at Kolkata romanization", "@ALA-LC romanization", "@braille transcription", "P2440", "P898", "P5279", "P5237"]],
    ["সম্পর্ক ও রীতি", ["P8530", "P31", "@appears before phonological feature", "P6191"]],
    ["উৎস", ["P5323", "P1343", "P973"]],
    ["ব্যাকরণগত বৈশিষ্ট্য", ["P5185", "@grammatical number", "P11053"]]],
  sense: [["সম্পর্কিত অর্থ", ["P5974", "P6593", "P5975", "P8471", "@predicate for"]], ["রীতি ও ক্ষেত্র", ["P6191", "@field of usage"]]],
};
const SUGGEST_G = { lexeme: [], form: [], sense: [] };
function otherBlock(hp, level, sec, title = "অন্যান্য বিবৃতি", lead = "", topChips = "") {
  const h = holderOf(hp);
  const idx = h.claims.map((c, i) => [c, i]).filter(([c]) => !isCovered(level, c)).map(([, i]) => i);
  const fromWd = idx.filter(i => h.claims[i]._id).length;
  const used = new Set(h.claims.map(c => c.prop));
  const groups = SUGGEST_G[level].map(([t, ids]) => [t, ids.filter(p => !COVERED[level].includes(p))]).filter(g => g[1].length);
  const inGroups = new Set(groups.flatMap(g => g[1]));
  const pop = POPULAR[level].filter(p => PLABEL[p.id] && !COVERED[level].includes(p.id) && !inGroups.has(p.id) && p.id !== P.hasQuality).slice(0, 12);
  const chip = (p, n) => `<button class="pchip${used.has(p) ? " used" : ""}" data-act="addClaim" data-hp="${hp}" data-prop="${p}" data-sec="${sec}" title="${p}${n ? `, ${n} বার ব্যবহৃত` : ""}">+ ${esc(plbi(p))}</button>`;
  const tip = "যেকোনো উইকি উপাত্ত প্রপার্টি এখানে যোগ করা যায়, কোয়ালিফায়ারসহ। উইকি উপাত্তে থাকা যেসব বিবৃতির আলাদা ঘর নেই সেগুলোও এখানে দেখা যায়; না বদলালে অপরিবর্তিত থাকে।";
  return `<section class="blk other" id="${hp ? "" : "sec-other"}">${title ? sectionHead(title, tip, fromWd ? ` <span class="tag">উইকি উপাত্ত থেকে ${toBn(fromWd)}টি</span>` : "") : ""}
    <div class="chips anyrow"><button class="pchip any" data-act="addClaim" data-hp="${hp}" data-prop="" data-sec="${sec}">+ যেকোনো প্রপার্টি</button>${topChips}</div>
    ${lead}
    ${idx.map(i => claimEditor(hp, i, sec)).join("")}
    <div class="sgroups">
      ${groups.map(([t, ids]) => `<div class="sg"><span class="fl">${esc(t)}</span><div class="chips">${ids.map(p => chip(p)).join("")}</div></div>`).join("")}
      ${pop.length ? `<div class="sg"><span class="fl">${level === "lexeme" ? "লেক্সিমে" : level === "form" ? "রূপে" : "অর্থে"} আরও প্রচলিত</span><div class="chips">${pop.map(p => chip(p.id, p.n)).join("")}</div></div>` : ""}
    </div>
  </section>`;
}

async function loadSuggestions() {
  try {
    const terms = [...new Set(Object.values(SUGGEST_GROUPS).flat().flatMap(g => g[1]).filter(x => x.startsWith("@")).map(x => x.slice(1)))];
    const found = Object.fromEntries(await Promise.all(terms.map(async t => [t, await resolveTerm(t, "property").catch(() => "")])));
    const ids = id => (id.startsWith("@") ? found[id.slice(1)] : id);
    await ensureProps([...Object.values(SUGGEST_GROUPS).flat().flatMap(g => g[1]).map(ids).filter(Boolean), ...QUAL_SUGGEST]);
    for (const [lvl, groups] of Object.entries(SUGGEST_GROUPS)) {
      SUGGEST_G[lvl] = groups.map(([t, list]) => [t, list.map(ids).filter(id => id && PLABEL[id])]);
      SUGGEST[lvl] = SUGGEST_G[lvl].flatMap(g => g[1]);
    }
    const num = found["grammatical number"]; if (num) VALUE_CHOICES[num] = NUMBER_CHOICES;
  } catch (e) { console.warn("suggestions", e); }
  try { await loadPopular(); } catch (e) { console.warn("popular", e); }
  try { await loadDictionaries(); } catch (e) { console.warn("dictionaries", e); }
  rerender("lexeme,forms,senses");
}
// Dictionaries offered for “described by source”: those already used on Bengali lexemes, Bengali-language
// dictionary items, and a few well-known titles found by name.
const DICT_SEEDS = ["সংসদ বাংলা অভিধান", "Samsad Bengali-English Dictionary", "বাংলা একাডেমি ব্যবহারিক বাংলা অভিধান", "বাংলা একাডেমি আধুনিক বাংলা অভিধান", "চলন্তিকা", "বঙ্গীয় শব্দকোষ", "বাঙ্গালা ভাষার অভিধান"];
async function loadDictionaries() {
  const sp = async q => { const r = await fetch(CFG.sparql + "?format=json&query=" + encodeURIComponent(q), { headers: { Accept: "application/sparql-results+json" } }); return (await r.json()).results.bindings; };
  const used = await sp(`SELECT ?d (COUNT(*) AS ?n) WHERE { ?l dct:language wd:Q9610 . { ?l p:P1343/ps:P1343 ?d } UNION { ?l ontolex:sense/p:P1343/ps:P1343 ?d } } GROUP BY ?d ORDER BY DESC(?n) LIMIT 25`).catch(() => []);
  const bnDicts = await sp(`SELECT DISTINCT ?d WHERE { ?d wdt:P31/wdt:P279* wd:Q23622 ; wdt:P407 wd:Q9610 . } LIMIT 40`).catch(() => []);
  const seeds = await Promise.all(DICT_SEEDS.map(async t => {
    try { const j = await api(CFG.wd, { action: "wbsearchentities", type: "item", search: t, language: /[\u0980-\u09FF]/.test(t) ? "bn" : "en", uselang: "en", limit: 5 });
      return j.search.find(r => /dictionar|অভিধান|শব্দকোষ|lexicon/i.test((r.description || "") + " " + (r.label || "")))?.id || ""; } catch (e) { return ""; }
  }));
  const ids = [...new Set([...used.map(b => b.d.value.split("/").pop()), ...seeds, ...bnDicts.map(b => b.d.value.split("/").pop())].filter(id => /^Q\d+$/.test(id)))].slice(0, 50);
  if (!ids.length) return;
  const j = await api(CFG.wd, { action: "wbgetentities", ids: ids.join("|"), props: "labels", languages: "bn|en" });
  VALUE_CHOICES.P1343 = ids.map(id => { const e = j.entities[id]; const bn = e?.labels?.bn?.value, en = e?.labels?.en?.value; return [id, bn && en && bn !== en ? `${bn} (${en})` : bn || en || id]; });
}

/* ---------------- etymology ↔ senses ----------------
   P5191 (derived from lexeme) sits on the lexeme; each sense it applies to is a P6072 (subject sense) qualifier.
   No P6072 = the etymology applies to the whole word. */
const etySenses = c => c.quals.filter(q => q.prop === P.subjSense && present(q.value)).map(q => q.value);
function etySenseChecks(ci) {
  const c = draft.claims[ci]; const linked = new Set(etySenses(c));
  if (!draft.senses.length) return `<small class="muted">এখনো কোনো অর্থ নেই; “অর্থ” ট্যাবে অর্থ যোগ করলে এখানে বাছতে পারবেন। আপাতত পুরো শব্দের ব্যুৎপত্তি।</small>`;
  return `<div class="checks">${draft.senses.map((s, k) => { const ref = senseRef(s); return `<label><input type="checkbox" data-hook="etySense" data-ci="${ci}" data-ref="${esc(ref)}"${linked.has(ref) ? " checked" : ""}> অর্থ ${toBn(k + 1)}: ${esc(s.gloss.bn || s.gloss.en || "(সংজ্ঞা নেই)")}</label>`; }).join("")}</div>
    ${linked.size ? "" : `<small class="muted">কোনোটিতে টিক নেই: পুরো শব্দের ব্যুৎপত্তি।</small>`}`;
}
function setEtySense(ci, ref, on) {
  const c = draft.claims[ci]; if (!c) return;
  if (on) { if (!etySenses(c).includes(ref)) c.quals.push({ prop: P.subjSense, value: ref }); }
  else c.quals = c.quals.filter(q => !(q.prop === P.subjSense && q.value === ref));
  c._dirty = true;
}
function etyBlockForSense(s, i) {
  const ref = senseRef(s), ders = idxOf(draft, P.derivedFrom);
  return `<fieldset><legend>এই অর্থের ব্যুৎপত্তি <span class="en">etymology</span></legend>
    ${ders.length ? `<div class="checks">${ders.map(ci => { const c = draft.claims[ci]; const scope = etySenses(c);
      return `<label><input type="checkbox" data-hook="etySense" data-ci="${ci}" data-ref="${esc(ref)}"${scope.includes(ref) ? " checked" : ""}> ${present(c.value) ? `<span data-lab="${esc(c.value)}">${esc(c.value)}</span>` : `<span class="muted">মূল শব্দ এখনো বাছা হয়নি (শব্দের তথ্য ট্যাবে)</span>`}${c._origin ? ` (${esc(CFG.origins[c._origin]?.label || "")})` : ""}<small class="muted">${scope.length ? ` · ${toBn(scope.length)}টি অর্থে` : " · এখন পুরো শব্দের"}</small></label>`; }).join("")}</div>` : `<p class="hint">এখনো কোনো ব্যুৎপত্তি নেই।</p>`}
    <button class="add small-add" data-act="newEtyForSense" data-ref="${esc(ref)}">+ এই অর্থের জন্য নতুন ব্যুৎপত্তি</button>
  </fieldset>`;
}
/* ---------------- sources (not shown; kept so loaded references are preserved) ---------------- */
const senseThumbs = s => { const files = s.claims.filter(c => c.prop === P.image && present(c.value)).map(c => c.value);
  return files.length ? `<div class="thumbs">${files.map(f => `<a href="${commonsPage(f)}" target="_blank" rel="noopener"><img src="${commonsUrl(f)}?width=180" alt="${esc(f)}" loading="lazy"></a>`).join("")}</div>` : ""; };

function uncoveredSummary() {
  const out = [];
  const scan = (name, h, lvl) => h.claims.filter(c => c._id && !isCovered(lvl, c)).forEach(c => out.push([name, c.prop]));
  scan("Lexeme", draft, "lexeme"); draft.forms.forEach(f => scan(f._id || "form", f, "form")); draft.senses.forEach(s => scan(s._id || "sense", s, "sense"));
  return out;
}
const SUMMARY_PREFIX = "লেক্সিম.বাংলা: ";
const autoSummary = () => (draft.existingId ? `“${nfc(draft.lemma)}” (${draft.existingId}) হালনাগাদ` : `নতুন লেক্সিম “${nfc(draft.lemma)}”`);
const editSummary = () => SUMMARY_PREFIX + (nfc($("#summary").value) || autoSummary());
const issueRow = (cls, m, loc) => `<div class="msg ${cls} issue"><span>${esc(m)}</span>${loc ? `<button class="btn small ghost" data-act="fixAt" data-loc="${esc(JSON.stringify(loc))}">ঠিক করুন</button>` : ""}</div>`;
function renderReview() {
  const box = $("#review-dyn"); if (!box) return;
  const plan = buildPlan(draft), v = validate(draft, plan);
  $("#c-issues").textContent = v.errors.length + v.warnings.filter(w => !w.startsWith("এখনো কিছু বদলানো")).length;
  $("#summary").placeholder = autoSummary();
  $("#submit").disabled = !auth.user || v.errors.length > 0 || v.nothing;
  $("#submit").title = !auth.user ? "সংরক্ষণের জন্য লগ ইন করুন" : v.errors.length ? "আগে ত্রুটিগুলো ঠিক করুন" : v.nothing ? "কিছু বদলানো হয়নি" : "";
  // Say why the button is off, next to it (not only on hover).
  let why = $("#submit-why");
  if (!why) { why = document.createElement("span"); why.id = "submit-why"; why.className = "muted"; why.style.cssText = "font-size:14px;align-self:center"; $("#submit").after(why); }
  why.textContent = !auth.user ? "সংরক্ষণের জন্য ওপরে “লগ ইন” চাপুন।" : v.errors.length ? `আগে নিচের ${toBn(v.errors.length)}টি ত্রুটি ঠিক করুন।` : v.nothing ? "এখনো কিছু বদলানো হয়নি।" : "";
  const unc = uncoveredSummary(); const grouped = {}; unc.forEach(([w, p]) => (grouped[p] = grouped[p] || []).push(w));
  box.innerHTML = `
  <section class="blk"><h3>যাচাই</h3>
    ${!v.errors.length && !v.warnings.length ? `<div class="msg ok">কোনো সমস্যা নেই। প্রথম সম্পাদনায় ${toBn(v.bytes)} বাইট।</div>` : ""}
    ${v.errors.map(e => issueRow("err", e, v.locs.get(e))).join("")}
    ${v.warnings.map(e => issueRow("warn", e, v.locs.get(e))).join("")}
    <p class="hint" style="margin-top:8px">প্রপার্টির ডেটাটাইপ: ${esc(dtSource)}।</p>
  </section>
  ${unc.length ? `<section class="blk">${sectionHead("যেসব বিবৃতির আলাদা ঘর নেই", "এগুলো উইকি উপাত্তে আছে এবং “অন্যান্য বিবৃতি” অংশে দেখা যায়। না বদলালে অপরিবর্তিত থাকবে।")}
    <div class="tbl-wrap"><table><thead><tr><th>প্রপার্টি</th><th>ডেটাটাইপ</th><th>কোথায়</th></tr></thead><tbody>${Object.entries(grouped).map(([p, ws]) => `<tr><td>${plab(p)}</td><td class="muted">${esc(DT[p] || "")}</td><td>${esc([...new Set(ws)].join(", "))}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
  <section class="blk"><h3>সম্পাদনা-পরিকল্পনা <span class="en">edit plan</span>${tipI((plan.phase1.id ? `প্রথম সম্পাদনায় ${plan.phase1.id}-এর শুধু বদলানো অংশ পাঠানো হবে` : "প্রথম সম্পাদনায় লেক্সিমটি তৈরি হবে") + "।" + (plan.phase2.length ? ` এরপর ${toBn(plan.phase2.length)}টি সম্পাদনায় নতুন রূপ বা অর্থের সঙ্গে যুক্ত বিবৃতি যোগ হবে।` : ""))}</h3>
    <div class="row" style="gap:8px;margin-bottom:8px"><button class="btn ghost small" data-act="dlPlan">সম্পাদনা-পরিকল্পনা ডাউনলোড (JSON)</button><button class="btn ghost small" data-act="copyP1">wbeditentity ডেটা কপি</button></div>
    <details open><summary>প্রথম সম্পাদনার ডেটা</summary><pre>${esc(JSON.stringify(plan.phase1.data, null, 2))}</pre></details>
    ${plan.phase2.length ? `<details><summary>পরের সম্পাদনাগুলো</summary><pre>${esc(JSON.stringify(plan.phase2, null, 2))}</pre></details>` : ""}
  </section>`;
}
function renderPreview() {
  const d = draft, cat = catBy(d.category), lang = CFG.languages.find(l => l.qid === d.language);
  $("#c-forms").textContent = toBn(d.forms.length); $("#c-senses").textContent = toBn(d.senses.length);
  const audioOf = h => h.claims.filter(c => c.prop === P.audio && present(c.value)).length;
  const btns = (kind, i, label) => `<span class="pv-act"><button class="pvb" data-act="goto" data-kind="${kind}" data-i="${i}" title="${esc(label)} বদলান" aria-label="${esc(label)} বদলান">✎</button><button class="pvb del" data-act="pvRemove" data-kind="${kind}" data-i="${i}" title="${esc(label)} সরান" aria-label="${esc(label)} সরান">×</button></span>`;
  const st = d.claims.map((c, i) => [c, i]).filter(([c]) => c.prop && present(c.value));
  const val = (v, p) => { const ch = VALUE_CHOICES[p]?.find(([q]) => q === v); return ch ? `${esc(ch[1])} ${wdLink(v, "↗")}` : typeof v === "string" && wdUrl(v) ? wdLink(v, v) : esc(fmtValue(v)); };
  $("#preview").innerHTML = `
    <p class="pv-lemma" lang="bn">${esc(nfc(d.lemma)) || '<span class="muted">শব্দ</span>'}</p>
    <p class="pv-meta">${esc(lang ? `${lang.bn} (${lang.en})` : d.language)}, ${cat ? esc(`${cat.bn} (${cat.en})`) : d.category ? esc(d.category) : '<span class="muted">শব্দশ্রেণি বাছা হয়নি</span>'}${d.existingId ? `; ${wdLink(d.existingId)}` : "; নতুন লেক্সিম"}</p>
    ${d.orig?.otherLemmas?.length ? `<p class="hint">অন্যান্য বানান: ${d.orig.otherLemmas.map(l => `${esc(l.value)} (${l.language})`).join(", ")}</p>` : ""}
    ${st.length ? `<h4>বিবৃতি</h4><ul class="pv-list">${st.map(([c, i]) => `<li><span><span class="muted">${esc(plbi(c.prop))}:</span> <span lang="bn">${val(c.value, c.prop)}</span></span>${btns("claim", i, plbi(c.prop))}</li>`).join("")}</ul>` : ""}
    <h4>অর্থ</h4>${d.senses.length ? `<ol class="pv-list">${d.senses.map((s, i) => `<li><span lang="bn">${esc(senseSummary(s))}${s.gloss.bn && s.gloss.en ? `; ${esc(s.gloss.en)}` : ""}</span>${btns("sense", i, "অর্থ " + toBn(i + 1))}</li>`).join("")}</ol>` : '<p class="muted">এখনো নেই।</p>'}
    <h4>রূপ</h4>${d.forms.length ? `<ul class="pv-list">${d.forms.map((f, i) => `<li><span><span lang="bn">${esc(f.rep)}</span> <span class="chips" style="display:inline-flex">${f.features.filter(Boolean).map(x => `<span class="chip">${esc(FKEY[x] ? CFG.features[FKEY[x]].bn : x)}</span>`).join("")}${audioOf(f) ? '<span class="chip">🔊</span>' : ""}</span></span>${btns("form", i, f.rep || "রূপ")}</li>`).join("")}</ul>` : '<p class="muted">এখনো নেই। রূপ ট্যাবে শব্দ লিখলেই টেমপ্লেট থেকে আসবে।</p>'}`;
}
const SECTION_OF = { P5238: "sec-comp", P5191: "sec-ety", P5831: "sec-usage", P1343: "sec-src", P973: "sec-src", P5323: "sec-src",
  P1552: "sec-core", P5187: "sec-core", P5186: "sec-core", P5923: "sec-core", P5194: "sec-core", P5713: "sec-core", P7481: "sec-core", P460: "sec-core", P443: "sec-core" };
function flash(el) { if (!el) return; el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1600); }
let pvTimer;
function schedulePreview() { clearTimeout(pvTimer); pvTimer = setTimeout(() => { renderPreview(); renderReview(); }, 150); }
const RENDER = { lexeme: renderLexeme, forms: renderForms, senses: renderSenses, review: renderReview };
function rerender(names) { String(names).split(",").forEach(n => RENDER[n.trim()]?.()); schedulePreview(); }
function mountAll(sel) { $$(".pkw", $(sel)).forEach(mountPicker); }
function renderHero() {
  $("#lemma").value = draft.lemma; $("#lang-q").value = draft.language; $("#lang-code").value = draft.langCode;
  $("#lang-preset").innerHTML = CFG.languages.map(l => `<option value="${l.iso3}"${l.qid && l.qid === draft.language ? " selected" : ""}${l.qid ? "" : " disabled"}>${l.bn} (${l.en})${l.qid ? "" : " — খোঁজা হচ্ছে…"}</option>`).join("")
    + (draft.language && !langBy(draft.language) ? `<option selected>${esc(draft.language)}</option>` : "");
  $("#cat").innerHTML = `<option value=""${draft.category ? "" : " selected"}>শব্দশ্রেণি বাছুন…</option>` + CFG.categories.map(c => `<option value="${c.qid}"${c.qid === draft.category ? " selected" : ""}>${c.bn} (${c.en})</option>`).join("") + (!draft.category || catBy(draft.category) ? "" : `<option value="${esc(draft.category)}" selected>${esc(draft.category)}</option>`);
  $("#cat").classList.toggle("need", !draft.category);
}
function renderAll() { renderHero(); renderLexeme(); renderForms(); renderSenses(); renderPreview(); renderReview(); }

/* ---------------- lookup flow (auto + button) ---------------- */
// Inflectional endings: if “word minus ending” is an existing lexeme, the word is probably a form of it.
const SUFFIXES = [["গুলোতে", ["plural", "locative"]], ["গুলিতে", ["plural", "locative"]], ["গুলোকে", ["plural", "accusative"]], ["গুলিকে", ["plural", "accusative"]],
  ["গুলোর", ["plural", "genitive"]], ["গুলির", ["plural", "genitive"]], ["গুলো", ["plural", "nominative"]], ["গুলি", ["plural", "nominative"]],
  ["দেরকে", ["plural", "accusative"]], ["দের", ["plural", "genitive"]], ["েরা", ["plural", "nominative"]], ["রা", ["plural", "nominative"]],
  ["টাকে", ["singular", "accusative"]], ["টার", ["singular", "genitive"]], ["টিকে", ["singular", "accusative"]], ["টির", ["singular", "genitive"]], ["টা", ["singular"]], ["টি", ["singular"]],
  ["কে", ["accusative"]], ["তে", ["locative"]], ["ের", ["genitive"]], ["র", ["genitive"]], [YA, ["locative"]], ["ে", ["locative"]]];
async function findFormHits(q, lang, lc) {
  const hits = new Map();
  await Promise.all([
    api(CFG.wd, { action: "wbsearchentities", type: "form", search: q, language: "bn", uselang: "en", limit: 20 })
      .then(j => j.search.forEach(r => { if (nfc(r.label || r.match?.text) === q) hits.set(r.id, r.id.split("-")[0]); })).catch(() => {}),
    fetch(CFG.sparql + "?format=json&query=" + encodeURIComponent(`SELECT ?f WHERE { ?l dct:language wd:${lang} ; ontolex:lexicalForm ?f . ?f ontolex:representation ?rep . FILTER(STR(?rep) = ${JSON.stringify(q)}) } LIMIT 20`), { headers: { Accept: "application/sparql-results+json" } })
      .then(r => r.json()).then(j => j.results.bindings.forEach(b => { const id = b.f.value.split("/").pop(); hits.set(id, id.split("-")[0]); })).catch(() => {}),
  ]);
  if (!hits.size) return [];
  const g = await api(CFG.wd, { action: "wbgetentities", ids: [...new Set(hits.values())].slice(0, 50).join("|") });
  const out = [];
  for (const [fid, lid] of hits) {
    const e = g.entities[lid]; if (!e || e.missing !== undefined || e.language !== lang) continue;
    if (Object.values(e.lemmas).some(l => nfc(l.value) === q)) continue; // that's the lexeme itself, handled by the lemma check
    lexCache.set(lid, e); const f = (e.forms || []).find(x => x.id === fid);
    out.push({ lexeme: lid, form: fid, lemma: firstVal(e.lemmas), cat: e.lexicalCategory, feats: (f?.grammaticalFeatures || []).map(x => (FKEY[x] ? CFG.features[FKEY[x]].bn : x)).join(", ") });
  }
  return out;
}
async function findBaseHits(q, lang, exclude) {
  const cands = [];
  for (const [suf, keys] of SUFFIXES) if (q.endsWith(suf) && q.length - suf.length >= 2) { const base = q.slice(0, -suf.length); if (!cands.some(c => c.base === base)) cands.push({ base, suf, keys }); }
  const out = [];
  await Promise.all(cands.slice(0, 5).map(async c => {
    try {
      const j = await api(CFG.wd, { action: "wbsearchentities", type: "lexeme", search: c.base, language: "bn", uselang: "en", limit: 10 });
      const ids = j.search.filter(r => nfc(r.label) === c.base).map(r => r.id); if (!ids.length) return;
      const g = await api(CFG.wd, { action: "wbgetentities", ids: ids.join("|") });
      for (const e of Object.values(g.entities)) {
        if (e.missing !== undefined || e.language !== lang || exclude.has(e.id) || !catBy(e.lexicalCategory)?.nominal) continue;
        lexCache.set(e.id, e);
        out.push({ id: e.id, lemma: firstVal(e.lemmas), suffix: c.suf, feats: c.keys.map(k => FQ[k]), featText: c.keys.map(k => CFG.features[k].bn).join(", ") });
      }
    } catch (e) {}
  }));
  return out;
}
let lookupSeq = 0, autoTimer;
function scheduleAutoLookup() {
  clearTimeout(autoTimer);
  if (draft.existingId) return;
  if (!nfc(draft.lemma)) { $("#found").innerHTML = ""; return; }
  autoTimer = setTimeout(() => lookup(true), 700);
}
async function lookup(auto = false) {
  const q = nfc(draft.lemma), box = $("#found"), seq = ++lookupSeq;
  if (!q) { if (!auto) box.innerHTML = `<div class="msg warn">আগে শব্দটি লিখুন।</div>`; return; }
  box.innerHTML = `<div class="msg">উইকি উপাত্তের লেক্সিম ও রূপে “${esc(q)}” খোঁজা হচ্ছে…</div>`;
  try {
    const [j, formHits] = await Promise.all([
      api(CFG.wd, { action: "wbsearchentities", type: "lexeme", search: q, language: "bn", uselang: "en", limit: 25 }),
      findFormHits(q, draft.language, draft.langCode || "bn").catch(() => []),
    ]);
    if (seq !== lookupSeq) return;
    const desc = Object.fromEntries(j.search.map(r => [r.id, r.description || ""]));
    const ids = j.search.map(r => r.id); let ents = {};
    if (ids.length) { const g = await api(CFG.wd, { action: "wbgetentities", ids: ids.slice(0, 50).join("|") }); ents = g.entities; ids.forEach(id => ents[id] && lexCache.set(id, ents[id])); }
    const all = ids.map(id => ents[id]).filter(Boolean);
    const exact = all.filter(e => Object.values(e.lemmas).some(l => nfc(l.value) === q));
    const same = exact.filter(e => e.language === draft.language && (!draft.category || e.lexicalCategory === draft.category));
    const other = exact.filter(e => !same.includes(e));
    const baseHits = formHits.length ? [] : await findBaseHits(q, draft.language, new Set([...exact.map(e => e.id)]));
    if (seq !== lookupSeq) return;
    Object.assign(draft, { _lookupFor: q, _formHits: formHits, _baseHits: baseHits, _allowDup: false });
    const card = (e, kind) => `<div class="hit ${kind}"><span class="lem" lang="bn">${esc(firstVal(e.lemmas))}</span><a href="https://www.wikidata.org/wiki/Lexeme:${e.id}" target="_blank" rel="noopener">${e.id}</a><span class="muted">${esc(desc[e.id] || "")}, ${toBn((e.forms || []).length)}টি রূপ, ${toBn((e.senses || []).length)}টি অর্থ, ${toBn(Object.values(e.claims || {}).flat().length)}টি বিবৃতি</span>
      <span class="chip">${esc(catBy(e.lexicalCategory)?.bn || e.lexicalCategory)}</span>
      <span class="acts">${!draft.category && e.language === draft.language && catBy(e.lexicalCategory) ? `<button class="btn ghost small" data-act="takeCat" data-cat="${e.lexicalCategory}">এই শ্রেণি বাছুন</button>` : ""}${kind === "same" ? `<button class="btn ghost small" data-act="skip">বাদ দিন</button>` : ""}<button class="btn small${kind === "same" ? "" : " ghost"}" data-act="editExisting" data-id="${e.id}">এটি সম্পাদনা করুন</button></span></div>`;
    let html = "";
    if (formHits.length) html += `<div class="msg err">“${esc(q)}” ইতিমধ্যে একটি লেক্সিমের রূপ, তাই এর আলাদা লেক্সিম লাগবে না। নতুন অর্থ বা বিবৃতি ওই লেক্সিমেই যোগ করুন।</div>
      ${formHits.map(h => `<div class="hit same"><span class="lem" lang="bn">${esc(h.lemma)}</span><a href="https://www.wikidata.org/wiki/Lexeme:${h.lexeme}" target="_blank" rel="noopener">${h.lexeme}</a><span class="muted">রূপ ${esc(h.form)}${h.feats ? `: ${esc(h.feats)}` : ""}, ${esc(catBy(h.cat)?.bn || h.cat)}</span><span class="acts"><button class="btn small" data-act="editExisting" data-id="${h.lexeme}">${esc(h.lemma)} খুলুন</button></span></div>`).join("")}
      <div><button class="btn ghost small" data-act="allowDup">এটি একই বানানের ভিন্ন শব্দ</button></div>`;
    if (baseHits.length) html += `${baseHits.map((h, i) => `<div class="msg warn">“${esc(q)}” দেখতে ${esc(h.lemma)} + ${esc(h.suffix)} (${esc(h.featText)})-এর মতো, আর <a href="https://www.wikidata.org/wiki/Lexeme:${h.id}" target="_blank" rel="noopener">${h.id} ${esc(h.lemma)}</a> লেক্সিমটি আছে। বিভক্তিযুক্ত রূপ ওই লেক্সিমেই থাকা উচিত। <button class="btn small" data-act="addAsForm" data-i="${i}">“${esc(q)}”-কে ${esc(h.lemma)}-এর রূপ হিসেবে যোগ করুন</button></div>`).join("")}`;
    if (same.length) html += `<div class="msg warn">${draft.category ? "একই ভাষা ও শ্রেণিতে উইকি উপাত্তে আগে থেকেই আছে।" : "এই ভাষায় একই বানানের লেক্সিম আছে (শব্দশ্রেণি এখনো বাছা হয়নি, তাই সব শ্রেণি দেখানো হলো)।"}</div>${same.map(e => card(e, "same")).join("")}`;
    if (other.length) html += `<div class="msg">একই বানান অন্য ভাষা বা শ্রেণিতে আছে। এখানে নতুন লেক্সিম বানানো যায়।</div>${other.map(e => card(e, "")).join("")}`;
    if (!exact.length && !formHits.length) html += `<div class="msg ok">“${esc(q)}” নামে কোনো লেক্সিম এখনো নেই।${all.length ? ` কাছাকাছি: ${all.slice(0, 6).map(e => `<a href="https://www.wikidata.org/wiki/Lexeme:${e.id}" target="_blank" rel="noopener">${esc(firstVal(e.lemmas))}</a>`).join(", ")}।` : ""} নিচের ধাপগুলো পূরণ করে তৈরি করুন।</div>`;
    else if (exact.length) html += `<div><button class="btn ghost" data-act="addNew">${same.length ? "তবু নতুন লেক্সিম বানাব" : "নতুন লেক্সিম বানান"}</button></div>`;
    box.innerHTML = html; schedulePreview();
  } catch (e) { if (seq === lookupSeq) box.innerHTML = `<div class="msg err">খোঁজা যায়নি: ${esc(e.message)}। ইন্টারনেট সংযোগ দেখে “উইকি উপাত্তে খুঁজুন” চাপুন।</div>`; }
}
async function loadExisting(id) {
  $("#found").innerHTML = `<div class="msg">${esc(id)} লোড হচ্ছে…</div>`;
  const e = await getLexeme(id, true);
  draft = draftFromEntity(e); tpl.sig = ""; tpl.key = "";
  if (draft.senses.length > 3) draft.senses.forEach(s => (s._collapsed = true));
  const props = new Set(); const add = h => h.claims.forEach(c => { props.add(c.prop); c.quals.forEach(q => props.add(q.prop)); });
  add(draft); draft.forms.forEach(add); draft.senses.forEach(add);
  try { await ensureProps([...props]); } catch (err) {}
  $("#found").innerHTML = `<div class="msg ok">${e.id} লোড হয়েছে: ${toBn(draft.forms.length)}টি রূপ, ${toBn(draft.senses.length)}টি অর্থ, ${toBn(Object.values(e.claims || {}).flat().length)}টি বিবৃতি। যা দরকার বদলান, তারপর “যাচাই ও সংরক্ষণ” থেকে জমা দিন। <button class="btn ghost small" data-act="addNew">সম্পাদনা বন্ধ করে নতুন লেক্সিম</button></div>`;
  renderAll();
}

/* ---------------- usage example finder (উইকিসংকলন, উইকিপিডিয়া, গুগল বুকস) ----------------
   A chosen sentence becomes a usage example (P5831) with subject form (P5830) and subject sense (P6072)
   qualifiers, and a reference: reference URL (P854), title (P1476), retrieved (P813). */
const EX_SOURCES = [
  { id: "wikisource", label: "উইকিসংকলন", host: "bn.wikisource.org" },
  { id: "wikipedia", label: "উইকিপিডিয়া", host: "bn.wikipedia.org" },
  { id: "books", label: "গুগল বুকস" },
];
const ex = { word: "", form: "", sense: "", results: [], loading: false, msg: "", on: { wikisource: true, wikipedia: false, books: true } };
const decodeHtml = h => { const t = document.createElement("textarea"); t.innerHTML = String(h || "").replace(/<[^>]+>/g, ""); return t.value; };
// Take whatever the search returns: the sentence (or snippet piece) that contains the word, full or not.
function sentencesWith(text, word) {
  text = String(text || "").replace(/\s+/g, " ").trim(); if (!text) return [];
  const clean = x => x.replace(/^[.…\s,;:\-–]+|[\s,;:\-–]+$/g, "").trim();
  const hits = text.split(/(?<=[।!?॥])\s+/).map(clean).filter(x => x.length >= 3 && x.includes(word));
  return (hits.length ? hits : [clean(text)]).map(x => (x.length > 400 ? x.slice(0, 400) + "…" : x));
}
// Wiki sources: search snippets; exact phrase first, then a plain search if that finds nothing.
async function exWikimedia(src, word) {
  const run = async q => {
    const u = `https://${src.host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=25&srprop=snippet&format=json&formatversion=2&origin=*`;
    return (await (await fetch(u)).json()).query?.search || [];
  };
  let hits = await run(`"${word}"`); if (!hits.length) hits = await run(word);
  return hits.flatMap(r => sentencesWith(decodeHtml(r.snippet), word).map(text => ({ text, source: src.label, title: r.title, url: `https://${src.host}/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}` })));
}
async function exBooks(word) {
  const run = async q => (await (await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=bn&maxResults=30`)).json()).items || [];
  let items = await run(`"${word}"`); if (!items.length) items = await run(word);
  return items.flatMap(it => sentencesWith(decodeHtml(it.searchInfo?.textSnippet || it.volumeInfo?.description || ""), word).map(text => ({ text, source: "গুগল বুকস", title: it.volumeInfo?.title || "", url: it.volumeInfo?.infoLink || "", year: (it.volumeInfo?.publishedDate || "").slice(0, 4) })));
}
function openExamples(word, ctx = {}) {
  Object.assign(ex, { word: nfc(word) || nfc(draft.lemma), form: ctx.form || "", sense: ctx.sense || "", results: [], msg: "" });
  renderExamples(); $("#exdlg").showModal(); runExamples();
}
async function runExamples() {
  const w = ex.word; if (!w) return;
  ex.loading = true; ex.results = []; ex.msg = ""; renderExamples();
  const jobs = EX_SOURCES.filter(s => ex.on[s.id]).map(s => (s.host ? exWikimedia(s, w) : exBooks(w)).catch(() => { ex.msg += `${s.label}-এ খোঁজা যায়নি। `; return []; }));
  const seen = new Set();
  ex.results = (await Promise.all(jobs)).flat().filter(r => { const k = nfc(r.text); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
  ex.loading = false; renderExamples();
}
const usedExamples = () => new Set(idxOf(draft, P.usage).map(ci => nfc(draft.claims[ci].value?.text || "")));
function renderExamples() {
  const keepList = $("#ex-body .exlist")?.scrollTop || 0, keepDlg = $("#exdlg")?.scrollTop || 0;
  requestAnimationFrame(() => { const l = $("#ex-body .exlist"); if (l) l.scrollTop = keepList; const dl = $("#exdlg"); if (dl) dl.scrollTop = keepDlg; });
  const used = usedExamples(); const w = ex.word;
  const mark = t => esc(t).split(esc(w)).join(`<mark>${esc(w)}</mark>`);
  $("#ex-body").innerHTML = `
    <div class="row2"><input class="in" id="ex-word" lang="bn" value="${esc(w)}" aria-label="যে শব্দ বা রূপ খুঁজবেন"><button class="btn" data-act="exSearch">খুঁজুন</button></div>
    <div class="opts" style="margin-top:8px">${EX_SOURCES.map(s => `<label><input type="checkbox" data-exsrc="${s.id}"${ex.on[s.id] ? " checked" : ""}> ${s.label}</label>`).join("")}</div>
    <div class="row">
      ${field(plab(P.subjForm), `<select id="ex-form"><option value="">বাক্য থেকে নিজে মিলিয়ে নিক</option>${draft.forms.map(f => `<option value="${esc(formRef(f))}"${formRef(f) === ex.form ? " selected" : ""}>${esc(f.rep)}</option>`).join("")}</select>`)}
      ${field(plab(P.subjSense), `<select id="ex-sense"><option value="">যুক্ত নয়</option>${draft.senses.map((s, k) => `<option value="${esc(senseRef(s))}"${senseRef(s) === ex.sense ? " selected" : ""}>${toBn(k + 1)}. ${esc(senseSummary(s))}</option>`).join("")}</select>`)}
    </div>
    ${ex.loading ? `<p class="hint">খোঁজা হচ্ছে…</p>` : ""}
    ${ex.msg ? `<p class="hint">${esc(ex.msg)}</p>` : ""}
    ${!ex.loading && !ex.results.length ? `<p class="hint">কিছু পাওয়া যায়নি। অন্য রূপ লিখে বা অন্য উৎস বেছে আবার খুঁজুন।</p>` : ""}
    <ul class="exlist">${ex.results.map((r, k) => `<li><p class="ex-s" lang="bn">${mark(r.text)}</p>
      <div class="exmeta"><span class="chip">${esc(r.source)}</span>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title || r.url)}</a>` : esc(r.title)}${r.year ? ` (${toBn(r.year)})` : ""}
      ${used.has(nfc(r.text)) ? '<span class="tag">যোগ হয়েছে</span>' : `<button class="btn small" data-act="exAdd" data-k="${k}">উদাহরণ হিসেবে যোগ করুন</button>`}</div></li>`).join("")}</ul>`;
}
function addExample(k) {
  const r = ex.results[k]; if (!r) return;
  const text = nfc(r.text); const lc = draft.langCode || "bn";
  let form = $("#ex-form")?.value || "";
  if (!form) { const hit = [...draft.forms].filter(f => f.rep && text.includes(nfc(f.rep))).sort((a, b) => b.rep.length - a.rep.length)[0]; form = hit ? formRef(hit) : ""; }
  const sense = $("#ex-sense")?.value || "";
  const c = newClaim(P.usage, { text, language: lc }, [[P.subjForm, form], [P.subjSense, sense]]);
  const today = new Date().toISOString().slice(0, 10);
  c.refs = [[[P.refUrl, r.url], ["P1476", r.title ? { text: r.title, language: /[\u0980-\u09FF]/.test(r.title) ? "bn" : "en" } : ""], ["P813", { time: today }]]];
  c._srcLabel = `${r.source}: ${r.title}`;
  draft.claims.push(c); rerender("lexeme,senses,forms");
  const btn = document.querySelector(`#ex-body [data-act="exAdd"][data-k="${k}"]`);
  if (btn) btn.outerHTML = '<span class="tag">যোগ হয়েছে</span>';
}
document.addEventListener("keydown", e => { if (e.target.id === "ex-word" && e.key === "Enter") { e.preventDefault(); ACTS.exSearch(); } });
document.addEventListener("change", e => { const id = e.target.dataset?.exsrc; if (id) { ex.on[id] = e.target.checked; } });

/* ---------------- audio dialog ---------------- */
const audio = { blob: null, ext: "", rec: null, chunks: [], url: "", hp: "", sec: "", word: "" };
function encodeWav(samples, sr) {
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, samples.length * 2, true);
  let o = 44; for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([b], { type: "audio/wav" });
}
async function toWav(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close();
  let s = buf.getChannelData(0); const sr = buf.sampleRate, th = 0.012, pad = Math.floor(sr * 0.15);
  let a = 0, z = s.length - 1; while (a < z && Math.abs(s[a]) < th) a++; while (z > a && Math.abs(s[z]) < th) z--;
  return encodeWav(s.slice(Math.max(0, a - pad), Math.min(s.length, z + pad)), sr);
}
function audioUi() {
  $("#a-rec").innerHTML = audio.rec ? '<span class="rec-dot"></span>রেকর্ডিং থামান' : "রেকর্ড করুন";
  $("#a-player").innerHTML = audio.url ? `<audio controls src="${audio.url}"></audio>` : '<span class="muted">এখনো কোনো অডিও নেই।</span>';
  $("#a-upload").disabled = !(audio.blob && auth.user);
  if (!auth.user) $("#a-msg").innerHTML = `<div class="msg warn">আপলোড করতে লগ ইন করুন। কমন্সে আগে থেকে থাকা অডিও “কমন্সে খুঁজুন” দিয়ে যুক্ত করা যায়।</div>`;
}
function openAudio(hp, sec, word) {
  Object.assign(audio, { hp, sec, word: nfc(word) || nfc(draft.lemma), blob: null, url: "" });
  $("#adlg-for").textContent = `${hp ? "রূপ" : "শব্দ"} “${audio.word || "…"}”-এর জন্য। রেকর্ডিং WAV হিসেবে, দুই পাশের নীরবতা ছেঁটে রাখা হয়।`;
  $("#a-name").value = `Bn-${audio.word || "word"}.wav`; $("#a-msg").innerHTML = ""; audioUi(); $("#adlg").showModal();
}
function setAudio(blob, ext) { audio.blob = blob; audio.ext = ext; if (audio.url) URL.revokeObjectURL(audio.url); audio.url = URL.createObjectURL(blob); $("#a-name").value = `Bn-${audio.word || "word"}.${ext}`; audioUi(); }
function takeAudioFile(f) {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!["ogg", "oga", "wav", "flac", "webm", "opus"].includes(ext)) { $("#a-msg").innerHTML = `<div class="msg err">কমন্স অডিওর জন্য .ogg, .oga, .wav, .flac, .webm ও .opus নেয়। “${esc(f.name)}” যোগ হয়নি।</div>`; return; }
  setAudio(f, ext);
}
$("#a-rec").addEventListener("click", async () => {
  if (audio.rec) { audio.rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream); audio.chunks = [];
    rec.ondataavailable = e => audio.chunks.push(e.data);
    rec.onstop = async () => { stream.getTracks().forEach(t => t.stop()); audio.rec = null; try { setAudio(await toWav(new Blob(audio.chunks, { type: rec.mimeType })), "wav"); } catch (e) { audioUi(); $("#a-msg").innerHTML = `<div class="msg err">রেকর্ডিং রূপান্তর করা যায়নি: ${esc(e.message)}</div>`; } };
    rec.start(); audio.rec = rec; audioUi();
  } catch (e) { $("#a-msg").innerHTML = `<div class="msg err">মাইক্রোফোন পাওয়া যায়নি: ${esc(e.message)}। এই পাতাকে মাইক্রোফোনের অনুমতি দিন, অথবা ফাইল টেনে আনুন।</div>`; }
});
const adrop = $("#a-drop");
["dragover", "dragenter"].forEach(ev => adrop.addEventListener(ev, e => { e.preventDefault(); adrop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => adrop.addEventListener(ev, e => { e.preventDefault(); adrop.classList.remove("over"); }));
adrop.addEventListener("drop", e => e.dataTransfer.files[0] && takeAudioFile(e.dataTransfer.files[0]));
$("#a-file").addEventListener("change", e => e.target.files[0] && takeAudioFile(e.target.files[0]));
$("#a-close").addEventListener("click", () => { if (audio.rec) audio.rec.stop(); $("#adlg").close(); });
$("#a-upload").addEventListener("click", async () => {
  const msg = $("#a-msg"); const name = nfc($("#a-name").value).replace(/^File:/i, "");
  if (!name) { msg.innerHTML = `<div class="msg err">ফাইলের একটি নাম দিন।</div>`; return; }
  const lic = $("#a-lic").value, today = new Date().toISOString().slice(0, 10), word = audio.word;
  const text = `== {{int:filedesc}} ==\n{{Information\n|description={{bn|1=“${word}” শব্দের উচ্চারণ}}{{en|1=Pronunciation of the Bengali word “${word}”}}\n|date=${today}\n|source={{own}}\n|author=[[User:${auth.user}|${auth.user}]]\n}}\n\n== {{int:license-header}} ==\n{{self|${lic}}}\n\n[[Category:Bengali pronunciation]]`;
  msg.innerHTML = `<div class="msg">কমন্সে আপলোড হচ্ছে…</div>`; $("#a-upload").disabled = true;
  try {
    const token = await csrf(CFG.commons); const fd = new FormData(); fd.append("file", audio.blob, name);
    const r = await api(CFG.commons, { action: "upload", filename: name, text, comment: `Pronunciation of ${word} (Bengali)`, token }, { post: true, body: fd });
    if (r.upload?.result !== "Success") throw new Error(`কমন্স আপলোড নেয়নি (${r.upload?.result})। সতর্কবার্তা: ${JSON.stringify(r.upload?.warnings || {})}। ফাইলের নাম বদলে আবার চেষ্টা করুন।`);
    const fname = r.upload.filename.replace(/_/g, " ");
    holderOf(audio.hp).claims.push(newClaim(P.audio, fname));
    msg.innerHTML = `<div class="msg ok">“${esc(fname)}” আপলোড হয়েছে। লেক্সিম সংরক্ষণের সময় যুক্ত হবে।</div>`;
    rerender(audio.sec);
  } catch (e) { msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; audioUi(); }
});

/* ---------------- actions & events ---------------- */
const ACTS = {
  addClaim: async ds => {
    if (ds.prop && (!DT[ds.prop] || !PLABEL[ds.prop])) { try { await ensureProps([ds.prop]); } catch (e) {} }
    holderOf(ds.hp).claims.push(newClaim(ds.prop || ""));
    rerender(ds.sec);
  },
  addComponent: () => { const n = idxOf(draft, P.combines).length; draft.claims.push(newClaim(P.combines, "", [[P.ordinal, String(n + 1)]])); rerender("lexeme"); },
  removeClaim: ds => { const h = holderOf(ds.hp); const [c] = h.claims.splice(+ds.i, 1); if (c?._id) (h._removed = h._removed || []).push(c._id); rerender(ds.sec); },
  addQual: async ds => {
    const c = getPath(draft, ds.path); const p = ds.prop || "";
    if (p && (!DT[p] || !PLABEL[p])) { try { await ensureProps([p]); } catch (e) {} }
    c.quals.push({ prop: p, value: p ? defaultValue(DT[p]) : "" }); c._dirty = true; rerender(ds.sec);
  },
  removeQual: ds => { const c = getPath(draft, ds.path); c.quals.splice(+ds.j, 1); c._dirty = true; rerender(ds.sec); },
  addForm: () => { draft.forms.push(newForm()); rerender("forms,lexeme"); },
  removeForm: ds => {
    const f = draft.forms[+ds.i]; if (!f) return;
    if (f._id && !confirm(`“${f.rep}” (${f._id}) উইকি উপাত্ত থেকে মুছে যাবে, সংরক্ষণ করলে। চালিয়ে যাবেন?`)) return;
    draft.forms.splice(+ds.i, 1); if (f._id) draft._removedForms.push(f._id); clearRef(formRef(f));
    if (f._tplKey === tpl.key && f._tplRow !== undefined && !formsOfRow(f._tplRow).length) { tpl.on[f._tplRow] = false; tpl.open.delete(f._tplRow); }
    rerender("forms,lexeme");
  },
  addSense: () => { draft.senses.push(newSense()); rerender("senses,lexeme"); },
  removeSense: ds => { const s0 = draft.senses[+ds.i]; if (s0?._id && !confirm(`অর্থ ${toBn(+ds.i + 1)} (${s0._id}) উইকি উপাত্ত থেকে মুছে যাবে, সংরক্ষণ করলে। চালিয়ে যাবেন?`)) return; const [s] = draft.senses.splice(+ds.i, 1); if (s._id) draft._removedSenses.push(s._id); clearRef(senseRef(s)); rerender("senses,lexeme"); },
  removeFeature: ds => { draft.forms[+ds.i].features.splice(+ds.j, 1); rerender("forms"); },
  toggleRow: ds => { const i = +ds.i; tpl.open.has(i) ? tpl.open.delete(i) : tpl.open.add(i); renderForms(); },
  takeCat: ds => { draft.category = ds.cat; renderHero(); rerender("forms,senses,lexeme"); lookup(false); },
  toggleSense: ds => { const s = draft.senses[+ds.i]; s._collapsed = !s._collapsed; renderSenses(); },
  collapseAll: ds => { draft.senses.forEach(s => (s._collapsed = ds.v === "1")); renderSenses(); },
  goto: ds => {
    const i = +ds.i;
    if (ds.kind === "claim") { const c = draft.claims[i]; selectTab("lexeme"); flash(document.getElementById(SECTION_OF[c?.prop] || "sec-other")); }
    else if (ds.kind === "sense") { const s = draft.senses[i]; s._collapsed = false; selectTab("senses"); flash(document.getElementById("sense-" + s._key)); }
    else if (ds.kind === "form") {
      const f = draft.forms[i]; selectTab("forms");
      if (f._tplKey === tpl.key && f._tplRow !== undefined) { tpl.open.add(f._tplRow); renderForms(); const inp = document.querySelector(`[data-tpl-i="${f._tplRow}"]`); flash(inp?.closest("tr")); inp?.focus({ preventScroll: true }); }
      else flash(document.getElementById("form-" + f._key));
    }
  },
  pvRemove: ds => {
    const i = +ds.i;
    if (ds.kind === "claim") { const c = draft.claims[i]; if (c?._id && !confirm(`${plbi(c.prop)}: “${fmtValue(c.value)}” উইকি উপাত্ত থেকে মুছে যাবে, সংরক্ষণ করলে। চালিয়ে যাবেন?`)) return; ACTS.removeClaim({ hp: "", i, sec: "lexeme" }); }
    else if (ds.kind === "sense") ACTS.removeSense({ i });
    else if (ds.kind === "form") ACTS.removeForm({ i });
  },
  editSentence: ds => { const f = draft.forms[+ds.i]; f._editSentence = !f._editSentence; rerender("forms"); },
  findExamples: ds => openExamples(ds.word, { form: ds.form || "", sense: ds.sense || "" }),
  exSearch: () => { ex.word = nfc($("#ex-word").value); ex.form = $("#ex-form").value; ex.sense = $("#ex-sense").value; runExamples(); },
  exAdd: ds => addExample(+ds.k),
  fixAt: ds => {
    const loc = JSON.parse(ds.loc);
    if (loc.kind === "hero") { const el = $(loc.sel); window.scrollTo({ top: 0, behavior: "smooth" }); flash(el); el?.focus?.({ preventScroll: true }); }
    else if (loc.kind === "tab") selectTab(loc.tab);
    else ACTS.goto({ kind: loc.kind, i: String(loc.i) });
  },
  dlPlan: () => download(`lexeme-plan-${nfc(draft.lemma) || "draft"}.json`, JSON.stringify([buildPlan(draft)], null, 2)),
  copyP1: async (ds, b) => { await navigator.clipboard.writeText(JSON.stringify(buildPlan(draft).phase1.data)); b.textContent = "কপি হয়েছে"; setTimeout(() => (b.textContent = "wbeditentity ডেটা কপি"), 1500); },
  goTab: ds => { selectTab(ds.tab); window.scrollTo({ top: $(".tabs").offsetTop - 8, behavior: "smooth" }); },
  newEtyForSense: ds => { draft.claims.push(newClaim(P.derivedFrom, "", [[P.subjSense, ds.ref]])); rerender("lexeme,senses"); selectTab("lexeme"); setTimeout(() => $("#ety-head")?.scrollIntoView({ behavior: "smooth" }), 50); },
  addSource: () => { draft.sources.push(newSource()); rerender("senses"); },
  removeSource: ds => { const [x] = draft.sources.splice(+ds.i, 1); draft.senses.forEach(s => (s.cites = s.cites.filter(c => String(c.src) !== String(x._key)))); rerender("senses"); },
  addCite: ds => { const s = draft.senses[+ds.i]; const free = draft.sources.find(x => !s.cites.some(c => String(c.src) === String(x._key))) || draft.sources[0]; s.cites.push(newCite(free._key)); rerender("senses"); },
  removeCite: ds => { draft.senses[+ds.i].cites.splice(+ds.j, 1); rerender("senses"); },
  findAudio: ds => findAudioFor(ds.hp, ds.sec, ds.word),
  findAllAudio: async () => { for (let i = 0; i < draft.forms.length; i++) if (draft.forms[i].rep) await findAudioFor(`forms.${i}`, "forms", draft.forms[i].rep); },
  attachAudio: ds => { const h = holderOf(ds.hp); if (!h.claims.some(c => c.prop === P.audio && nfc(c.value) === nfc(ds.file))) h.claims.push(newClaim(P.audio, ds.file)); rerender(ds.sec); },
  allowDup: () => { draft._allowDup = true; $("#found").insertAdjacentHTML("afterbegin", `<div class="msg">ঠিক আছে: “${esc(nfc(draft.lemma))}” আলাদা লেক্সিম হিসেবে তৈরি হবে।</div>`); schedulePreview(); },
  addAsForm: async ds => {
    const h = draft._baseHits[+ds.i]; const word = nfc(draft.lemma);
    try {
      await loadExisting(h.id);
      const set = [...h.feats].sort().join();
      if (!draft.forms.some(f => nfc(f.rep) === word && [...f.features].sort().join() === set)) draft.forms.push(newForm(word, [...h.feats]));
      rerender("forms,lexeme"); selectTab("forms");
      $("#found").insertAdjacentHTML("beforeend", `<div class="msg ok">“${esc(word)}” ${esc(h.lemma)}-এর নতুন রূপ হিসেবে যোগ হয়েছে। বৈশিষ্ট্য মিলিয়ে “যাচাই ও সংরক্ষণ” থেকে জমা দিন।</div>`);
    } catch (e) { $("#found").innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  },
  usageFromForm: ds => {
    const f = draft.forms[+ds.i]; const sent = f.example || fillX(sentenceGuide(f).s, f.rep);
    const text = nfc(sent.replace(/[\[\]]/g, "")); if (!text) return;
    draft.claims.push(newClaim(P.usage, { text, language: draft.langCode || "bn" }, [[P.subjForm, formRef(f)]]));
    rerender("lexeme");
    const b = document.querySelector(`[data-act="usageFromForm"][data-i="${ds.i}"]`); if (b) { b.textContent = "উদাহরণে যোগ হয়েছে"; setTimeout(() => (b.textContent = "প্রয়োগের উদাহরণ হিসেবে যোগ করুন"), 1800); }
  },
  addNew: () => { const keep = { lemma: draft.lemma, language: draft.language, langCode: draft.langCode, category: draft.category }; if (draft.existingId) { draft = Object.assign(newDraft(), keep); } $("#found").innerHTML = ""; renderAll(); selectTab("lexeme"); },
  skip: () => { draft = newDraft(); $("#found").innerHTML = `<div class="msg">বাদ দেওয়া হলো। পরের শব্দ লিখুন।</div>`; renderAll(); $("#lemma").focus(); },
  editExisting: async ds => { try { await loadExisting(ds.id); } catch (e) { $("#found").innerHTML = `<div class="msg err">${esc(e.message)}</div>`; } },
  audioDlg: ds => openAudio(ds.hp, ds.sec, ds.word),
};
const HOOKS = {
  animacy: t => { setAnimacy(t.value); rerender("lexeme,forms"); },
  tplAnimacy: t => { genOpts.animacy = t.value; renderForms(); },
  rel: async t => { const c = draft.claims[+t.dataset.i]; c._relKey = t.value; const q = await resolveOpt(CFG.headRelations[t.value]); c.quals[qualIdx(c, P.headRel)].value = q; c.quals[qualIdx(c, P.headRel)]._dirty = true; c._dirty = true; rerender("lexeme"); },
  mode: async t => { const c = draft.claims[+t.dataset.i]; c._modeKey = t.value; const j = qualIdx(c, P.derivMode); c.quals[j].value = await resolveOpt(CFG.derivationModes[t.value]); c.quals[j]._dirty = true; c._dirty = true; rerender("lexeme"); },
  origin: async t => { const c = draft.claims[+t.dataset.i]; c._origin = t.value; const o = CFG.origins[t.value]; c._modeKey = o?.mode || ""; const j = qualIdx(c, P.derivMode); c.quals[j].value = await resolveOpt(CFG.derivationModes[c._modeKey]); c.quals[j]._dirty = true; c._dirty = true; rerender("lexeme"); },
  ending: t => { genOpts.ending = t.value; renderForms(); },
  extras: t => { genOpts.extras = t.checked; renderForms(); },
  autoAudio: t => { genOpts.autoAudio = t.checked; if (t.checked) scheduleAutoAudio(); },
  tpl: t => { genOpts.template = t.value; renderForms(); },
  tplAll: t => { tpl.rows.forEach((r, i) => { if (formsOfRow(i).some(f => f._id)) return; tpl.on[i] = t.checked; setRowForms(i, t.checked ? tpl.vals[i] : ""); }); rerender("forms,lexeme"); scheduleAutoAudio(); },
  etySense: t => { setEtySense(+t.dataset.ci, t.dataset.ref, t.checked); rerender("lexeme,senses"); },
  choice: t => {
    const path = t.dataset.path;
    if (t.value === "__other") { freeEntry.add(path); setVal(path, ""); rerender("lexeme,senses,forms"); return; }
    setVal(path, t.value); const a = t.parentElement.querySelector(".wdl"); if (a) a.remove();
    if (t.value) t.insertAdjacentHTML("afterend", wdLink(t.value, t.value + " ↗")); schedulePreview();
  },
  featAdd: t => { if (t.value === "__other") { draft.forms[+t.dataset.i]._featSearch = true; rerender("forms"); return; } if (!t.value) return; const f = draft.forms[+t.dataset.i]; if (!f.features.includes(t.value)) f.features.push(t.value); rerender("forms"); },
};
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.hook) HOOKS[t.dataset.hook]?.(t);
  if (!t.dataset.bind) return;
  setVal(t.dataset.bind, t.type === "checkbox" ? t.checked : t.value);
  if (t.dataset.rerender) rerender(t.dataset.rerender);
  if (t.id === "lemma") scheduleAutoLookup();
  schedulePreview();
});
// Template table: typing in a row edits its form(s) directly; ticking adds, unticking removes.
let tplStructDirty = false;
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.tplI !== undefined) {
    const i = +t.dataset.tplI, before = formsOfRow(i).length;
    tpl.vals[i] = t.value; tpl.edited[i] = true;
    const saved = formsOfRow(i).some(f => f._id);
    tpl.on[i] = saved || !!t.value.trim();
    setRowForms(i, tpl.on[i] ? t.value : "");
    formsOfRow(i).forEach(f => (f._tplEdited = true));
    if (formsOfRow(i).length !== before || tpl.open.has(i)) tplStructDirty = true;
    const cell = document.querySelector(`[data-tpl-s="${i}"]`); if (cell) cell.innerHTML = markX(fillX(tpl.rows[i].ex, t.value));
    const cb = document.querySelector(`[data-tpl-on="${i}"]`); if (cb && !cb.disabled) cb.checked = tpl.on[i];
    schedulePreview(); scheduleAutoAudio();
  } else if (t.dataset.tplOn !== undefined) {
    const i = +t.dataset.tplOn; tpl.on[i] = t.checked; setRowForms(i, t.checked ? tpl.vals[i] : "");
    if (!t.checked) tpl.open.delete(i);
    rerender("forms,lexeme"); $(`[data-tpl-on="${i}"]`)?.focus(); scheduleAutoAudio();
  }
});
document.addEventListener("change", e => {
  if (e.target.dataset.tplI === undefined || !tplStructDirty) return;
  tplStructDirty = false;
  setTimeout(() => { const a = document.activeElement, sel = a?.dataset?.tplI !== undefined ? `[data-tpl-i="${a.dataset.tplI}"]` : null; rerender("forms,lexeme"); if (sel) $(sel)?.focus(); }, 0);
});
// Live-update a form card's heading and example sentence without re-rendering (keeps focus).
document.addEventListener("input", e => {
  const t = e.target, m = (t.dataset.bind || "").match(/^forms\.(\d+)\.(rep|example)$/); if (!m) return;
  const card = t.closest(".form-card"), f = draft.forms[+m[1]]; if (!card || !f) return;
  if (m[2] === "rep") card.querySelector(".fc-head h3").textContent = f.rep;
  card.querySelector(".ex-s").innerHTML = markX(f.example || fillX(sentenceGuide(f).s, f.rep));
});
document.addEventListener("change", e => { if (e.target.dataset.rerenderLazy) rerender("lexeme"); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const fn = ACTS[b.dataset.act]; if (fn) { e.preventDefault(); fn(b.dataset, b); }
});
function selectTab(name) {
  $$(".tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  $$(".panel").forEach(p => (p.hidden = p.id !== "p-" + name));
  if (name === "review") renderReview(); else if (RENDER[name]) RENDER[name]();
}
$$(".tabs button").forEach(b => b.addEventListener("click", () => selectTab(b.dataset.tab)));
$("#lang-preset").addEventListener("change", e => { const l = CFG.languages.find(x => x.iso3 === e.target.value); if (l) { draft.language = l.qid; draft.langCode = l.code; } renderHero(); rerender("forms"); schedulePreview(); scheduleAutoLookup(); loadPopular().then(() => rerender("lexeme,forms,senses")).catch(() => {}); });
// Find each language's item (by ISO 639-3, P220) and the lemma code its existing lexemes use.
async function resolveLanguages() {
  await Promise.all(CFG.languages.map(async l => {
    try {
      const j = await api(CFG.wd, { action: "query", list: "search", srsearch: `haswbstatement:P220=${l.iso3}`, srnamespace: "0", srlimit: "1" });
      const q = j.query.search[0]?.title; if (q && /^Q\d+$/.test(q)) l.qid = q;
    } catch (e) {}
    if (!l.qid) return;
    try {
      const sq = `SELECT ?code (COUNT(*) AS ?n) WHERE { ?l dct:language wd:${l.qid} ; wikibase:lemma ?lem . BIND(LANG(?lem) AS ?code) } GROUP BY ?code ORDER BY DESC(?n) LIMIT 1`;
      const r = await fetch(CFG.sparql + "?format=json&query=" + encodeURIComponent(sq), { headers: { Accept: "application/sparql-results+json" } });
      const code = (await r.json()).results.bindings[0]?.code?.value; if (code) l.code = code;
    } catch (e) {}
    if (!l.code) l.code = `mis-x-${l.qid}`; // no lexemes yet and no Wikimedia code: private-use tag on “mis”
  }));
  const cur = CFG.languages.find(l => l.iso3 === "ben"); if (draft.language === "Q9610" && cur) draft.langCode = cur.code || "bn";
  renderHero();
}
$("#cat").addEventListener("change", () => { $("#cat").classList.toggle("need", !draft.category); scheduleAutoLookup(); });
$("#lookup").addEventListener("click", () => lookup(false));
$("#lemma").addEventListener("keydown", e => { if (e.key === "Enter") { clearTimeout(autoTimer); lookup(false); } });
$("#reset").addEventListener("click", () => { if (confirm("এই খসড়ার সবকিছু মুছে যাবে। নিশ্চিত?")) { draft = newDraft(); $("#found").innerHTML = ""; renderAll(); } });

$("#submit").addEventListener("click", async () => {
  const logBox = $("#submit-log"); logBox.hidden = false; logBox.innerHTML = "";
  const log = m => { logBox.insertAdjacentHTML("beforeend", `<div>${esc(m)}</div>`); logBox.scrollTop = 1e9; };
  $("#submit").disabled = true;
  try {
    const r = await submitPlan(buildPlan(draft), editSummary(), log);
    log(`সম্পন্ন: https://www.wikidata.org/wiki/Lexeme:${r.id}`);
    await loadExisting(r.id); selectTab("review");
  } catch (e) {
    log("থেমে গেছে: " + e.message + (e.code === "editconflict" ? " এর মধ্যে অন্য কেউ এই লেক্সিম সম্পাদনা করেছেন। আপনার বদলগুলো টুকে রাখুন, “এটি সম্পাদনা করুন” দিয়ে আবার লোড করে বসান।" : ""));
  } finally { renderReview(); }
});

/* theme: auto (follow the system) → light → dark */
const THEMES = [["auto", "auto", "স্বয়ংক্রিয়"], ["light", "sun", "হালকা"], ["dark", "moon", "গাঢ়"]];
function applyTheme(t) {
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const [, icon, label] = THEMES.find(x => x[0] === t) || THEMES[0];
  const b = $("#theme"); b.innerHTML = ic(icon); b.title = b.ariaLabel = `রং: ${label} (বদলাতে চাপুন)`; b.dataset.t = t;
  try { localStorage.setItem("theme", t); } catch (e) {}
}
$("#theme").addEventListener("click", () => { const i = THEMES.findIndex(x => x[0] === ($("#theme").dataset.t || "auto")); applyTheme(THEMES[(i + 1) % 3][0]); });
applyTheme((() => { try { return localStorage.getItem("theme") || "auto"; } catch (e) { return "auto"; } })());

/* account: login, logout and the account menu are in the shared site header (auth.js). */

/* ---------------- bulk mode ---------------- */
function setMode(bulk) { $("#single").hidden = bulk; $("#bulk").hidden = !bulk; $("#m-single").setAttribute("aria-pressed", String(!bulk)); $("#m-bulk").setAttribute("aria-pressed", String(bulk)); }
$("#m-single").addEventListener("click", () => setMode(false));
$("#m-bulk").addEventListener("click", () => { setMode(true); setBulkView(grid.view); });
// All forms of the matching Lexeme Forms template, pre-filled, for a draft that isn't on screen.
function templateFormsFor(d) {
  const saved = draft; draft = d;
  try {
    const key = autoTemplate(); if (!key) return [];
    return TEMPLATES[key].forms.flatMap(r => repsOf(prefill(key, d.lemma, r)).map(rep => [rep, [...r[2]]]));
  } finally { draft = saved; }
}
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, ""); const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const clean = rows.filter(r => r.some(x => x.trim())); if (!clean.length) return [];
  const head = clean[0].map(x => x.replace(/^\uFEFF/, "").trim().toLowerCase());
  return clean.slice(1).map(r => Object.fromEntries(head.map((k, i) => [k, (r[i] || "").trim()])));
}
const catFromAny = v => { v = (v || "").trim(); if (/^Q\d+$/.test(v)) return v; const c = CFG.categories.find(c => [c.key, c.en.toLowerCase()].includes(v.toLowerCase()) || c.bn === v); return c ? c.qid : v; };
const featFromAny = x => { x = x.trim(); return CFG.features[x]?.qid || x; };
function rowToDraft(r) {
  const d = newDraft();
  d.lemma = nfc(r.lemma); d.langCode = r.lang_code || "bn"; d.language = r.language || CFG.languages.find(l => l.code === d.langCode)?.qid || "Q9610";
  if (!r.lang_code) d.langCode = langBy(d.language)?.code || d.langCode;
  d.category = catFromAny(r.category); d.existingId = r.existing_id || null;
  const an = (r.animacy || "").toLowerCase(); const aq = CFG.qualities[an] || (/^Q\d+$/.test(r.animacy || "") ? r.animacy : "");
  if (aq) d.claims.push(newClaim(P.hasQuality, aq));
  if (r.audio) d.claims.push(newClaim(P.audio, r.audio));
  if (r.derived_from) { const mk = (r.derivation_mode || "").toLowerCase(); d.claims.push(newClaim(P.derivedFrom, r.derived_from, [[P.derivMode, /^Q\d+$/.test(r.derivation_mode || "") ? r.derivation_mode : (CFG.derivationModes[mk]?.qid || "")]])); }
  (r.components || "").split(/[;|]/).map(s => s.trim()).filter(Boolean).forEach((id, i) => d.claims.push(newClaim(P.combines, id, [[P.ordinal, String(i + 1)]])));
  (r.statements || "").split(";").map(s => s.trim()).filter(Boolean).forEach(s => { const [p, ...v] = s.split("="); if (/^P\d+$/.test(p.trim())) d.claims.push(newClaim(p.trim(), v.join("=").trim())); });
  if (r.gloss_bn || r.gloss_en || r.item) { const s = newSense(); s.gloss = { bn: r.gloss_bn || "", en: r.gloss_en || "" }; if (r.item) s.claims.push(newClaim(P.item, r.item)); d.senses.push(s); }

  if (/^(y|yes|1|true|হ্যাঁ)$/i.test(r.generate_forms || "")) templateFormsFor(d).forEach(([rep, feats]) => d.forms.push(newForm(rep, feats)));
  (r.forms || "").split(";").map(s => s.trim()).filter(Boolean).forEach(s => { const [rep, feats = ""] = s.split(":"); d.forms.push(newForm(nfc(rep), feats.split(",").map(featFromAny).filter(Boolean))); });
  if (r.usage_example) d.claims.push(newClaim(P.usage, { text: r.usage_example, language: d.langCode }, [[P.subjSense, d.senses[0] ? senseRef(d.senses[0]) : ""]]));
  return d;
}
function normalizeDraft(o) {
  const d = Object.assign(newDraft(), o);
  const nc = c => ({ ...newClaim(c.prop, c.value), ...c, quals: (c.quals || []).map(q => ({ prop: q.prop, value: q.value })) });
  d.claims = (d.claims || []).map(nc);
  d.forms = (d.forms || []).map(f => ({ ...newForm(), ...f, _key: f._key ?? keySeq++, claims: (f.claims || []).map(nc) }));
  d.sources = (d.sources || []).map(x => ({ ...newSource(), ...x, _key: x._key ?? keySeq++ }));
  d.senses = (d.senses || []).map(s => ({ ...newSense(), ...s, _key: s._key ?? keySeq++, gloss: { bn: "", en: "", ...(s.gloss || {}) }, cites: (s.cites || []).map(c => ({ ...newCite(c.src), ...c })), claims: (s.claims || []).map(nc) }));
  return d;
}
const bulk = { drafts: [], results: [], stop: false };
function loadBulkText(text) {
  text = text.trim(); if (!text) return [];
  if (/^[\[{]/.test(text)) { const j = JSON.parse(text); return (Array.isArray(j) ? j : [j]).map(normalizeDraft); }
  return parseCSV(text).map(rowToDraft);
}
$("#bulk-file").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { $("#bulk-text").value = await f.text(); bulkEdited(); setBulkView(grid.view); } });
$("#bulk-tpl").addEventListener("click", () => download("bengali-lexemes-template.csv", "\uFEFF" + SAMPLE_CSV, "text/csv"));
/* ---------------- bulk table: editable, sortable, searchable view of the CSV ---------------- */
const SAMPLE_CSV = "lemma,lang_code,language,category,animacy,gloss_bn,gloss_en,item,derived_from,derivation_mode,components,usage_example,generate_forms,forms,audio,statements,existing_id\n" +
  "কুকুর,bn,Q9610,noun,animate,চারপেয়ে গৃহপালিত প্রাণী,dog,Q144,,,,কুকুরটা খুব প্রভুভক্ত।,yes,\"কুকুরেরা:plural,nominative\",,,\n" +
  "জামা,bn,Q9610,noun,inanimate,গায়ে পরার পোশাক,shirt,,,,,,yes,,,,\n" +
  "আম,bn,Q9610,noun,inanimate,এক রকমের মিষ্টি ফল,mango,,,,,,yes,\"আমগুলো:plural,nominative\",,,\n" +
  "করা,bn,Q9610,verb,,কোনো কাজ সম্পন্ন করা,to do,,,,,,yes,,,,\n";
const COL_BN = { lemma: "শব্দ", lang_code: "কোড", language: "ভাষা", category: "শ্রেণি", animacy: "প্রাণীবাচক", gloss_bn: "সংজ্ঞা (bn)", gloss_en: "সংজ্ঞা (en)", item: "আইটেম",
  derived_from: "উদ্ভূত", derivation_mode: "উদ্ভবের ধরন", components: "অংশ", usage_example: "উদাহরণ", generate_forms: "রূপ তৈরি", forms: "রূপ", audio: "অডিও", statements: "বিবৃতি", existing_id: "লেক্সিম আইডি" };
const grid = { cols: [], rows: [], sort: -1, dir: 1, q: "", view: "table", json: false };
function parseCSVRows(text) {
  text = String(text).replace(/^\uFEFF/, ""); const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const csvCell = v => (/[",\n\r]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
const toCSV = () => [grid.cols, ...grid.rows].map(r => r.map(csvCell).join(",")).join("\n") + "\n";
function gridFromText() {
  const t = $("#bulk-text").value.trim();
  grid.json = /^[\[{]/.test(t);
  if (grid.json) return;
  if (!t) { grid.cols = parseCSVRows(SAMPLE_CSV)[0]; grid.rows = []; return; }
  const raw = parseCSVRows(t).filter((r, k) => k === 0 || r.some(x => String(x).trim()));
  grid.cols = raw[0].map(x => x.trim()); grid.rows = raw.slice(1).map(r => grid.cols.map((_, i) => r[i] ?? ""));
}
let gridSyncT;
function syncText() { clearTimeout(gridSyncT); gridSyncT = setTimeout(() => { $("#bulk-text").value = toCSV(); }, 150); }
// validation results belong to non-empty rows, in order
function rowResults() { const map = new Map(); let k = 0; grid.rows.forEach((r, i) => { if (r.some(x => String(x).trim())) { if (bulk.results[k]) map.set(i, bulk.results[k]); k++; } }); return map; }
function renderGrid() {
  const box = $("#bulk-grid"); if (!box) return;
  if (grid.json) { box.innerHTML = `<p class="hint">JSON তালিকা টেবিলে দেখানো যায় না; “লেখা” অংশে সম্পাদনা করুন।</p>`; $("#bulk-count").textContent = ""; return; }
  const q = grid.q.toLowerCase(); const res = rowResults();
  let idx = grid.rows.map((_, i) => i).filter(i => !q || grid.rows[i].some(x => String(x).toLowerCase().includes(q)));
  if (grid.sort >= 0) idx.sort((a, b) => String(grid.rows[a][grid.sort]).localeCompare(String(grid.rows[b][grid.sort]), "bn") * grid.dir);
  $("#bulk-count").textContent = `${toBn(idx.length)}/${toBn(grid.rows.length)}টি সারি`;
  const st = r => { if (!r) return ""; const msgs = [...r.errors, ...r.warnings].join("\n");
    const tag = r.status ? r.status : r.errors.length ? '<span class="status-tag err">ত্রুটি</span>' : r.warnings.length ? '<span class="status-tag warn">সতর্কতা</span>' : '<span class="status-tag ok">ঠিক আছে</span>';
    return `${tag}${msgs ? tipI(msgs) : ""}`; };
  box.innerHTML = `<table class="bgrid"><thead><tr><th>#</th><th>যাচাই</th>${grid.cols.map((c, j) => `<th><button class="sortb" data-act="gridSort" data-j="${j}" title="${esc(c)}">${esc(COL_BN[c] || c)}${grid.sort === j ? (grid.dir > 0 ? " ▲" : " ▼") : ""}</button></th>`).join("")}<th></th></tr></thead>
    <tbody>${idx.map(i => `<tr><td class="muted">${toBn(i + 1)}</td><td class="stc">${st(res.get(i))}</td>${grid.cols.map((c, j) => `<td><input class="cell" lang="bn" data-r="${i}" data-c="${j}" value="${esc(grid.rows[i][j])}" aria-label="${esc((COL_BN[c] || c) + " " + (i + 1))}"></td>`).join("")}<td><button class="x" style="position:static" data-act="gridDel" data-r="${i}" aria-label="সারি ${toBn(i + 1)} মুছুন">×</button></td></tr>`).join("")}</tbody></table>
    ${!grid.rows.length ? `<p class="hint">কোনো সারি নেই। “নমুনা দেখান” চাপুন, ফাইল খুলুন, বা “+ সারি” দিয়ে লিখুন।</p>` : ""}`;
}
function setBulkView(v) {
  if (v === "table") gridFromText(); else $("#bulk-text").value = grid.json ? $("#bulk-text").value : toCSV();
  grid.view = v; $("#bulk-grid-wrap").hidden = v !== "table"; $("#bulk-text").hidden = v !== "text";
  $("#bv-table").setAttribute("aria-pressed", String(v === "table")); $("#bv-text").setAttribute("aria-pressed", String(v === "text"));
  renderGrid();
}
function bulkEdited() { if (bulk.results.length) { bulk.results = []; $("#bulk-run").disabled = true; $("#bulk-summary").textContent = "সারি বদলেছে; আবার যাচাই করুন।"; } }
document.addEventListener("input", e => {
  const t = e.target;
  if (t.classList?.contains("cell")) { grid.rows[+t.dataset.r][+t.dataset.c] = t.value; syncText(); bulkEdited(); }
  else if (t.id === "bulk-q") { grid.q = t.value; renderGrid(); }
  else if (t.id === "bulk-text") bulkEdited();
});
Object.assign(ACTS, {
  gridSort: ds => { const j = +ds.j; if (grid.sort === j) grid.dir = -grid.dir; else { grid.sort = j; grid.dir = 1; } renderGrid(); },
  gridDel: ds => { grid.rows.splice(+ds.r, 1); $("#bulk-text").value = toCSV(); bulkEdited(); renderGrid(); },
  gridAdd: () => { if (grid.json) return; if (!grid.cols.length) gridFromText(); grid.rows.push(grid.cols.map(c => (c === "lang_code" ? "bn" : c === "language" ? "Q9610" : ""))); grid.q = ""; $("#bulk-q").value = ""; $("#bulk-text").value = toCSV(); renderGrid(); const last = $$("#bulk-grid tbody tr").pop(); last?.querySelector("input")?.focus(); },
});
$("#bv-table").addEventListener("click", () => setBulkView("table"));
$("#bv-text").addEventListener("click", () => setBulkView("text"));
$("#bulk-sample").addEventListener("click", () => { $("#bulk-text").value = SAMPLE_CSV; bulkEdited(); setBulkView(grid.view); });
$("#bulk-csv-dl").addEventListener("click", () => download("lexemes.csv", "\uFEFF" + (grid.json ? $("#bulk-text").value : toCSV()), grid.json ? "application/json" : "text/csv"));

async function bulkValidate() {
  const sum = $("#bulk-summary");
  if (grid.view === "table" && !grid.json) $("#bulk-text").value = toCSV();
  try { bulk.drafts = loadBulkText($("#bulk-text").value); } catch (e) { sum.innerHTML = `<div class="msg err">ইনপুট পড়া যায়নি: ${esc(e.message)}</div>`; return; }
  if (!bulk.drafts.length) { sum.textContent = "কোনো সারি পাওয়া যায়নি। প্রথম লাইনে কলামের নাম আছে কি না দেখুন।"; return; }
  sum.textContent = `${toBn(bulk.drafts.length)}টি সারি যাচাই হচ্ছে…`;
  try { await ensureProps([...new Set(bulk.drafts.flatMap(d => [d, ...d.forms, ...d.senses].flatMap(h => h.claims.flatMap(c => [c.prop, ...c.quals.map(q => q.prop)]))))]); } catch (e) {}
  const seen = new Map();
  bulk.results = bulk.drafts.map((d, i) => {
    const plan = buildPlan(d), v = validate(d, plan);
    v.warnings = v.warnings.filter(w => !w.startsWith("এখনো কিছু বদলানো"));
    const key = `${d.lemma}|${d.language}|${d.category}`;
    if (!d.existingId && seen.has(key)) v.warnings.push(`${toBn(seen.get(key) + 1)} নম্বর সারির সঙ্গে শব্দ, ভাষা ও শ্রেণি একই।`); seen.set(key, i);
    return { plan, ...v, status: "" };
  });
  if ($("#bulk-dupes").checked) {
    for (let i = 0; i < bulk.drafts.length; i++) {
      const d = bulk.drafts[i]; if (d.existingId || !d.lemma) continue;
      sum.textContent = `উইকি উপাত্তে আগের লেক্সিম খোঁজা হচ্ছে (${toBn(i + 1)}/${toBn(bulk.drafts.length)})…`;
      try {
        const fh = await findFormHits(d.lemma, d.language, d.langCode || "bn").catch(() => []);
        fh.forEach(h => bulk.results[i].errors.push(`“${d.lemma}” ইতিমধ্যে ${h.lexeme} (${h.lemma})-এর রূপ ${h.form}। নতুন লেক্সিম না বানিয়ে সেখানে যোগ করুন।`));
        const j = await api(CFG.wd, { action: "wbsearchentities", type: "lexeme", search: d.lemma, language: "bn", uselang: "en", limit: 10 });
        const exact = j.search.filter(r => nfc(r.label) === d.lemma).map(r => r.id);
        if (exact.length) {
          const f = await api(CFG.wd, { action: "wbgetentities", ids: exact.join("|") });
          const hit = Object.values(f.entities).find(e => e.language === d.language && e.lexicalCategory === d.category);
          if (hit) bulk.results[i].warnings.push(`${hit.id} হিসেবে আগে থেকেই আছে। এতে যোগ করতে existing_id দিন, নয়তো সারিটি বাদ দিন।`);
        }
      } catch (e) { bulk.results[i].warnings.push("উইকি উপাত্তে যাচাই করা যায়নি: " + e.message); }
      await sleep(150);
    }
  }
  const bad = bulk.results.filter(r => r.errors.length).length, warn = bulk.results.filter(r => !r.errors.length && r.warnings.length).length, ok = bulk.results.length - bad;
  const delay = +$("#bulk-delay").value || 4000; const edits = bulk.results.filter(r => !r.errors.length).reduce((a, r) => a + 1 + r.plan.phase2.length, 0);
  sum.innerHTML = `${toBn(bulk.results.length)}টির মধ্যে ${toBn(ok)}টি সারি সংরক্ষণ করা যাবে (${toBn(warn)}টিতে সতর্কবার্তা, ${toBn(bad)}টি ত্রুটির জন্য আটকে)। মোট ${toBn(edits)}টি সম্পাদনা, বর্তমান বিরতিতে প্রায় ${toBn(Math.ceil(edits * delay / 60000))} মিনিট।${bulk.results.length > CFG.limits.batchWarn ? ` <span class="status-tag warn">বড় ব্যাচ: আগে বট ফ্ল্যাগের আবেদন করার কথা ভাবুন।</span>` : ""}`;
  drawBulkTable();
  $("#bulk-run").disabled = !auth.user || ok === 0; $("#bulk-run").title = auth.user ? "" : "চালাতে লগ ইন করুন";
  $("#bulk-export").disabled = false;
}
function drawBulkTable() { renderGrid(); }
$("#bulk-validate").addEventListener("click", bulkValidate);
$("#bulk-export").addEventListener("click", () => download("lexeme-plans.json", JSON.stringify(bulk.results.filter(r => !r.errors.length).map(r => r.plan), null, 2)));
$("#bulk-stop").addEventListener("click", () => { bulk.stop = true; });
$("#bulk-run").addEventListener("click", async () => {
  const logBox = $("#bulk-log"); logBox.innerHTML = ""; const log = m => { logBox.insertAdjacentHTML("beforeend", `<div>${esc(new Date().toLocaleTimeString())}  ${esc(m)}</div>`); logBox.scrollTop = 1e9; };
  bulk.stop = false; $("#bulk-run").disabled = true; $("#bulk-stop").disabled = false; $("#bulk-validate").disabled = true;
  const delay = Math.max(1000, +$("#bulk-delay").value || 4000);
  for (let i = 0; i < bulk.results.length; i++) {
    const r = bulk.results[i]; if (r.errors.length || r.status.includes("সংরক্ষিত")) continue;
    if (bulk.stop) { log("আপনি থামিয়েছেন। বাকি সারিগুলোর জন্য আবার যাচাই করে চালান।"); break; }
    try { const res = await submitPlan(r.plan, `${SUMMARY_PREFIX}ব্যাচ, “${r.plan.lemma}”`, m => log(`#${i + 1} ${m}`)); r.status = `<a href="https://www.wikidata.org/wiki/Lexeme:${res.id}" target="_blank" rel="noopener">${res.id} সংরক্ষিত</a>`; }
    catch (e) { r.status = `<span class="status-tag err">ব্যর্থ</span> ${esc(e.message)}`; log(`#${i + 1} ব্যর্থ: ${e.message}`); }
    drawBulkTable(); await sleep(delay);
  }
  log("ব্যাচ শেষ।"); $("#bulk-stop").disabled = true; $("#bulk-validate").disabled = false; $("#bulk-run").disabled = !auth.user;
});

/* ---------------- start ---------------- */
async function loadDatatypes() {
  try { const j = await api(CFG.wd, { action: "wbgetentities", ids: [...new Set(Object.values(P))].join("|"), props: "datatype|labels", languages: "bn|en" });
    for (const [id, e] of Object.entries(j.entities)) { if (e.datatype) DT[id] = e.datatype; if (e.labels?.en) PLABEL[id] = e.labels.en.value; if (e.labels?.bn) WDBN[id] = e.labels.bn.value; }
    dtSource = "উইকি উপাত্ত থেকে সরাসরি লোড করা";
  } catch (e) { dtSource = "টুলের নিজস্ব তালিকা (উইকি উপাত্তে পৌঁছানো যায়নি)"; }
  renderAll(); loadSuggestions();
}
renderAll();
finishOAuth().finally(() => { refreshUser(); loadDatatypes(); resolveLanguages(); });

