"use strict";
// /bulk: import from bn.wiktionary — Bengali entries that have no Wikidata lexeme yet. Chosen words become
// sheet rows (word, word class, language, a link to the bn.wiktionary page). Definitions are NOT copied:
// bn.wiktionary is CC BY-SA, Wikidata is CC0 — they are shown here for reference and written by the user.
(function () {
  if (!document.body.classList.contains("is-bulk") || !window.BulkSheet) return;
  const menu = document.querySelector('.bs-menu[data-menu="file"]'); if (!menu) return;
  const item = document.createElement("button");
  item.className = "bs-mi"; item.type = "button";
  item.innerHTML = `<svg class="ic" viewBox="0 0 24 24"><path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6"/></svg>উইকিঅভিধান থেকে আনুন <small>উইকি উপাত্তে নেই এমন শব্দ</small>`;
  menu.insertBefore(item, menu.querySelector(".bs-msep"));

  const panel = document.createElement("section");
  panel.className = "wk-panel"; panel.hidden = true;
  panel.innerHTML = `<div class="wk-head"><b>বাংলা উইকিঅভিধানে আছে, উইকি উপাত্তে নেই</b><span class="muted" id="wk-count"></span>
      <button type="button" class="ve-btn" id="wk-close" aria-label="বন্ধ">✕</button></div>
    <div class="wk-tools"><input class="in" id="wk-q" placeholder="শব্দ খুঁজুন" aria-label="শব্দ খুঁজুন">
      <label><input type="checkbox" id="wk-all"> এই পাতার সব</label>
      <button type="button" class="btn small" id="wk-add" disabled>নির্বাচিতগুলো তালিকায় যোগ করুন</button><span class="muted" id="wk-msg"></span></div>
    <div class="wk-list" id="wk-list"></div>
    <div class="wk-foot"><button type="button" class="btn ghost small" id="wk-more" hidden>আরও দেখান</button>
      <span class="wk-lic">উইকিঅভিধানের সংজ্ঞা CC BY-SA, উইকি উপাত্ত CC0 — তাই সংজ্ঞা কপি হয় না; শুধু শব্দ, শব্দশ্রেণি ও পাতার লিংক আসে। সংজ্ঞা নিজের ভাষায় লিখুন।</span></div>`;
  document.getElementById("bulk-grid-wrap").before(panel);

  let offset = 0, q = "", timer, loading = false;
  const chosen = new Set();
  const $p = s => panel.querySelector(s);
  async function load(reset) {
    if (loading) return; loading = true;
    if (reset) { offset = 0; $p("#wk-list").innerHTML = '<div class="muted" style="padding:10px">লোড হচ্ছে…</div>'; }
    try {
      const j = await getJSONsafe(`/api/wikt/missing?${new URLSearchParams({ q, offset, limit: 100 })}`);
      if (!j.ready) {
        $p("#wk-list").innerHTML = `<div class="msg">উইকিঅভিধানের তালিকা তৈরি হচ্ছে (প্রথমবার কয়েক মিনিট লাগে, উইকিমিডিয়ার গতিসীমা মেনে)। একটু পরে আবার খুলুন।${j.error ? " — " + esc(j.error) : ""}</div>`;
        $p("#wk-count").textContent = ""; loading = false; return;
      }
      $p("#wk-count").textContent = `${toBn(j.total)}টি শব্দ${j.checked ? "" : " (উইকি উপাত্তের সূচি তৈরি হচ্ছে, তাই কিছু আগে থেকে থাকা শব্দও দেখাতে পারে)"}`;
      const html = j.list.map(t => `<label class="wk-row"><input type="checkbox" value="${esc(t)}"${chosen.has(t) ? " checked" : ""}><span class="wk-t">${esc(t)}</span>
        <a href="https://bn.wiktionary.org/wiki/${encodeURIComponent(t)}" target="_blank" rel="noopener" class="muted">উইকিঅভিধান ↗</a>
        <button type="button" class="ve-btn wk-peek" data-t="${esc(t)}" title="উইকিঅভিধানে কী লেখা আছে দেখুন">দেখুন</button><div class="wk-ref" hidden></div></label>`).join("");
      if (reset) $p("#wk-list").innerHTML = html || '<div class="muted" style="padding:10px">কিছু পাওয়া যায়নি।</div>'; else $p("#wk-list").insertAdjacentHTML("beforeend", html);
      offset += j.list.length; $p("#wk-more").hidden = offset >= j.total;
    } catch (e) { $p("#wk-list").innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
    loading = false;
  }
  // The wiktionary endpoints exist only on the Node server.
  async function getJSONsafe(u) { const r = await fetch(u); const j = await r.json().catch(() => null); if (!r.ok || !j) throw new Error(j?.error || "এই সুবিধা শুধু Node সার্ভারে চলে"); return j; }
  const sync = () => { $p("#wk-add").disabled = !chosen.size; $p("#wk-msg").textContent = chosen.size ? `${toBn(chosen.size)}টি বাছাই` : ""; };

  item.addEventListener("click", () => { panel.hidden = false; if (!$p("#wk-list").children.length) load(true); panel.scrollIntoView({ block: "start", behavior: "smooth" }); });
  $p("#wk-close").onclick = () => { panel.hidden = true; };
  $p("#wk-q").addEventListener("input", e => { clearTimeout(timer); timer = setTimeout(() => { q = e.target.value.trim(); load(true); }, 300); });
  $p("#wk-more").onclick = () => load(false);
  panel.addEventListener("change", e => {
    if (e.target.id === "wk-all") { panel.querySelectorAll('.wk-row input[type="checkbox"]').forEach(c => { c.checked = e.target.checked; c.checked ? chosen.add(c.value) : chosen.delete(c.value); }); return sync(); }
    const c = e.target.closest('.wk-row input[type="checkbox"]'); if (!c) return;
    c.checked ? chosen.add(c.value) : chosen.delete(c.value); sync();
  });
  panel.addEventListener("click", async e => {
    const b = e.target.closest(".wk-peek"); if (!b) return; e.preventDefault();
    const box = b.parentElement.querySelector(".wk-ref"); if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.textContent = "লোড হচ্ছে…";
    try { const en = await getJSONsafe(`/api/wikt/entry?title=${encodeURIComponent(b.dataset.t)}`);
      const pos = en.bn?.pos || [];
      box.innerHTML = pos.length ? pos.map(p => `<div><span class="chip">${esc(p.label || p.key)}</span> ${esc(p.defs.slice(0, 3).join(" · "))}</div>`).join("") + '<div class="wk-lic">শুধু দেখার জন্য (CC BY-SA)</div>' : '<span class="muted">বাংলা অংশ পড়া যায়নি।</span>';
    } catch (err) { box.textContent = err.message; }
  });
  // Add the chosen words: one row per word class found on the page (or one row without a class).
  $p("#wk-add").onclick = async () => {
    const list = [...chosen]; const rows = [];
    $p("#wk-add").disabled = true;
    for (let i = 0; i < list.length; i++) {
      $p("#wk-msg").textContent = `উইকিঅভিধান পড়া হচ্ছে ${toBn(i + 1)}/${toBn(list.length)}…`;
      let keys = [];
      try { const en = await getJSONsafe(`/api/wikt/entry?title=${encodeURIComponent(list[i])}`); keys = [...new Set((en.bn?.pos || []).map(p => p.key).filter(Boolean))]; } catch (e) {}
      const link = `https://bn.wiktionary.org/wiki/${encodeURIComponent(list[i])}`;
      (keys.length ? keys : [""]).forEach(k => rows.push({ lemma: list[i], category: k,
        generate_forms: ["noun", "verb", "adjective", "proper_noun"].includes(k) ? "yes" : "", wiktionary: link }));
      await new Promise(r => setTimeout(r, 250));
    }
    BulkSheet.addRows(rows);
    chosen.clear(); panel.querySelectorAll('.wk-row input[type="checkbox"]').forEach(c => { c.checked = false; }); $p("#wk-all").checked = false;
    $p("#wk-msg").textContent = `${toBn(rows.length)}টি সারি তালিকায় যোগ হলো। সংজ্ঞা নিজের ভাষায় লিখে যাচাই করুন।`;
  };
  if (typeof COL_BN === "object") COL_BN.wiktionary = "উইকিঅভিধান";
})();
