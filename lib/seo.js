"use strict";
// Search-engine optimisation, done on the server so crawlers get real content without running JavaScript:
// per-page <title>/description, canonical URL, Open Graph + Twitter cards, JSON-LD structured data,
// the word's own text inside the page body, robots.txt and sitemap.xml (every word of the local index).
const CFG = require("./config");
const IX = require("./lexindex");
const OAUTH1 = require("./oauth1");

const SITE = "লেক্সিম.বাংলা";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const base = req => (OAUTH1.publicUrl || `http${req.headers["x-forwarded-proto"] === "https" ? "s" : ""}://${req.headers.host}`).replace(/\/+$/, "");
const catBn = q => CFG.categories.find(c => c.qid === q)?.bn || "";
const langs = () => CFG.languages.filter(l => l.reader).map(l => l.qid).filter(Boolean);
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

function entry(id) {
  for (const q of langs()) { const ix = IX.peek(q); const r = ix && ix.byId.get(id); if (r) return { r, lang: CFG.languages.find(l => l.qid === q) }; }
  return null;
}

// What each page should say about itself.
function pageInfo(req, file, m) {
  const p = new URL(req.url, "http://x").pathname;
  const info = { title: "", desc: "", path: p, robots: "index,follow", jsonld: [], body: null };
  if (file === "index.html") {
    info.title = `${SITE} — বাংলা অভিধান: অর্থ, রূপ, ব্যুৎপত্তি, বাগধারা ও প্রবাদ`;
    info.desc = "বাংলা ভাষার উন্মুক্ত উইকি অভিধান। হাজারো বাংলা শব্দের অর্থ, রূপ, উচ্চারণ, গভীর ব্যুৎপত্তি, বাগধারা ও প্রবাদ — উইকি উপাত্ত লেক্সিম থেকে, বিনামূল্যে।";
    info.path = "/";
    info.jsonld.push({ "@context": "https://schema.org", "@type": "WebSite", name: SITE, alternateName: "Lexeme Bangla", url: base(req) + "/", inLanguage: "bn",
      potentialAction: { "@type": "SearchAction", target: base(req) + "/search?q={search_term_string}", "query-input": "required name=search_term_string" } });
  } else if (file === "word.html" || file === "etymology.html") {
    const id = m[1], e = entry(id);
    const ety = file === "etymology.html";
    if (e) {
      const { r, lang } = e, cat = catBn(r.category), defs = (r.bn.length ? r.bn : r.en).slice(0, 3);
      info.title = ety ? `${r.lemma} শব্দের ব্যুৎপত্তি ও উৎস | ${SITE}` : `${r.lemma} অর্থ${cat ? " (" + cat + ")" : ""} — ${lang?.bn || "বাংলা"} অভিধান | ${SITE}`;
      info.desc = cut(ety ? `“${r.lemma}” শব্দটি কোথা থেকে এসেছে: বিভিন্ন ভাষা ধরে পুরো ব্যুৎপত্তি-বৃক্ষ, খণ্ডাংশ ও একই মূলের শব্দ।`
        : `${r.lemma}${cat ? " (" + cat + ")" : ""}: ${defs.join("; ") || "অর্থ, রূপ ও ব্যুৎপত্তি"}। ${lang?.bn || "বাংলা"} শব্দের অর্থ, রূপ, উচ্চারণ ও ব্যুৎপত্তি।`, 160);
      info.jsonld.push({ "@context": "https://schema.org", "@type": "DefinedTerm", name: r.lemma, description: defs.join("; ") || undefined, inLanguage: lang?.code || "bn",
        url: base(req) + `/word/${id}`, sameAs: `https://www.wikidata.org/wiki/Lexeme:${id}`,
        inDefinedTermSet: { "@type": "DefinedTermSet", name: SITE, url: base(req) + "/" } });
      info.jsonld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE, item: base(req) + "/" },
        { "@type": "ListItem", position: 2, name: r.lemma, item: base(req) + `/word/${id}` },
        ...(ety ? [{ "@type": "ListItem", position: 3, name: "ব্যুৎপত্তি", item: base(req) + `/etymology/${id}` }] : [])] });
      // Real content for crawlers (and a fast first paint); the page script replaces it.
      if (!ety) info.body = { target: '<div id="wordbody">', html: `<article class="seo-static"><h1>${esc(r.lemma)}</h1>${cat ? `<p><em>(${esc(cat)})</em></p>` : ""}${defs.length ? `<ol>${defs.map(d => `<li>${esc(d)}</li>`).join("")}</ol>` : ""}</article>` };
    } else {
      info.title = ety ? `ব্যুৎপত্তি | ${SITE}` : `শব্দ | ${SITE}`;
      info.desc = "বাংলা শব্দের অর্থ, রূপ, উচ্চারণ ও ব্যুৎপত্তি — উইকি উপাত্ত লেক্সিম থেকে।";
    }
  } else if (file === "browse.html") {
    const q = new URL(req.url, "http://x").searchParams, letter = q.get("letter") || "";
    info.title = letter ? `“${letter}” দিয়ে শুরু বাংলা শব্দ — শব্দক্রম | ${SITE}` : `বাংলা শব্দের তালিকা — বর্ণানুক্রমে শব্দক্রম | ${SITE}`;
    info.desc = `বর্ণানুক্রমে ${letter ? "“" + letter + "” দিয়ে শুরু " : ""}সব বাংলা শব্দ, অর্থ ও শব্দশ্রেণিসহ, পাতায় পাতায়।`;
    info.path = p + (letter ? "?letter=" + encodeURIComponent(letter) : "");
  } else if (file === "collection.html") {
    const proverb = m[1] === "proverb";
    info.title = proverb ? `বাংলা প্রবাদ-প্রবচন ও তার অর্থ | ${SITE}` : `বাংলা বাগধারা ও তার অর্থ | ${SITE}`;
    info.desc = proverb ? "লোকমুখে প্রচলিত বাংলা প্রবাদ-প্রবচনের সংকলন, প্রতিটির অর্থসহ।" : "বাংলা বাগধারার সংকলন — প্রতিটির প্রকৃত অর্থসহ, বর্ণানুক্রমে।";
  } else if (file === "search.html") {
    const q = new URL(req.url, "http://x").searchParams.get("q") || "";
    info.title = q ? `“${q}” — অনুসন্ধান | ${SITE}` : `বাংলা শব্দ খুঁজুন | ${SITE}`;
    info.desc = "বাংলা শব্দ, শব্দের রূপ বা অর্থ দিয়ে খুঁজুন; উন্নত অনুসন্ধানে শুরু, শেষ বা ভেতরের অংশ দিয়ে।";
    info.path = "/search"; if (q) info.robots = "noindex,follow";
  } else if (file === "sound.html") {
    info.title = `লিব্রে স্টুডিও — বাংলাদেশের ভাষা ও আঞ্চলিক শব্দের উচ্চারণ রেকর্ড করুন | ${SITE}`;
    info.desc = "নিজের ভাষা, উপভাষা বা আঞ্চলিক শব্দের উচ্চারণ রেকর্ড করে উইকিমিডিয়া কমন্সে তুলুন এবং উইকি উপাত্তের লেক্সিমে যুক্ত করুন।"; info.path = "/studio";
  } else if (file === "wizard.html") {
    info.title = /\/bulk/.test(p) ? `একসঙ্গে অনেক লেক্সিম | ${SITE}` : `লেক্সিম উইজার্ড — নতুন শব্দ যোগ করুন | ${SITE}`;
    info.desc = "উইকি উপাত্তে বাংলা লেক্সিম তৈরি ও সম্পাদনা।"; info.robots = "noindex,follow";
  }
  return info;
}

// Insert the tags into a page (replaces the page's own <title> and description).
function apply(html, req, file, m) {
  const i = pageInfo(req, file, m); if (!i.title) return html;
  const url = base(req) + i.path;
  const tags = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="robots" content="${i.robots}">`,
    `<meta name="theme-color" content="#23467A">`,
    `<link rel="icon" href="/LexemBangla.svg" type="image/svg+xml">`,
    `<meta property="og:site_name" content="${SITE}">`, `<meta property="og:type" content="${file === "word.html" ? "article" : "website"}">`,
    `<meta property="og:title" content="${esc(i.title)}">`, `<meta property="og:description" content="${esc(i.desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`, `<meta property="og:locale" content="bn_BD">`,
    `<meta name="twitter:card" content="summary">`, `<meta name="twitter:title" content="${esc(i.title)}">`, `<meta name="twitter:description" content="${esc(i.desc)}">`,
    ...i.jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`),
  ].join("\n");
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(i.title)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>\s*/i, "");
  html = html.replace("</title>", `</title>\n<meta name="description" content="${esc(i.desc)}">`);
  html = html.includes("<!--SEO-->") ? html.replace("<!--SEO-->", tags) : html.replace("</head>", tags + "\n</head>");
  if (i.body && html.includes(i.body.target)) html = html.replace(i.body.target, i.body.target + i.body.html);
  return html;
}

function robots(req) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /proxy/\nDisallow: /auth/\nDisallow: /wizard\nDisallow: /bulk\n\nSitemap: ${base(req)}/sitemap.xml\n`;
}
function sitemap(req) {
  const b = base(req), day = new Date().toISOString().slice(0, 10);
  const urls = [["/", "daily", "1.0"], ["/browse", "weekly", "0.8"], ["/collection/idiom", "weekly", "0.8"], ["/collection/proverb", "weekly", "0.8"], ["/search", "monthly", "0.5"]];
  for (const q of langs()) { const ix = IX.peek(q); if (ix) for (const r of ix.list) urls.push([`/word/${r.id}`, "monthly", r.bn.length ? "0.7" : "0.5"]); }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.slice(0, 50000).map(([p, f, pr]) => `<url><loc>${esc(b + p)}</loc><lastmod>${day}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join("\n") + `\n</urlset>\n`;
}

module.exports = { apply, robots, sitemap };
