"use strict";
// Wikimedia login for every page (OAuth 2.0 with PKCE), straight from the header button.
// Reading never needs it; it is only for creating or editing lexemes. The token lives in this tab's
// sessionStorage ("wd_token"), which the wizard also reads, so one login serves the whole site.
// The OAuth callback is always the site root, so a single callback URL is registered on the consumer;
// after login you are brought back to the page you started from.
const LXAuth = (function () {
  const OAUTH = {
    clientId: "", // only for an OAuth 2.0 consumer; the site's OAuth 1.0a login runs on the Node server
    authorize: "https://meta.wikimedia.org/w/rest.php/oauth2/authorize",
    token: "https://meta.wikimedia.org/w/rest.php/oauth2/access_token",
  };
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Server-configured OAuth 2 ID first, then one entered earlier. (A stored dummy ID is ignored.)
  const clientId = () => [window.LX_OAUTH_CLIENT, ls.get("oa_client"), OAUTH.clientId].map(x => (x || "").trim()).find(x => x && !/^0+$/.test(x)) || "";
  const callbackUri = () => new URL(window.LX_NODE ? "/" : "index.html", location.href).href.split("?")[0];
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  // Behind the Node server with an OAuth 1.0a consumer (window.LX_OAUTH1) the whole login happens on the server:
  // the page only learns the user name (window.LX_USER); API calls are signed by the server's /proxy.
  // "server-session" stands in for the token so the wizard knows it is logged in.
  const server = () => !!window.LX_OAUTH1;
  if (server()) { ss.set("wd_token", window.LX_USER ? "server-session" : null); ss.set("wd_user", window.LX_USER || null); }
  const token = () => ss.get("wd_token") || "";
  const user = () => (token() ? ss.get("wd_user") || "" : "");

  async function login(id = clientId()) {
    if (server() && window.LX_PASTEBACK) return pasteBackLogin();
    if (server()) { location.href = "/auth/login?back=" + encodeURIComponent(location.pathname + location.search + location.hash); return; }
    // Without the Node server there is nowhere to keep the OAuth 1.0a secret, so login cannot start.
    // Served by Node but no consumer configured (e.g. a host without the OAUTH_* environment variables).
    if (!id && window.LX_NODE) { note("এই সার্ভারে লগ ইন এখনো চালু করা হয়নি (OAUTH_CONSUMER_KEY / OAUTH_CONSUMER_SECRET / PUBLIC_URL সেট করা নেই)। পড়তে লগ ইন লাগে না।"); return; }
    if (!id) { note("লগ ইনের জন্য সার্ভার চালু করুন: npm start, তারপর সার্ভারের ঠিকানা খুলুন। পড়তে লগ ইন লাগে না।"); return; }
    if (location.protocol === "file:") { alert("লগ ইনের জন্য পাতাটি সার্ভার দিয়ে খুলতে হবে (npm start, তারপর http://localhost:3000)।"); return; }
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
    ss.set("lx_pkce", JSON.stringify({ verifier, state, clientId: id, back: location.href })); ls.set("oa_client", id);
    const u = new URL(OAUTH.authorize);
    u.search = new URLSearchParams({ response_type: "code", client_id: id, redirect_uri: callbackUri(), code_challenge: challenge, code_challenge_method: "S256", state });
    location.href = u;
  }
  // Runs on the callback page (the site root): trade the code for a token, then go back.
  async function finish() {
    const q = new URLSearchParams(location.search); const code = q.get("code"); if (!code) return false;
    let saved; try { saved = JSON.parse(ss.get("lx_pkce") || "null"); } catch (e) {}
    if (!saved || saved.state !== q.get("state")) return false; // not ours (e.g. the wizard's own flow)
    ss.set("lx_pkce", null);
    history.replaceState(null, "", location.pathname);
    try {
      const res = await fetch(OAUTH.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: saved.clientId, code_verifier: saved.verifier, redirect_uri: callbackUri() }) });
      const j = await res.json();
      if (!j.access_token) throw new Error(j.error_description || j.error || res.status);
      await setToken(j.access_token);
      if (saved.back && saved.back !== location.href) location.href = saved.back;
    } catch (e) { alert("লগ ইন ব্যর্থ: " + e.message); }
    return true;
  }
  async function setToken(t) {
    ss.set("wd_token", t || null); ss.set("wd_user", null);
    if (t) {
      try {
        const r = await fetch("https://www.wikidata.org/w/api.php?action=query&meta=userinfo&format=json&formatversion=2&crossorigin=1", { headers: { Authorization: "Bearer " + t } });
        const j = await r.json(); if (!j.query?.userinfo?.anon) ss.set("wd_user", j.query.userinfo.name);
      } catch (e) {}
    }
    render(); window.dispatchEvent(new Event("lx-auth"));
  }
  const logout = async () => {
    if (server()) { try { await fetch("/auth/logout", { method: "POST" }); } catch (e) {} window.LX_USER = ""; ss.set("wd_token", null); ss.set("wd_user", null); render(); window.dispatchEvent(new Event("lx-auth")); return; }
    return setToken("");
  };

  // Consumer whose callback is another address (e.g. http://127.0.0.1:5000/): Wikimedia opens in a new tab;
  // after approving, that tab lands on the callback address — copy it and paste it here to finish.
  async function pasteBackLogin() {
    const b = document.getElementById("login-btn"); if (!b) return;
    const w = window.open("about:blank", "_blank");
    let j; try { j = await (await fetch("/auth/login?json=1&back=" + encodeURIComponent(location.pathname))).json(); } catch (e) { j = { error: e.message }; }
    if (!j.url) { w?.close(); note("লগ ইন শুরু করা যায়নি: " + (j.error || "")); return; }
    if (w) w.location = j.url; else window.open(j.url, "_blank");
    let m = document.getElementById("lx-paste");
    if (!m) { m = document.createElement("div"); m.id = "lx-paste"; m.className = "lx-menu lx-paste"; b.closest(".sn-in").appendChild(m); }
    m.hidden = false;
    m.innerHTML = `<div class="lx-menu-who">লগ ইন শেষ করুন<small>নতুন ট্যাবে উইকিমিডিয়ায় অনুমতি দিন। তারপর সেই ট্যাব যে ঠিকানায় যাবে (পাতাটি না খুললেও), ঠিকানা-বার থেকে পুরো ঠিকানা কপি করে এখানে পেস্ট করুন।</small></div>
      <input id="lx-paste-in" placeholder="http://127.0.0.1:5000/…oauth_verifier=…" style="width:100%;box-sizing:border-box;margin:6px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--sunken);color:var(--ink)">
      <div style="display:flex;gap:6px"><button type="button" id="lx-paste-go" style="color:var(--primary)">লগ ইন শেষ করুন</button><button type="button" id="lx-paste-x" style="color:var(--muted)">বাতিল</button></div>
      <small id="lx-paste-msg" style="color:var(--err)"></small>`;
    const go = async () => {
      const v = m.querySelector("#lx-paste-in").value.trim(); if (!v) return;
      const r = await (await fetch("/auth/complete?u=" + encodeURIComponent(v))).json().catch(() => ({}));
      if (r.ok) location.reload(); else m.querySelector("#lx-paste-msg").textContent = r.error || "লগ ইন শেষ হয়নি। আবার লগ ইন চাপুন।";
    };
    m.querySelector("#lx-paste-go").onclick = go;
    m.querySelector("#lx-paste-in").addEventListener("paste", () => setTimeout(go, 50));
    m.querySelector("#lx-paste-x").onclick = () => { m.hidden = true; };
  }

  // A short message under the header button (no popup).
  function note(msg) {
    const b = document.getElementById("login-btn"); if (!b) return;
    let n = document.getElementById("lx-note");
    if (!n) { n = document.createElement("div"); n.id = "lx-note"; n.className = "lx-note"; n.setAttribute("role", "status"); b.closest(".sn-in").appendChild(n); }
    n.textContent = msg; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(() => (n.hidden = true), 7000);
  }

  /* header button + account dialog */
  function render() {
    const b = document.getElementById("login-btn"); if (!b) return;
    const u = user();
    b.classList.toggle("on", !!u);
    b.querySelector("span").textContent = u || (token() ? "অ্যাকাউন্ট" : "লগ ইন");
    b.title = u ? `${u} হিসেবে লগ ইন করা আছে` : "নতুন শব্দ যোগ বা সম্পাদনার জন্য লগ ইন (পড়তে লাগে না)";
  }
  // Logged in: a small dropdown under the header button (not a popup window) with the name and লগ আউট.
  function openMenu() {
    const b = document.getElementById("login-btn"); if (!b) return;
    let m = document.getElementById("lx-menu");
    if (m && !m.hidden) { m.hidden = true; return; } // second click closes it
    if (!m) {
      m = document.createElement("div"); m.id = "lx-menu"; m.className = "lx-menu"; m.setAttribute("role", "menu");
      b.closest(".sn-in").appendChild(m);
      document.addEventListener("click", e => { if (!m.hidden && !m.contains(e.target) && !b.contains(e.target)) m.hidden = true; });
      document.addEventListener("keydown", e => { if (e.key === "Escape") m.hidden = true; });
    }
    m.innerHTML = `<div class="lx-menu-who">${esc(user() || "অ্যাকাউন্ট")}<small>উইকিমিডিয়া অ্যাকাউন্টে লগ ইন করা আছে</small></div>
      <button type="button" role="menuitem" id="lx-logout">লগ আউট</button>`;
    m.querySelector("#lx-logout").onclick = async () => { m.hidden = true; await logout(); };
    m.hidden = false;
  }
  const openDialog = openMenu; // kept for older callers
  function bind() {
    const b = document.getElementById("login-btn"); if (!b || b.dataset.bound) return; b.dataset.bound = 1;
    // Logged out → straight to Wikimedia's login. Logged in → the small dropdown (name, লগ আউট).
    b.addEventListener("click", () => (user() || token() ? openMenu() : login()));
    render();
  }
  bind(); finish();
  // Logged in, but the consumer's grants cannot edit (identity-only): explain once per page.
  if (server() && window.LX_USER && window.LX_CAN_EDIT === false)
    setTimeout(() => note("লগ ইন হয়েছে, কিন্তু এই OAuth consumer-এর সম্পাদনার অনুমতি নেই (শুধু পরিচয় যাচাই)। নতুন consumer নিবন্ধন করুন: Edit existing pages, Create, edit, and move pages, Upload new files।"), 300);
  // Result of a server login that did not complete (…?login=failed / nosession): say why, then tidy the URL.
  (() => {
    const q = new URLSearchParams(location.search), r = q.get("login"); if (!r || r === "1") return;
    note(r === "nosession"
      ? "লগ ইন শেষ হয়নি: উইকিমিডিয়া অন্য ঠিকানায় ফিরিয়েছে। consumer-এর callback URL ঠিক এই ঠিকানা হতে হবে: " + location.origin + "/"
      : "লগ ইন শেষ হয়নি। আবার চেষ্টা করুন; সমস্যা থাকলে সার্ভারের উইন্ডোতে কারণ দেখা যাবে।");
    q.delete("login"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  })();
  return { login, logout, setToken, token, user, render, openDialog, callbackUri };
})();
