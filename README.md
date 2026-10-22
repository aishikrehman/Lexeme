# লেক্সিম.বাংলা (Node.js)

Bengali-script dictionary reader + Wikidata Lexeme Wizard. No npm dependencies; needs **Node 18+**.

```
npm start          # http://localhost:3000   (PORT env var to change)
npm run dev        # auto-restart on changes
```

Without Node the pages still work: open `public/index.html` from any static server (or the file itself).
The same reader code in `lib/` then runs in the browser and talks to Wikidata directly.

## Pages

| URL | Page |
|---|---|
| `index.html` (`/`) | Home: search, word of the day, idioms, proverbs, stats, A–Z letters, language picker |
| `search.html?q=` | Search; match types (exact / starts / ends / contains) and fields (lemma / definition) are multi-select; one or all languages |
| `/lemma/L123` (`/lemma/L123#L123-F4` opens at a form) | Entry: senses, glosses in all languages, synonyms/antonyms/translations, usage examples, IPA + audio, forms, etymology, compound parts, derived words, homographs, sources, all other statements; previous/next word (← → keys) |
| `/etymology/L123` | Deep etymology tree across every language level (P5191/P5238 recursively), derivation modes, sources, cognates |
| `browse.html` | All words alphabetically, page by page or continuous scroll; filter by letter / category |
| `collection.html?cat=idiom` / `?cat=proverb` | Full idiom and proverb collections (idioms also include verbal locutions/phrases while Wikidata has no Bengali "idiom" lexemes) |
| `/wizard` | One lexeme at a time: the original editor with every function (senses, forms, etymology, audio, examples), restyled to match. `?id=L123` update, `?lemma=…&cat=idiom` new |
| `/bulk` | **একসঙ্গে অনেক** — many lexemes as a spreadsheet: paste from Excel/Google Sheets (TSV) or CSV, open CSV/TSV/JSON files, keyboard editing, block select, copy/cut/paste, fill-down (Ctrl+D), undo/redo, insert/duplicate/delete rows, show/hide/add/resize columns, find & replace, drop-downs for category/animacy/language, live cell checks, status filter, autosave, CSV/TSV/JSON export, “open row in the wizard”; then validate (incl. duplicates on Wikidata) and run the batch |
| `/legacy` | The original single-file `index.html`, untouched |

Old links (`/word/L123`, `word.html?id=L123`, `etymology.html?id=L123`, `/browse`, `/wizard`, …) redirect to these. Without the Node server (plain files) word links fall back to `word.html?id=L123`.

## Node server

- `/api/*` — cached JSON: `config`, `search`, `home`, `browse`, `random`, `collection`, `word/:id`, `neighbors/:id`, `etymology/:id`
- `/proxy/wd`, `/proxy/commons`, `/proxy/sparql` — the wizard sends all Wikidata/Commons/SPARQL traffic (including authenticated edits and uploads) through these when served by Node
- `/lib/*.js` — the reader engine, shared by server and browser

## Login (Wikimedia OAuth 1.0a, server-side)

Reading needs no login. The header **লগ ইন** button (every page) goes to `/auth/login`, which sends you straight to
Wikimedia; after approving you return to the page you were on. The consumer secret never leaves the server.

Settings — `oauth.local.json` (git-ignored, never served) or environment variables:

| file key | env var | meaning |
|---|---|---|
| `consumerKey` | `OAUTH_CONSUMER_KEY` | consumer token |
| `consumerSecret` | `OAUTH_CONSUMER_SECRET` | secret token |
| `publicUrl` | `PUBLIC_URL` | the address people open the site at; the callback `<publicUrl>/auth/callback` is built from it, and the server's default port is taken from it |

The callback sent to Wikimedia must **start with** the consumer's registered "callback URL" (the consumer needs
"Allow consumer to specify a callback … as a required prefix"). A Wikimedia consumer has exactly one callback,
so use one consumer per place the site runs:

- **Local:** consumer callback `http://127.0.0.1:5000/` → `publicUrl: "http://127.0.0.1:5000"` → open
  **http://127.0.0.1:5000** (exactly this host — `localhost` is a different site to the browser and loses the login).
- **Production:** register another consumer with callback `https://your-domain.org/`, then run with
  `OAUTH_CONSUMER_KEY=… OAUTH_CONSUMER_SECRET=… PUBLIC_URL=https://your-domain.org PORT=…`.

Grants needed: edit existing pages; create, edit and move pages; upload new files. The wizard's edits and uploads
go through `/proxy/*`, where the server signs each call; plain reads are sent anonymously. Logins are kept in
`cache/sessions.json`, so `npm start` (which restarts itself when the code changes) keeps you logged in.