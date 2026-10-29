"use strict";
// Deep links into the Lexeme Wizard from the reader:
//   /wizard.html?id=L123            → load an existing lexeme for updating
//   /wizard.html?id=L123&return=1   → …and come back to its reading page after saving
//   /wizard.html?lemma=শব্দ&cat=noun → start a new entry prefilled (return=1 opens the new word after saving)
//   /bulk (or wizard.html?mode=bulk) → the separate “একসঙ্গে অনেক” page (spreadsheet, bulk-sheet.js)
//   /wizard?from=bulk               → a row sent from the bulk sheet, opened for detailed editing
(function () {
  const q = new URLSearchParams(location.search);
  const ret = q.get("return") === "1";
  const readUrl = lid => (window.LX_NODE ? `/word/${lid}` : `word.html?id=${lid}`);

  // One language only: the language, item and code fields have nothing to choose — hide them.
  if (CFG.languages.length < 2) ["#lang-preset", "#lang-q", "#lang-code"].forEach(s => { const f = $(s)?.closest(".f"); if (f) f.hidden = true; });
  // Two separate pages from one engine: /wizard = one lexeme at a time, /bulk = many lexemes (spreadsheet).
  const isBulk = /\/bulk\/?$/.test(location.pathname) || q.get("mode") === "bulk";
  if (isBulk) {
    document.body.classList.add("is-bulk");
    setMode(true); setBulkView("table");
    $(".top .bname").textContent = "একসঙ্গে অনেক লেক্সিম";
    $(".top .bsub").textContent = "স্প্রেডশিটে অনেক শব্দ একসঙ্গে লিখুন বা পেস্ট করুন, যাচাই করুন, তারপর একবারে উইকি উপাত্তে সংরক্ষণ করুন";
    document.title = "একসঙ্গে অনেক · লেক্সিম.বাংলা";
  } else setMode(false);
  // (no fixed save bar: the review tab has the save button, with its checks and log)

  // A row sent from the bulk sheet (“উইজার্ডে খুলুন”) becomes the draft here.
  if (!isBulk && q.get("from") === "bulk") {
    let row = null; try { row = JSON.parse(sessionStorage.getItem("lx_bulk_row") || "null"); sessionStorage.removeItem("lx_bulk_row"); } catch (e) {}
    if (row) {
      draft = rowToDraft(row); renderAll();
      $("#found").innerHTML = `<div class="msg ok">“${esc(draft.lemma || "")}” সারিটি একসঙ্গে-অনেক তালিকা থেকে খোলা হয়েছে। এখানে বিস্তারিত সম্পাদনা করে সরাসরি সংরক্ষণ করতে পারেন।</div>`;
      history.replaceState(null, "", location.pathname);
    }
  }

  // One login for the whole site (auth.js, header button). Header login/logout → the wizard picks it up;
  // the wizard's own account dialog (token paste, logout) → the header shows it.
  window.addEventListener("lx-auth", () => { auth.token = LXAuth.token(); refreshUser(); });
  // With the server login (OAuth 1.0a) the name comes from the server; the wizard's own “who am I” lookup
  // must not overwrite it (that caused the name to flash and turn into “অ্যাকাউন্ট”).
  if (window.LX_OAUTH1) {
    const origRefresh = refreshUser;
    refreshUser = async function () {
      auth.token = LXAuth.token();
      if (!auth.token) return origRefresh();
      auth.user = window.LX_USER || "";
      const b = $("#acct"); b.querySelector("span").textContent = auth.user; b.classList.toggle("on", true);
      renderReview();
    };
    setTimeout(() => refreshUser(), 0);
  }
  let lastUser = null;
  setInterval(() => {
    if (auth.user === lastUser) return; lastUser = auth.user;
    if (!window.LX_OAUTH1) { try { auth.user ? sessionStorage.setItem("wd_user", auth.user) : sessionStorage.removeItem("wd_user"); } catch (e) {} }
    LXAuth.render();
  }, 700);

  // After a successful save in single mode, go back to reading that word (fresh from Wikidata).
  let saving = false;
  $("#submit").addEventListener("click", () => { saving = true; }, true);
  const origLoad = loadExisting;
  loadExisting = async function (lid) {
    // Right after a successful save: optional follow-up steps (e.g. the bn.wiktionary page, wikt-page.js).
    // Show the saved lexeme in the save bar: “✓ L123 সংরক্ষিত [দেখুন]”.
    if (saving) { const d = $("#save-done"); if (d) { d.hidden = false; d.innerHTML = `✓ ${esc(lid)} সংরক্ষিত <a href="https://www.wikidata.org/wiki/Lexeme:${esc(lid)}" target="_blank" rel="noopener">[দেখুন]</a>`; } }
    if (saving && window.LX_afterSave) { try { await window.LX_afterSave(lid); } catch (e) { console.warn(e); } }
    if (saving && ret) { saving = false; try { sessionStorage.setItem("lx_fresh", lid); } catch (e) {} location.href = readUrl(lid); return; }
    saving = false; return origLoad(lid);
  };

  if (q.get("code")) return; // OAuth callback is handled by wizard.js
  if (window.LX_STASHED) return; // work from before the login is back on screen; don't load ?id / ?lemma over it
  if (q.get("login") === "1" && !LXAuth.token()) setTimeout(() => LXAuth.login(), 300); // old links
  const id = q.get("id"), lemma = q.get("lemma"), lang = q.get("lang"), cat = q.get("cat");
  if (lang) { const s = $("#lang-preset"); if ([...s.options].some(o => o.value === lang)) { s.value = lang; s.dispatchEvent(new Event("change")); } }
  if (cat) { const c = CFG.categories.find(x => x.key === cat || x.qid === cat); if (c) { draft.category = c.qid; renderHero(); } }
  const backBtn = lid => ` <a class="btn ghost small" href="${readUrl(lid)}">${ret ? "সম্পাদনা না করে পড়ার পাতায় ফিরুন" : "অভিধানে দেখুন"}</a>`;
  if (id && /^L\d+$/.test(id)) { origLoad(id).then(() => { $("#found .msg.ok")?.insertAdjacentHTML("beforeend", backBtn(id)); }).catch(e => { $("#found").innerHTML = `<div class="msg err">${esc(id)} লোড করা যায়নি: ${esc(e.message)}</div>`; }); }
  else if (lemma) { const el = $("#lemma"); el.value = lemma; el.dispatchEvent(new Event("input", { bubbles: true })); }
  // From the studio's upload list (“＋ লেক্সিম বানান”): the recording already on Commons becomes the pronunciation (P443).
  const audio = q.get("audio");
  if (audio && /\.(wav|ogg|oga|opus|flac|mp3|webm)$/i.test(audio) && !draft.claims.some(c => c.prop === "P443" && c.value === audio)) { draft.claims.push(newClaim("P443", audio)); renderAll(); }
})();
