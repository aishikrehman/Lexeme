"use strict";
// Shared header for every page (reader pages and the wizard): navigation, search box, account and theme buttons.
// Reading never needs an account; logging in is only for creating or editing lexemes in the wizard.

/* Clean URLs. Behind the Node server (window.LX_NODE) pages live at /, /search, /browse, /word/L123,
   /etymology/L123, /collection/idiom, /wizard. Opened as plain files the .html names keep working.
   Code may write either form; cleanUrl() turns a .html link into the clean one. */
function cleanUrl(href) {
  if (!window.LX_NODE || !href || /^(https?:|mailto:|#|\/api\/|\/proxy\/)/.test(href)) return href;
  const m = String(href).match(/^\/?([a-z]+)\.html(?:\?([^#]*))?(#.*)?$/); if (!m) return href;
  const [, page, query = "", hash = ""] = m; const q = new URLSearchParams(query);
  let path = page === "index" ? "/" : "/" + page;
  if ((page === "word" || page === "etymology") && /^L\d+$/.test(q.get("id") || "")) { path = `/${page}/${q.get("id")}`; q.delete("id"); }
  if (page === "collection" && /^(idiom|proverb)$/.test(q.get("cat") || "")) { path = `/collection/${q.get("cat")}`; q.delete("cat"); }
  if (page === "wizard" && q.get("mode") === "bulk") { path = "/bulk"; q.delete("mode"); }
  if (page === "sound") path = "/studio";
  const rest = q.toString();
  return path + (rest ? "?" + rest : "") + hash;
}
(function () {
  if (window.LX_NODE) {
    // Rewrite every link and form on the page, including ones added later by scripts.
    const fix = root => {
      root.querySelectorAll?.("a[href]").forEach(a => { const h = a.getAttribute("href"), c = cleanUrl(h); if (c !== h) a.setAttribute("href", c); });
      root.querySelectorAll?.("form[action]").forEach(f => { const h = f.getAttribute("action"), c = cleanUrl(h); if (c !== h) f.setAttribute("action", c); });
      if (root.matches?.("a[href]")) { const h = root.getAttribute("href"), c = cleanUrl(h); if (c !== h) root.setAttribute("href", c); }
    };
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && fix(n)))).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", () => fix(document));
    // Address bar: show the clean form even when a page was reached through an old .html link.
    const c = cleanUrl(location.pathname.replace(/^\//, "") + location.search + location.hash);
    if (c && c !== location.pathname + location.search + location.hash && /\.html/.test(location.pathname)) history.replaceState(null, "", c);
  }

  const file = location.pathname.split("/").pop() || "index.html";
  const curCat = (location.pathname.match(/\/collection\/(idiom|proverb)/) || [])[1] || new URLSearchParams(location.search).get("cat");
  const isBulkPage = /\/bulk\/?$/.test(location.pathname) || (/wizard/.test(file) && new URLSearchParams(location.search).get("mode") === "bulk");
  const page = /\/studio\/?$/.test(location.pathname) ? "sound" : /\/libre\/?$/.test(location.pathname) ? "libre" : /collection/.test(location.pathname) ? `collection-${curCat}` : isBulkPage ? "bulk" : (file.replace(/\.html$/, "") || "index");
  const pageKey = page === "browse" && curCat ? `browse-${curCat}` : page;
  // Menu: অভিধান · তালিকা ▾ · লেক্সিম ▾ · লিব্রে স্টুডিও
  const chev = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
  const MENU = [
    ["অভিধান", "index.html", "index"],
    ["তালিকা", [["browse.html", "সব শব্দ", "browse", "বর্ণানুক্রমে, পাতায় পাতায়"],
      ...[["noun", "বিশেষ্য"], ["proper_noun", "নামবাচক বিশেষ্য"], ["pronoun", "সর্বনাম"], ["verb", "ক্রিয়া"], ["adjective", "বিশেষণ"], ["adverb", "ক্রিয়াবিশেষণ"], ["postposition", "অনুসর্গ"], ["conjunction", "সংযোজক অব্যয়"], ["interjection", "আবেগসূচক অব্যয়"], ["numeral", "সংখ্যাবাচক শব্দ"], ["phrase", "বাক্যাংশ"], ["prefix", "উপসর্গ"]]
        .map(([k, t]) => [`browse.html?cat=${k}`, t, `browse-${k}`]),
      ["collection.html?cat=idiom", "বাগধারা", "collection-idiom"], ["collection.html?cat=proverb", "প্রবাদ-প্রবচন", "collection-proverb"]], "grid"],
    ["লেক্সিম", [["wizard.html", "লেক্সিম উইজার্ড", "wizard", "একটি শব্দ যোগ বা সম্পাদনা"], ["wizard.html?mode=bulk", "একসঙ্গে অনেক", "bulk", "স্প্রেডশিটে অনেক শব্দ"], ["lexinary.html", "লেক্সিনারি উইজার্ড", "lexinary", "লেক্সিম থেকে উইকিঅভিধানের ভুক্তি"]]],
    ["লিব্রে স্টুডিও", "sound.html", "sound"],
  ];
  const cur = k => (k === pageKey ? ' aria-current="page"' : "");
  const P = { index: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13"/>', list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    lexeme: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5"/>', sound: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    browse: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>', idiom: '<path d="M5 8h5v5c0 3-2 5-5 5M14 8h5v5c0 3-2 5-5 5"/>',
    proverb: '<path d="M4 5h16v11H9l-5 4z"/>', libre: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', wizard: '<path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/>', bulk: '<path d="M3 5h18v14H3zM3 10h18M3 15h18M9 5v14"/>', lexinary: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM12 7v6M9 10h6"/>' };
  const ico = k => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k] || P[/^browse-/.test(k) ? "tag" : /^collection-idiom/.test(k) ? "idiom" : /^collection-proverb/.test(k) ? "proverb" : "list"]}</svg>`;
  const TOP = { "তালিকা": "list", "লেক্সিম": "lexeme", "লিব্রে স্টুডিও": "sound" };
  const menuHtml = MENU.map(([t, h, k]) => !Array.isArray(h) ? `<a class="nl" href="${cleanUrl(h)}"${cur(k)}>${ico(k)}${t}</a>`
    : `<span class="sn-drop${h.some(x => x[2] === pageKey) ? " on" : ""}${k === "grid" ? " sn-wide" : ""}"><button type="button" class="nl sn-dbtn" aria-expanded="false" aria-haspopup="true">${ico(TOP[t])}${t}${chev}</button>
      <span class="sn-dmenu"><span class="sn-dhead">${t}</span>${h.map(([u, n, kk, d]) => `<a href="${cleanUrl(u)}"${cur(kk)}>${ico(kk)}<span><b>${n}</b>${d ? `<small>${d}</small>` : ""}</span></a>`).join("")}</span></span>`).join("");
  let user = ""; try { user = sessionStorage.getItem("wd_token") ? sessionStorage.getItem("wd_user") || "" : ""; } catch (e) {}
  const nav = document.createElement("nav");
  nav.className = "sitenav"; nav.setAttribute("aria-label", "সাইটের পাতা");
  nav.innerHTML = `<div class="sn-in"><a class="logo" href="${cleanUrl("index.html")}"><span class="logo-mark" aria-hidden="true">অ</span><span>লেক্সিম<b>.</b>বাংলা</span></a><button type="button" class="sn-burger" aria-label="মেনু" aria-expanded="false"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><span class="sn-links">${menuHtml}</span>
    <span class="nav-acct" id="nav-acct"><a class="nl-btn" href="${cleanUrl("search.html")}"${page === "search" ? ' aria-current="page"' : ""}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>অনুসন্ধান</span></a><button type="button" class="login-btn${user ? " on" : ""}" id="login-btn"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>${user ? user.replace(/[<>&"]/g, "") : "লগ ইন"}</span></button></span></div>`;
  document.body.prepend(nav);
  // Phones: the page links fold into the ☰ button.
  const burger = nav.querySelector(".sn-burger");
  burger.addEventListener("click", () => { const open = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", String(open)); });
  const drops = [...nav.querySelectorAll(".sn-drop")];
  const setDrop = (d, o) => { d.classList.toggle("open", o); d.querySelector(".sn-dbtn").setAttribute("aria-expanded", String(o)); };
  drops.forEach(d => d.querySelector(".sn-dbtn").addEventListener("click", e => { e.stopPropagation(); const o = !d.classList.contains("open"); drops.forEach(x => setDrop(x, false)); setDrop(d, o); }));
  document.addEventListener("click", e => drops.forEach(d => { if (!d.contains(e.target)) setDrop(d, false); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") drops.forEach(d => setDrop(d, false)); });
  // Light / dark / auto — one button, same on every page (the choice is kept in localStorage "theme").
  const THEMES = [["auto", "স্বয়ংক্রিয়", '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>'],
    ["light", "হালকা", '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
    ["dark", "গাঢ়", '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>']];
  const tb = document.createElement("button"); tb.type = "button"; tb.className = "theme-btn"; tb.id = "theme-btn";
  nav.querySelector(".sn-in").appendChild(tb);
  const applyTheme = t => {
    if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    const [, label, icon] = THEMES.find(x => x[0] === t) || THEMES[0];
    tb.innerHTML = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    tb.title = `রং: ${label} (বদলাতে চাপুন)`; tb.setAttribute("aria-label", tb.title); tb.dataset.t = t;
    try { localStorage.setItem("theme", t); } catch (e) {}
  };
  tb.addEventListener("click", () => { const i = THEMES.findIndex(x => x[0] === (tb.dataset.t || "auto")); applyTheme(THEMES[(i + 1) % 3][0]); });
  applyTheme((() => { try { return localStorage.getItem("theme") || "auto"; } catch (e) { return "auto"; } })());
  // The login button is handled by auth.js on every page (straight to Wikimedia).
})();
