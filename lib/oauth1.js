"use strict";
// Wikimedia OAuth 1.0a, done entirely on the server (the consumer secret never reaches the browser).
// Flow: /auth/login → Special:OAuth/initiate → user approves on meta.wikimedia.org → Wikimedia calls back
// with oauth_verifier → Special:OAuth/token → access token kept in a server-side session (HttpOnly cookie).
// Every Wikidata/Commons API call the wizard makes through /proxy is then signed with that token.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Settings: environment variables, or oauth.local.json next to server.js (never served to browsers).
//   OAUTH_CONSUMER_KEY / consumerKey, OAUTH_CONSUMER_SECRET / consumerSecret — the consumer
//   PUBLIC_URL / publicUrl — the address people open the site at (e.g. http://127.0.0.1:5000 locally,
//                            https://yourdomain.org in production). The OAuth callback is built from it, so it
//                            must start with the consumer's registered "callback URL" (used as a prefix).
let FILE = {};
try { FILE = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "oauth.local.json"), "utf8")); } catch (e) {}
// Production (Render, lexeme.bnwp.org): the public address and the consumer token are built in; only the
// secret has to be set on the host, as OAUTH_CONSUMER_SECRET (it must never be in the repository).
const ON_HOST = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID) && !FILE.consumerKey;
const PRODUCTION = { publicUrl: "https://lexeme.bnwp.org", consumerKey: "e8b0fe03bdf511061d92bbcbc6f29530" };
function loadConsumer() {
  const key = process.env.OAUTH_CONSUMER_KEY || FILE.consumerKey || (ON_HOST ? PRODUCTION.consumerKey : "");
  const secret = process.env.OAUTH_CONSUMER_SECRET || FILE.consumerSecret || "";
  return key && secret ? { key: key.trim(), secret: secret.trim() } : null;
}
const CONSUMER = loadConsumer();
const PUBLIC_URL = String(process.env.PUBLIC_URL || FILE.publicUrl || (ON_HOST ? PRODUCTION.publicUrl : "")).replace(/\/+$/, "");
// What is missing, for /auth/me (never the values themselves).
const MISSING = [!(process.env.OAUTH_CONSUMER_KEY || FILE.consumerKey || ON_HOST) && "OAUTH_CONSUMER_KEY", !(process.env.OAUTH_CONSUMER_SECRET || FILE.consumerSecret) && "OAUTH_CONSUMER_SECRET", !PUBLIC_URL && "PUBLIC_URL"].filter(Boolean);
const SECURE = /^https:/.test(PUBLIC_URL) ? "; Secure" : "";
// With a public URL the callback is sent in the request (consumer must allow callback prefixes);
// without one, "oob" makes Wikimedia use the consumer's registered callback as it is.
// OAUTH_CALLBACK / "callback" overrides it — e.g. a consumer registered only for http://127.0.0.1:5000/ used on
// a real domain. Then Wikimedia cannot return to this site, and the login is finished by pasting the address
// Wikimedia sent the browser to (PASTE_BACK, see /auth/complete).
const CALLBACK = (process.env.OAUTH_CALLBACK || FILE.callback || "").trim() || (PUBLIC_URL ? PUBLIC_URL + "/auth/callback" : "oob");
const hostOf = u => { try { return new URL(u).host; } catch (e) { return ""; } };
const PASTE_BACK = !!PUBLIC_URL && CALLBACK !== "oob" && hostOf(CALLBACK) !== hostOf(PUBLIC_URL);
const META = "https://meta.wikimedia.org/w/index.php";
const USER_AGENT = require("./config").userAgent;

/* ---------- signing (RFC 5849, HMAC-SHA1) ---------- */
const pct = s => encodeURIComponent(String(s)).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
// `extra` = query and x-www-form-urlencoded body parameters that are part of the signature.
function authHeader(method, url, extra = [], token = null) {
  const u = new URL(url);
  const oauth = {
    oauth_consumer_key: CONSUMER.key, oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_version: "1.0",
    ...(token ? { oauth_token: token.key } : {}),
  };
  const all = [...u.searchParams, ...extra, ...Object.entries(oauth)].map(([k, v]) => [pct(k), pct(v)]);
  all.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  const base = [method.toUpperCase(), pct(u.origin + u.pathname), pct(all.map(([k, v]) => `${k}=${v}`).join("&"))].join("&");
  oauth.oauth_signature = crypto.createHmac("sha1", `${pct(CONSUMER.secret)}&${pct(token ? token.secret : "")}`).update(base).digest("base64");
  return "OAuth " + Object.entries(oauth).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}
async function signedText(url, token) {
  const r = await fetch(url, { headers: { Authorization: authHeader("GET", url, [], token), "User-Agent": USER_AGENT } });
  return r.text();
}
// Username (and the grants the user approved) of an access token: Special:OAuth/identify returns a JWT
// signed by Wikimedia; the Wikidata API is the fallback for the name.
async function whoAmI(token) {
  try {
    const jwt = (await signedText(`${META}?title=Special:OAuth/identify`, token)).trim();
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (payload.username) return { user: payload.username, grants: payload.grants || [] };
  } catch (e) { console.warn("[login] identify:", e.message); }
  try {
    const info = await signedJson("https://www.wikidata.org/w/api.php?action=query&meta=userinfo&format=json&formatversion=2", token);
    if (!info.query?.userinfo?.anon && info.query?.userinfo?.name) return { user: info.query.userinfo.name, grants: null };
    console.warn("[login] userinfo:", JSON.stringify(info).slice(0, 200));
  } catch (e) { console.warn("[login] userinfo:", e.message); }
  return { user: "", grants: null };
}
// Grants that allow nothing beyond "who are you" — such a token cannot read or edit through the API.
const IDENTITY_ONLY = ["mwoauth-authonly", "mwoauth-authonlyprivate"];
const canEditWith = grants => !grants || (!grants.every(g => IDENTITY_ONLY.includes(g)) && grants.some(g => /edit|createeditmovepage/.test(g)));
async function signedJson(url, token, extraParams = []) {
  const r = await fetch(url, { headers: { Authorization: authHeader("GET", url, extraParams, token), "User-Agent": USER_AGENT } });
  const text = await r.text();
  try { return JSON.parse(text); } catch (e) { throw new Error(`Wikimedia OAuth: ${text.slice(0, 200)}`); }
}

/* ---------- sessions (kept in cache/sessions.json so a server restart keeps everyone logged in) ---------- */
const SESS_FILE = path.join(__dirname, "..", "cache", "sessions.json");
const sessions = new Map(); // sid → { req?, back?, token?, user?, grants? }
try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(SESS_FILE, "utf8")))) sessions.set(k, v); } catch (e) {}
let saveT;
function saveSessions() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const keep = Object.fromEntries([...sessions].filter(([, s]) => s.token)); // only logged-in sessions
    fs.promises.mkdir(path.dirname(SESS_FILE), { recursive: true }).then(() => fs.promises.writeFile(SESS_FILE, JSON.stringify(keep))).catch(() => {});
  }, 200);
}
function session(req, res, create) {
  const sid = (/(?:^|;\s*)lx_sid=([a-f0-9]{48})/.exec(req.headers.cookie || "") || [])[1];
  if (sid && sessions.has(sid)) return sessions.get(sid);
  if (!create) return null;
  const id = crypto.randomBytes(24).toString("hex"); const s = { id };
  sessions.set(id, s);
  res.setHeader("Set-Cookie", `lx_sid=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${SECURE}`);
  return s;
}
const userOf = req => session(req)?.user || "";
const loggedIn = req => !!session(req)?.token;
const grantsOf = req => session(req)?.grants || null;
const canEdit = req => loggedIn(req) && canEditWith(grantsOf(req));

/* ---------- login / callback / logout ---------- */
// Only same-site paths are accepted as the page to return to.
const safeBack = b => (typeof b === "string" && /^\/(?!\/)/.test(b) ? b : "/");
async function login(req, res, back) {
  if (!CONSUMER) return { status: 500, error: "OAuth consumer is not configured (oauth.local.json or OAUTH_CONSUMER_KEY / OAUTH_CONSUMER_SECRET)." };
  const s = session(req, res, true);
  const url = `${META}?title=Special:OAuth/initiate&format=json&oauth_callback=${pct(CALLBACK)}`;
  const j = await signedJson(url, null);
  if (!j.key || !j.secret) return { status: 502, error: "Wikimedia refused the login request: " + (j.error || JSON.stringify(j)).slice(0, 200) };
  s.req = { key: j.key, secret: j.secret }; s.back = safeBack(back);
  return { redirect: `https://meta.wikimedia.org/wiki/Special:OAuth/authorize?oauth_token=${pct(j.key)}&oauth_consumer_key=${pct(CONSUMER.key)}` };
}
// Wikimedia sends the user back to the consumer's registered callback URL with oauth_verifier + oauth_token.
async function callback(req, res, q) {
  const s = session(req, res, false);
  if (!s || !s.req || s.req.key !== q.get("oauth_token")) {
    // Usually: the callback URL registered on meta.wikimedia.org points at a different host (127.0.0.1 vs localhost)
    // or port, so the browser came back without this site's session cookie.
    console.warn("[login] callback without a matching login session (check the consumer's callback URL host/port)");
    return { redirect: "/?login=nosession" };
  }
  const verifier = q.get("oauth_verifier");
  const url = `${META}?title=Special:OAuth/token&format=json&oauth_verifier=${pct(verifier)}`;
  const j = await signedJson(url, s.req);
  const back = s.back || "/"; delete s.req; delete s.back;
  if (!j.key || !j.secret) { console.warn("[login] token exchange failed:", JSON.stringify(j).slice(0, 200)); return { redirect: back + (back.includes("?") ? "&" : "?") + "login=failed" }; }
  s.token = { key: j.key, secret: j.secret };
  const who = await whoAmI(s.token);
  s.user = who.user; s.grants = who.grants;
  saveSessions();
  console.log(`[login] ${s.user || "(name unknown)"} logged in; grants: ${who.grants ? who.grants.join(", ") || "(none)" : "(unknown)"}`);
  if (!canEditWith(who.grants)) console.warn("[login] this consumer's grants do not allow editing — register a consumer with: Edit existing pages, Create, edit, and move pages, Upload new files");
  return { redirect: back };
}
function logout(req, res) { const s = session(req, res, false); if (s) { sessions.delete(s.id); saveSessions(); } res.setHeader("Set-Cookie", "lx_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"); }

// Headers for a proxied API call made by a logged-in user (null when there is no session).
// Only calls that need the account are signed: every POST (edits, uploads) and the token / user-info queries.
// Plain reads go out anonymously, so reading never depends on the consumer's grants.
function needsAccount(method, url) {
  if (method === "POST") return true;
  const q = new URL(url).searchParams;
  return /tokens|userinfo/.test(q.get("meta") || "") || q.get("action") === "edit" || /^wb(edit|create|set|add|remove)/.test(q.get("action") || "");
}
function proxyAuth(req, method, url, contentType, body) {
  const s = session(req); if (!s || !s.token || !CONSUMER) return null;
  if (!needsAccount(method, url)) return null;
  const extra = method === "POST" && /application\/x-www-form-urlencoded/.test(contentType || "") ? [...new URLSearchParams(body.toString("utf8"))] : [];
  return { Authorization: authHeader(method, url, extra, s.token) };
}

module.exports = { missing: MISSING, publicUrl: PUBLIC_URL, callbackUrl: CALLBACK, pasteBack: PASTE_BACK, enabled: !!CONSUMER, login, callback, logout, userOf, loggedIn, grantsOf, canEdit, proxyAuth };
