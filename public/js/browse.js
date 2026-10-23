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
async function loadPaged() {
  $("#out").innerHTML = skeleton(8);
  try {
    const j = await fetchPage(st.page); pages = j.pages;
    $("#count").textContent = `${toBn(j.total)}টি শব্দ · পাতা ${toBn(j.page)} / ${toBn(j.pages)}`;
    const start = (j.page - 1) * j.size;
    $("#out").innerHTML = j.list.length ? j.list.map((s, i) => rowItem(s, j.labels, start + i + 1)).join("") : `<div class="msg">এই বাছাইয়ে কোনো শব্দ নেই।</div>`;
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
$("#lang").addEventListener("change", e => { setLang(e.target.value); location.href = hrefWith({}); });

configReady.then(() => {
  $("#lang").innerHTML = SITE.languages.filter(l => l.qid).map(l => `<option value="${l.qid}">${esc(l.bn)}</option>`).join(""); $("#lang").value = getLang(); $("#lang").closest("label").hidden = SITE.languages.length < 2;
  $("#cat").innerHTML += SITE.categories.map(c => `<option value="${c.key}">${esc(c.bn)}</option>`).join("");
  $("#cat").value = st.cat; $("#size").value = st.size; $("#view").value = st.view;
  start();
});
