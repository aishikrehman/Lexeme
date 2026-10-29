"use strict";
// The site footer, made on the server so it is there without JavaScript too. Names and the extra note come
// from the admin's site settings.
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
function footer(s) {
  const col = (title, links) => `<div class="sf-col"><h2>${title}</h2><ul>${links.map(([h, t]) => `<li><a href="${h}">${esc(t)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="site-foot" role="contentinfo"><div class="wrap">
  <div class="sf-top">
    <div class="sf-brand"><a class="sf-logo" href="/"><img class="logo-img" src="/LexemBangla.svg" alt="" width="46" height="32">${esc(s.siteName)}</a>
      <p>বাংলা ও বাংলাদেশের ভাষাগুলোর উন্মুক্ত অভিধান আর উচ্চারণ সংগ্রহ — উইকি উপাত্ত, উইকিঅভিধান ও উইকিমিডিয়া কমন্সের সঙ্গে যুক্ত।</p>
      ${s.footerNote ? `<p class="sf-note">${esc(s.footerNote)}</p>` : ""}</div>
    ${col("অভিধান", [["/search", "অনুসন্ধান"], ["/browse", "শব্দক্রম"], ["/collection/idiom", "বাগধারা"], ["/collection/proverb", "প্রবাদ-প্রবচন"]])}
    ${col("অবদান রাখুন", [["/wizard", s.wizardName], ["/bulk", s.bulkName], ["/lexinary", s.lexinaryName], ["/studio", s.studioName]])}
    ${col("সাহায্য", [["/docs", "ফিচার ও ডকুমেন্টেশন"], ["/feedback", "ফিডব্যাক / সমস্যা জানান"], ["/settings", "আমার সেটিংস"], ["/docs#privacy", "গোপনীয়তা"]])}
  </div>
  <div class="sf-bottom">
    <span>শব্দের তথ্য: ${ext("https://www.wikidata.org/wiki/Wikidata:Lexicographical_data", "উইকি উপাত্ত")} (CC0) · অভিধানের ভুক্তি: ${ext("https://bn.wiktionary.org/", "উইকিঅভিধান")} (CC BY-SA) · উচ্চারণ: ${ext("https://commons.wikimedia.org/", "উইকিমিডিয়া কমন্স")}</span>
    <span>কোড: ${ext("https://github.com/aishikrehman/Lexeme", "গিটহাব")} (MIT) · নির্মাতা: ${ext("https://www.wikidata.org/wiki/User:Aishik_Rehman", "ঐশিক রেহমান")}</span>
  </div></div></footer>`;
}
module.exports = { footer };
