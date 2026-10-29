"use strict";
mountSearch($("#sp"), $("#home-results"));
$("#letters").innerHTML = LETTERS.map(l => `<a href="browse.html?${qs({ letter: l })}">${l}</a>`).join("");

let H = null; // the last /api/home answer
async function load() {
  const lang = getLang();
  $("#idioms").innerHTML = skeleton(4); $("#proverbs").innerHTML = "";
  try {
    const h = H = await getJSON(`/api/home?${qs({ lang })}`);
    $("#stats").innerHTML = [
      [h.total, "মোট শব্দ"], [h.glossed, "বাংলা সংজ্ঞাসহ"], [h.idiomCount, "বাগধারা"], [h.proverbCount, "প্রবাদ"],
    ].map(([n, t]) => `<div class="h-stat"><b>${toBn((n || 0).toLocaleString("en-IN"))}</b><span>${t}</span></div>`).join("");
    $("#wotd-date").textContent = new Date(h.date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
    drawWord(h.wotd, h.labels, "আজকের শব্দ");
    quoteAt(0);
    newQuiz();
    $("#idioms").innerHTML = h.idioms.length ? h.idioms.slice(0, 8).map(s => wcard(s, "idiom")).join("") : `<div class="msg">কোনো বাগধারা পাওয়া যায়নি। <a href="wizard.html?cat=idiom">যোগ করুন</a></div>`;
    $("#proverbs").innerHTML = h.proverbs.length ? h.proverbs.slice(0, 6).map(pcard).join("") : `<div class="msg">কোনো প্রবাদ পাওয়া যায়নি। <a href="wizard.html?cat=proverb">যোগ করুন</a></div>`;
  } catch (e) {
    $("#wotd").innerHTML = `<div class="msg err">লোড করা যায়নি: ${esc(e.message)}</div>`; $("#idioms").innerHTML = ""; $("#quote").innerHTML = ""; $("#quiz").innerHTML = "";
  }
}

// A proverb as a small quote card: the saying, its meaning under it.
const pcard = s => `<a class="pcard" href="${wordUrl(s.id)}"><span class="pq" aria-hidden="true">“</span><b>${esc(s.lemma)}</b>${s.gloss ? `<span class="pm">${esc(s.gloss)}</span>` : ""}</a>`;

/* word of the day (and the random-word button, which swaps only this box) */
function drawWord(w, labels, kicker) {
  $("#wotd").innerHTML = w ? `<div><div class="k">${kicker}</div><div class="lemma">${esc(w.lemma)}</div>
      <div class="taglist"><span class="chip">${esc(catLabel(w.category, labels))}</span></div>
      <p style="margin-top:14px"><a class="btn" href="${wordUrl(w.id)}">বিস্তারিত পড়ুন</a> <a class="btn ghost" href="${etyUrl(w.id)}">ব্যুৎপত্তি</a></p></div>
    <div><ol>${(w.glosses || []).map(g => `<li>${esc(g)}</li>`).join("") || `<li class="muted">সংজ্ঞা নেই</li>`}</ol>
      <p class="muted">${toBn(w.senses)}টি অর্থ · ${toBn(w.forms)}টি রূপ</p>
      <button class="btn ghost small" id="rand">${ic("shuffle")}যেকোনো একটি শব্দ</button></div>`
    : `<div class="muted">এই ভাষায় এখনো বাংলা সংজ্ঞাসহ কোনো শব্দ নেই। <a href="wizard.html">প্রথমটি যোগ করুন</a>।</div>`;
  $("#rand")?.addEventListener("click", random);
}
async function random() {
  const b = $("#rand"); if (b) { b.disabled = true; b.lastChild.textContent = "খোঁজা হচ্ছে…"; }
  try {
    const r = await getJSON(`/api/random?${qs({ lang: getLang(), t: Date.now() })}`); // unique URL → never cached
    if (r.word) drawWord(r.word, r.labels, "যেকোনো একটি শব্দ"); else if (b) b.disabled = false;
  } catch (e) { if (b) { b.disabled = false; b.lastChild.textContent = "আবার চেষ্টা করুন"; } }
}

/* featured proverb: a large quote; “আরেকটি” steps through today's proverbs */
let qi = 0;
function quoteAt(i) {
  const list = (H?.proverbs || []).filter(p => p.lemma); const box = $("#quote");
  if (!list.length) { box.closest("section").hidden = true; return; }
  qi = (i + list.length) % list.length; const p = list[qi];
  box.innerHTML = `<blockquote><a href="${wordUrl(p.id)}">${esc(p.lemma)}</a></blockquote>
    ${p.gloss ? `<figcaption>${esc(p.gloss)}</figcaption>` : ""}
    <div class="h-quote-acts"><span class="muted">${toBn(qi + 1)} / ${toBn(list.length)}</span><button class="btn ghost small" id="q-next">আরেকটি ›</button></div>`;
  $("#q-next").onclick = () => quoteAt(qi + 1);
}

/* quiz: the meaning of an idiom, pick the idiom among three */
let score = { right: 0, all: 0 };
function newQuiz() {
  const pool = (H?.idioms || []).filter(x => x.gloss && x.lemma); const box = $("#quiz");
  if (pool.length < 3) { box.closest("section").hidden = true; return; }
  const shuffled = pool.slice().sort(() => Math.random() - 0.5), ans = shuffled[0];
  const opts = shuffled.slice(0, 3).sort(() => Math.random() - 0.5);
  box.innerHTML = `<p class="h-q-def">“${esc(ans.gloss)}”</p><p class="muted" style="margin:0 0 8px">এই অর্থ কোন বাগধারার?</p>
    <div class="h-q-opts">${opts.map(o => `<button type="button" class="h-q-opt" data-id="${o.id}">${esc(o.lemma)}</button>`).join("")}</div>
    <div class="h-q-foot"><span id="q-msg" aria-live="polite"></span><span class="muted">${score.all ? `স্কোর ${toBn(score.right)}/${toBn(score.all)}` : ""}</span></div>`;
  box.querySelectorAll(".h-q-opt").forEach(b => b.onclick = () => {
    const ok = b.dataset.id === ans.id; score.all++; if (ok) score.right++;
    box.querySelectorAll(".h-q-opt").forEach(x => { x.disabled = true; if (x.dataset.id === ans.id) x.classList.add("right"); });
    if (!ok) b.classList.add("wrong");
    $("#q-msg").innerHTML = `${ok ? "ঠিক! " : "হলো না। "}<a href="${wordUrl(ans.id)}">${esc(ans.lemma)}</a> · <button type="button" class="btn ghost small" id="q-again">পরেরটি ›</button>`;
    $("#q-again").onclick = newQuiz;
  });
}

configReady.then(() => {
  $("#cats").innerHTML = SITE.categories.map(c => `<a href="browse.html?${qs({ cat: c.key })}">${esc(c.bn)}</a>`).join("");
  load();
});
