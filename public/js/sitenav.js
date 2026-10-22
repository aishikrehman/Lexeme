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
  const page = /collection/.test(location.pathname) ? `collection-${curCat}` : isBulkPage ? "bulk" : (file.replace(/\.html$/, "") || "index");
  const links = [["index.html", "অভিধান", "index"], ["search.html", "", "search"], ["browse.html", "শব্দক্রম", "browse"], ["collection.html?cat=idiom", "বাগধারা", "collection-idiom"], ["collection.html?cat=proverb", "প্রবাদ", "collection-proverb"], ["wizard.html", "লেক্সিম উইজার্ড", "wizard"], ["wizard.html?mode=bulk", "একসঙ্গে অনেক", "bulk"]];
  let user = ""; try { user = sessionStorage.getItem("wd_token") ? sessionStorage.getItem("wd_user") || "" : ""; } catch (e) {}
  const nav = document.createElement("nav");
  nav.className = "sitenav"; nav.setAttribute("aria-label", "সাইটের পাতা");
  nav.innerHTML = `<div class="sn-in"><a class="logo" href="${cleanUrl("index.html")}">লেক্সিম<b>.</b>বাংলা</a><button type="button" class="sn-burger" aria-label="মেনু" aria-expanded="false"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><span class="sn-links">${links.filter(l => l[2] !== "search").map(([h, t, k]) => `<a class="nl" href="${cleanUrl(h)}"${k === page ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</span>
    <span class="nav-acct" id="nav-acct"><a class="nl-btn" href="${cleanUrl("search.html")}"${page === "search" ? ' aria-current="page"' : ""}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>অনুসন্ধান</span></a><button type="button" class="login-btn${user ? " on" : ""}" id="login-btn"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>${user ? user.replace(/[<>&"]/g, "") : "লগ ইন"}</span></button></span></div>`;
  document.body.prepend(nav);
  // Phones: the page links fold into the ☰ button.
  const burger = nav.querySelector(".sn-burger");
  burger.addEventListener("click", () => { const open = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", String(open)); });
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
