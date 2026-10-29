"use strict";
// Where everything users own is kept: the database (speakers, settings, word lists, upload history, feedback…)
// and the login sessions. It is OUTSIDE the code folder, so updating the code — git pull, re-uploading, even
// deleting and re-cloning the folder — never touches it:
//   STORE_DIR if set, otherwise a "lexeme-data" folder next to the code folder (e.g. ~/lexeme → ~/lexeme-data).
// Data an older version kept inside the code folder (./data, ./cache/sessions.json) is copied over once.
const fs = require("fs"), path = require("path");
const CODE = path.join(__dirname, "..");
function pick() {
  if (process.env.STORE_DIR) return path.resolve(process.env.STORE_DIR);
  const beside = path.join(path.dirname(CODE), "lexeme-data");
  try { fs.mkdirSync(beside, { recursive: true }); fs.accessSync(beside, fs.constants.W_OK); return beside; }
  catch (e) { return path.join(CODE, "data"); } // no write access beside the code: fall back to inside it
}
const DATA = pick();
fs.mkdirSync(DATA, { recursive: true });
const OLD = { db: path.join(CODE, "data", "lexeme.db"), sessions: path.join(CODE, "cache", "sessions.json") };
module.exports = { DATA, OLD, file: name => path.join(DATA, name) };
