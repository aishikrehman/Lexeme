"use strict";
const P0 = params();
// Form to jump to comes from the hash (/lemma/L1472#L1472-F11); ?form= still works for old links.
const hashForm = (location.hash.match(/^#(L\d+-F\d+)$/) || [])[1];
if (hashForm) P0.form = hashForm;
let CUR = P0.id || (location.pathname.match(/L\d+/) || [""])[0];
let L = {}; // labels
let ENT;
let NB = {}; // previous / next word
const plab = p => SITE.plabelBn[p] || L[p]?.label || p;
const fileUrl = (name, w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}${w ? "?width=" + w : ""}`;
const val = (claims, p) => (claims?.[p] || []).filter(c => c.mainsnak.snaktype === "value").map(c => c.mainsnak.datavalue.value);
const firstText = o => { if (!o) return ""; const v = o.bn || o.en || Object.values(o)[0]; return v ? v.value : ""; };
const editUrl = id => `wizard.html?id=${id}&return=1`;

/* ---------- value formatting ---------- */
function entLink(id) {
  const l = L[id] || {};
  if (id.startsWith("L")) {
    const lid = id.split("-")[0];
    return `<a href="${wordUrl(lid)}">${esc(l.label || id)}</a>${l.gloss && id.includes("-S") ? ` <span class="muted">(${esc(l.gloss)})</span>` : ""}${l.language && l.language !== ENT.language ? " " + langBadge(l.language, L) : ""}`;
  }
  return `<a href="https://www.wikidata.org/wiki/${id.startsWith("P") ? "Property:" : ""}${id}" target="_blank" rel="noopener" title="${esc(l.desc || "")}">${esc(l.label || id)}</a>`;
}
function fmtTime(v) {
  const m = String(v.time).match(/^([+-]?\d+)-(\d\d)-(\d\d)/); if (!m) return esc(v.time);
  const y = +m[1]; return v.precision >= 11 ? toBn(`${+m[3]}/${+m[2]}/${y}`) : v.precision === 10 ? toBn(`${+m[2]}/${y}`) : y < 0 ? `খ্রিস্টপূর্ব ${toBn(-y)}` : toBn(y);
}
function fmtSnak(sn) {
  if (sn.snaktype === "novalue") return '<span class="muted">নেই</span>';
  if (sn.snaktype === "somevalue") return '<span class="muted">অজানা</span>';
  const dv = sn.datavalue, v = dv.value, dt = sn.datatype || L[sn.property]?.datatype;
  switch (dv.type) {
    case "wikibase-entityid": return entLink(v.id);
    case "monolingualtext": return `${esc(v.text)} <span class="en">[${esc(v.language)}]</span>`;
    case "time": return fmtTime(v);
    case "quantity": return toBn(String(v.amount).replace(/^\+/, ""));
    case "globecoordinate": return `${v.latitude}, ${v.longitude}`;
    case "string":
      if (dt === "commonsMedia") return `<a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(v)}" target="_blank" rel="noopener">${esc(v)}</a>`;
      if (dt === "url") return `<a href="${esc(v)}" target="_blank" rel="noopener nofollow">${esc(v)}</a>`;
      return esc(v);
    default: return esc(JSON.stringify(v));
  }
}
const quals = c => Object.values(c.qualifiers || {}).flat().map(q => `<span class="muted">${esc(plab(q.property))}:</span> ${fmtSnak(q)}`).join(" · ");
function kvList(claims, skip = []) {
  const rows = Object.entries(claims || {}).filter(([p]) => !skip.includes(p));
  if (!rows.length) return "";
  return `<dl class="kv">${rows.map(([p, cs]) => `<dt>${esc(plab(p))}</dt><dd>${cs.map(c => `<div>${fmtSnak(c.mainsnak)}${c.qualifiers ? ` <small>(${quals(c)})</small>` : ""}</div>`).join("")}</dd>`).join("")}</dl>`;
}
const section = (id, title, body) => body ? `<section id="${id}" class="card" style="margin-bottom:18px"><h2 style="margin:0 0 8px;font-size:19px">${title}</h2>${body}</section>` : "";
const sectionHead = (id, title) => `<section id="${id}" class="card" style="margin-bottom:18px"><h2 style="margin:0 0 8px;font-size:19px">${title}</h2>`;

/* ---------- sections ---------- */
function audioBtn(file) { return `<button class="play" data-audio="${esc(file)}" title="${esc(file)}">${ic("volume")} শুনুন</button>`; }
function pronunciation(e) {
  const ipa = [...new Set([...val(e.claims, "P898"), ...e.forms.flatMap(f => val(f.claims, "P898"))])].slice(0, 3);
  const audio = [...new Set([...val(e.claims, "P443"), ...(e.forms[0] ? val(e.forms[0].claims, "P443") : [])])].slice(0, 3);
  const hy = val(e.forms[0]?.claims, "P5279")[0];
  if (!ipa.length && !audio.length && !hy) return "";
  return `<div class="pron">${ipa.map(i => `<span>উচ্চারণ: <span class="ipa">/${esc(i)}/</span></span>`).join("")}${hy ? `<span>অক্ষরবিভাজন: ${esc(hy)}</span>` : ""}${audio.map(audioBtn).join("")}</div>`;
}
const SENSE_DONE = ["P5137", "P5973", "P5974", "P5972", "P18", "P6191", "P6084", "P5831", "P6593"];
// The concept (ধারণা, P5137) and the sense image sit in a box on the right of each sense.
function conceptBox(s, main) {
  const items = val(s.claims, "P5137").map(v => v.id), img = val(s.claims, "P18")[0];
  if (!items.length && !img) return "";
  return `<aside class="concept">${items.map(q => `<div class="k">ধারণা</div><a href="https://www.wikidata.org/wiki/${q}" target="_blank" rel="noopener">${esc(L[q]?.label || q)}</a>${L[q]?.desc ? `<div class="muted">${esc(L[q].desc)}</div>` : ""}`).join("")}
    ${img ? `<a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(img)}" target="_blank" rel="noopener"><img src="${fileUrl(img, 440)}" alt="${esc(main)}" loading="lazy"></a>` : ""}</aside>`;
}
function senses(e) {
  if (!e.senses.length) return `<p class="muted">এই শব্দের কোনো অর্থ এখনো যোগ করা হয়নি। <a href="${editUrl(e.id)}">অর্থ যোগ করুন</a></p>`;
  return e.senses.map((s, i) => {
    const g = s.glosses || {}; const main = g.bn?.value || firstText(g);
    const others = Object.values(g).filter(x => x.value !== main);
    const rel = (p, t) => { const cs = s.claims?.[p] || []; return cs.length ? `<div style="margin-top:6px"><span class="muted">${t}:</span> <span class="taglist" style="display:inline-flex">${cs.map(c => `<span>${fmtSnak(c.mainsnak)}</span>`).join("")}</span></div>` : ""; };
    const trans = (s.claims?.P5972 || []).map(c => c.mainsnak.datavalue?.value?.id).filter(Boolean);
    const byLang = {}; trans.forEach(t => { const lg = L[t]?.language || "?"; (byLang[lg] = byLang[lg] || []).push(t); });
    const cbox = conceptBox(s, main);
    return `<div class="sense${cbox ? " with-concept" : ""}" id="${s.id}"><div class="num">${toBn(i + 1)}</div><div>
      <div class="gl">${esc(main) || '<span class="muted">(সংজ্ঞা নেই)</span>'}</div>
      ${others.map(o => `<div class="gl-other">${esc(o.value)} <span class="en">[${esc(o.language)}]</span></div>`).join("")}
      ${rel("P6191", "রীতি")}${rel("P6084", "অঞ্চল")}${rel("P5973", "সমার্থক")}${rel("P5974", "বিপরীত")}${rel("P6593", "ঊর্ধ্বতন শব্দ")}
      ${trans.length ? `<div style="margin-top:6px"><span class="muted">অনুবাদ:</span> ${Object.entries(byLang).map(([lg, ts]) => `${langBadge(lg, L)} ${ts.map(t => `<a href="${wordUrl(t.split("-")[0])}">${esc(L[t]?.label || t)}</a>`).join(", ")}`).join(" &nbsp; ")}</div>` : ""}
      ${usageFor(e, s.id)}
      ${kvList(s.claims, SENSE_DONE)}
    </div>${cbox}</div>`;
  }).join("");
}
function exampleHtml(e, c) {
  const v = c.mainsnak.datavalue?.value; if (!v) return "";
  const formId = c.qualifiers?.P5830?.[0]?.datavalue?.value?.id;
  const form = e.forms.find(f => f.id === formId); const rep = form ? firstText(form.representations) : "";
  let text = esc(v.text); if (rep) text = text.split(esc(rep)).join(`<mark>${esc(rep)}</mark>`);
  const ref = (c.references || [])[0]?.snaks || {};
  const title = ref.P1476?.[0]?.datavalue?.value?.text, url = ref.P854?.[0]?.datavalue?.value, stated = ref.P248?.[0]?.datavalue?.value?.id;
  const src = [stated ? entLink(stated) : "", title ? esc(title) : "", url ? `<a href="${esc(url)}" target="_blank" rel="noopener nofollow">উৎস</a>` : ""].filter(Boolean).join(" · ");
  return `<blockquote class="ex">${text}${src ? `<span class="src">— ${src}</span>` : ""}</blockquote>`;
}
function usageFor(e, senseId) { return (e.claims.P5831 || []).filter(c => c.qualifiers?.P6072?.[0]?.datavalue?.value?.id === senseId).map(c => exampleHtml(e, c)).join(""); }
function usageUnattached(e) { return (e.claims.P5831 || []).filter(c => !c.qualifiers?.P6072).map(c => exampleHtml(e, c)).join(""); }

const hasEty = e => (e.claims.P5191 || []).length || (e.claims.P5238 || []).length;
function etymologySection(e) {
  if (!hasEty(e)) return `<p class="muted" style="margin:0">ব্যুৎপত্তি এখনো যোগ হয়নি। <a href="${editUrl(e.id)}">যোগ করুন</a></p>`;
  const lemma = esc(Object.values(e.lemmas)[0].value);
  const direct = (e.claims.P5191 || []).map(c => {
    const id = c.mainsnak.datavalue?.value?.id; const mode = c.qualifiers?.P5886?.[0]?.datavalue?.value?.id;
    const refs = (c.references || []).map(r => r.snaks?.P248?.[0]?.datavalue?.value?.id).filter(Boolean);
    return `<div class="ety-chain">${lemma} <span class="arr">← ${mode ? esc(L[mode]?.label || mode) : "উদ্ভূত"} ←</span> ${id ? entLink(id) : ""}${refs.length ? ` <small class="muted">(উৎস: ${refs.map(entLink).join(", ")})</small>` : ""}</div>`;
  }).join("");
  return direct + `<div id="ety-tree" style="margin-top:8px"><div class="skel" style="width:60%;height:28px"></div></div>`;
}
function compound(e) {
  const cs = (e.claims.P5238 || []).slice().sort((a, b) => +(a.qualifiers?.P1545?.[0]?.datavalue?.value || 0) - +(b.qualifiers?.P1545?.[0]?.datavalue?.value || 0));
  if (!cs.length) return "";
  return `<div class="ety-chain">${cs.map(c => fmtSnak(c.mainsnak)).join(' <span class="arr">+</span> ')} <span class="arr">=</span> <b>${esc(Object.values(e.lemmas)[0].value)}</b></div>`;
}
function forms(e) {
  if (!e.forms.length) return "";
  return `<div class="tbl forms"><table><thead><tr><th>রূপ</th><th>ব্যাকরণগত বৈশিষ্ট্য</th><th>উচ্চারণ</th><th></th></tr></thead><tbody>${e.forms.map(f => {
    const ipa = val(f.claims, "P898")[0], au = val(f.claims, "P443")[0];
    return `<tr id="${f.id}"><td class="rep">${Object.values(f.representations).map(r => esc(r.value)).join(" / ")}</td><td>${f.grammaticalFeatures.map(g => `<span class="chip">${esc(L[g]?.label || g)}</span>`).join(" ")}</td><td>${ipa ? `<span class="ipa">/${esc(ipa)}/</span>` : ""}</td><td>${au ? audioBtn(au) : ""}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function lexRelations(e) {
  return ["P5402", "P8530", "P5976", "P460", "P5920"].map(p => (e.claims[p] || []).length ? `<h3 style="font-size:15px;margin:12px 0 6px">${esc(plab(p))}</h3><div class="taglist">${e.claims[p].map(c => `<span>${fmtSnak(c.mainsnak)}</span>`).join("")}</div>` : "").join("");
}
function sources(e) {
  const cs = [...(e.claims.P1343 || []), ...(e.claims.P973 || [])];
  if (!cs.length) return "";
  return `<ul style="margin:0;padding-left:20px">${cs.map(c => `<li>${fmtSnak(c.mainsnak)}${c.qualifiers ? ` <small>(${quals(c)})</small>` : ""}</li>`).join("")}</ul>`;
}
const LEX_DONE = ["P5191", "P5238", "P5831", "P1343", "P973", "P443", "P898", "P5402", "P8530", "P5976", "P460", "P5920"];

/* ---------- page ---------- */
// Matched inflected form (from search, e.g. মাকে → মা): banner + highlighted row.
function formBanner(e) {
  const fid = P0.form; const f = fid && e.forms.find(x => x.id === fid);
  if (!f) return "";
  const rep = firstText(f.representations);
  return `<div class="card formhit">“<b>${esc(P0.q || rep)}</b>” হলো “${esc(Object.values(e.lemmas)[0].value)}” শব্দের একটি রূপ${f.grammaticalFeatures.length ? ` — ${f.grammaticalFeatures.map(g => `<span class="chip">${esc(L[g]?.label || g)}</span>`).join(" ")}` : ""}। <a href="#${f.id}">রূপের তালিকায় দেখুন</a></div>`;
}
function serialHtml() {
  return (NB.prev ? `<a class="prev" href="${wordUrl(NB.prev.id)}" rel="prev"><small>← আগের শব্দ</small><b>${esc(NB.prev.lemma)}</b></a>` : "<span></span>")
    + (NB.next ? `<a class="next" href="${wordUrl(NB.next.id)}" rel="next"><small>পরের শব্দ →</small><b>${esc(NB.next.lemma)}</b></a>` : "");
}
function loadingView() { return `<div style="padding:24px 0"><div class="skel" style="width:24%;height:44px"></div><div class="skel" style="width:60%;margin-top:16px"></div><div class="skel" style="width:50%;margin-top:10px"></div></div>`; }

let renderSeq = 0;
async function render(id, { fresh = false, keepTabs = false } = {}) {
  const my = ++renderSeq;
  if (!keepTabs) $("#wtabs").innerHTML = "";
  $("#wordbody").innerHTML = loadingView();
  let d;
  try { d = await getJSON(`/api/word/${id}${fresh ? "?fresh=1" : ""}`); }
  catch (err) { $("#wordbody").innerHTML = `<div class="msg err" style="margin-top:30px">${esc(id)} লোড করা যায়নি: ${esc(err.message)}</div>`; return; }
  if (my !== renderSeq) return;
  const e = ENT = d.entity; L = d.labels; CUR = id; NB = {};
  e.forms = e.forms || []; e.senses = e.senses || []; e.claims = e.claims || {};
  const lemma = Object.values(e.lemmas).map(l => l.value).join(" / ");
  document.title = `${lemma} · লেক্সিম.বাংলা`;
  const parts = [
    ["senses", `অর্থ <span class="muted">(${toBn(e.senses.length)})</span>`, senses(e)],
    ["usage", "প্রয়োগের উদাহরণ", usageUnattached(e)],
    ["etymology", "ব্যুৎপত্তি", etymologySection(e)],
    ["compound", "খণ্ডাংশ", compound(e)],
    ["forms", `রূপ <span class="muted">(${toBn(e.forms.length)})</span>`, forms(e)],
    ["derived", "এই লেক্সিম দিয়ে গঠিত", `<div id="desc-tree"><div class="skel" style="width:40%;height:24px"></div></div>${lexRelations(e)}`],
    ["sources", "উৎস ও প্রমাণ", sources(e)],
    ["other", "অন্যান্য তথ্য", kvList(e.claims, LEX_DONE)],
  ].filter(p => p[2]);
  $("#wordbody").innerHTML = `
    <header class="wordhead"><h1 lang="${esc(Object.keys(e.lemmas)[0])}">${esc(lemma)}</h1>
      <div class="meta"><span class="chip acc">${esc(catLabel(e.lexicalCategory, L))}</span>${langBadge(e.language, L)}<a class="chip" href="https://www.wikidata.org/wiki/Lexeme:${e.id}" target="_blank" rel="noopener">${e.id} ${ic("ext")}</a></div>
      <div class="acts"><a class="btn small" href="${editUrl(e.id)}">${ic("pen")}সম্পাদনা</a></div>
    </header>
    ${pronunciation(e)}${formBanner(e)}
    <div class="layout"><div>${parts.map(([pid, t, b]) => section(pid, t, b)).join("")}
      <div class="serial" id="serial"><span class="muted">আগের ও পরের শব্দ খোঁজা হচ্ছে…</span></div>
    </div>
    <aside class="toc"><div class="card"><b>এই পাতায়</b><nav>${parts.map(([pid, t]) => `<a href="#${pid}">${t}</a>`).join("")}</nav></div>
      <div class="card side-box" id="other-langs" hidden></div>
      <div class="card"><b>শব্দক্রমে পড়ুন</b><p class="muted" style="margin:4px 0 0;font-size:14px"><span class="kbd">←</span> আগের · <span class="kbd">→</span> পরের শব্দ</p>
        <p style="margin:8px 0 0"><a href="browse.html?${qs({ letter: [...lemma][0] })}">“${esc([...lemma][0])}” দিয়ে শুরু সব শব্দ →</a></p></div>
      <div class="card"><b>অবদান রাখুন</b><p style="margin:6px 0 0;font-size:14px"><a href="${editUrl(e.id)}">এই শব্দ সম্পাদনা</a><br><a href="wizard.html?return=1">নতুন শব্দ যোগ</a></p></div>
    </aside></div>`;
  if (P0.form && id === (params().id || id)) { const row = document.getElementById(P0.form); if (row) { row.classList.add("hl"); setTimeout(() => row.scrollIntoView({ block: "center", behavior: "smooth" }), 200); } }
  // Everything below loads after the entry is already on screen.
  if (hasEty(e)) getJSON(`/api/etymology/${id}`).then(t => { if (my !== renderSeq) return; const el = $("#ety-tree");
    el.innerHTML = Object.keys(t.nodes).length > 1 ? `<div class="muted" style="font-size:13px">বাঁ থেকে ডানে: শব্দ → খণ্ডাংশ ও উৎস → তাদের উৎস …</div>${etymologyTree(t, id)}${t.cognates.length ? `<p class="muted" style="font-size:14px;margin:6px 0 0">একই মূল থেকে অন্য ভাষায় আরও ${toBn(t.cognates.length)}টি শব্দ — <a href="${etyUrl(id)}">তালিকা দেখুন</a></p>` : ""}` : ""; })
    .catch(() => { const el = $("#ety-tree"); if (el) el.innerHTML = ""; });
  getJSON(`/api/descendants/${id}`).then(t => { if (my !== renderSeq) return; const el = $("#desc-tree"); if (!el) return;
    if (!Object.keys(t.nodes).length) { el.innerHTML = ""; if (!lexRelations(e)) { $("#derived")?.remove(); $('.toc a[href="#derived"]')?.remove(); } return; }
    el.innerHTML = `<div class="muted" style="font-size:13px">${toBn(Object.keys(t.nodes).length)}টি শব্দ${t.truncated ? " (আংশিক)" : ""}</div>${descendantsTree(t, id, { lemma, language: e.language })}`; })
    .catch(() => { const el = $("#desc-tree"); if (el) el.innerHTML = ""; });
  getJSON(`/api/neighbors/${id}`).then(n => { if (my !== renderSeq) return; NB = n; $("#serial").innerHTML = serialHtml(); }).catch(() => { const s = $("#serial"); if (s) s.innerHTML = ""; });
  getJSON(`/api/same/${id}`).then(s => { if (my !== renderSeq) return; drawSame(s, id); }).catch(() => {});
}
// Same spelling: tabs for other categories in this language; a sidebar box for other languages.
function drawSame(s, id) {
  Object.assign(L, s.labels);
  if (s.tabs.length > 1 && !$("#wtabs").children.length) {
    $("#wtabs").innerHTML = `<div class="wtabs" role="tablist">${s.tabs.map(t => `<button role="tab" data-id="${t.id}" aria-selected="${t.id === id}">${esc(catLabel(t.category, L))}${t.gloss ? ` <small class="muted">${esc(t.gloss.slice(0, 24))}</small>` : ""}</button>`).join("")}</div>`;
  }
  $$("#wtabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.id === id)));
  const box = $("#other-langs");
  if (box && s.otherLangs.length) {
    box.hidden = false;
    box.innerHTML = `<h3>অন্য ভাষায় একই শব্দ</h3>${s.otherLangs.map(o => `<a class="it" href="${wordUrl(o.id)}">${langBadge(o.language, L)} <b>${esc(o.lemma)}</b> <span class="muted" style="font-size:13px">${esc(catLabel(o.category, L))}${o.gloss ? " · " + esc(o.gloss) : ""}</span></a>`).join("")}`;
  }
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("#wtabs button"); if (!t) return;
  history.replaceState(null, "", wordUrl(t.dataset.id)); delete P0.form;
  render(t.dataset.id, { keepTabs: true });
});
document.addEventListener("keydown", ev => {
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (ev.key === "ArrowLeft" && NB.prev) location.href = wordUrl(NB.prev.id);
  if (ev.key === "ArrowRight" && NB.next) location.href = wordUrl(NB.next.id);
});
let player;
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-audio]"); if (!b) return;
  player?.pause(); player = new Audio(fileUrl(b.dataset.audio)); player.play().catch(() => window.open(`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(b.dataset.audio)}`));
});
// Hovering a word link warms the cache, so the next page opens instantly.
document.addEventListener("mouseover", ev => {
  const a = ev.target.closest('a[href^="word.html?id="], a[href^="/lemma/"]'); if (!a || a.dataset.pf) return; a.dataset.pf = 1;
  const m = a.getAttribute("href").match(/(L\d+)/); if (m) getJSON(`/api/word/${m[1]}`).catch(() => {});
});

(async () => {
  await configReady;
  // Just saved in the wizard → skip every cache once.
  let fresh = P0.fresh === "1";
  try { if (sessionStorage.getItem("lx_fresh") === CUR) { fresh = true; sessionStorage.removeItem("lx_fresh"); } } catch (e) {}
  if (fresh) dropCache(CUR);
  if (P0.id || P0.fresh) history.replaceState(null, "", wordUrl(CUR) + location.hash);
  render(CUR, { fresh });
})();
