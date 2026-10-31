"use strict";
// bn.wiktionary page for a lexeme, written as {{লে|L…}}: bn.wiktionary's Module:আভিধানিক উপাত্ত builds the whole
// entry from the Wikidata lexeme, so the page never needs hand-copied text. The user decides, per save:
//   off (default) · create the page if missing (or add the lexeme to a page that already uses {{লে}}) ·
//   also replace a hand-written page (only after seeing its current text and confirming).
(function () {
  if (!document.getElementById("p-review") || document.body.classList.contains("is-bulk")) return;
  const WIKT = window.LX_PROXY ? "/proxy/wikt" : "https://bn.wiktionary.org/w/api.php";
  const PAGE = t => `https://bn.wiktionary.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
  const LEX_RX = /\{\{\s*লে\s*\|\s*(L\d+)/g;
  let mode = (() => { try { return localStorage.getItem("lx_wikt_mode") || "off"; } catch (e) { return "off"; } })();
  let page = null; // { title, exists, text, lexemes:[…], handWritten }

  const box = document.createElement("section");
  box.className = "blk wikt-box";
  box.innerHTML = `<h3>বাংলা উইকিঅভিধান</h3>
    <p class="hint">পাতায় শুধু <code>{{লে|L…}}</code> লেখা হয়; উইকিঅভিধানের মডিউল লেক্সিম থেকে অর্থ, রূপ, ব্যুৎপত্তি সব দেখায়, তাই পরে লেক্সিম বদলালে পাতাও নিজে থেকে হালনাগাদ হয়।</p>
    <div class="wikt-modes" role="radiogroup" aria-label="উইকিঅভিধানে কী করবে">
      <label><input type="radio" name="wikt" value="off"> কিছু করবেন না</label>
      <label><input type="radio" name="wikt" value="create"> পাতা না থাকলে তৈরি করুন <small>(অন্য লেক্সিমের {{লে}} থাকলে পাশে যোগ হবে)</small></label>
      <label><input type="radio" name="wikt" value="replace"> হাতে লেখা পাতাও প্রতিস্থাপন করুন <small>(আগে নিশ্চিত করতে হবে; পুরোনো লেখা ইতিহাসে থাকবে)</small></label>
    </div>
    <div class="wikt-status" id="wikt-status"></div>`;
  const anchor = document.querySelector("#p-review .blk");
  anchor.after(box);
  box.querySelectorAll('input[name="wikt"]').forEach(r => { r.checked = r.value === mode; r.onchange = () => { mode = r.value; try { localStorage.setItem("lx_wikt_mode", mode); } catch (e) {} draw(); }; });

  // What is on bn.wiktionary under this title now.
  let seq = 0, t;
  async function check() {
    const title = (draft.lemma || "").trim(); const my = ++seq;
    if (!title) { page = null; return draw(); }
    $("#wikt-status").innerHTML = `<span class="muted">উইকিঅভিধানে “${esc(title)}” দেখা হচ্ছে…</span>`;
    try {
      const j = await api(WIKT, { action: "query", titles: title, prop: "revisions", rvprop: "content", rvslots: "main", redirects: "1" });
      if (my !== seq) return;
      const pg = j.query.pages[0], text = pg.missing ? "" : pg.revisions?.[0]?.slots?.main?.content || "";
      const lexemes = [...text.matchAll(LEX_RX)].map(m => m[1]);
      const rest = text.replace(/\{\{\s*লে\s*\|[^}]*\}\}/g, "").replace(/\{\{[^{}]*\}\}/g, "").replace(/\[\[(বিষয়শ্রেণী|Category):[^\]]*\]\]/gi, "").trim();
      page = { title: pg.title || title, exists: !pg.missing, text, lexemes, handWritten: !!rest, bn: window.LX?.wikt ? LX.wikt.parse(text, "bn") : null };
    } catch (e) { page = { title, error: e.message }; }
    draw(); drawRef();
  }
  // Reference box under the search hits: what bn.wiktionary says (CC BY-SA, so shown, never copied).
  const ref = document.createElement("div"); ref.id = "wikt-ref"; $("#found").after(ref);
  function drawRef() {
    const b = page?.bn;
    if (!page || page.error) { ref.innerHTML = ""; return; }
    if (!page.exists) { ref.innerHTML = `<div class="msg wikt-ref"><b>বাংলা উইকিঅভিধান:</b> “${esc(page.title)}” পাতাটি নেই।</div>`; return; }
    // Built from lexemes: the lexeme is the content, so only the link. Hand-written: show what it says.
    if (page.lexemes.length && !page.handWritten) {
      ref.innerHTML = `<div class="msg wikt-ref"><b>বাংলা উইকিঅভিধানে আছে:</b> <a href="${PAGE(page.title)}" target="_blank" rel="noopener">${esc(page.title)} ↗</a> <span class="muted">— লেক্সিম থেকে তৈরি: ${page.lexemes.map(l => `<a href="https://www.wikidata.org/wiki/Lexeme:${l}" target="_blank" rel="noopener">${l}</a>`).join(", ")}</span></div>`;
      return;
    }
    if (!b || !b.pos.length) { // hand-written in a layout the parser cannot read: show the text itself
      const plain = page.text.replace(/\{\{[^{}]*\}\}/g, "").replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/'{2,}/g, "").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
      ref.innerHTML = `<details class="msg wikt-ref" open><summary><b>বাংলা উইকিঅভিধানে আছে:</b> <a href="${PAGE(page.title)}" target="_blank" rel="noopener">${esc(page.title)} ↗</a></summary><pre class="wikt-pre">${esc(plain.slice(0, 2500))}</pre><div class="wikt-lic">শুধু দেখার জন্য (CC BY-SA) — সংজ্ঞা নিজের ভাষায় লিখুন।</div></details>`;
      return;
    }
    const cats = CFG.categories;
    // Collapsible; the open/closed choice is remembered.
    let open = true; try { open = localStorage.getItem("lx_wikt_ref_open") !== "0"; } catch (e) {}
    const n = b.pos.reduce((a, p) => a + p.defs.length, 0);
    ref.innerHTML = `<details class="msg wikt-ref"${open ? " open" : ""}><summary><b>বাংলা উইকিঅভিধানে আছে:</b> ${esc(page.title)} <span class="muted">· ${b.pos.map(p => esc(p.label || p.key)).join(", ")}${n ? ` · ${toBn(n)}টি অর্থ` : ""}</span></summary>
      <div class="wikt-ref-body"><a href="${PAGE(page.title)}" target="_blank" rel="noopener">উইকিঅভিধানে পাতাটি খুলুন ↗</a>
      ${page.lexemes.length ? ` <span class="muted">(লেক্সিম: ${page.lexemes.map(l => `<a href="https://www.wikidata.org/wiki/Lexeme:${l}" target="_blank" rel="noopener">${l}</a>`).join(", ")})</span>` : ""}
      ${b.pos.map(p => { const c = cats.find(x => x.key === p.key);
        return `<div class="wikt-pos">${c ? `<button type="button" class="btn ghost small" data-wikt-cat="${c.qid}" title="শব্দশ্রেণি হিসেবে বসান">${esc(c.bn)} বসান</button>` : `<span class="chip">${esc(p.label)}</span>`}
          ${p.defs.length ? `<ol>${p.defs.slice(0, 6).map(d => `<li>${esc(d)}</li>`).join("")}</ol>` : ""}</div>`; }).join("")}
      ${b.pron.length ? `<div class="muted">উচ্চারণ: ${esc(b.pron.slice(0, 2).join(" · "))}</div>` : ""}
      ${b.ety.length ? `<div class="muted">ব্যুৎপত্তি: ${esc(b.ety.slice(0, 2).join(" · "))}</div>` : ""}
      <div class="wikt-lic">উইকিঅভিধানের লেখা CC BY-SA লাইসেন্সে; উইকি উপাত্ত CC0। তাই এই লেখা শুধু দেখার জন্য — সংজ্ঞা নিজের ভাষায় লিখুন। শব্দশ্রেণি, রূপ ও উৎসের মতো তথ্য নেওয়া যায়।</div></div></details>`;
    ref.querySelector("details").addEventListener("toggle", e => { try { localStorage.setItem("lx_wikt_ref_open", e.target.open ? "1" : "0"); } catch (err) {} });
    ref.querySelectorAll("[data-wikt-cat]").forEach(btn => btn.onclick = () => { draft.category = btn.dataset.wiktCat; renderHero(); rerender("forms,senses,lexeme"); btn.textContent = "✓ বসানো হলো"; });
  }
  const schedule = () => { clearTimeout(t); t = setTimeout(check, 600); };
  // What a save would do, given the page and the chosen mode.
  function plan(lid) {
    if (!page || page.error || mode === "off") return { act: "none" };
    if (lid && page.lexemes.includes(lid)) return { act: "none", why: "পাতায় এই লেক্সিম আগে থেকেই আছে" };
    if (!page.exists) return { act: "create", text: `{{লে|${lid || "L…"}}}` };
    if (!page.handWritten) return { act: "append", text: page.text.replace(/\s*$/, "") + `\n{{লে|${lid || "L…"}}}` };
    if (mode === "replace") return { act: "replace", text: `{{লে|${lid || "L…"}}}` };
    return { act: "none", why: "পাতাটি হাতে লেখা; বদলাতে “প্রতিস্থাপন” বাছুন" };
  }
  function draw() {
    const s = $("#wikt-status"); if (!s) return;
    if (!page) { s.innerHTML = ""; return; }
    if (page.error) { s.innerHTML = `<div class="msg err">উইকিঅভিধানে দেখা যায়নি: ${esc(page.error)}</div>`; return; }
    const link = `<a href="${PAGE(page.title)}" target="_blank" rel="noopener">${esc(page.title)}</a>`;
    const state = !page.exists ? `উইকিঅভিধানে ${link} পাতাটি নেই।`
      : page.lexemes.length && !page.handWritten ? `${link} পাতাটি লেক্সিম থেকে তৈরি ({{লে|${page.lexemes.join("}}, {{লে|")}}})।`
      : `${link} পাতাটি হাতে লেখা${page.lexemes.length ? ` (সঙ্গে {{লে|${page.lexemes.join("}}, {{লে|")}}})` : ""}।`;
    const p = plan(draft.existingId);
    const what = mode === "off" ? "সংরক্ষণের সময় উইকিঅভিধানে কিছু করা হবে না।"
      : p.act === "create" ? "সংরক্ষণের পর নতুন পাতা তৈরি হবে।" : p.act === "append" ? "সংরক্ষণের পর পাতায় এই লেক্সিম যোগ হবে।"
      : p.act === "replace" ? "<b>সংরক্ষণের পর পুরো পাতা {{লে}} দিয়ে প্রতিস্থাপন হবে</b> — আগে নিশ্চিত করতে বলা হবে।" : (p.why || "") + "।";
    s.innerHTML = `<div class="msg${p.act === "replace" ? " warn" : ""}">${state} ${what}</div>
      ${page.exists && page.handWritten ? `<details><summary>বর্তমান লেখা দেখুন</summary><pre class="wikt-pre">${esc(page.text.slice(0, 4000))}${page.text.length > 4000 ? "\n…" : ""}</pre></details>` : ""}`;
  }

  // After a successful save: do it, with a final confirmation for replacing hand-written text.
  window.LX_afterSave = async function (lid) {
    if (mode === "off") return;
    const linkify = s => s.replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
    const log = m => { const lb = $("#submit-log"); if (lb) { lb.hidden = false; lb.insertAdjacentHTML("beforeend", `<div>${linkify(esc(m))}</div>`); } };
    await check();
    const p = plan(lid);
    // Nothing to do: say why in the save log, so a skipped step (e.g. a hand-written page) is never silent.
    if (p.act === "none") {
      if (page?.error) log(`উইকিঅভিধান: দেখা যায়নি — ${page.error}`);
      else if (p.why) log(`উইকিঅভিধান: কিছু করা হয়নি — ${p.why} (${PAGE(page.title)})`);
      return;
    }
    if (p.act === "replace" && !confirm(`উইকিঅভিধানের “${page.title}” পাতাটি হাতে লেখা। পুরো লেখা মুছে শুধু {{লে|${lid}}} রাখা হবে (পুরোনো লেখা পাতার ইতিহাসে থাকবে)। নিশ্চিত?`)) { log("উইকিঅভিধান: প্রতিস্থাপন বাতিল করা হলো।"); return; }
    try {
      const token = await csrf(WIKT);
      const summary = { create: `লেক্সিম.বাংলা: উইকি উপাত্ত লেক্সিম ${lid} থেকে পাতা ({{লে}})`, append: `লেক্সিম.বাংলা: লেক্সিম ${lid} যোগ ({{লে}})`, replace: `লেক্সিম.বাংলা: হাতে লেখা পাতা উইকি উপাত্ত লেক্সিম ${lid} ({{লে}}) দিয়ে প্রতিস্থাপন` }[p.act];
      const params = { action: "edit", title: page.title, text: p.text, summary, token, ...(p.act === "create" ? { createonly: "1" } : { nocreate: "1" }) };
      const r = await api(WIKT, params, { post: true });
      log(`উইকিঅভিধান: ${r.edit?.result === "Success" ? "সম্পন্ন" : JSON.stringify(r.edit || r)} — ${PAGE(page.title)}`);
    } catch (e) { log("উইকিঅভিধান: হয়নি — " + e.message); }
  };

  // Lookup sources next to “খুঁজুন”: [ডাটা] Wikidata lexemes, [অভিধান] bn.wiktionary — both on by default.
  const SRC = { wd: true, wikt: true };
  try { Object.assign(SRC, JSON.parse(localStorage.getItem("lx_wiz_src") || "{}")); } catch (e) {}
  const drawSrc = () => {
    $("#src-wd")?.setAttribute("aria-pressed", String(SRC.wd)); $("#src-wikt")?.setAttribute("aria-pressed", String(SRC.wikt));
    document.body.classList.toggle("no-wikt", !SRC.wikt);
  };
  ["wd", "wikt"].forEach(k => $(`#src-${k}`)?.addEventListener("click", () => {
    SRC[k] = !SRC[k]; if (!SRC.wd && !SRC.wikt) SRC[k === "wd" ? "wikt" : "wd"] = true; // one stays on
    try { localStorage.setItem("lx_wiz_src", JSON.stringify(SRC)); } catch (e) {} drawSrc();
  }));
  drawSrc();
  document.addEventListener("click", e => {
    if (!e.target.closest("#lookup")) return;
    if (SRC.wikt) { check().then(() => { const d = ref.querySelector("details"); if (d) d.open = true; }); }
    if (!SRC.wd) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  // Re-check when the word changes or the review tab is opened.
  document.addEventListener("input", e => { if (e.target.id === "lemma") schedule(); });
  document.addEventListener("click", e => { if (e.target.closest('[data-tab="review"]')) check(); });
  const origLoad = loadExisting; // also refresh after a lexeme is loaded
  loadExisting = async function (lid) { const r = await origLoad(lid); schedule(); return r; };
  schedule();
})();
