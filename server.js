"use strict";
// লেক্সিম.বাংলা — Node.js server (no external dependencies; Node 18+).
// Serves the reader/dictionary pages and the Lexeme Wizard, a cached JSON API over Wikidata,
// and a pass-through proxy the wizard uses for all Wikidata / Commons / SPARQL traffic.
require("./lib/log"); // first: keeps the last lines of console output for the admin dashboard
const http = require("http");
const fs = require("fs");
const path = require("path");
const R = require("./lib/reader");
const CFG = require("./lib/config");
const OAUTH1 = require("./lib/oauth1");
const SEO = require("./lib/seo");
const WIKT = require("./lib/wiktionary");
const FOOT = require("./lib/footer");
const SSR = require("./lib/ssr"); // <noscript> content: pages keep working with JavaScript blocked
const PANEL = require("./lib/panel"); // /settings, /feedback, /admin — server-made pages
const STORE = require("./lib/store"); // স্টুডিও লিব্রে: recordings and word lists per logged-in user // titles, descriptions, structured data, sitemap // Wikimedia OAuth 1.0a login, server-side (secret stays here)

// Port: PORT, or `node server.js 3001`, or the port of the public URL (oauth.local.json "publicUrl"), else 3000.
const PORT = +process.env.PORT || +process.argv[2] || +(OAUTH1.publicUrl && new URL(OAUTH1.publicUrl).port) || 3000;
const PUB = path.join(__dirname, "public");
const LIB = path.join(__dirname, "lib");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".wav": "audio/wav", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".ttf": "font/ttf", ".woff2": "font/woff2" };

// Pages have clean URLs only (no .html): /, /search, /browse, /wizard, /word/L123, /etymology/L123, /collection/idiom.
const CLEAN = [
  [/^\/$/, "index.html"],
  [/^\/(search|browse|wizard|lexinary)\/?$/, m => `${m[1]}.html`],
  [/^\/studio\/?$/, "sound.html"], // লিব্রে স্টুডিও
  [/^\/bulk\/?$/, "wizard.html"], // “একসঙ্গে অনেক” — same engine as the wizard, its own page
  [/^\/word\/(L\d+)\/?$/, "word.html"],
  [/^\/etymology\/(L\d+)\/?$/, "etymology.html"],
  [/^\/collection\/(idiom|proverb)\/?$/, "collection.html"],
];
// The pages link each other as x.html (they also work without this server); here those become clean URLs.
function cleanRedirect(p, search) {
  const q = new URLSearchParams(search);
  let to = null;
  if (/^\/wizard\/?$/.test(p) && q.get("mode") === "bulk") { q.delete("mode"); to = "/bulk"; }
  const m = p.match(/^\/(index|search|browse|wizard|lexinary|word|etymology|collection)\.html$/);
  if (m) {
    to = m[1] === "index" ? "/" : `/${m[1]}`;
    if ((m[1] === "word" || m[1] === "etymology") && /^L\d+$/.test(q.get("id") || "")) { to += "/" + q.get("id"); q.delete("id"); }
    if (m[1] === "wizard" && q.get("mode") === "bulk") { to = "/bulk"; q.delete("mode"); }
    if (m[1] === "collection") { to += "/" + (/^(idiom|proverb)$/.test(q.get("cat") || "") ? q.get("cat") : "idiom"); q.delete("cat"); }
  }
  if (!to) return null;
  const rest = q.toString();
  return to + (rest ? "?" + rest : "");
}
// Names, notice and footer text from the admin's site settings (safe to put inside a <script>).
// the dictionary source a logged-in user chose (both / wd / wikt), so every page starts with it
const sourceOf = req => { const u = OAUTH1.loggedIn(req) && OAUTH1.userOf(req); return (u && STORE.getPrefs(u).data?.source) || ""; };
const siteJson = () => { const s = STORE.site(); delete s.admins; return JSON.stringify(s).replace(/</g, "\\u003c"); };
// Tell every page it is behind this server (clean links, wizard proxy) and who is logged in.
const nodeFlag = req => h => h.replace("<head>", '<head><base href="/">').replace("</head>", `<script>window.LX_NODE = true; window.LX_OAUTH1 = ${OAUTH1.enabled}; window.LX_PASTEBACK = ${OAUTH1.pasteBack}; window.LX_USER = ${JSON.stringify(OAUTH1.loggedIn(req) ? OAUTH1.userOf(req) || "অ্যাকাউন্ট" : "").replace(/</g, "\\u003c")}; window.LX_CAN_EDIT = ${OAUTH1.canEdit(req)}; window.LX_GRANTS = ${JSON.stringify(OAUTH1.grantsOf(req)).replace(/</g, "\\u003c")}; window.LX_OAUTH_CLIENT = ${JSON.stringify(process.env.OAUTH_CLIENT_ID || CFG.oauthClientId || "")}; window.LX_SITE = ${siteJson()}; window.LX_ADMIN = ${PANEL.isAdmin(OAUTH1.loggedIn(req) && OAUTH1.userOf(req))}; window.LX_SOURCE = ${JSON.stringify(sourceOf(req))};</script></head>`).replace("<!--NODE-->", "<script>window.LX_PROXY = true;</script>")
  .replace(/<\/body>/, m => (/class="sd-body"|<body[^>]*class="[^"]*\bwz\b|id="single"/.test(h) ? "" : FOOT.footer(STORE.site())) + m); // the footer, on every page but the work tools (studio, lexeme wizard, bulk)

// JSON API.
const API = {
  "/api/config": () => R.config(),
  "/api/search": q => R.search(q),
  "/api/home": q => R.home(q),
  "/api/browse": q => R.browse(q),
  "/api/random": q => R.random(q.lang),
  "/api/collection": q => R.collection(q),
  // bn.wiktionary: Bengali entries with no Wikidata lexeme yet, and one parsed entry (reference only)
  "/api/wikt/missing": q => WIKT.missing(q),
  "/api/wikt/entry": q => WIKT.entry(q.title),
};
const API_RX = [
  [/^\/api\/word\/(L\d+)$/, (m, q) => R.word(m[1], q)],
  [/^\/api\/same\/(L\d+)$/, m => R.sameLemma(m[1])],
  [/^\/api\/descendants\/(L\d+)$/, (m, q) => R.descendants(m[1], q)],
  [/^\/api\/neighbors\/(L\d+)$/, m => R.neighbors(m[1])],
  [/^\/api\/etymology\/(L\d+)$/, (m, q) => R.etymology(m[1], q)],
];

// Proxy targets for the wizard. With an OAuth 1.0a session each call is signed here with the user's token;
// otherwise a browser OAuth 2 token (if any) is forwarded as it came.
const PROXY = { "/proxy/wd": "https://www.wikidata.org/w/api.php", "/proxy/commons": "https://commons.wikimedia.org/w/api.php", "/proxy/sparql": "https://query.wikidata.org/sparql", "/proxy/wikt": "https://bn.wiktionary.org/w/api.php", "/proxy/books": "https://www.googleapis.com/books/v1/volumes" }; // books: through here, so visitors' IPs never reach Google

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff", ...extra });
  res.end(body);
}
// Every script, stylesheet and font a page links gets ?v=<its modification time>. A new upload therefore has a
// new address, so neither the browser nor Cloudflare can hand out the old copy, and versioned files may be
// cached for a year (below).
function stamp(html) {
  return html.replace(/\b(src|href)="((?:\.\.\/)?(?:js|css|fonts|lib)\/[^"?#]+)"/g, (m, attr, ref) => {
    const f = ref.startsWith("../lib/") || ref.startsWith("lib/") ? path.join(LIB, path.basename(ref)) : path.join(PUB, ref.replace(/^\.\.\//, ""));
    try { return `${attr}="${ref}?v=${fs.statSync(f).mtimeMs.toString(36).replace(".", "")}"`; } catch (e) { return m; }
  });
}
// Browsers must re-check every file on each load (no-cache) and get a quick 304 when it is unchanged,
// so a code update is never hidden behind a stale cached copy.
function sendFile(res, file, transform, req) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    const lastMod = st.mtime.toUTCString();
    // HTML is personalised (login state), so it is always sent; other files can be answered with 304.
    if (!transform && req && req.headers["if-modified-since"] === lastMod) { res.writeHead(304, { "Cache-Control": "no-cache", "Last-Modified": lastMod }); return res.end(); }
    fs.readFile(file, (err2, buf) => {
      if (err2) return send(res, 404, "Not found", "text/plain; charset=utf-8");
      const ext = path.extname(file);
      const versioned = req && /[?&]v=/.test(req.url || "");
      send(res, 200, transform ? transform(buf.toString("utf8")) : buf, MIME[ext] || "application/octet-stream", transform ? { "Cache-Control": "no-store" } : { "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "no-cache", "Last-Modified": lastMod });
    });
  });
}
function readBody(req) {
  return new Promise((ok, fail) => { const parts = []; req.on("data", c => parts.push(c)); req.on("end", () => ok(Buffer.concat(parts))); req.on("error", fail); });
}
async function proxy(req, res, target, search) {
  const headers = { "User-Agent": CFG.userAgent, Accept: req.headers.accept || "application/json" };
  if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
  const body = req.method === "POST" ? await readBody(req) : undefined;
  // CORS flags only make sense from a browser; server-to-server they would make MediaWiki reject or anonymise the call.
  const q = new URLSearchParams(search); q.delete("origin"); q.delete("crossorigin");
  const full = target + (q.toString() ? "?" + q : "");
  const signed = target !== PROXY["/proxy/sparql"] && target !== PROXY["/proxy/books"] && OAUTH1.proxyAuth(req, req.method, full, headers["Content-Type"], body);
  if (signed) Object.assign(headers, signed);
  else if (target !== PROXY["/proxy/books"] && req.headers.authorization && !/server-session/.test(req.headers.authorization)) headers.Authorization = req.headers.authorization;
  let r = await fetch(full, { method: req.method, headers, body });
  let buf = Buffer.from(await r.arrayBuffer());
  // Reading never needs the login: if a read was refused for permissions, repeat it anonymously.
  if (req.method === "GET" && headers.Authorization && /"code":"(readapidenied|mwoauth-[a-z-]+)"/.test(buf.toString("utf8"))) {
    delete headers.Authorization;
    r = await fetch(full, { method: "GET", headers }); buf = Buffer.from(await r.arrayBuffer());
  }
  // A permission error on a call made with the user's login almost always means the OAuth consumer was
  // registered without editing grants: say so in Bengali instead of the raw API code.
  if (signed && /"code":"(readapidenied|permissiondenied|writeapidenied|mwoauth-[a-z-]+)"/.test(buf.toString("utf8"))) {
    try {
      const j = JSON.parse(buf.toString("utf8"));
      j.error.info = `আপনার লগ ইন দিয়ে এই কাজের অনুমতি নেই (${j.error.code})। OAuth consumer-টি সম্ভবত শুধু “User identity verification only” অনুমতিতে নিবন্ধিত। meta.wikimedia.org-এ নতুন consumer নিবন্ধন করুন — অনুমতি: Edit existing pages, Create, edit, and move pages, Upload new files — তারপর oauth.local.json-এ নতুন key/secret দিন।`;
      buf = Buffer.from(JSON.stringify(j));
    } catch (e) {}
  }
  send(res, r.status, buf, r.headers.get("content-type") || "application/json", { "Cache-Control": "no-store" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  try {
    // Login (OAuth 1.0a). Wikimedia returns to the consumer's registered callback with oauth_verifier + oauth_token;
    // whatever path that is, it is handled here.
    if (url.searchParams.has("oauth_verifier") && url.searchParams.has("oauth_token")) {
      const r = await OAUTH1.callback(req, res, url.searchParams); if (OAUTH1.loggedIn(req)) STORE.log(OAUTH1.userOf(req), "login");
      res.writeHead(302, { Location: r.redirect }); return res.end();
    }
    // Login must start on the same host the callback returns to (e.g. 127.0.0.1:5000, not localhost),
    // otherwise the browser comes back without its session cookie.
    // Paste-back login: the address Wikimedia sent the browser to (with oauth_verifier) is pasted on this site.
    if (p === "/auth/complete") {
      let q2; try { q2 = new URL(url.searchParams.get("u") || "").searchParams; } catch (e) { q2 = new URLSearchParams(); }
      if (!q2.get("oauth_verifier") || !q2.get("oauth_token")) return send(res, 400, JSON.stringify({ ok: false, error: "ঠিকানায় oauth_verifier পাওয়া যায়নি" }));
      const r = await OAUTH1.callback(req, res, q2);
      return send(res, 200, JSON.stringify({ ok: OAUTH1.loggedIn(req), user: OAUTH1.userOf(req), redirect: r.redirect }), undefined, { "Cache-Control": "no-store" });
    }
    if (p === "/auth/login" && url.searchParams.get("json") === "1") {
      const r = await OAUTH1.login(req, res, url.searchParams.get("back"));
      return send(res, r.redirect ? 200 : r.status || 500, JSON.stringify(r.redirect ? { url: r.redirect } : { error: r.error }), undefined, { "Cache-Control": "no-store" });
    }
    if (p === "/auth/login" && !OAUTH1.pasteBack && OAUTH1.publicUrl && req.headers.host !== new URL(OAUTH1.publicUrl).host) {
      res.writeHead(302, { Location: OAUTH1.publicUrl + "/auth/login" + url.search }); return res.end();
    }
    if (p === "/auth/callback") { res.writeHead(302, { Location: "/?login=failed" }); return res.end(); } // reached without oauth_verifier
    if (p === "/auth/login") {
      const r = await OAUTH1.login(req, res, url.searchParams.get("back"));
      if (r.redirect) { res.writeHead(302, { Location: r.redirect }); return res.end(); }
      return send(res, r.status || 500, `<!doctype html><meta charset="utf-8"><p style="font:16px sans-serif;padding:20px">লগ ইন করা যায়নি: ${String(r.error).replace(/[<&]/g, "")}</p><p style="font:16px sans-serif;padding:0 20px"><a href="/">ফিরে যান</a></p>`, "text/html; charset=utf-8");
    }
    if (p === "/auth/logout") { OAUTH1.logout(req, res); return send(res, 200, JSON.stringify({ ok: true })); }
    // Search engines
    if (p === "/robots.txt") return send(res, 200, SEO.robots(req), "text/plain; charset=utf-8", { "Cache-Control": "public, max-age=3600" });
    if (p === "/sitemap.xml") return send(res, 200, SEO.sitemap(req), "application/xml; charset=utf-8", { "Cache-Control": "public, max-age=3600" });
    if (p === "/auth/me") return send(res, 200, JSON.stringify({ user: OAUTH1.userOf(req), oauth1: OAUTH1.enabled, publicUrl: OAUTH1.publicUrl, callback: OAUTH1.callbackUrl, missing: OAUTH1.missing }), undefined, { "Cache-Control": "no-store" });
    if (PROXY[p]) {
      if (req.method !== "GET" && req.method !== "POST") return send(res, 405, JSON.stringify({ error: "method not allowed" }));
      return await proxy(req, res, PROXY[p], url.search);
    }
    // স্টুডিও লিব্রে storage (needs the Wikimedia login; same-site requests only for changes)
    if (p.startsWith("/store/")) {
      const user = OAUTH1.loggedIn(req) && OAUTH1.userOf(req);
      if (!user) return send(res, 401, JSON.stringify({ error: "login" }), undefined, { "Cache-Control": "no-store" });
      if (req.method !== "GET" && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, JSON.stringify({ error: "origin" }));
      const ok = o => send(res, 200, JSON.stringify(o), undefined, { "Cache-Control": "no-store" });
      try {
        if (p === "/store/clips" && req.method === "GET") return ok(await STORE.list(user));
        if (p === "/store/words") {
          if (req.method === "GET") return ok(await STORE.getWords(user));
          if (req.method === "PUT") return ok({ n: await STORE.putWords(user, JSON.parse((await readBody(req)).toString("utf8") || "[]")) });
        }
        if (p === "/store/source" && req.method === "PUT") { // just the dictionary source, without touching the other settings
          const v = JSON.parse((await readBody(req)).toString("utf8") || "{}").source; if (!/^(both|wd|wikt)$/.test(v)) throw new Error("bad source");
          const cur = STORE.getPrefs(user).data || {}; cur.source = v; return ok(STORE.putPrefs(user, cur)); }
        if (p === "/store/prefs") {
          if (req.method === "GET") return ok(STORE.getPrefs(user));
          if (req.method === "PUT") return ok(STORE.putPrefs(user, JSON.parse((await readBody(req)).toString("utf8") || "{}")));
        }
        if (p === "/store/speakers") { // shared speakers: the studio's list goes up, every speaker this account may use comes back
          if (req.method === "GET") return ok(STORE.speakersOf(user));
          if (req.method === "PUT") return ok(STORE.syncSpeakers(user, JSON.parse((await readBody(req)).toString("utf8") || "[]")));
          if (req.method === "POST") { const b = JSON.parse((await readBody(req)).toString("utf8") || "{}"); return ok(STORE.linkSpeaker(user, b.id, b.code)); }
        }
        const m = p.match(/^\/store\/clips\/([a-z0-9]+)$/i); // details only; audio is never stored here
        if (m && req.method === "PUT") { const b = JSON.parse((await readBody(req)).toString("utf8") || "{}"), was = (STORE.list(user).find(c => c.id === m[1]) || {}).status;
          const r = STORE.putMeta(user, m[1], b); if (r.status === "done" && was !== "done") STORE.log(user, "clip.upload", r.file || r.word); return ok(r); }
        if (m && req.method === "DELETE") { await STORE.remove(user, m[1]); return ok({ ok: true }); }
      } catch (e) { return send(res, 400, JSON.stringify({ error: e.message })); }
      return send(res, 404, JSON.stringify({ error: "not found" }));
    }
    if (p.startsWith("/api/")) {
      if (req.method !== "GET") return send(res, 405, JSON.stringify({ error: "method not allowed" }));
      const q = Object.fromEntries(url.searchParams);
      let out;
      if (API[p]) out = await API[p](q);
      else { const hit = API_RX.map(([rx, fn]) => [p.match(rx), fn]).find(([m]) => m); if (!hit) return send(res, 404, JSON.stringify({ error: "not found" })); out = await hit[1](hit[0], q); }
      // Random answers must never be reused from a cache; everything else may be kept for a minute.
      return send(res, 200, JSON.stringify(out), undefined, { "Cache-Control": p === "/api/random" || p.startsWith("/api/wikt/") ? "no-store" : "public, max-age=60" });
    }
    const user = OAUTH1.loggedIn(req) && OAUTH1.userOf(req);
    if (await PANEL.handle(req, res, url, user, readBody, h => stamp(nodeFlag(req)(h)))) return;
    const moved = cleanRedirect(p, url.search);
    if (moved) { res.writeHead(301, { Location: moved }); return res.end(); }
    // Every page learns it runs behind this server (clean links; the wizard routes its Wikidata calls through /proxy).
    for (const [rx, file] of CLEAN) { const m = p.match(rx); if (m) {
      const name = typeof file === "function" ? file(m) : file;
      const ns = await SSR.noscript(name, m, url, STORE.site()); // the page's content for browsers without JavaScript
      return sendFile(res, path.join(PUB, name), h => stamp(SEO.apply(nodeFlag(req)(h), req, name, m)).replace(/<body[^>]*>/, b => b + ns)); } }
    // Only the reader engine files are shared with browsers (not oauth1.js and other server code).
    if (/^\/lib\/(config|wikidata|lexindex|reader|wiktparse)\.js$/.test(p)) return sendFile(res, path.join(LIB, p.slice(5)), null, req);
    if (p.startsWith("/lib/")) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    const file = path.normalize(path.join(PUB, p));
    if (!file.startsWith(PUB)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return sendFile(res, file, null, req);
  } catch (e) {
    console.error(req.url, e.message);
    send(res, e.status || 502, JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`লেক্সিম.বাংলা running at ${OAUTH1.publicUrl || "http://localhost:" + PORT}`);
  if (OAUTH1.enabled) console.log(`OAuth login: callback ${OAUTH1.callbackUrl} — open the site at ${OAUTH1.publicUrl || "the consumer's callback host"}`);
  // Build (or load from cache/) the local word index of every language right away, so searches are instant.
  const IX = require("./lib/lexindex");
  R.config().then(c => c.languages.forEach(l => l.qid && IX.get(l.qid))).catch(() => {}); // reader languages only
});
