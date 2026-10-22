"use strict";
(function () {
// Shared configuration for the reader (mirrors CFG in public/js/wizard.js).
const __exp = {
  wd: "https://www.wikidata.org/w/api.php",
  sparql: "https://query.wikidata.org/sparql",
  // Login uses the OAuth 1.0a consumer in oauth.local.json (key + secret, server-side). Leave this empty;
  // it is only for an optional OAuth 2.0 client ID. Do not put the OAuth 1.0a key here.
  oauthClientId: "",
  userAgent: "LexemeBangla/2.0 (https://www.wikidata.org/wiki/User:Aishik_Rehman) node",
  languages: [
    { iso3: "ben", qid: "Q9610", code: "bn", en: "Bengali", bn: "বাংলা" },
    { iso3: "asm", qid: "Q29401", code: "as", en: "Assamese", bn: "অসমীয়া" },
    { iso3: "kyw", qid: "Q6446173", code: "", en: "Kurmali", bn: "কুড়মালি" },
    { iso3: "syl", qid: "Q2044", code: "syl", en: "Sylheti", bn: "সিলেটি" },
    { iso3: "ctg", qid: "Q33173", code: "", en: "Chittagonian", bn: "চাটগাঁইয়া" },
  ],
  categories: [
    { key: "noun", qid: "Q1084", en: "Noun", bn: "বিশেষ্য" },
    { key: "proper_noun", qid: "Q147276", en: "Proper noun", bn: "নামবাচক বিশেষ্য" },
    { key: "pronoun", qid: "Q36224", en: "Pronoun", bn: "সর্বনাম" },
    { key: "verb", qid: "Q24905", en: "Verb", bn: "ক্রিয়া" },
    { key: "adjective", qid: "Q34698", en: "Adjective", bn: "বিশেষণ" },
    { key: "adverb", qid: "Q380057", en: "Adverb", bn: "ক্রিয়াবিশেষণ" },
    { key: "postposition", qid: "Q161873", en: "Postposition", bn: "অনুসর্গ" },
    { key: "conjunction", qid: "Q36484", en: "Conjunction", bn: "সংযোজক অব্যয়" },
    { key: "interjection", qid: "Q83034", en: "Interjection", bn: "আবেগসূচক অব্যয়" },
    { key: "numeral", qid: "Q63116", en: "Numeral", bn: "সংখ্যাবাচক শব্দ" },
    { key: "phrase", qid: "Q187931", en: "Phrase", bn: "বাক্যাংশ" },
    { key: "idiom", qid: "Q184511", en: "Idiom", bn: "বাগধারা" },
    { key: "proverb", qid: "Q35102", en: "Proverb", bn: "প্রবাদ" },
    { key: "prefix", qid: "Q134830", en: "Prefix", bn: "উপসর্গ" },
  ],
  // Bengali labels for properties shown in the reader.
  plabelBn: {
    P5191: "যে শব্দ থেকে উদ্ভূত", P5886: "উদ্ভবের ধরন", P5238: "খণ্ডাংশ", P1545: "ক্রমিক সংখ্যা", P5831: "প্রয়োগের উদাহরণ",
    P5830: "উদাহরণে ব্যবহৃত রূপ", P6072: "উদাহরণে ব্যবহৃত অর্থ", P5137: "এই অর্থের আইটেম", P5973: "সমার্থক শব্দ", P5974: "বিপরীত শব্দ",
    P5972: "অনুবাদ", P1343: "বর্ণিত উৎস", P304: "পৃষ্ঠা", P248: "উৎস", P6084: "ব্যবহারের অঞ্চল", P18: "ছবি", P443: "উচ্চারণের অডিও",
    P898: "আইপিএ উচ্চারণ", P5279: "অক্ষরবিভাজন", P2440: "প্রতিবর্ণীকরণ", P5237: "উচ্চারণভেদ", P6593: "ঊর্ধ্বতন শব্দ", P5975: "যার সুনির্দিষ্ট রূপ",
    P8471: "সম্পর্কিত বিশেষণ", P6191: "ভাষার রীতি", P1552: "বৈশিষ্ট্য", P7481: "রূপভেদ", P460: "একই বলে কথিত", P5323: "যেখানে পাওয়া যায়",
    P1932: "উৎসে যেভাবে আছে", P1810: "যে নামে উল্লিখিত", P8394: "সংজ্ঞার উদ্ধৃতি", P973: "বর্ণনার URL", P5187: "শব্দমূল", P5186: "ক্রিয়ারূপের শ্রেণি",
    P5923: "যে ধরনের লেক্সিম গড়ে", P5194: "স্বীকৃতিদাতা", P5713: "আবশ্যিক ব্যাকরণগত বৈশিষ্ট্য", P5185: "ব্যাকরণগত লিঙ্গ", P31: "নিদর্শন",
    P5402: "সমবানান শব্দ", P5920: "ধাতু/মূল", P8530: "বিকল্প রূপ", P5911: "রূপসাধন শ্রেণি", P5976: "ভ্রান্ত মিত্র", P854: "তথ্যসূত্রের URL",
    P1476: "শিরোনাম", P813: "সংগ্রহের তারিখ", P9763: "প্রধান অংশের অবস্থান", P9764: "প্রধান অংশের সঙ্গে সম্পর্ক", P5548: "নির্দিষ্ট রূপ",
  },
};
if (typeof module !== "undefined" && module.exports) module.exports = __exp; else (window.LX = window.LX || {}).config = __exp;
})();
