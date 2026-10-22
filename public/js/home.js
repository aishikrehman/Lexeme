"use strict";
liveResults($("#q"), $("#home-results"));
$("#letters").innerHTML = LETTERS.map(l => `<a href="browse.html?${qs({ letter: l })}">${l}</a>`).join("");

async function load() {
  const lang = getLang();
  $("#idioms").innerHTML = $("#proverbs").innerHTML = skeleton(6);
  try {
    const h = await getJSON(`/api/home?${qs({ lang })}`);
    $("#stats").innerHTML = [
      [h.total, "মোট লেক্সিম"], [h.glossed, "বাংলা সংজ্ঞাসহ"], [h.idiomCount, "বাগধারা"], [h.proverbCount, "প্রবাদ"],
    ].map(([n, t]) => `<div class="stat"><b>${toBn(n.toLocaleString("en-IN"))}</b><span class="muted">${t}</span></div>`).join("");
    $("#wotd-date").textContent = new Date(h.date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
    drawWord(h.wotd, h.labels, "আজকের শব্দ");
    $("#idioms").innerHTML = h.idioms.length ? h.idioms.map(s => wcard(s, "idiom")).join("") : `<div class="msg">কোনো বাগধারা পাওয়া যায়নি। <a href="wizard.html?cat=idiom">যোগ করুন</a></div>`;
    $("#proverbs").innerHTML = h.proverbs.length ? h.proverbs.map(s => wcard(s, "proverb")).join("") : `<div class="msg">কোনো প্রবাদ পাওয়া যায়নি। <a href="wizard.html?cat=proverb">যোগ করুন</a></div>`;
  } catch (e) {
    $("#wotd").innerHTML = `<div class="msg err">লোড করা যায়নি: ${esc(e.message)}</div>`; $("#idioms").innerHTML = $("#proverbs").innerHTML = "";
  }
}
function drawWord(w, labels, kicker) {
  $("#wotd").innerHTML = w ? `<div><div class="k">${kicker}</div><div class="lemma">${esc(w.lemma)}</div>
      <div class="taglist"><span class="chip">${esc(catLabel(w.category, labels))}</span>${langBadge(w.language, labels)}</div>
      <p style="margin-top:14px"><a class="btn" href="${wordUrl(w.id)}">বিস্তারিত পড়ুন</a> <a class="btn ghost" href="${etyUrl(w.id)}">ব্যুৎপত্তি</a></p></div>
    <div><ol>${(w.glosses || []).map(g => `<li>${esc(g)}</li>`).join("") || `<li class="muted">সংজ্ঞা নেই</li>`}</ol>
      <p class="muted">${toBn(w.senses)}টি অর্থ · ${toBn(w.forms)}টি রূপ</p>
      <button class="btn ghost small" id="rand">${ic("shuffle")}যেকোনো একটি শব্দ</button></div>`
    : `<div class="muted">এই ভাষায় এখনো বাংলা সংজ্ঞাসহ কোনো শব্দ নেই। <a href="wizard.html">প্রথমটি যোগ করুন</a>।</div>`;
  $("#rand")?.addEventListener("click", random);
}
// Swap just the word box for a random word (no page reload).
async function random() {
  const b = $("#rand"); if (b) { b.disabled = true; b.lastChild.textContent = "খোঁজা হচ্ছে…"; }
  try {
    // A unique URL every time → never a cached (repeated) answer.
    const r = await getJSON(`/api/random?${qs({ lang: getLang(), t: Date.now() })}`);
    if (r.word) drawWord(r.word, r.labels, "যেকোনো একটি শব্দ"); else if (b) b.disabled = false;
  }
  catch (e) { if (b) { b.disabled = false; b.lastChild.textContent = "আবার চেষ্টা করুন"; } }
}

configReady.then(() => {
  const draw = () => { $("#langpick").innerHTML = SITE.languages.filter(l => l.qid).map(l => `<button type="button" data-q="${l.qid}" aria-pressed="${l.qid === getLang()}">${esc(l.bn)}</button>`).join(""); };
  draw();
  $("#langpick").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; setLang(b.dataset.q); draw(); load(); });
  load();
});
