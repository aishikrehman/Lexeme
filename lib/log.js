"use strict";
// Server log for the admin dashboard: the last lines of console output (and uncaught errors), kept in memory.
// Nothing is written to disk; a restart starts a fresh log. Hosting logs (cPanel/Passenger) still get everything.
const MAX = 800, lines = [];
const push = (level, args) => {
  const text = args.map(a => (a instanceof Error ? a.stack || a.message : typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch (e) { return String(a); } })())).join(" ");
  lines.push({ ts: new Date().toISOString(), level, text: text.slice(0, 4000) }); if (lines.length > MAX) lines.splice(0, lines.length - MAX);
};
for (const level of ["log", "info", "warn", "error"]) {
  const orig = console[level].bind(console);
  console[level] = (...args) => { push(level, args); orig(...args); };
}
process.on("uncaughtException", e => { console.error("uncaughtException:", e); process.exit(1); }); // logged, then the usual crash-and-restart
process.on("unhandledRejection", e => { push("error", ["unhandledRejection:", e]); });
const started = new Date().toISOString();
module.exports = { lines: () => lines.slice().reverse(), started };
