"use strict";
(function () {
// Reader / dictionary endpoints: search, word detail, home sections, serial browsing, deep etymology.
const CFG = (typeof require === "function" ? require("./config") : LX.config);
const W = (typeof require === "function" ? require("./wikidata") : LX.wd);
const IX = (typeof require === "function" ? require("./lexindex") : LX.index);
// A list row from an index entry.
const ixRow = (r, lang) => ({ id: r.id, lemma: r.lemma, language: lang, category: r.category, gloss: r.gloss });

const P = { derivedFrom: "P5191", derivMode: "P5886", combines: "P5238", ordinal: "P1545" };
const lit = s => JSON.stringify(String(s)); // safe SPARQL string literal
const qid = s => (/^Q\d+$/.test(s) ? s : "Q9610");
const catQ = key => CFG.categories.find(c => c.key === key)?.qid;

/* ---------- languages (resolve missing QIDs like the wizard does) ---------- */
let langsReady = null;
function languages() {
  langsReady = langsReady || Promise.all(CFG.languages.map(async l => {
    if (l.qid) return;
    try { const j = await W.api({ action: "query", list: "search", srsearch: `haswbstatement:P220=${l.iso3}`, srnamespace: "0", srlimit: "1" }); const t = j.query.search[0]?.title; if (/^Q\d+$/.test(t || "")) l.qid = t; } catch (e) { langsReady = null; }
  })).then(() => CFG.languages);
  return langsReady;
}
async function config() { return { languages: await languages(), categories: CFG.categories, plabelBn: CFG.plabelBn }; }

/* ---------- summaries used by lists ---------- */
function summary(e) {
  return { id: e.id, lemma: W.lemmaOf(e), language: e.language, category: e.lexicalCategory, gloss: W.firstVal(e.senses?.[0]?.glosses), senses: (e.senses || []).length, forms: (e.forms || []).length };
}
async function summaries(ids) {
  const ents = await W.getEntities(ids);
  const list = ids.map(id => ents[id]).filter(Boolean).map(summary);
  const labels = await W.labelsFor(list.map(s => [s.language, s.category]));
  return { list, labels };
}

/* ---------- search ----------
   q:        relevance text (Wikidata's search index: lemmas, forms, full text)
   exact / starts / ends / contains: one text each (advanced search); every filled one must match (AND),
             e.g. starts=ক&ends=র → words that start with ক and end with র
   field:    comma list of lemma | gloss — where the patterns are tested (both when empty)
   lang:     a language QID, or "all"
   how:      old links (?how=starts,ends&q=X) — the q text is used for each listed pattern       */
const HOW = { exact: (s, q) => s === q, starts: (s, q) => s.startsWith(q), ends: (s, q) => s.endsWith(q), contains: (s, q) => s.includes(q) };
const sparqlCond = (how, v, q) => ({ exact: `STR(${v}) = ${lit(q)}`, starts: `STRSTARTS(STR(${v}), ${lit(q)})`, ends: `STRENDS(STR(${v}), ${lit(q)})`, contains: `CONTAINS(STR(${v}), ${lit(q)})` })[how];
const allCond = (conds, v) => conds.map(([h, x]) => sparqlCond(h, v, x)).join(" && ");
const allHow = (conds, s) => conds.every(([h, x]) => HOW[h](s, x));

// Relevance search: Wikidata's lemma/form index (forms come back as "alias"), plus definitions.
// In one language the definitions are matched by SPARQL (fast and language-filtered); for all languages
// Wikidata's full-text index is used (it cannot filter by language).
async function indexSearch(q, inLemma, inGloss, lang = "all") {
  const hits = new Map(); // id → matched form text (if the match was a form)
  const jobs = [];
  if (inLemma) jobs.push(W.api({ action: "wbsearchentities", type: "lexeme", search: q, language: "bn", uselang: "bn", limit: "50", strictlanguage: "0" })
    .then(j => (j.search || []).forEach(r => hits.set(r.id, r.match?.type === "alias" ? r.match.text : hits.get(r.id) || ""))));
  if (inGloss || !inLemma) {
    if (lang !== "all") jobs.push(W.sparql(`SELECT DISTINCT ?l WHERE { ?l dct:language wd:${qid(lang)} ; ontolex:sense/skos:definition ?d . FILTER(CONTAINS(LCASE(STR(?d)), ${lit(q.toLowerCase())})) } LIMIT 50`, 10 * 60e3)
      .then(rows => rows.forEach(r => { const id = W.idOf(r.l); if (!hits.has(id)) hits.set(id, ""); })).catch(() => {}));
    else jobs.push(W.api({ action: "query", list: "search", srnamespace: "146", srsearch: q, srlimit: "50" })
      .then(f => (f.query?.search || []).forEach(r => { const id = r.title.replace(/^Lexeme:/, ""); if (!hits.has(id)) hits.set(id, ""); })));
  }
  await Promise.all(jobs);
  return hits;
}
// Rows for result lists: lemma, language, category and definitions of many lexemes in one query.
async function listRows(ids) {
  if (!ids.length) return [];
  const rows = await W.sparql(`SELECT ?l (GROUP_CONCAT(DISTINCT ?lm; separator=" / ") AS ?lemma) (SAMPLE(?lang) AS ?lg) (SAMPLE(?cat) AS ?c)
      (GROUP_CONCAT(DISTINCT CONCAT(LANG(?d), "¦", STR(?d)); separator="‖") AS ?ds) WHERE {
    VALUES ?l { ${ids.map(i => "wd:" + i).join(" ")} }
    ?l wikibase:lemma ?lm ; dct:language ?lang ; wikibase:lexicalCategory ?cat .
    OPTIONAL { ?l ontolex:sense/skos:definition ?d }
  } GROUP BY ?l`, 10 * 60e3);
  return rows.map(r => {
    const defs = (r.ds || "").split("‖").filter(Boolean).map(x => x.split("¦"));
    const pick = defs.find(d => d[0] === "bn") || defs.find(d => d[0] === "en") || defs[0];
    return { id: W.idOf(r.l), lemma: r.lemma, language: W.idOf(r.lg), category: W.idOf(r.c), gloss: pick ? pick[1] : "", _g: defs.map(d => d[1]) };
  });
}
function indexSearchLocal(ix, q, conds, inLemma, inGloss, limit) {
  const lang = ix.lang, ql = q.toLowerCase(), out = [];
  const okLemma = r => !conds.length || r.lemmas.some(l => allHow(conds, l));
  const okGloss = r => conds.length ? r.defs.some(d => allHow(conds, d)) : false;
  // Inflected forms that equal the query (e.g. মাকে → মা).
  const formHit = new Map();
  if (q && inLemma) for (const fid of ix.forms.get(q) || []) { const lid = fid.split("-")[0]; if (!formHit.has(lid)) formHit.set(lid, fid); }
  for (const r of ix.list) {
    let rank = -1, inG = false, form = "", formId = "";
    if (q) {
      const lem = r.lemmas;
      if (inLemma && lem.includes(q)) rank = 0;
      else if (inLemma && formHit.has(r.id)) { rank = 1; form = q; formId = formHit.get(r.id); }
      else if (inLemma && lem.some(l => l.startsWith(q))) rank = 2;
      else if (inLemma && lem.some(l => l.includes(q))) rank = 3;
      else if (inGloss && r.defs.some(d => d.toLowerCase().includes(ql))) { rank = 4; inG = true; }
      if (rank < 0) continue;
      if (conds.length && !((inLemma && okLemma(r)) || (inGloss && okGloss(r)))) continue;
    } else {
      if (inLemma && okLemma(r)) rank = 0;
      else if (inGloss && okGloss(r)) { rank = 1; inG = true; }
      else continue;
    }
    out.push({ ...ixRow(r, lang), form, formId, inGloss: inG, _rank: rank, _pos: r.pos });
  }
  out.sort((a, b) => a._rank - b._rank || a._pos - b._pos);
  return { list: out.slice(0, limit).map(({ _rank, _pos, ...s }) => s), labels: ix.labels, total: out.length };
}
async function search(o = {}) {
  let { q = "", lang = "Q9610", how = "", field = "", mode = "", limit = 50 } = o;
  q = String(q).trim();
  let conds = Object.keys(HOW).map(h => [h, String(o[h] || "").trim()]).filter(([, x]) => x);
  const oldHows = String(how).split(",").filter(h => HOW[h]);
  if (!conds.length && oldHows.length && q) { conds = oldHows.map(h => [h, q]); q = ""; }
  if (!q && !conds.length) return { list: [], labels: {} };
  let fields = String(field || mode).split(",").filter(f => f === "lemma" || f === "gloss"); // ?mode= = old links
  if (!fields.length) fields = ["lemma", "gloss"];
  const inLemma = fields.includes("lemma"), inGloss = fields.includes("gloss");
  limit = Math.min(+limit || 50, 200);
  // One language with the local index ready: everything is answered in memory (milliseconds).
  const ix = lang !== "all" && IX.get(qid(lang));
  if (ix) return indexSearchLocal(ix, q, conds, inLemma, inGloss, limit);
  return W.cached(`search:${q}:${JSON.stringify(conds)}:${lang}:${fields}:${limit}`, 5 * 60e3, async () => {
    // Patterns only, one language: straight SPARQL over lemmas and/or definitions (fast, exhaustive).
    if (conds.length && !q && lang !== "all") {
      const L = qid(lang);
      // Lemma and definition matches run as two parallel queries (one UNION query is far slower on WDQS).
      const one = (where, src) => W.sparql(`SELECT ?l ?lemma (SAMPLE(?cat) AS ?c) (SAMPLE(?g) AS ?gloss) WHERE { ${where}
        ?l wikibase:lexicalCategory ?cat . OPTIONAL { ?l ontolex:sense/skos:definition ?g . FILTER(LANG(?g) IN ("bn","en")) } } GROUP BY ?l ?lemma ORDER BY STR(?lemma) LIMIT ${limit}`, 10 * 60e3)
        .then(rows => rows.map(r => ({ id: W.idOf(r.l), lemma: r.lemma, language: L, category: W.idOf(r.c), gloss: r.gloss || "", inGloss: src === 2 })));
      const [a, b] = await Promise.all([
        inLemma ? one(`?l dct:language wd:${L} ; wikibase:lemma ?lemma . FILTER(${allCond(conds, "?lemma")})`, 1) : [],
        inGloss ? one(`?l dct:language wd:${L} ; wikibase:lemma ?lemma ; ontolex:sense/skos:definition ?d . FILTER(${allCond(conds, "?d")})`, 2) : [],
      ]);
      const seen = new Set(a.map(x => x.id));
      const list = a.concat(b.filter(x => !seen.has(x.id))).slice(0, limit);
      return { list, labels: await W.labelsFor(list.map(s => s.category).concat(L)) };
    }
    // Relevance (or all languages): Wikidata's search index, then keep only rows that satisfy every pattern.
    const probe = q || (conds.find(c => c[0] === "exact") || conds.find(c => c[0] === "starts") || conds.find(c => c[0] === "contains") || conds[0])[1];
    const hits = await indexSearch(probe, inLemma, inGloss, lang);
    // One light SPARQL query for the rows (lemma, language, category, definitions) instead of
    // downloading every full lexeme; full data only for the few hits that matched an inflected form.
    const ids = [...hits.keys()].filter(i => /^L\d+$/.test(i));
    const formIds = ids.filter(i => hits.get(i));
    const [rows, formEnts] = await Promise.all([listRows(ids), W.getEntities(formIds)]);
    let list = rows.map(s => {
      const text = hits.get(s.id) || ""; const e = formEnts[s.id];
      return { ...s, form: text, formId: text && e ? (e.forms || []).find(f => Object.values(f.representations).some(r => r.value === text))?.id || "" : "" };
    });
    if (lang !== "all") list = list.filter(s => s.language === lang);
    // Relevance: rows found only through their definition get the "সংজ্ঞায় মিল" tag and sort after word matches.
    if (!conds.length) list.forEach(s => { s.inGloss = !s.form && !s.lemma.includes(probe); });
    if (conds.length) list = list.filter(s => {
      const lemmaHit = inLemma && (allHow(conds, s.lemma) || (s.form && allHow(conds, s.form)));
      s.inGloss = !lemmaHit && inGloss && s._g.some(g => allHow(conds, g));
      return lemmaHit || s.inGloss;
    });
    const rank = s => (s.lemma === probe ? 0 : s.form === probe ? 1 : s.inGloss ? 4 : s.lemma.startsWith(probe) ? 2 : 3);
    list.sort((a, b) => rank(a) - rank(b) || a.lemma.localeCompare(b.lemma, "bn"));
    list = list.slice(0, limit).map(({ _g, ...s }) => s);
    return { list, labels: await W.labelsFor(list.map(s => [s.language, s.category])) };
  });
}
/* ---------- word detail (fast path: the lexeme and its labels only) ---------- */
async function word(id, { fresh } = {}) {
  if (!/^L\d+$/.test(id)) throw Object.assign(new Error("bad id"), { status: 400 });
  if (fresh) W.forget(id);
  const e = await W.getLexeme(id);
  if (!e) throw Object.assign(new Error("লেক্সিমটি পাওয়া যায়নি"), { status: 404 });
  if (fresh) IX.patch(e); // keep the local index current after an edit
  return { entity: e, labels: await W.labelsFor(e) };
}
// Same spelling: other categories in the same language (shown as tabs) and the same word in other languages.
async function sameLemma(id) {
  const e = await W.getLexeme(id); if (!e) return { tabs: [], otherLangs: [], labels: {} };
  const lemma = Object.values(e.lemmas)[0]?.value || "";
  const j = await W.api({ action: "wbsearchentities", type: "lexeme", search: lemma, language: "bn", limit: "50", strictlanguage: "0" });
  const ids = (j.search || []).filter(r => r.label === lemma || r.match?.text === lemma).map(r => r.id);
  const ents = await W.getEntities([...new Set([id, ...ids])]);
  const same = Object.values(ents).filter(x => Object.values(x.lemmas).some(l => l.value === lemma)).map(summary);
  const tabs = same.filter(s => s.language === e.language).sort((a, b) => (a.id === id ? -1 : b.id === id ? 1 : 0));
  const otherLangs = same.filter(s => s.language !== e.language);
  return { tabs, otherLangs, labels: await W.labelsFor(same.map(s => [s.language, s.category])) };
}
// Lexemes built from this one (compounds and derivations), recursively, as a tree.
async function descendants(id, { depth = 3, max = 150 } = {}) {
  if (!/^L\d+$/.test(id)) throw Object.assign(new Error("bad id"), { status: 400 });
  depth = Math.min(+depth || 3, 5);
  const nodes = {}, edges = [];
  let frontier = [id];
  for (let lv = 0; lv < depth && frontier.length && Object.keys(nodes).length < max; lv++) {
    const rows = await W.sparql(`SELECT ?t ?l ?lemma ?p ?lang WHERE { VALUES ?t { ${frontier.slice(0, 60).map(x => "wd:" + x).join(" ")} } VALUES ?p { wdt:${P.derivedFrom} wdt:${P.combines} }
      ?l ?p ?t ; wikibase:lemma ?lemma ; dct:language ?lang } LIMIT 400`, 10 * 60e3).catch(() => []);
    const next = [];
    for (const r of rows) {
      const lid = W.idOf(r.l), from = W.idOf(r.t);
      edges.push({ from, to: lid, kind: r.p.endsWith(P.derivedFrom) ? "derived" : "compound" });
      if (!nodes[lid] && lid !== id && Object.keys(nodes).length < max) { nodes[lid] = { id: lid, lemma: r.lemma, language: W.idOf(r.lang), level: lv + 1 }; next.push(lid); }
    }
    frontier = next;
  }
  return { id, nodes, edges, labels: await W.labelsFor(Object.values(nodes).map(n => n.language)), truncated: Object.keys(nodes).length >= max };
}

/* ---------- serial order (alphabetical by lemma) ---------- */
const letterFilter = letter => (letter ? `FILTER(STRSTARTS(STR(?lemma), ${lit(letter)}))` : "");
// Previous/next word in alphabetical order (slow on WDQS, so the word page asks for it separately).
async function neighborsOf(id) {
  for (const lang of CFG.languages.map(l => l.qid).filter(Boolean)) {
    const ix = IX.peek(lang), r = ix && ix.byId.get(id);
    if (r) { const m = x => (x ? { id: x.id, lemma: x.lemma } : null); return { prev: m(ix.list[r.pos - 1]), next: m(ix.list[r.pos + 1]) }; }
  }
  const e = await W.getLexeme(id); if (!e) return {};
  return neighbors(id, Object.values(e.lemmas)[0]?.value || "", e.language);
}
async function neighbors(id, lemma, lang) {
  const base = `?l dct:language wd:${qid(lang)} ; wikibase:lemma ?lemma .`;
  const [prev, next] = await Promise.all([
    W.sparql(`SELECT ?l ?lemma WHERE { ${base} FILTER(STR(?lemma) < ${lit(lemma)}) } ORDER BY DESC(STR(?lemma)) LIMIT 1`, 60 * 60e3),
    W.sparql(`SELECT ?l ?lemma WHERE { ${base} FILTER(STR(?lemma) > ${lit(lemma)}) } ORDER BY STR(?lemma) LIMIT 1`, 60 * 60e3),
  ]);
  const m = r => (r[0] ? { id: W.idOf(r[0].l), lemma: r[0].lemma } : null);
  return { prev: m(prev), next: m(next) };
}
async function browse({ lang = "Q9610", page = 1, size = 40, letter = "", cat = "" }) {
  lang = qid(lang); size = Math.min(Math.max(+size || 40, 10), 100); page = Math.max(+page || 1, 1);
  const cq = catQ(cat);
  const ix = IX.get(lang);
  if (ix) {
    const all = ix.list.filter(r => (!cq || r.category === cq) && (!letter || r.lemmas.some(l => l.startsWith(letter))));
    return { page, size, total: all.length, pages: Math.max(1, Math.ceil(all.length / size)), list: all.slice((page - 1) * size, page * size).map(r => ixRow(r, lang)), labels: ix.labels };
  }
  const where = `?l dct:language wd:${lang} ; wikibase:lemma ?lemma ${cq ? `; wikibase:lexicalCategory wd:${cq}` : ""} . ${letterFilter(letter)}`;
  const [count, rows] = await Promise.all([
    W.sparql(`SELECT (COUNT(?l) AS ?n) WHERE { ${where} }`, 6 * 60 * 60e3),
    W.sparql(`SELECT ?l ?lemma WHERE { ${where} } ORDER BY STR(?lemma) LIMIT ${size} OFFSET ${(page - 1) * size}`, 60 * 60e3),
  ]);
  const total = +(count[0]?.n || 0);
  const { list, labels } = await summaries(rows.map(r => W.idOf(r.l)));
  return { page, size, total, pages: Math.max(1, Math.ceil(total / size)), list, labels };
}
// Index entry → the summary shape the home page word box uses.
const ixWord = (r, lang) => ({ ...ixRow(r, lang), glosses: (r.bn.length ? r.bn : r.en).slice(0, 4), senses: r.bn.length || r.en.length, forms: r.forms.length });
async function random(lang = "Q9610") {
  const ix = IX.get(qid(lang));
  if (ix && ix.list.length) { const r = ix.list[Math.floor(Math.random() * ix.list.length)]; return { id: r.id, word: ixWord(r, ix.lang), labels: ix.labels }; }
  const n = +((await W.sparql(`SELECT (COUNT(?l) AS ?n) WHERE { ?l dct:language wd:${qid(lang)} }`, 6 * 60 * 60e3))[0]?.n || 0);
  const r = await W.sparql(`SELECT ?l WHERE { ?l dct:language wd:${qid(lang)} } LIMIT 1 OFFSET ${Math.floor(Math.random() * Math.max(n, 1))}`, 1);
  const id = W.idOf(r[0]?.l); const e = id && (await W.getLexeme(id));
  if (!e) return { id };
  // Full summary so the home page can swap its word box in place.
  const s = { ...summary(e), glosses: (e.senses || []).map(x => W.firstVal(x.glosses)).filter(Boolean).slice(0, 4) };
  return { id, word: s, labels: await W.labelsFor([s.language, s.category]) };
}

/* ---------- home: word of the day, idioms, proverbs ---------- */
const dayKey = () => new Date().toISOString().slice(0, 10);
function seeded(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }
function pick(arr, n, seed) { const r = seeded(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }

async function catList(lang, cq) {
  const ix = IX.get(lang);
  if (ix) return ix.list.filter(r => r.category === cq).map(r => ({ id: r.id, lemma: r.lemma, gloss: r.gloss }));
  // Match the lexical category or "instance of" (P31) the same item.
  const rows = await W.sparql(`SELECT ?l ?lemma (SAMPLE(?g) AS ?gloss) WHERE { ?l dct:language wd:${lang} ; wikibase:lemma ?lemma . { ?l wikibase:lexicalCategory wd:${cq} } UNION { ?l wdt:P31 wd:${cq} }
    OPTIONAL { ?l ontolex:sense/skos:definition ?g . FILTER(LANG(?g) IN ("bn","en")) } } GROUP BY ?l ?lemma LIMIT 2000`, 6 * 60 * 60e3);
  return rows.map(r => ({ id: W.idOf(r.l), lemma: r.lemma, gloss: r.gloss || "" }));
}
// Idioms: Bengali idiomatic expressions are often filed as verbal locutions or phrases instead of "idiom".
const IDIOM_FALLBACK = ["Q10976085", "Q187931"];
async function idiomList(lang) {
  const own = await catList(lang, catQ("idiom")).catch(() => []);
  if (own.length) return own;
  const lists = await Promise.all(IDIOM_FALLBACK.map(q => catList(lang, q).catch(() => [])));
  const seen = new Set(); return lists.flat().filter(x => !seen.has(x.id) && seen.add(x.id));
}
async function home({ lang = "Q9610" }) {
  lang = qid(lang);
  const ix = IX.get(lang);
  if (ix) {
    const [idioms, proverbs] = await Promise.all([idiomList(lang), catList(lang, catQ("proverb"))]);
    const glossed = ix.list.filter(r => r.bn.length);
    const w = glossed.length ? glossed[Math.floor(seeded(dayKey() + lang)() * glossed.length)] : null;
    return { date: dayKey(), total: ix.list.length, glossed: glossed.length, wotd: w && ixWord(w, lang), labels: ix.labels,
      idioms: pick(idioms, 12, "i" + dayKey()), idiomCount: idioms.length, proverbs: pick(proverbs, 10, "p" + dayKey()), proverbCount: proverbs.length };
  }
  return W.cached(`home:${lang}:${dayKey()}`, 60 * 60e3, async () => {
    const [idioms, proverbs, glossed, total] = await Promise.all([
      idiomList(lang),
      catList(lang, catQ("proverb")).catch(() => []),
      W.sparql(`SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:${lang} ; ontolex:sense/skos:definition ?g . FILTER(LANG(?g) = "bn") }`, 6 * 60 * 60e3).catch(() => []),
      W.sparql(`SELECT (COUNT(?l) AS ?n) WHERE { ?l dct:language wd:${lang} }`, 6 * 60 * 60e3).catch(() => []),
    ]);
    // Word of the day: a lexeme with a Bengali gloss, chosen deterministically from the date.
    let wotd = null;
    const n = +(glossed[0]?.n || 0);
    if (n) {
      const off = Math.floor(seeded(dayKey() + lang)() * n);
      const r = await W.sparql(`SELECT DISTINCT ?l WHERE { ?l dct:language wd:${lang} ; ontolex:sense/skos:definition ?g . FILTER(LANG(?g) = "bn") } LIMIT 1 OFFSET ${off}`, 24 * 60 * 60e3).catch(() => []);
      const wid = W.idOf(r[0]?.l);
      if (wid) { const e = await W.getLexeme(wid); if (e) wotd = { ...summary(e), glosses: (e.senses || []).map(s => W.firstVal(s.glosses)).filter(Boolean).slice(0, 4) }; }
    }
    const labels = await W.labelsFor(wotd ? [wotd.language, wotd.category] : []);
    return {
      date: dayKey(), total: +(total[0]?.n || 0), glossed: n, wotd, labels,
      idioms: pick(idioms, 12, "i" + dayKey()), idiomCount: idioms.length,
      proverbs: pick(proverbs, 10, "p" + dayKey()), proverbCount: proverbs.length,
    };
  });
}
async function collection({ lang = "Q9610", cat = "idiom", page = 1, size = 30 }) {
  const cq = catQ(cat); if (!cq) throw Object.assign(new Error("bad category"), { status: 400 });
  const all = (await (cat === "idiom" ? idiomList(qid(lang)) : catList(qid(lang), cq))).sort((a, b) => a.lemma.localeCompare(b.lemma, "bn"));
  page = Math.max(+page || 1, 1); size = Math.min(+size || 30, 100);
  return { total: all.length, page, pages: Math.max(1, Math.ceil(all.length / size)), list: all.slice((page - 1) * size, page * size) };
}

/* ---------- deep etymology: ancestors across all languages + cognates ---------- */
async function etymology(id, { depth = 10, max = 80 } = {}) {
  if (!/^L\d+$/.test(id)) throw Object.assign(new Error("bad id"), { status: 400 });
  depth = Math.min(+depth || 10, 15);
  const nodes = {}, edges = [];
  let frontier = [{ id, level: 0 }];
  while (frontier.length && Object.keys(nodes).length < max) {
    const ents = await W.getEntities(frontier.map(f => f.id));
    const next = [];
    for (const { id: nid, level } of frontier) {
      const e = ents[nid]; if (!e || nodes[nid]) continue;
      nodes[nid] = { ...summary(e), level, glosses: (e.senses || []).map(s => W.firstVal(s.glosses)).filter(Boolean).slice(0, 3) };
      if (level >= depth) continue;
      for (const c of e.claims?.[P.derivedFrom] || []) {
        const to = c.mainsnak.datavalue?.value?.id; if (!to) continue;
        const mode = c.qualifiers?.[P.derivMode]?.[0]?.datavalue?.value?.id || "";
        const refs = (c.references || []).map(r => r.snaks?.P248?.[0]?.datavalue?.value?.id).filter(Boolean);
        edges.push({ from: nid, to: to.split("-")[0], kind: "derived", mode, refs });
        next.push({ id: to.split("-")[0], level: level + 1 });
      }
      for (const c of e.claims?.[P.combines] || []) {
        const to = c.mainsnak.datavalue?.value?.id; if (!to) continue;
        edges.push({ from: nid, to: to.split("-")[0], kind: "part", ord: +(c.qualifiers?.[P.ordinal]?.[0]?.datavalue?.value || 0) });
        next.push({ id: to.split("-")[0], level: level + 1 });
      }
    }
    frontier = next.filter(n => !nodes[n.id]);
  }
  // Roots = ancestors with no further "derived from"; their other descendants are cognates.
  const hasParent = new Set(edges.filter(x => x.kind === "derived").map(x => x.from));
  const roots = Object.keys(nodes).filter(k => k !== id && !hasParent.has(k) && edges.some(x => x.to === k && x.kind === "derived"));
  let cognates = [];
  if (roots.length) {
    const rows = await W.sparql(`SELECT ?root ?l ?lemma ?lang WHERE { VALUES ?root { ${roots.slice(0, 10).map(r => "wd:" + r).join(" ")} }
      ?l wdt:${P.derivedFrom} ?root ; wikibase:lemma ?lemma ; dct:language ?lang } LIMIT 400`, 30 * 60e3).catch(() => []);
    cognates = rows.map(r => ({ root: W.idOf(r.root), id: W.idOf(r.l), lemma: r.lemma, language: W.idOf(r.lang) })).filter(c => !nodes[c.id]);
  }
  const labels = await W.labelsFor({ n: Object.values(nodes).map(n => [n.language, n.category]), e: edges.map(x => [x.mode, x.refs]), c: cognates.map(c => c.language) });
  return { id, nodes, edges, roots, cognates, labels, truncated: Object.keys(nodes).length >= max };
}

const __exp = { config, search, word, sameLemma, descendants, neighbors: neighborsOf, browse, random, home, collection, etymology, labels: ids => W.labelsFor(ids) };
if (typeof module !== "undefined" && module.exports) module.exports = __exp; else (window.LX = window.LX || {}).reader = __exp;
})();
