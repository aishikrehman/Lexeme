"use strict";
// Spreadsheet editor for “একসঙ্গে অনেক” (the /bulk page). It edits wizard.js's `grid` (cols/rows) and keeps
// everything downstream as it was: #bulk-text, validation (bulkValidate), the batch runner and the plan export.
//
// Mouse: click a cell, Shift+click or drag to select a block, double-click to edit, drag a header edge to resize.
// Keys:  arrows / Tab / Enter move · type or F2 to edit · Esc cancels · Delete clears · Ctrl+C / X / V copy, cut,
//        paste (TSV from Excel / Google Sheets, or CSV) · Ctrl+D fill down · Ctrl+Z / Ctrl+Y undo, redo ·
//        Ctrl+A select all · Ctrl+Enter / Shift+Enter insert a row below / above.
(function () {
  const host = document.getElementById("bulk-grid");
  if (!host || typeof grid === "undefined") return;

  /* ---------- column knowledge ---------- */
  const ENUM = {
    category: () => [["", "—"], ...CFG.categories.map(c => [c.key, `${c.bn} · ${c.key}`])],
    animacy: () => [["", "—"], ["animate", "প্রাণীবাচক · animate"], ["inanimate", "অপ্রাণীবাচক · inanimate"]],
    generate_forms: () => [["", "—"], ["yes", "হ্যাঁ · yes"], ["no", "না · no"]],
    derivation_mode: () => [["", "—"], ...Object.entries(CFG.derivationModes).map(([k, v]) => [k, v.label])],
    lang_code: () => CFG.languages.filter(l => l.code).map(l => [l.code, `${l.bn} · ${l.code}`]),
    language: () => CFG.languages.filter(l => l.qid).map(l => [l.qid, `${l.bn} · ${l.qid}`]),
  };
  const PATTERN = { existing_id: [/^L\d+$/, "L দিয়ে শুরু লেক্সিম আইডি, যেমন L1472"], derived_from: [/^L\d+(-[SF]\d+)?$/, "লেক্সিম আইডি, যেমন L1472"],
    item: [/^Q\d+$/, "আইটেম আইডি, যেমন Q144"], components: [/^L\d+(\s*[;|]\s*L\d+)*$/, "লেক্সিম আইডি, ; দিয়ে আলাদা: L1;L2"], language: [/^Q\d+$/, "ভাষার আইটেম, যেমন Q9610"] };
  const HELP = {
    lemma: "শব্দটি (lemma) — বাধ্যতামূলক", category: "শব্দশ্রেণি: noun, verb, adjective…", gloss_bn: "বাংলা সংজ্ঞা", gloss_en: "ইংরেজি সংজ্ঞা",
    forms: "রূপ:বৈশিষ্ট্য,বৈশিষ্ট্য; আরেক রূপ:… যেমন কুকুরেরা:plural,nominative", generate_forms: "yes দিলে টেমপ্লেট থেকে সব রূপ তৈরি হবে",
    statements: "P…=মান; P…=মান", existing_id: "দিলে নতুন না বানিয়ে এই লেক্সিমে যোগ হবে", usage_example: "প্রয়োগের উদাহরণ বাক্য",
    components: "সমাসের অংশ: L1;L2", derived_from: "যে লেক্সিম থেকে উদ্ভূত", audio: "কমন্সের অডিও ফাইলের নাম",
  };
  const label = c => COL_BN[c] || c;

  /* ---------- state ---------- */
  const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const S = {
    r: 0, c: 0, r2: 0, c2: 0,           // selection in view space (visible rows × visible columns)
    edit: null,                          // { i, j } while a cell editor is open
    drag: false, undo: [], redo: [],
    hidden: new Set(LS.get("lx_bulk_hidden", [])), widths: LS.get("lx_bulk_widths", {}),
    filter: "all", rows: [], cols: [],   // current view: data row indices / data column indices
    findOpen: false,
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sel = () => ({ r0: Math.min(S.r, S.r2), r1: Math.max(S.r, S.r2), c0: Math.min(S.c, S.c2), c1: Math.max(S.c, S.c2) });

  /* ---------- changes (undo, sync, autosave) ---------- */
  const snapshot = () => JSON.stringify({ cols: grid.cols, rows: grid.rows });
  function change(fn) {
    S.undo.push(snapshot()); if (S.undo.length > 100) S.undo.shift(); S.redo = [];
    fn(); after();
  }
  function after() {
    $("#bulk-text").value = toCSV(); bulkEdited(); autosave(); render();
  }
  function restore(from, to) { if (!from.length) return; to.push(snapshot()); const s = JSON.parse(from.pop()); grid.cols = s.cols; grid.rows = s.rows; $("#bulk-text").value = toCSV(); bulkEdited(); autosave(); render(); }
  let saveT;
  function autosave() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { LS.set("lx_bulk_sheet", { cols: grid.cols, rows: grid.rows, t: Date.now() }); const n = $("#bs-saved"); if (n) n.textContent = "স্বয়ংক্রিয়ভাবে সংরক্ষিত " + new Date().toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }); }, 400);
  }
  const blankRow = () => grid.cols.map(c => (c === "lang_code" ? "bn" : c === "language" ? "Q9610" : ""));

  /* ---------- checks per cell (instant, before the full validation) ---------- */
  function issue(i, j) {
    const c = grid.cols[j], v = String(grid.rows[i][j] ?? "").trim(), row = grid.rows[i];
    const filled = row.some(x => String(x).trim());
    if (!filled) return null;
    if (c === "lemma" && !v) return ["err", "শব্দ (lemma) খালি"];
    if (!v) return null;
    if (PATTERN[c] && !PATTERN[c][0].test(v)) return ["err", "ঠিক বিন্যাস নয়: " + PATTERN[c][1]];
    if (c === "category" && !/^Q\d+$/.test(v) && !CFG.categories.some(x => [x.key, x.en.toLowerCase(), x.bn].includes(v.toLowerCase()) || x.bn === v)) return ["warn", "অজানা শব্দশ্রেণি"];
    if (c === "generate_forms" && !/^(y|yes|1|true|হ্যাঁ|n|no|0|false|না)$/i.test(v)) return ["warn", "yes বা no দিন"];
    if (c === "animacy" && !/^(animate|inanimate|Q\d+)$/i.test(v)) return ["warn", "animate বা inanimate দিন"];
    if (c === "lemma") {
      const k = grid.cols.indexOf("category"), key = v + "|" + (k >= 0 ? row[k] : "");
      if (dupCount.get(key) > 1) return ["warn", "একই শব্দ ও শ্রেণি আরেকটি সারিতেও আছে"];
    }
    return null;
  }
  let dupCount = new Map();
  function countDups() {
    dupCount = new Map(); const a = grid.cols.indexOf("lemma"), k = grid.cols.indexOf("category"); if (a < 0) return;
    grid.rows.forEach(r => { const v = String(r[a] || "").trim(); if (!v) return; const key = v + "|" + (k >= 0 ? r[k] : ""); dupCount.set(key, (dupCount.get(key) || 0) + 1); });
  }

  /* ---------- row status from the last full validation ---------- */
  function statusOf(res) {
    if (!res) return "none";
    if (/সংরক্ষিত/.test(res.status || "")) return "saved";
    if (/ব্যর্থ/.test(res.status || "")) return "failed";
    return res.errors.length ? "err" : res.warnings.length ? "warn" : "ok";
  }
  const STATUS_TAG = { err: '<span class="status-tag err">ত্রুটি</span>', warn: '<span class="status-tag warn">সতর্কতা</span>', ok: '<span class="status-tag ok">ঠিক আছে</span>' };

  /* ---------- view ---------- */
  function computeView() {
    const q = (grid.q || "").toLowerCase(), res = rowResults();
    let idx = grid.rows.map((_, i) => i).filter(i => !q || grid.rows[i].some(x => String(x).toLowerCase().includes(q)));
    if (S.filter !== "all") idx = idx.filter(i => {
      const st = statusOf(res.get(i));
      if (S.filter === "issues") return grid.cols.some((_, j) => issue(i, j));
      return st === S.filter;
    });
    if (grid.sort >= 0) idx.sort((a, b) => String(grid.rows[a][grid.sort]).localeCompare(String(grid.rows[b][grid.sort]), "bn") * grid.dir);
    S.rows = idx; S.cols = grid.cols.map((_, j) => j).filter(j => !S.hidden.has(grid.cols[j]));
    S.r = clamp(S.r, 0, Math.max(0, S.rows.length - 1)); S.r2 = clamp(S.r2, 0, Math.max(0, S.rows.length - 1));
    S.c = clamp(S.c, 0, Math.max(0, S.cols.length - 1)); S.c2 = clamp(S.c2, 0, Math.max(0, S.cols.length - 1));
    return res;
  }

  function render() {
    if (grid.json) { host.innerHTML = `<p class="hint" style="padding:12px">JSON তালিকা টেবিলে দেখানো যায় না; “লেখা” অংশে সম্পাদনা করুন।</p>`; $("#bulk-count").textContent = ""; return; }
    countDups();
    const res = computeView(), s = sel();
    const lemmaJ = grid.cols.indexOf("lemma");
    const head = `<tr><th class="rn" title="সারি নম্বর — চাপলে পুরো সারি বাছাই">#</th><th class="stc">যাচাই</th>${S.cols.map((j, vc) => {
      const c = grid.cols[j], w = S.widths[c];
      return `<th data-vc="${vc}" class="${j === lemmaJ ? "lem" : ""}${vc >= s.c0 && vc <= s.c1 ? " hsel" : ""}" style="${w ? `width:${w}px;min-width:${w}px;max-width:${w}px` : ""}" title="${esc(c + (HELP[c] ? " — " + HELP[c] : ""))}">
        <button class="sortb" data-act="gridSort" data-j="${j}">${esc(label(c))}${grid.sort === j ? (grid.dir > 0 ? " ▲" : " ▼") : ""}</button><span class="rz" data-col="${esc(c)}" aria-hidden="true"></span></th>`;
    }).join("")}</tr>`;
    const body = S.rows.map((i, vr) => {
      const r = res.get(i), st = statusOf(r), msgs = r ? [...r.errors, ...r.warnings].join("\n") : "";
      const tag = r ? (r.status ? r.status : STATUS_TAG[st]) + (msgs ? tipI(msgs) : "") : "";
      const rowSel = vr >= s.r0 && vr <= s.r1;
      return `<tr class="${rowSel ? "rsel" : ""} st-${st}"><th class="rn" data-vr="${vr}">${toBn(i + 1)}</th><td class="stc">${tag}</td>${S.cols.map((j, vc) => {
        const v = grid.rows[i][j] ?? "", is = issue(i, j), inSel = rowSel && vc >= s.c0 && vc <= s.c1, act = vr === S.r && vc === S.c;
        const cls = ["cl", grid.cols[j] === "lemma" ? "lem" : "", is ? "is-" + is[0] : "", inSel ? "sel" : "", act ? "act" : ""].filter(Boolean).join(" ");
        const shown = ENUM[grid.cols[j]] ? (ENUM[grid.cols[j]]().find(o => o[0] === v)?.[1] || v) : v;
        return `<td class="${cls}" data-vr="${vr}" data-vc="${vc}"${is ? ` title="${esc(is[1])}"` : ""}>${esc(shown)}</td>`;
      }).join("")}</tr>`;
    }).join("");
    host.innerHTML = `<table class="sheet"><thead>${head}</thead><tbody>${body}</tbody></table>${!grid.rows.length ? `<div class="sheet-empty">কোনো সারি নেই। <b>Excel / Google Sheets থেকে কপি করে এখানে পেস্ট করুন</b> (Ctrl+V), ফাইল খুলুন, “নমুনা” দেখুন, বা “+ সারি” চাপুন।</div>` : !S.rows.length ? `<div class="sheet-empty">এই বাছাইয়ে কোনো সারি নেই।</div>` : ""}`;
    const issues = grid.rows.reduce((a, _, i) => a + (grid.cols.some((__, j) => issue(i, j)) ? 1 : 0), 0);
    $("#bulk-count").textContent = `${toBn(S.rows.length)}/${toBn(grid.rows.length)}টি সারি${issues ? ` · ${toBn(issues)}টিতে ঘরের সমস্যা` : ""}`;
    drawSelInfo(); drawColMenu();
    if (S.edit) openEditor(S.edit.vr, S.edit.vc, S.edit.text, true);
  }
  function drawSelInfo() {
    const s = sel(), n = (s.r1 - s.r0 + 1) * (s.c1 - s.c0 + 1), el = $("#bs-sel"); if (!el) return;
    const i = S.rows[S.r], j = S.cols[S.c];
    el.textContent = !S.rows.length ? "" : n > 1 ? `${toBn(s.r1 - s.r0 + 1)} সারি × ${toBn(s.c1 - s.c0 + 1)} কলাম বাছাই` : `সারি ${toBn(i + 1)} · ${label(grid.cols[j] || "")}`;
  }
  function paintSelection() { // cheap re-highlight without rebuilding the table
    const s = sel();
    host.querySelectorAll("td.cl").forEach(td => {
      const vr = +td.dataset.vr, vc = +td.dataset.vc;
      td.classList.toggle("sel", vr >= s.r0 && vr <= s.r1 && vc >= s.c0 && vc <= s.c1);
      td.classList.toggle("act", vr === S.r && vc === S.c);
    });
    host.querySelectorAll("tbody tr").forEach((tr, vr) => tr.classList.toggle("rsel", vr >= s.r0 && vr <= s.r1));
    host.querySelectorAll("thead th[data-vc]").forEach(th => { const vc = +th.dataset.vc; th.classList.toggle("hsel", vc >= s.c0 && vc <= s.c1); });
    drawSelInfo();
    const td = cellEl(S.r, S.c); td?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  const cellEl = (vr, vc) => host.querySelector(`td.cl[data-vr="${vr}"][data-vc="${vc}"]`);
  function moveTo(vr, vc) {
    if (!S.rows.length) return;
    S.r = S.r2 = clamp(vr, 0, S.rows.length - 1); S.c = S.c2 = clamp(vc, 0, S.cols.length - 1);
    paintSelection();
  }
  // Keep the anchor (S.r/S.c) and move the far corner when extending.
  function extendTo(vr, vc) { S.r2 = clamp(vr, 0, S.rows.length - 1); S.c2 = clamp(vc, 0, S.cols.length - 1); paintSelection(); }

  /* ---------- cell editor ---------- */
  function openEditor(vr, vc, text, keepText) {
    const td = cellEl(vr, vc); if (!td) { S.edit = null; return; }
    const i = S.rows[vr], j = S.cols[vc], c = grid.cols[j], cur = keepText ? text : text ?? String(grid.rows[i][j] ?? "");
    S.edit = { vr, vc, i, j, text: cur };
    const opts = ENUM[c]?.();
    td.classList.add("editing");
    if (opts) {
      const known = opts.some(o => o[0] === cur);
      td.innerHTML = `<select class="ed">${(known ? opts : [[cur, cur], ...opts]).map(o => `<option value="${esc(o[0])}"${o[0] === cur ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
    } else td.innerHTML = `<textarea class="ed" rows="1" lang="bn" spellcheck="false"></textarea>`;
    const ed = td.querySelector(".ed"); if (!opts) ed.value = cur;
    ed.focus(); if (!opts) { ed.setSelectionRange(ed.value.length, ed.value.length); autoGrow(ed); }
    ed.addEventListener("input", () => { S.edit && (S.edit.text = ed.value); if (!opts) autoGrow(ed); });
    ed.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); S.edit = null; render(); host.focus(); return; }
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) { e.preventDefault(); commit(); moveTo(vr + 1, vc); host.focus(); return; }
      if (e.key === "Tab") { e.preventDefault(); commit(); moveTo(vr, vc + (e.shiftKey ? -1 : 1)); host.focus(); return; }
    });
    if (opts) ed.addEventListener("change", () => { commit(); host.focus(); });
    ed.addEventListener("blur", () => { if (S.edit && S.edit.i === i && S.edit.j === j) commit(); });
  }
  const autoGrow = el => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; };
  function commit() {
    const e = S.edit; if (!e) return; S.edit = null;
    const td = cellEl(e.vr, e.vc); const ed = td?.querySelector(".ed");
    const val = ed ? ed.value : e.text;
    if (String(grid.rows[e.i]?.[e.j] ?? "") === val) { render(); return; }
    change(() => { grid.rows[e.i][e.j] = typeof nfc === "function" ? nfc(val) : val; });
  }

  /* ---------- clipboard ---------- */
  const tsvCell = v => (/[\t\n\r"]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  function selectionText() {
    const s = sel(); const out = [];
    for (let vr = s.r0; vr <= s.r1; vr++) { const i = S.rows[vr]; out.push(S.cols.slice(s.c0, s.c1 + 1).map(j => tsvCell(String(grid.rows[i][j] ?? ""))).join("\t")); }
    return out.join("\n");
  }
  function parseTable(text) {
    text = String(text).replace(/\r\n?/g, "\n").replace(/\n$/, "");
    const tab = text.includes("\t"), sep = tab ? "\t" : ",";
    if (!tab && !text.includes(",") ) return text.split("\n").map(l => [l]);
    const rows = []; let row = [], f = "", q = false;
    for (let k = 0; k < text.length; k++) {
      const ch = text[k];
      if (q) { if (ch === '"') { if (text[k + 1] === '"') { f += '"'; k++; } else q = false; } else f += ch; }
      else if (ch === '"' && f === "") q = true;
      else if (ch === sep) { row.push(f); f = ""; }
      else if (ch === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else f += ch;
    }
    row.push(f); rows.push(row);
    return rows;
  }
  function pasteText(text) {
    let block = parseTable(text); if (!block.length) return;
    const known = Object.keys(COL_BN);
    const looksHeader = block[0].length > 1 && block[0].every(x => known.includes(String(x).trim().toLowerCase()));
    change(() => {
      // A whole sheet with a header row pasted into an empty table → it becomes the table.
      if (looksHeader && !grid.rows.some(r => r.some(x => String(x).trim()))) {
        grid.cols = block[0].map(x => x.trim().toLowerCase()); grid.rows = block.slice(1).map(r => grid.cols.map((_, k) => r[k] ?? ""));
        S.r = S.r2 = S.c = S.c2 = 0; return;
      }
      if (looksHeader) {
        // Header row pasted into a filled table: map by column name, append as new rows.
        const map = block[0].map(x => grid.cols.indexOf(x.trim().toLowerCase()));
        block.slice(1).forEach(r => { const nr = blankRow(); map.forEach((j, k) => { if (j >= 0) nr[j] = r[k] ?? ""; }); grid.rows.push(nr); });
        return;
      }
      const s = sel(); const single = block.length === 1 && block[0].length === 1;
      // One value pasted onto a selected block → fill the whole block with it.
      if (single && (s.r1 > s.r0 || s.c1 > s.c0)) { for (let vr = s.r0; vr <= s.r1; vr++) for (let vc = s.c0; vc <= s.c1; vc++) grid.rows[S.rows[vr]][S.cols[vc]] = block[0][0]; return; }
      block.forEach((r, dr) => {
        let i = S.rows[s.r0 + dr];
        if (i === undefined) { grid.rows.push(blankRow()); i = grid.rows.length - 1; S.rows.push(i); }
        r.forEach((v, dc) => { const j = S.cols[s.c0 + dc]; if (j !== undefined) grid.rows[i][j] = v; });
      });
      S.r2 = s.r0 + block.length - 1; S.c2 = Math.min(s.c0 + Math.max(...block.map(r => r.length)) - 1, S.cols.length - 1);
    });
  }

  /* ---------- row / column operations ---------- */
  const OPS = {
    addEnd() { change(() => { grid.rows.push(blankRow()); grid.q = ""; S.filter = "all"; }); const $q = $("#bulk-q"); if ($q) $q.value = ""; moveTo(S.rows.length - 1, 0); },
    insert(below) {
      const s = sel(); const at = S.rows.length ? (below ? S.rows[s.r1] + 1 : S.rows[s.r0]) : 0;
      change(() => { grid.sort = -1; grid.rows.splice(at, 0, blankRow()); });
      moveTo(S.rows.indexOf(at), S.c);
    },
    duplicate() { const s = sel(); const idx = S.rows.slice(s.r0, s.r1 + 1); if (!idx.length) return;
      change(() => { grid.sort = -1; const at = Math.max(...idx) + 1; grid.rows.splice(at, 0, ...idx.map(i => [...grid.rows[i]])); }); },
    delRows() { const s = sel(); const idx = new Set(S.rows.slice(s.r0, s.r1 + 1)); if (!idx.size) return;
      if (idx.size > 5 && !confirm(`${toBn(idx.size)}টি সারি মুছবে। নিশ্চিত?`)) return;
      change(() => { grid.rows = grid.rows.filter((_, i) => !idx.has(i)); }); moveTo(s.r0, S.c); },
    clear() { const s = sel(); change(() => { for (let vr = s.r0; vr <= s.r1; vr++) for (let vc = s.c0; vc <= s.c1; vc++) grid.rows[S.rows[vr]][S.cols[vc]] = ""; }); },
    fillDown() { const s = sel(); if (s.r1 === s.r0) return;
      change(() => { for (let vc = s.c0; vc <= s.c1; vc++) { const j = S.cols[vc], v = grid.rows[S.rows[s.r0]][j]; for (let vr = s.r0 + 1; vr <= s.r1; vr++) grid.rows[S.rows[vr]][j] = v; } }); },
    undo() { restore(S.undo, S.redo); }, redo() { restore(S.redo, S.undo); },
    selectAll() { S.r = 0; S.c = 0; S.r2 = S.rows.length - 1; S.c2 = S.cols.length - 1; paintSelection(); },
    addColumn(name) {
      name = String(name || "").trim().toLowerCase(); if (!name) return;
      if (grid.cols.includes(name)) { S.hidden.delete(name); saveCols(); render(); return; }
      change(() => { grid.cols.push(name); grid.rows.forEach(r => r.push("")); });
    },
    openInWizard() {
      const i = S.rows[S.r]; if (i === undefined) return;
      const obj = Object.fromEntries(grid.cols.map((c, j) => [c, String(grid.rows[i][j] ?? "").trim()]));
      try { sessionStorage.setItem("lx_bulk_row", JSON.stringify(obj)); } catch (e) {}
      window.open(typeof cleanUrl === "function" ? cleanUrl("wizard.html?from=bulk") : "wizard.html?from=bulk", "_blank");
    },
  };
  const saveCols = () => { LS.set("lx_bulk_hidden", [...S.hidden]); LS.set("lx_bulk_widths", S.widths); };

  /* ---------- find & replace ---------- */
  function replaceAll(find, rep, inSelection) {
    if (!find) return 0; let n = 0; const s = sel();
    const rows = inSelection ? S.rows.slice(s.r0, s.r1 + 1) : S.rows, cols = inSelection ? S.cols.slice(s.c0, s.c1 + 1) : S.cols;
    change(() => { rows.forEach(i => cols.forEach(j => { const v = String(grid.rows[i][j] ?? ""); if (v.includes(find)) { n += v.split(find).length - 1; grid.rows[i][j] = v.split(find).join(rep); } })); });
    return n;
  }

  /* ---------- columns menu ---------- */
  function drawColMenu() {
    const m = $("#bs-cols-menu"); if (!m) return;
    m.innerHTML = grid.cols.map(c => `<label><input type="checkbox" data-col="${esc(c)}"${S.hidden.has(c) ? "" : " checked"}${c === "lemma" ? " disabled" : ""}> ${esc(label(c))} <span class="en">${esc(c)}</span></label>`).join("")
      + `<div class="bs-addcol">${Object.keys(COL_BN).filter(c => !grid.cols.includes(c)).length ? `<select id="bs-newcol"><option value="">+ কলাম যোগ…</option>${Object.keys(COL_BN).filter(c => !grid.cols.includes(c)).map(c => `<option value="${c}">${esc(label(c))} · ${c}</option>`).join("")}</select>` : ""}
        <button type="button" class="btn ghost small" data-bs="showall">সব দেখান</button></div>`;
  }

  /* ---------- events ---------- */
  host.tabIndex = 0;
  host.addEventListener("mousedown", e => {
    const td = e.target.closest("td.cl"), rn = e.target.closest("th.rn[data-vr]"), rz = e.target.closest(".rz");
    if (rz) { // column resize
      e.preventDefault(); const th = rz.parentElement, c = rz.dataset.col, x0 = e.clientX, w0 = th.getBoundingClientRect().width;
      const mv = ev => { const w = Math.max(60, Math.round(w0 + ev.clientX - x0)); th.style.width = th.style.minWidth = th.style.maxWidth = w + "px"; S.widths[c] = w; };
      const up = () => { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); saveCols(); };
      document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up); return;
    }
    if (rn) { e.preventDefault(); const vr = +rn.dataset.vr; if (e.shiftKey) { S.r2 = vr; S.c = 0; S.c2 = S.cols.length - 1; } else { S.r = S.r2 = vr; S.c = 0; S.c2 = S.cols.length - 1; } paintSelection(); host.focus(); return; }
    if (!td || td.classList.contains("editing")) return;
    e.preventDefault(); host.focus();
    if (S.edit) commit();
    const vr = +td.dataset.vr, vc = +td.dataset.vc;
    if (e.shiftKey) extendTo(vr, vc); else moveTo(vr, vc);
    S.drag = true;
  });
  host.addEventListener("mouseover", e => { if (!S.drag) return; const td = e.target.closest("td.cl"); if (td) extendTo(+td.dataset.vr, +td.dataset.vc); });
  document.addEventListener("mouseup", () => { S.drag = false; });
  host.addEventListener("dblclick", e => { const td = e.target.closest("td.cl"); if (td) openEditor(+td.dataset.vr, +td.dataset.vc); });
  host.addEventListener("keydown", e => {
    if (S.edit || e.target.closest(".ed")) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey, s = sel();
    if (!S.rows.length) { if (ctrl && k.toLowerCase() === "z") { e.preventDefault(); OPS.undo(); } return; }
    const go = (dr, dc) => { e.preventDefault(); if (e.shiftKey) extendTo(S.r2 + dr, S.c2 + dc); else moveTo(S.r + dr, S.c + dc); };
    if (k === "ArrowDown") return go(1, 0);
    if (k === "ArrowUp") return go(-1, 0);
    if (k === "ArrowRight") return go(0, 1);
    if (k === "ArrowLeft") return go(0, -1);
    if (k === "Tab") { e.preventDefault(); return moveTo(S.r, S.c + (e.shiftKey ? -1 : 1)); }
    if (k === "Enter" && ctrl) { e.preventDefault(); return OPS.insert(true); }
    if (k === "Enter" && e.shiftKey) { e.preventDefault(); return OPS.insert(false); }
    if (k === "Enter" || k === "F2") { e.preventDefault(); return openEditor(S.r, S.c); }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); return OPS.clear(); }
    if (ctrl && k.toLowerCase() === "z") { e.preventDefault(); return e.shiftKey ? OPS.redo() : OPS.undo(); }
    if (ctrl && k.toLowerCase() === "y") { e.preventDefault(); return OPS.redo(); }
    if (ctrl && k.toLowerCase() === "d") { e.preventDefault(); return OPS.fillDown(); }
    if (ctrl && k.toLowerCase() === "a") { e.preventDefault(); return OPS.selectAll(); }
    if (k === "Home") { e.preventDefault(); return moveTo(ctrl ? 0 : S.r, 0); }
    if (k === "End") { e.preventDefault(); return moveTo(ctrl ? S.rows.length - 1 : S.r, S.cols.length - 1); }
    if (k === "PageDown") return go(15, 0);
    if (k === "PageUp") return go(-15, 0);
    // Typing a character starts editing with that character (like a spreadsheet).
    if (k.length === 1 && !ctrl && !e.altKey) { e.preventDefault(); const c = grid.cols[S.cols[S.c]]; return ENUM[c] ? openEditor(S.r, S.c) : openEditor(S.r, S.c, k); }
  });
  document.addEventListener("copy", e => { if (document.activeElement !== host || S.edit) return; e.preventDefault(); e.clipboardData.setData("text/plain", selectionText()); });
  document.addEventListener("cut", e => { if (document.activeElement !== host || S.edit) return; e.preventDefault(); e.clipboardData.setData("text/plain", selectionText()); OPS.clear(); });
  document.addEventListener("paste", e => { if (document.activeElement !== host || S.edit) return; e.preventDefault(); pasteText(e.clipboardData.getData("text/plain")); });

  /* ---------- toolbar ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-bs]"); if (!b) return;
    const a = b.dataset.bs;
    if (a === "cols") { const m = $("#bs-cols-menu"); m.hidden = !m.hidden; return; }
    if (a === "showall") { S.hidden.clear(); saveCols(); render(); return; }
    if (a === "find") { S.findOpen = !S.findOpen; $("#bs-find").hidden = !S.findOpen; if (S.findOpen) $("#bs-find-in").focus(); return; }
    if (a === "replace") { const n = replaceAll($("#bs-find-in").value, $("#bs-rep-in").value, $("#bs-find-sel").checked); $("#bs-find-msg").textContent = `${toBn(n)}টি বদলানো হয়েছে`; return; }
    if (a === "clearall") { if (confirm("সব সারি মুছে নতুন করে শুরু করবেন?")) { change(() => { grid.rows = []; }); } return; }
    if (OPS[a]) { OPS[a](); host.focus(); }
  });
  document.addEventListener("change", e => {
    const cb = e.target.closest("#bs-cols-menu input[data-col]");
    if (cb) { cb.checked ? S.hidden.delete(cb.dataset.col) : S.hidden.add(cb.dataset.col); saveCols(); render(); return; }
    if (e.target.id === "bs-newcol" && e.target.value) { OPS.addColumn(e.target.value); return; }
    if (e.target.id === "bs-filter") { S.filter = e.target.value; render(); }
  });
  document.addEventListener("click", e => { const m = $("#bs-cols-menu"); if (m && !m.hidden && !m.contains(e.target) && !e.target.closest('[data-bs="cols"]')) m.hidden = true; });
  // Downloads in more formats (CSV is the existing button).
  const dl = (name, text, type) => download(name, text, type);
  $("#bs-dl-tsv")?.addEventListener("click", () => dl("lexemes.tsv", [grid.cols, ...grid.rows].map(r => r.map(v => tsvCell(String(v ?? ""))).join("\t")).join("\n") + "\n", "text/tab-separated-values"));
  $("#bs-dl-json")?.addEventListener("click", () => dl("lexemes.json", JSON.stringify(grid.rows.filter(r => r.some(x => String(x).trim())).map(r => Object.fromEntries(grid.cols.map((c, j) => [c, r[j] ?? ""]))), null, 2), "application/json"));
  $("#bulk-file")?.setAttribute("accept", ".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json");

  /* ---------- take over the table drawing ---------- */
  renderGrid = render;
  const origView = setBulkView;
  setBulkView = function (v) { if (S.edit) commit(); origView(v); };
  // TSV files: turn them into CSV before wizard.js reads them.
  const fileIn = $("#bulk-file");
  fileIn?.addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f || !/\.(tsv|txt)$/i.test(f.name)) return;
    const t = await f.text(); if (!t.includes("\t")) return;
    // wizard.js reads the file as CSV too; once it is done, replace its result with the TSV table.
    const rows = parseTable(t), cols = rows[0].map(x => x.trim().toLowerCase());
    const csv = [cols, ...rows.slice(1).map(r => cols.map((_, k) => r[k] ?? ""))].map(r => r.map(csvCell).join(",")).join("\n") + "\n";
    setTimeout(() => { $("#bulk-text").value = csv; setBulkView("table"); autosave(); }, 150);
  });
  // The sample button and file loads replace the table: remember the previous one for undo.
  ["bulk-sample", "bulk-file"].forEach(id => $("#" + id)?.addEventListener(id === "bulk-file" ? "change" : "click", () => { S.undo.push(snapshot()); setTimeout(autosave, 300); }, true));

  /* ---------- restore unsaved work ---------- */
  const saved = LS.get("lx_bulk_sheet", null);
  if (saved && saved.rows?.length && !$("#bulk-text").value.trim()) {
    grid.cols = saved.cols; grid.rows = saved.rows; $("#bulk-text").value = toCSV();
    const n = $("#bs-saved"); if (n) n.innerHTML = `আগের কাজ ফিরিয়ে আনা হয়েছে (${toBn(saved.rows.length)}টি সারি)`;
  }
  window.BulkSheet = { render, OPS };
})();
