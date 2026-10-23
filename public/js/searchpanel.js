"use strict";
// One search panel for the homepage and /search: the search box first, the options under it.
// Above the box: three ways of matching, one at a time: সবচেয়ে প্রাসঙ্গিক · হুবহু · অংশ মিলিয়ে (দিয়ে শুরু / দিয়ে শেষ / ভেতরে আছে, combinable).
// mountSearch(root, out, { page }) — page:true keeps the address bar in step and shows up to 200 results.
function mountSearch(root, out, { page = false } = {}) {
  const KEYS = ["q", "exact", "starts", "ends", "contains"];
  const MODE_KEYS = { relevant: ["q"], exact: ["exact"], parts: ["starts", "ends", "contains"] };
  const HOW_BN = { exact: "হুবহু", starts: "দিয়ে শুরু", ends: "দিয়ে শেষ", contains: "ভেতরে আছে" };
  const PH = { relevant: "শব্দ, শব্দের রূপ বা অর্থ লিখুন…", exact: "পুরো শব্দটি লিখুন…" };
  const icon = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  root.classList.add("sp");
  root.innerHTML = `<div class="sp-modes">
      <div class="sp-seg" role="radiogroup" aria-label="কীভাবে মেলাবে">
        <button type="button" role="radio" data-m="relevant">সবচেয়ে প্রাসঙ্গিক</button><button type="button" role="radio" data-m="exact">হুবহু</button><button type="button" role="radio" data-m="parts">অংশ মিলিয়ে</button>
      </div></div>
    <form class="sp-box" role="search">
      <div class="sp-one">${icon}<input class="sp-in" data-k="one" lang="bn" autocomplete="off" aria-label="শব্দ খুঁজুন">
        <button type="button" class="sp-x" aria-label="মুছুন" hidden>✕</button><button class="sp-go" type="submit">খুঁজুন</button></div>
      <div class="sp-parts">${icon}
        <label><span>দিয়ে শুরু</span><input class="sp-in" data-k="starts" lang="bn" autocomplete="off" placeholder="যেমন: জল"></label>
        <label><span>দিয়ে শেষ</span><input class="sp-in" data-k="ends" lang="bn" autocomplete="off" placeholder="যেমন: কর"></label>
        <label><span>ভেতরে আছে</span><input class="sp-in" data-k="contains" lang="bn" autocomplete="off" placeholder="যেমন: বুনো"></label>
        <button class="sp-go" type="submit">খুঁজুন</button></div>
    </form>
    <div class="sp-opts">
      <span class="muted">কোথায় খুঁজবে:</span><div class="sp-seg sp-src" role="group" aria-label="কোন উৎসে">
        <button type="button" data-s="wd">উইকি উপাত্ত</button><button type="button" data-s="wikt">উইকিঅভিধান</button>
      </div><div class="sp-seg sp-field" role="group" aria-label="শব্দে না সংজ্ঞায়">
        <button type="button" data-f="lemma">শব্দে</button><button type="button" data-f="gloss">সংজ্ঞায়</button>
      </div>
    </div>
    <p class="sp-hint muted"></p>`;
  const q$ = s => root.querySelector(s), q$$ = s => [...root.querySelectorAll(s)];
  const one = q$('[data-k="one"]');

  const p = params();
  const fields = new Set(String(p.field || "").split(",").filter(f => f === "lemma" || f === "gloss"));
  if (!fields.size) fields.add("lemma"); // default: words only
  const srcs = new Set(String(p.src || "").split(",").filter(s => s === "wd" || s === "wikt"));
  if (!srcs.size) srcs.add("wd"); // default: Wikidata lexemes
  let mode = p.exact ? "exact" : (p.starts || p.ends || p.contains) ? "parts" : p.q ? "relevant" : (() => { try { return localStorage.getItem("search_amode") || "relevant"; } catch (e) { return "relevant"; } })();
  if (!MODE_KEYS[mode]) mode = "relevant";
  if (page) { one.value = p.exact || p.q || ""; ["starts", "ends", "contains"].forEach(k => { q$(`[data-k="${k}"]`).value = p[k] || ""; }); }

  function setMode(m, focus) {
    mode = m; try { localStorage.setItem("search_amode", m); } catch (e) {}
    root.dataset.mode = m;
    q$$(".sp-seg [data-m]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.m === m)));
    if (m !== "parts") one.placeholder = PH[m];
    if (focus) (m === "parts" ? q$('[data-k="starts"]') : one).focus();
  }
  const drawFields = () => { q$$(".sp-field button").forEach(b => b.setAttribute("aria-pressed", String(fields.has(b.dataset.f)))); q$$(".sp-src button").forEach(b => b.setAttribute("aria-pressed", String(srcs.has(b.dataset.s)))); };
  const values = () => mode === "parts"
    ? Object.fromEntries(MODE_KEYS.parts.map(k => [k, q$(`[data-k="${k}"]`).value.trim()]))
    : { [MODE_KEYS[mode][0]]: one.value.trim() };
  const fieldStr = () => (fields.size === 2 ? "" : [...fields].join(","));

  let seq = 0, timer;
  async function run() {
    const v = values(), filled = Object.keys(v).filter(k => v[k]); drawFields();
    q$(".sp-x").hidden = !one.value;
    const params = { ...v, field: fieldStr(), src: srcs.size === 1 && srcs.has("wd") ? "" : [...srcs].join(",") };
    const label = filled.map(k => (k === "q" ? `“${v.q}”` : `${HOW_BN[k]} “${v[k]}”`)).join(" ও ");
    if (page) { history.replaceState(null, "", cleanUrl("search.html?" + qs(params))); document.title = (label ? `${label} · ` : "") + "খুঁজুন · লেক্সিম.বাংলা"; }
    const hint = q$(".sp-hint");
    if (!filled.length) { hint.textContent = ""; out.innerHTML = ""; return; }
    const my = ++seq, limit = page ? 200 : 12; out.innerHTML = skeleton(page ? 5 : 3);
    const where = fields.size === 1 ? (fields.has("gloss") ? " · সংজ্ঞায়" : " · শব্দে") : "";
    const more = n => !page && n >= limit ? ` · <a href="${cleanUrl("search.html?" + qs(params))}">সব ফল দেখুন →</a>` : "";
    const add = v.q || v.exact;
    const jobs = [];
    if (srcs.has("wd")) jobs.push(getJSON(`/api/search?${qs({ ...v, field: fieldStr(), lang: getLang(), limit })}`).then(j => ({
      n: j.list.length, head: "উইকি উপাত্ত (লেক্সিম)",
      html: j.list.length ? j.list.map((s, i) => rowItem(s, j.labels, i + 1).replace('<span class="g">', s.inGloss ? '<span class="g"><span class="chip">সংজ্ঞায় মিল</span> ' : '<span class="g">')).join("")
        : `<div class="sp-empty">কিছু পাওয়া যায়নি।${add ? ` <a class="btn small" href="wizard.html?${qs({ lemma: add, return: 1 })}">“${esc(add)}” নতুন শব্দ হিসেবে যোগ করুন</a>` : ""}</div>` })));
    if (srcs.has("wikt")) jobs.push(wiktSearch(v, limit, fields.has("gloss")).then(list => ({
      n: list.length, head: "বাংলা উইকিঅভিধান",
      html: list.length ? list.map((r, i) => `<a class="dent wk" href="https://bn.wiktionary.org/wiki/${encodeURIComponent(r.title)}" target="_blank" rel="noopener"><span class="sn">${toBn(i + 1)}</span><span class="lem">${esc(r.title)}</span>${r.snippet ? ` <span class="g">${esc(r.snippet)}</span>` : ""} <span class="n">উইকিঅভিধান ↗</span></a>`).join("")
        : `<div class="sp-empty">উইকিঅভিধানে কিছু পাওয়া যায়নি।</div>` })));
    // Each source shows as soon as it answers.
    const heads = jobs.length > 1;
    out.innerHTML = jobs.map((_, i) => `<div class="sp-sec" data-i="${i}">${skeleton(3)}</div>`).join("");
    const got = [];
    const fill = () => {
      const total = got.filter(Boolean).reduce((a, r) => a + r.n, 0), wait = got.filter(Boolean).length < jobs.length;
      hint.innerHTML = `${esc(label)}${where} — <b>${toBn(total)}</b>${got.some(r => r && r.n >= limit) ? "+" : ""}টি ফল${wait ? " (আরও আসছে…)" : ""}${more(Math.max(0, ...got.filter(Boolean).map(r => r.n)))}`;
    };
    jobs.forEach((job, i) => job.catch(e => ({ n: 0, head: "", html: `<div class="msg err">খোঁজা যায়নি: ${esc(e.message || e)}</div>` })).then(r => {
      if (my !== seq) return; got[i] = r;
      const box = out.querySelector(`.sp-sec[data-i="${i}"]`); if (box) box.innerHTML = (heads ? `<h3 class="sp-head">${r.head} <span class="muted">${toBn(r.n)}</span></h3>` : "") + r.html;
      fill();
    }));
  }  const later = () => { clearTimeout(timer); timer = setTimeout(run, 280); };
  q$$(".sp-in").forEach(i => i.addEventListener("input", later));
  q$(".sp-box").addEventListener("submit", e => { e.preventDefault(); clearTimeout(timer); run(); });
  q$(".sp-x").addEventListener("click", () => { one.value = ""; one.focus(); run(); });
  q$$(".sp-seg [data-m]").forEach(b => b.addEventListener("click", () => {
    // Moving between the single-box ways keeps what was typed.
    setMode(b.dataset.m, true); run();
  }));
  q$(".sp-src").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    const s = b.dataset.s; if (srcs.has(s) && srcs.size > 1) srcs.delete(s); else srcs.add(s); run(); });
  q$(".sp-field").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    const f = b.dataset.f; if (fields.has(f) && fields.size > 1) fields.delete(f); else fields.add(f); run(); }); // one always stays on
  setMode(mode); drawFields();
  configReady.then(run);
  return { focus: () => (mode === "parts" ? q$('[data-k="starts"]') : one).focus() };
}

// bn.wiktionary titles (Bengali script only) for the same three ways of matching.
async function wiktSearch(v, limit, inText) {
  const api = o => fetch("https://bn.wiktionary.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", ...o })).then(r => r.json());
  const bn = t => /[\u0980-\u09FF]/.test(t);
  const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (v.exact !== undefined) {
    const j = await api({ action: "query", titles: v.exact, prop: "extracts", exintro: 1, explaintext: 1, exchars: 160 });
    return Object.values(j.query?.pages || {}).filter(pg => pg.missing === undefined).map(pg => ({ title: pg.title, snippet: strip(pg.extract) }));
  }
  const re = s => String(s || "").replace(/[\\.*+?^${}()|[\]\/"<>#@&~]/g, "\\$&");
  const has = r => (!v.starts || r.startsWith(v.starts)) && (!v.ends || r.endsWith(v.ends)) && (!v.contains || r.includes(v.contains));
  let titles;
  if (v.q !== undefined) {
    const j = await api({ action: "query", list: "search", srsearch: inText ? v.q : `intitle:"${v.q.replace(/"/g, "")}"`, srnamespace: 0, srlimit: Math.min(limit * 2, 500), srprop: "snippet" });
    return (j.query?.search || []).filter(r => bn(r.title)).slice(0, limit).map(r => ({ title: r.title, snippet: strip(r.snippet) }));
  }
  if (v.starts) { // fast: titles with this prefix, the rest filtered here
    titles = []; let cont = {};
    for (let n = 0; n < 10 && titles.length < limit; n++) {
      const j = await api({ action: "query", list: "allpages", apprefix: v.starts, apnamespace: 0, aplimit: "max", ...cont });
      titles.push(...(j.query?.allpages || []).map(p => p.title).filter(has));
      if (!j.continue) break; cont = j.continue;
    }
  } else {
    const j = await api({ action: "query", list: "search", srsearch: `intitle:/${re(v.contains || v.ends)}/`, srnamespace: 0, srlimit: 500, srprop: "" });
    titles = (j.query?.search || []).map(r => r.title).filter(has);
  }
  titles = titles.filter(bn).slice(0, limit);
  // Short descriptions for the first 20.
  const ex = {};
  if (titles.length) { try { const j = await api({ action: "query", titles: titles.slice(0, 20).join("|"), prop: "extracts", exintro: 1, explaintext: 1, exchars: 160, exlimit: 20 });
    Object.values(j.query?.pages || {}).forEach(p => { ex[p.title] = strip(p.extract); }); } catch (e) {} }
  return titles.map(title => ({ title, snippet: ex[title] || "" }));
}