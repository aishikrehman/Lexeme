"use strict";
const st = Object.assign({ page: 1, letter: "", cat: "", size: "40", view: "pages" }, params());
st.page = +st.page || 1;
let pages = 1, loading = false, io = null;

const href = page => cleanUrl("browse.html?" + qs({ letter: st.letter, cat: st.cat, size: st.size !== "40" ? st.size : "", view: st.view !== "pages" ? st.view : "", page: page > 1 ? page : "" }));
function drawLetters() { $("#letters").innerHTML = `<a href="${hrefWith({ letter: "" })}"${!st.letter ? ' class="on"' : ""}>সব</a>` + LETTERS.map(l => `<a href="${hrefWith({ letter: l })}"${l === st.letter ? ' class="on"' : ""}>${l}</a>`).join(""); }
const hrefWith = o => { const s = { ...st, ...o, page: 1 }; return cleanUrl("browse.html?" + qs({ letter: s.letter, cat: s.cat, size: s.size !== "40" ? s.size : "", view: s.view !== "pages" ? s.view : "" })); };

async function fetchPage(page) {
  return getJSON(`/api/browse?${qs({ lang: getLang(), page, size: st.size, letter: st.letter, cat: st.cat })}`);
}
// bn.wiktionary page titles (Bengali script), alphabetically from `from`, up to `to`, optionally with a prefix.
async function wiktTitles({ from = "", to = "", prefix = "", max = 500 }) {
  const out = []; let cont = {}, next = "";
  for (let n = 0; n < 6 && out.length < max; n++) {
    const j = await fetch("https://bn.wiktionary.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", action: "query", list: "allpages", apnamespace: 0, aplimit: Math.min(500, max - out.length), ...(from ? { apfrom: from } : {}), ...(to ? { apto: to } : {}), ...(prefix ? { apprefix: prefix } : {}), ...cont })).then(r => r.json());
    out.push(...(j.query?.allpages || []).map(p => p.title).filter(t => /[\u0980-\u09FF]/.test(t)));
    if (!j.continue) { next = ""; break; } cont = j.continue; next = j.continue.apcontinue;
  }
  return { list: out.slice(0, max).map(title => ({ title })), next };
}
// Wiktionary alone: its own pages, "next" continues from where the last one stopped.
async function loadWikt() {
  $("#out").innerHTML = skeleton(8);
  try {
    const { list, next } = await wiktTitles({ from: st.from || "", prefix: st.letter, max: +st.size });
    $("#count").textContent = `উইকিঅভিধান${st.letter ? ` · “${st.letter}”` : ""} · এই পাতায় ${toBn(list.length)}টি শব্দ`;
    $("#out").innerHTML = list.length ? list.map((r, i) => wiktRow(r, i + 1)).join("") : `<div class="msg">কিছু নেই।</div>`;
    setExport(`উইকিঅভিধান${st.letter ? " " + st.letter : ""}`, list.map(expRowWikt));
    $("#pager").innerHTML = $("#top-pager").innerHTML = (st.from ? `<a href="${hrefWith({})}">← শুরুতে</a>` : "") + (next ? `<a href="${cleanUrl("browse.html?" + qs({ letter: st.letter, size: st.size !== "40" ? st.size : "", from: next }))}" rel="next">পরের পাতা →</a>` : "");
  } catch (e) { $("#out").innerHTML = `<div class="msg err">লোড করা যায়নি: ${esc(e.message)}</div>`; }
}
async function loadPaged() {
  if (getSource() === "wikt" && !st.cat) return loadWikt();
  $("#out").innerHTML = skeleton(8);
  try {
    const j = await fetchPage(st.page); pages = j.pages;
    $("#count").textContent = `মোট ${toBn(j.total)}টি শব্দ · পাতা ${toBn(j.page)} / ${toBn(j.pages)}`;
    const start = (j.page - 1) * j.size;
    // with both sources (and no word class chosen): the Wiktionary entries that fall between this page's first and last word join in
    let wk = [];
    if (getSource() === "both" && !st.cat && j.list.length) {
      const sorted = j.list.map(s => s.lemma).sort((a, b) => a.localeCompare(b, "bn"));
      wk = (await wiktTitles({ from: j.page > 1 ? sorted[0] : "", to: j.page < j.pages ? sorted[sorted.length - 1] : "", prefix: st.letter }).catch(() => ({ list: [] }))).list;
    }
    if (wk.length) { const extra = wk.filter(r => !j.list.some(s => s.lemma === r.title)).length; $("#count").innerHTML = `মোট ${toBn(j.total)}টি লেক্সিম · পাতা ${toBn(j.page)} / ${toBn(j.pages)} <span class="tip" tabindex="0" data-tip="এই পাতায় উইকিঅভিধানের আরও ${toBn(extra)}টি শব্দ যোগ হয়েছে, যেগুলোর লেক্সিম নেই।">+${toBn(extra)}</span>`; }
    // export: this page, or the whole list (every page, 200 at a time)
    const title = `শব্দক্রম${st.letter ? " " + st.letter : ""}${st.cat ? " " + (SITE.categories.find(c => c.key === st.cat)?.bn || st.cat) : ""}`;
    setExport(title, [...j.list.map(s => expRowLex(s, j.labels)), ...wk.filter(r => !j.list.some(s => s.lemma === r.title)).map(expRowWikt)].sort((a, b) => a["শব্দ"].localeCompare(b["শব্দ"], "bn")),
      j.pages > 1 ? async progress => { const all = []; for (let p = 1, n = 1; p <= n && p <= 40; p++) { progress(`পাতা ${toBn(p)} / ${toBn(n)}…`); const k = await getJSON(`/api/browse?${qs({ lang: getLang(), page: p, size: 200, letter: st.letter, cat: st.cat })}`); n = k.pages; all.push(...k.list.map(s => expRowLex(s, k.labels))); } return all; } : null);
    $("#out").innerHTML = !j.list.length ? `<div class="msg">এই বাছাইয়ে কোনো শব্দ নেই।</div>` : wk.length ? mergedRows(j.list, j.labels, wk, start + 1) : j.list.map((s, i) => rowItem(s, j.labels, start + i + 1)).join("");
    $("#pager").innerHTML = $("#top-pager").innerHTML = pager(j.page, j.pages, href);
  } catch (e) { $("#out").innerHTML = `<div class="msg err">লোড করা যায়নি: ${esc(e.message)}</div>`; }
}
async function loadMore() {
  if (loading || st.page > pages) return; loading = true;
  $("#sentinel").innerHTML = `<div class="muted" style="text-align:center;padding:16px">লোড হচ্ছে…</div>`;
  try {
    const j = await fetchPage(st.page); pages = j.pages;
    $("#count").textContent = `${toBn(j.total)}টি শব্দ`;
    const start = (j.page - 1) * j.size;
    $("#out").insertAdjacentHTML("beforeend", `<div class="muted" style="margin-top:10px">— পাতা ${toBn(j.page)} —</div>` + j.list.map((s, i) => rowItem(s, j.labels, start + i + 1)).join(""));
    st.page++;
    if (st.page > pages) { $("#sentinel").innerHTML = `<div class="muted" style="text-align:center;padding:16px">শেষ।</div>`; io?.disconnect(); }
    else $("#sentinel").innerHTML = "";
    // The observer only fires when the marker enters view; if it is still on screen, load the next page now.
    loading = false;
    if (st.page <= pages) { const r = $("#sentinel").getBoundingClientRect(); if (r.top < innerHeight + 600) return loadMore(); }
  } catch (e) { $("#sentinel").innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  loading = false;
}
function start() {
  drawLetters();
  io?.disconnect(); $("#out").innerHTML = ""; $("#pager").innerHTML = $("#top-pager").innerHTML = "";
  $("#out").classList.toggle("one-col", st.view === "scroll"); // continuous reading: one column, new words continue below
  if (st.view === "scroll") { pages = Infinity; io = new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: "600px" }); io.observe($("#sentinel")); }
  else loadPaged();
}
document.addEventListener("keydown", e => {
  if (st.view !== "pages" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === "ArrowRight" && st.page < pages) location.href = href(st.page + 1);
  if (e.key === "ArrowLeft" && st.page > 1) location.href = href(st.page - 1);
});
for (const k of ["cat", "size", "view"]) $("#" + k).addEventListener("change", e => { location.href = hrefWith({ [k]: e.target.value }); });
$("#src").addEventListener("change", e => { setSource(e.target.value); location.href = hrefWith({}); }); // the same choice as on search and home
$("#lang").addEventListener("change", e => { setLang(e.target.value); location.href = hrefWith({}); });

mountExport($("#count").parentElement);
configReady.then(() => {
  $("#lang").innerHTML = SITE.languages.filter(l => l.qid).map(l => `<option value="${l.qid}">${esc(l.bn)}</option>`).join(""); $("#lang").value = getLang(); $("#lang").closest("label").hidden = SITE.languages.length < 2;
  $("#cat").innerHTML += SITE.categories.map(c => `<option value="${c.key}">${esc(c.bn)}</option>`).join("");
  $("#cat").value = st.cat; $("#size").value = st.size; $("#view").value = st.view; $("#src").value = getSource();
  start();
});
