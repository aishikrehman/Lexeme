"use strict";
// Server-made pages that need no JavaScript: a user's own settings (/settings), feedback (/feedback) and the
// site admin's dashboard (/admin). Every change is an ordinary form POST, answered with a redirect back
// (POST → 303 → GET), so they work with scripts blocked too.
const fs = require("fs"), path = require("path");
const STORE = require("./store"), LOG = require("./log"), DOCS = require("./docs");
const TPL = path.join(__dirname, "..", "public", "panel.html");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const when = ts => (ts ? esc(String(ts).replace("T", " ").slice(0, 16)) : "—");

let FILE = {}; try { FILE = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "oauth.local.json"), "utf8")); } catch (e) {}
// Admins: ADMIN_USERS (comma-separated Wikimedia user names), "admins" in oauth.local.json, or the dashboard's own list.
const adminList = () => [process.env.ADMIN_USERS, FILE.admins, STORE.site().admins].flat().filter(Boolean).join(",").split(",").map(s => s.trim()).filter(Boolean);
const isAdmin = user => !!user && adminList().includes(user);

// Changes must come from this site's own pages (no cross-site form posts).
function sameSite(req) {
  const src = req.headers.origin || req.headers.referer; if (!src) return false;
  try { return new URL(src).host === req.headers.host; } catch (e) { return false; }
}
const form = buf => Object.fromEntries(new URLSearchParams(buf.toString("utf8")));
const back = (res, to, msg) => { // the message goes in the query, before any #section
  const [base, hash] = to.split("#");
  res.writeHead(303, { Location: base + (msg ? (base.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg) : "") + (hash ? "#" + hash : "") }); res.end();
};

function page(title, body, { active } = {}) {
  let tpl; try { tpl = fs.readFileSync(TPL, "utf8"); } catch (e) { tpl = "<!doctype html><html lang=bn><head><meta charset=utf-8><title></title></head><body><!--PANEL--></body></html>"; }
  return tpl.replace("<title></title>", `<title>${esc(title)} · ${esc(STORE.site().siteName)}</title>`).replace("<!--PANEL-->", body).replace(/data-active=""/, `data-active="${esc(active || "")}"`);
}
const note = q => (q.get("msg") ? `<p class="pn-msg" role="status">${esc(q.get("msg"))}</p>` : "");
const loginFirst = (to, what) => `<section class="pnl"><h1>${esc(what)}</h1><p>এই পাতার জন্য উইকিমিডিয়া অ্যাকাউন্টে লগ ইন করুন।</p><p><a class="btn" href="/auth/login?back=${encodeURIComponent(to)}">লগ ইন করুন</a></p></section>`;

/* ---------- a user's own settings ---------- */
const FEATURES = [["wm", "শব্দ-তালিকা ধরে রেকর্ড", true], ["auto", "একটানা রেকর্ড (শব্দ শেষে নিজে থেকে পরেরটা)", false], ["autoq", "রেকর্ড হলেই আপলোড তালিকায়", true],
  ["editor", "টাইমলাইন ও সম্পাদনার যন্ত্র", false], ["noplayer", "নিচের প্লেয়ার বার লুকান", false], ["menumini", "স্টুডিওর বাঁ মেনু গুটিয়ে রাখুন", false]];
const SPK_LABEL = { name: "ছদ্মনাম", lang: "ভাষা", other: "ভাষার নাম", dialect: "উপভাষা", district: "জেলা", place: "এলাকা", gender: "লিঙ্গ", age: "বয়স", level: "দক্ষতা", learned: "কোথায় শেখা", license: "লাইসেন্স", note: "নোট" };
// Extra explanations live in a small ⓘ: hover or focus (tap) shows them, so the pages stay clean.
const tip = text => `<span class="tip" tabindex="0" role="note" aria-label="${esc(text)}" data-tip="${esc(text)}">ⓘ</span>`;
const SET_TABS = [["speakers", "বক্তা"], ["features", "সুবিধা"], ["activity", "কার্যক্রম"]];
function settingsPage(user, q) {
  if (!user) return page("আমার সেটিংস", loginFirst("/settings", "আমার সেটিংস"), { active: "settings" });
  const t = SET_TABS.some(([k]) => k === q.get("t")) ? q.get("t") : "speakers";
  const nav = `<nav class="pn-tabs">${SET_TABS.map(([k, l]) => `<a href="/settings?t=${k}"${k === t ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
  return page("আমার সেটিংস", `<section class="pnl"><h1>আমার সেটিংস ${tip("সবকিছু সার্ভারে থাকে — অন্য ডিভাইসে লগ ইন করলেও একই থাকবে, ব্রাউজার মুছে ফেললেও হারাবে না।")} <small class="who" title="${esc(user)}">${esc(user)}</small></h1>${nav}</section>${note(q)}${SET[t](user)}`, { active: "settings" });
}
const SET = {
  speakers(user) {
    const spk = STORE.speakersOf(user);
    return `<section class="pnl"><h2>বক্তা ${tip("প্রতিটি বক্তার একটি আইডি আর ৬ অক্ষরের যুক্ত-কোড আছে। অন্য অ্যাকাউন্ট থেকে একই বক্তা হিসেবে রেকর্ড করতে সেখানে দুটোই দিন। কোড শুধু বক্তার মালিক দেখেন। তথ্য বদলাতে স্টুডিওর সেটআপ ব্যবহার করুন।")}</h2>
    ${spk.length ? `<table class="tbl"><thead><tr><th>বক্তা</th><th>আইডি</th><th>যুক্ত-কোড</th><th></th></tr></thead><tbody>${spk.map(s => `<tr>
      <td><b>${esc(s.name || "নামহীন")}</b> ${tip([s.district, s.lang, s.age, s.gender].filter(Boolean).join(" · ") + (s.mine ? "" : ` — ${s.owner}-এর বক্তা, আপনার সঙ্গে যুক্ত`) || "—")}</td>
      <td class="mono">${esc(s.id)}</td><td class="mono">${s.mine ? esc(s.code) : "—"}</td>
      <td>${s.mine ? `<form method="post" action="/settings/speaker-code"><input type="hidden" name="id" value="${esc(s.id)}"><button class="lnk" title="আগের কোড আর চলবে না">নতুন কোড</button></form>`
        : `<form method="post" action="/settings/speaker-unlink"><input type="hidden" name="id" value="${esc(s.id)}"><button class="lnk red">বিচ্ছিন্ন করুন</button></form>`}</td></tr>`).join("")}</tbody></table>`
      : `<p>এখনো কোনো বক্তা নেই — <a href="/studio">স্টুডিওর সেটআপে</a> যোগ করুন।</p>`}
    <form method="post" action="/settings/speaker-link" class="row-form"><b>অন্য অ্যাকাউন্টের বক্তা যুক্ত করুন</b>
      <input name="id" placeholder="বক্তার আইডি" required><input name="code" placeholder="যুক্ত-কোড" maxlength="6" required style="width:8em;text-transform:uppercase"><button class="btn">যুক্ত করুন</button></form></section>`;
  },
  features(user) {
    const prefs = STORE.getPrefs(user).data || {}, src = prefs.source || "wd";
    return `<section class="pnl"><h2>সুবিধা চালু/বন্ধ ${tip("স্টুডিও ও অভিধানে পরের বার খুললেই খাটবে, সব ডিভাইসে।")}</h2>
    <form method="post" action="/settings/features">
      ${FEATURES.map(([k, label, def]) => `<label class="chk"><input type="checkbox" name="${k}" value="1"${(prefs[k] ?? def) ? " checked" : ""}> ${esc(label)}</label>`).join("")}
      <label class="fld">অভিধানে কোন উৎস দেখাবে<select name="source">${[["both", "উইকি উপাত্ত ও উইকিঅভিধান — দুটোই"], ["wd", "শুধু উইকি উপাত্ত"], ["wikt", "শুধু উইকিঅভিধান"]].map(([v, l]) => `<option value="${v}"${v === src ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <button class="btn">সংরক্ষণ</button></form></section>`;
  },
  activity(user) { return `<section class="pnl"><h2>আমার সাম্প্রতিক কার্যক্রম</h2>${actTable(STORE.activity({ user, limit: 50 }), false)}</section>`; },
};
// Feedback has its own page: the form, and (logged in) what you sent before with the answers.
function feedbackPage(user, q) {
  const fb = user ? STORE.feedback({ user }) : [];
  return page("ফিডব্যাক", `<section class="pnl"><h1>ফিডব্যাক বা সমস্যা জানান ${tip("লগ ইন না করেও পাঠানো যায়; লগ ইন করে পাঠালে উত্তর এই পাতাতেই দেখতে পাবেন।")}</h1></section>${note(q)}
    <section class="pnl">${feedbackForm("/feedback")}</section>
    ${fb.length ? `<section class="pnl"><h2>আগে যা জানিয়েছেন</h2><ul class="fb-list">${fb.map(f => `<li><span class="st st-${esc(f.status)}">${esc(FB_STATUS[f.status] || f.status)}</span> <small>${when(f.ts)}</small><p>${esc(f.text)}</p>${f.note ? `<p class="reply"><b>উত্তর:</b> ${esc(f.note)}</p>` : ""}</li>`).join("")}</ul></section>` : ""}`, { active: "feedback" });
}const FB_STATUS = { new: "নতুন", seen: "দেখা হয়েছে", doing: "কাজ চলছে", done: "সমাধান হয়েছে" }, FB_KIND = { bug: "সমস্যা", idea: "পরামর্শ", data: "তথ্যের ভুল", other: "অন্যান্য" };
const feedbackForm = backTo => `<form method="post" action="/feedback" class="fb-form"><input type="hidden" name="back" value="${esc(backTo)}">
  <label class="fld">ধরন<select name="kind">${Object.entries(FB_KIND).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
  <label class="fld">কোন পাতায় <small>(ঐচ্ছিক)</small><input name="page" placeholder="যেমন /studio"></label>
  <label class="fld">বিস্তারিত<textarea name="text" rows="4" required placeholder="কী হয়েছিল, কী আশা করেছিলেন…"></textarea></label>
  <button class="btn">পাঠান</button></form>`;
const actTable = (rows, withUser) => (rows.length ? `<table class="tbl"><thead><tr><th>সময়</th>${withUser ? "<th>অ্যাকাউন্ট</th>" : ""}<th>কাজ</th><th>বিস্তারিত</th></tr></thead><tbody>${rows.map(r => `<tr><td><small>${when(r.ts)}</small></td>${withUser ? `<td>${r.user ? `<a href="/admin?s=activity&user=${encodeURIComponent(r.user)}">${esc(r.user)}</a>` : "—"}</td>` : ""}<td>${esc(ACT[r.action] || r.action)}</td><td><small>${esc(r.detail || "")}</small></td></tr>`).join("")}</tbody></table>` : `<p class="hint">এখনো কিছু নেই।</p>`);
const ACT = { login: "লগ ইন", "speaker.new": "নতুন বক্তা", "speaker.link": "বক্তা যুক্ত", feedback: "ফিডব্যাক", "site.settings": "সাইটের সেটিংস", "clip.upload": "কমন্সে আপলোড", "prefs": "সেটিংস বদল", "admin.speaker": "বক্তা সম্পাদনা (অ্যাডমিন)" };

/* ---------- admin dashboard ---------- */
const ADMIN_TABS = [["overview", "সারসংক্ষেপ"], ["users", "অ্যাকাউন্ট"], ["speakers", "বক্তা"], ["activity", "কার্যক্রম"], ["feedback", "ফিডব্যাক"], ["log", "সার্ভার লগ"], ["site", "সাইটের সেটিংস"]];
function adminPage(user, q) {
  if (!user) return page("অ্যাডমিন", loginFirst("/admin", "অ্যাডমিন ড্যাশবোর্ড"), { active: "admin" });
  if (!isAdmin(user)) return page("অ্যাডমিন", `<section class="pnl"><h1>অ্যাডমিন ড্যাশবোর্ড</h1><p>${esc(user)} অ্যাকাউন্টের এই পাতার অনুমতি নেই।</p>${adminList().length ? "" : `<p class="hint">এখনো কোনো অ্যাডমিন ঠিক করা হয়নি। সার্ভারের গোপন সেটিংসে <code>ADMIN_USERS</code> = আপনার উইকিমিডিয়া ব্যবহারকারী নাম দিন (একাধিক হলে কমা দিয়ে), তারপর অ্যাপ রিস্টার্ট করুন।</p>`}</section>`, { active: "admin" });
  const s = ADMIN_TABS.some(([k]) => k === q.get("s")) ? q.get("s") : "overview";
  const nav = `<nav class="pn-tabs">${ADMIN_TABS.map(([k, l]) => `<a href="/admin?s=${k}"${k === s ? ' aria-current="page"' : ""}>${l}${k === "feedback" && STORE.stats().feedbackNew ? ` <span class="badge">${bn(STORE.stats().feedbackNew)}</span>` : ""}</a>`).join("")}</nav>`;
  return page("অ্যাডমিন", `<section class="pnl"><h1>অ্যাডমিন ড্যাশবোর্ড</h1>${nav}</section>${note(q)}${ADMIN[s](q)}`, { active: "admin" });
}
const ADMIN = {
  overview() {
    const st = STORE.stats(), up = process.uptime();
    return `<section class="pnl"><div class="cards">${[["অ্যাকাউন্ট", st.users], ["বক্তা", st.speakers], ["রেকর্ডের বিবরণ", st.clips], ["কমন্সে উঠেছে", st.uploaded], ["শব্দ-তালিকার শব্দ", st.words], ["নতুন ফিডব্যাক", st.feedbackNew]].map(([l, n]) => `<div class="card"><b>${bn(n)}</b><span>${l}</span></div>`).join("")}</div>
      <h2>সার্ভার</h2><table class="tbl"><tbody>
      <tr><th>Node</th><td>${esc(process.version)}</td></tr><tr><th>চালু আছে</th><td>${bn(Math.floor(up / 3600))} ঘণ্টা ${bn(Math.floor(up % 3600 / 60))} মিনিট (শুরু ${when(LOG.started)})</td></tr>
      <tr><th>মেমোরি</th><td>${bn(Math.round(process.memoryUsage().rss / 1048576))} MB</td></tr><tr><th>ডাটাবেজ</th><td class="mono">${esc(st.dbFile)}</td></tr>
      <tr><th>অ্যাডমিন</th><td>${esc(adminList().join(", "))}</td></tr></tbody></table></section>
      <section class="pnl"><h2>সাম্প্রতিক কার্যক্রম</h2>${actTable(STORE.activity({ limit: 15 }), true)}<p><a href="/admin?s=activity">সব দেখুন →</a></p></section>`;
  },
  users() {
    const u = STORE.users(), spk = STORE.allSpeakers();
    return `<section class="pnl"><h2>যুক্ত অ্যাকাউন্ট <small>${bn(u.length)}</small></h2><table class="tbl"><thead><tr><th>অ্যাকাউন্ট</th><th>শেষ সক্রিয়</th><th>কাজ</th><th>বক্তা</th><th></th></tr></thead><tbody>${u.map(r => `<tr>
      <td><b>${esc(r.user)}</b> <a href="https://meta.wikimedia.org/wiki/Special:CentralAuth/${encodeURIComponent(r.user)}" target="_blank" rel="noopener"><small>উইকিমিডিয়া</small></a></td><td><small>${when(r.last)}</small></td><td>${bn(r.n)}</td>
      <td><small>${esc(spk.filter(s => s.owner === r.user || s.users.includes(r.user)).map(s => s.name || s.id).join(", "))}</small></td>
      <td><a href="/admin?s=activity&user=${encodeURIComponent(r.user)}">কার্যক্রম</a></td></tr>`).join("")}</tbody></table></section>`;
  },
  speakers(q) {
    const all = STORE.allSpeakers(), open = q.get("id");
    return `<section class="pnl"><h2>সব বক্তা <small>${bn(all.length)}</small> ${tip("একই মানুষ একাধিক অ্যাকাউন্ট থেকে রেকর্ড করলে সম্পাদনায় গিয়ে মালিক বা যুক্ত অ্যাকাউন্ট ঠিক করুন।")}</h2>
      <table class="tbl"><thead><tr><th>বক্তা</th><th>আইডি · কোড</th><th>মালিক</th><th>যুক্ত অ্যাকাউন্ট</th><th>শেষ বদল</th><th></th></tr></thead><tbody>${all.map(s => `<tr${s.id === open ? ' class="open"' : ""}>
        <td><b>${esc(s.name || "নামহীন")}</b><br><small>${esc([s.district, s.lang].filter(Boolean).join(" · "))}</small></td><td class="mono">${esc(s.id)}<br>${esc(s.code)}</td>
        <td>${esc(s.owner)}</td><td><small>${esc(s.users.join(", ") || "—")}</small></td><td><small>${when(s.updated)}</small></td><td><a href="/admin?s=speakers&id=${encodeURIComponent(s.id)}#edit">সম্পাদনা</a></td></tr>`).join("")}</tbody></table></section>
      ${open && all.find(s => s.id === open) ? speakerEdit(all.find(s => s.id === open)) : ""}`;
  },
  activity(q) {
    const user = q.get("user");
    return `<section class="pnl"><h2>কার্যক্রম${user ? ` — ${esc(user)} <a href="/admin?s=activity"><small>সবার</small></a>` : ""}</h2>${actTable(STORE.activity({ user, limit: 500 }), !user)}</section>`;
  },
  feedback() {
    const fb = STORE.feedback();
    return `<section class="pnl"><h2>ফিডব্যাক <small>${bn(fb.length)}</small></h2>${fb.length ? fb.map(f => `<form method="post" action="/admin/feedback" class="fb-item st-${esc(f.status)}"><input type="hidden" name="id" value="${f.id}">
      <div><b>${esc(FB_KIND[f.kind] || f.kind)}</b> · ${esc(f.user || "লগ ইন ছাড়া")} · <small>${when(f.ts)}</small>${f.page ? ` · <small class="mono">${esc(f.page)}</small>` : ""}</div><p>${esc(f.text)}</p>
      <div class="row-form"><select name="status">${Object.entries(FB_STATUS).map(([k, v]) => `<option value="${k}"${k === f.status ? " selected" : ""}>${v}</option>`).join("")}</select>
      <input name="note" value="${esc(f.note || "")}" placeholder="উত্তর বা নোট (ব্যবহারকারী দেখবেন)" style="flex:1"><button class="btn">সংরক্ষণ</button></div></form>`).join("") : `<p class="hint">কোনো ফিডব্যাক নেই।</p>`}</section>`;
  },
  log() {
    const L = LOG.lines();
    return `<section class="pnl"><h2>সার্ভার লগ <small>শেষ ${bn(L.length)} লাইন, ${when(LOG.started)} থেকে</small></h2><pre class="log">${L.map(l => `<span class="lv-${l.level}">${esc(l.ts.slice(11, 19))} ${esc(l.level.toUpperCase().padEnd(5))} ${esc(l.text)}</span>`).join("\n") || "খালি"}</pre></section>`;
  },
  site() {
    const s = STORE.site();
    const f = (k, l, hint, long) => `<label class="fld"><span>${l} ${hint ? tip(hint) : ""}</span>${long ? `<textarea name="${k}" rows="3">${esc(s[k])}</textarea>` : `<input name="${k}" value="${esc(s[k])}">`}</label>`;
    return `<section class="pnl"><h2>সাইটের সেটিংস</h2><form method="post" action="/admin/site">
      <h3>টুলের নাম</h3>${f("siteName", "সাইটের নাম")}${f("studioName", "অডিও স্টুডিও")}${f("wizardName", "লেক্সিম উইজার্ড")}${f("bulkName", "একসঙ্গে অনেক")}${f("lexinaryName", "লেক্সিনারি")}
      <h3>ঘোষণা ও ফুটার</h3>${f("notice", "সব পাতার ওপরে ঘোষণা", "খালি রাখলে কিছু দেখাবে না", true)}${f("footerNote", "ফুটারে বাড়তি লেখা", "", true)}
      <h3>অ্যাডমিন</h3>${f("admins", "অ্যাডমিন অ্যাকাউন্ট", "উইকিমিডিয়া ব্যবহারকারী নাম, কমা দিয়ে। সার্ভারের ADMIN_USERS-এর অ্যাডমিনরা সবসময় থাকবেন।")}
      <button class="btn">সংরক্ষণ</button></form></section>`;
  },
};
function speakerEdit(s) {
  const f = (k, l) => `<label class="fld">${l}<input name="${k}" value="${esc(s[k] || "")}"></label>`;
  return `<section class="pnl" id="edit"><h2>বক্তা সম্পাদনা — ${esc(s.name || s.id)}</h2>
    <form method="post" action="/admin/speaker"><input type="hidden" name="id" value="${esc(s.id)}"><div class="grid2">${Object.entries(SPK_LABEL).map(([k, l]) => f(k, l)).join("")}</div>
      <div class="grid2"><label class="fld">মালিক অ্যাকাউন্ট<input name="owner" value="${esc(s.owner)}"></label><label class="fld">আরেকটি অ্যাকাউন্ট যুক্ত করুন<input name="adduser" placeholder="ব্যবহারকারী নাম"></label></div>
      <div class="row-form"><button class="btn">সংরক্ষণ</button><button class="btn ghost" name="act" value="code">নতুন যুক্ত-কোড</button><button class="btn red" name="act" value="delete" onclick="return confirm('বক্তাটি মুছবেন? রেকর্ডগুলো কমন্সে যেমন আছে থাকবে।')">বক্তা মুছুন</button></div></form></section>`;
}

/* ---------- routes ---------- */
// finish(html) adds what every page gets from the server (login state, versioned file links).
async function handle(req, res, url, user, readBody, finish = h => h) {
  const p = url.pathname, q = url.searchParams;
  const html = s => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(finish(s)); };
  if (req.method === "GET") {
    if (p === "/settings") return html(settingsPage(user, q)), true;
    if (p === "/admin") return html(adminPage(user, q)), true;
    if (p === "/feedback") return html(feedbackPage(user, q)), true;
    if (p === "/docs") return html(page("ফিচার ও ডকুমেন্টেশন", DOCS.docs(STORE.site()), { active: "docs" })), true;
    return false;
  }
  if (req.method !== "POST" || !/^\/(settings|admin|feedback)(\/|$)/.test(p)) return false;
  if (!sameSite(req)) { res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }); res.end("অন্য সাইট থেকে পাঠানো ফর্ম গ্রহণ করা হয় না।"); return true; }
  const f = form(await readBody(req));
  try {
    if (p === "/feedback") { STORE.addFeedback(user, f.page, f.kind, f.text); return back(res, /^\/[\w/-]*$/.test(f.back || "") ? f.back : "/feedback", "ধন্যবাদ — পাঠানো হয়েছে।"), true; }
    if (!user) return back(res, "/auth/login?back=" + encodeURIComponent(p.replace(/\/[^/]*$/, "") || "/settings")), true;
    if (p === "/settings/features") {
      const cur = STORE.getPrefs(user).data || {};
      for (const [k] of FEATURES) cur[k] = f[k] === "1";
      cur.source = /^(both|wd|wikt)$/.test(f.source) ? f.source : "wd";
      STORE.putPrefs(user, cur); STORE.log(user, "prefs", "features");
      return back(res, "/settings?t=features", "সংরক্ষিত।"), true;
    }
    if (p === "/settings/speaker-link") { STORE.linkSpeaker(user, f.id, f.code); return back(res, "/settings?t=speakers", "বক্তা যুক্ত হলো — স্টুডিওতে এখন একে বাছতে পারবেন।"), true; }
    if (p === "/settings/speaker-unlink") { STORE.unlinkSpeaker(user, f.id); return back(res, "/settings?t=speakers", "বিচ্ছিন্ন করা হলো।"), true; }
    if (p === "/settings/speaker-code") { STORE.newSpeakerCode(user, f.id, false); return back(res, "/settings?t=speakers", "নতুন কোড তৈরি হলো; আগের কোড আর চলবে না।"), true; }
    if (!isAdmin(user)) { res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }); res.end("অনুমতি নেই"); return true; }
    if (p === "/admin/site") { STORE.setSite(f, user); return back(res, "/admin?s=site", "সংরক্ষিত।"), true; }
    if (p === "/admin/feedback") { STORE.setFeedback(f.id, f.status, f.note); return back(res, "/admin?s=feedback", "সংরক্ষিত।"), true; }
    if (p === "/admin/speaker") {
      if (f.act === "delete") { STORE.deleteSpeaker(f.id); STORE.log(user, "admin.speaker", "delete " + f.id); return back(res, "/admin?s=speakers", "মুছে ফেলা হলো।"), true; }
      if (f.act === "code") { STORE.newSpeakerCode(user, f.id, true); return back(res, `/admin?s=speakers&id=${encodeURIComponent(f.id)}#edit`, "নতুন কোড তৈরি হলো।"), true; }
      STORE.adminSpeaker(f.id, f); STORE.setSpeakerOwner(f.id, (f.owner || "").trim()); STORE.addSpeakerUser(f.id, (f.adduser || "").trim()); STORE.log(user, "admin.speaker", f.id);
      return back(res, `/admin?s=speakers&id=${encodeURIComponent(f.id)}#edit`, "সংরক্ষিত।"), true;
    }
  } catch (e) { return back(res, req.headers.referer ? new URL(req.headers.referer).pathname + new URL(req.headers.referer).search.replace(/[?&]msg=[^&]*/, "") : "/settings", e.message), true; }
  return false;
}
module.exports = { handle, isAdmin };
