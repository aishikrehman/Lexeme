"use strict";
// লিব্রে — step-by-step recording in the manner of the old Lingua Libre Record Wizard:
// 1 speaker → 2 microphone test → 3 word list → 4 record (word by word: record, retake, skip, listen, details)
// → 5 upload (tick, check, upload). Shares speakers, word list, upload list and upload code with the full studio
// (window.StudioLibre), so both modes work on one project in this browser and on the server.
(function () {
  const S = window.StudioLibre; if (!S) return;
  const ez = s => document.querySelector("#easy " + s), ezz = s => [...document.querySelectorAll("#easy " + s)];
  const opts = (list, val) => list.map(([v, t]) => `<option value="${esc(v)}"${v === val ? " selected" : ""}>${esc(t)}</option>`).join("");
  const kindList = Object.entries(S.KINDS).map(([k, v]) => [k, v[0]]);
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };

  /* ---------- mode: /libre = this wizard, /studio = the full studio ---------- */
  function setMode(simple) {
    $("#studio").hidden = simple; $("#easy").hidden = !simple; document.body.classList.toggle("easy-mode", simple);
    store("lx_snd_mode", simple ? "easy" : "full");
    if (window.LX_NODE) history.replaceState(null, "", (simple ? "/libre" : "/studio") + location.search);
    document.title = (simple ? "লিব্রে" : "লিব্রে স্টুডিও") + " · লেক্সিম.বাংলা";
    $$(".sitenav .sn-dmenu a").forEach(a => { const on = new URL(a.href).pathname === (simple ? "/libre" : "/studio"); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
    if (simple) go(step); else { closeMic(); S.zoomFit(); }
  }
  $("#t-easy").onclick = () => setMode(true);
  ez("#ez-full").onclick = () => setMode(false);

  /* ---------- steps ---------- */
  let step = load("lx_ez_step", 1);
  function why(n) {
    if (n >= 2 && S.speakerWhy()) return "আগে বক্তা বাছুন বা যোগ করুন";
    if (n >= 4 && !S.WORDS.length) return "আগে তালিকায় অন্তত একটি শব্দ দিন";
    return "";
  }
  function go(n) {
    n = Math.max(1, Math.min(5, n));
    for (let k = 2; k <= n; k++) if (why(k)) { n = k - 1; break; }
    step = n; store("lx_ez_step", n);
    ezz(".ez-step").forEach(s => { s.hidden = +s.dataset.step !== n; });
    ezz(".ez-steps li").forEach(li => { const k = +li.dataset.s; li.className = k === n ? "cur" : k < n ? "done" : why(k) ? "lock" : ""; });
    ez("#ez-back").disabled = n === 1; ez("#ez-fwd").hidden = n === 5;
    ez("#ez-fwd").textContent = n === 4 ? "আপলোডে যান ›" : "পরের ধাপ ›";
    if (n === 1) drawSpeakers(); if (n === 3) drawList(); if (n === 4) drawWord(); if (n === 5) drawPub();
    if (n === 2 || n === 4) openMic().catch(e => { ez("#ez-mt-msg").textContent = "মাইক চালু করা যায়নি: " + e.message; }); else closeMic();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  ez("#ez-steps").addEventListener("click", e => { const li = e.target.closest("li"); if (li) go(+li.dataset.s); });
  ez("#ez-back").onclick = () => go(step - 1);
  ez("#ez-fwd").onclick = () => { const w = why(step + 1); if (w) { flash(w); return; } go(step + 1); };
  const flash = t => { const m = ez(`.ez-step[data-step="${step}"] .ez-err`) || ez(`.ez-step[data-step="${step}"] .ez-state`); if (m) m.textContent = "⚠ " + t; else alert(t); };

  /* ---------- 1 speaker ---------- */
  ez("#ez-lang").innerHTML = opts(S.SD_LANGS.map(l => [l[2], l[2]]));
  ez("#ez-district").innerHTML = `<option value="">— বেছে নিন —</option>` + opts(S.SD_DISTRICTS.map(d => [d[0], d[0]])) + `<option>বাংলাদেশের বাইরে</option>`;
  const syncOther = () => { ez("#ez-other-l").hidden = !/অন্য/.test(ez("#ez-lang").value); };
  ez("#ez-lang").onchange = syncOther;
  const F = { name: "#ez-name", lang: "#ez-lang", other: "#ez-other", dialect: "#ez-dialect", district: "#ez-district", place: "#ez-place", gender: "#ez-gender", age: "#ez-age", level: "#ez-level" };
  function drawSpeakers() {
    const cur = S.SP;
    ez("#ez-spk").innerHTML = S.SPK.map(s => `<label class="ez-spkcard${s.id === cur.id ? " on" : ""}"><input type="radio" name="ezspk" value="${s.id}"${s.id === cur.id ? " checked" : ""}>
      <span><b>${esc(s.name)}</b><small>${esc([/অন্য/.test(s.lang || "") ? s.other : s.lang, s.dialect, s.district].filter(Boolean).join(" · "))}</small></span>
      <button type="button" class="ez-link" data-edit="${s.id}">বদলান</button></label>`).join("") || `<p class="ez-sub">এখনো কোনো বক্তা নেই — নিচে যোগ করুন।</p>`;
    if (!S.SPK.length && ez("#ez-spk-form").hidden) openForm(null);
  }
  ez("#ez-spk").addEventListener("change", e => { const r = e.target.closest("input[name=ezspk]"); if (!r) return; $("#sp-pick").value = r.value; $("#sp-pick").dispatchEvent(new Event("change")); ez("#ez-spk-form").hidden = true; go(1); });
  ez("#ez-spk").addEventListener("click", e => { const b = e.target.closest("[data-edit]"); if (!b) return; e.preventDefault(); $("#sp-pick").value = b.dataset.edit; $("#sp-pick").dispatchEvent(new Event("change")); openForm(S.SP); });
  function openForm(sp) {
    ez("#ez-spk-form").hidden = false; ez("#ez-spk-title").textContent = sp ? `বক্তা: ${sp.name}` : "নতুন বক্তা";
    Object.entries(F).forEach(([k, s]) => { const el = ez(s); el.value = sp?.[k] ?? (k === "level" ? "native" : ""); if (el.tagName === "SELECT" && el.selectedIndex < 0) el.selectedIndex = 0; });
    ez("#ez-consent").checked = !!sp?.consent; syncOther(); ez("#ez-spk-msg").textContent = "";
    if (!sp) $("#sp-new").click();
  }
  ez("#ez-spk-new").onclick = () => { openForm(null); ez("#ez-spk-form").scrollIntoView({ behavior: "smooth", block: "start" }); };
  ez("#ez-spk-save").onclick = () => {
    // Written into the studio's speaker form, so both modes share one speaker list.
    const map = { name: "#sp-name", lang: "#sp-lang", other: "#sp-other", dialect: "#sp-dialect", district: "#sp-district", place: "#sp-place", gender: "#sp-gender", age: "#sp-age", level: "#sp-level" };
    Object.entries(map).forEach(([k, s]) => { $(s).value = String(ez(F[k]).value).trim(); });
    $("#sp-consent").checked = ez("#ez-consent").checked; if (!$("#sp-license").value) $("#sp-license").selectedIndex = 0;
    S.readSpeaker();
    const w = S.speakerWhy(); ez("#ez-spk-msg").textContent = w ? "⚠ " + w : "";
    if (!w) { ez("#ez-spk-form").hidden = true; go(1); }
  };

  /* ---------- microphone (steps 2 and 4) ---------- */
  let stream = null, actx = null, an = null, mraf = 0;
  async function listDevs() {
    try { const ds = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput" && d.deviceId && d.deviceId !== "default");
      const cur = ez("#ez-dev").value; ez("#ez-dev").innerHTML = `<option value="">ডিফল্ট মাইক</option>` + ds.map(d => `<option value="${esc(d.deviceId)}">${esc(d.label || "মাইক্রোফোন")}</option>`).join(""); ez("#ez-dev").value = cur; } catch (e) {}
  }
  async function openMic() {
    if (stream) return;
    const id = ez("#ez-dev").value || load("lx_ez_dev", "");
    stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    actx = new (window.AudioContext || window.webkitAudioContext)(); an = actx.createAnalyser(); an.fftSize = 1024; actx.createMediaStreamSource(stream).connect(an);
    listDevs(); meter();
  }
  function closeMic() { cancelAnimationFrame(mraf); if (rec) return; stream?.getTracks().forEach(t => t.stop()); stream = null; actx?.close(); actx = null; an = null; }
  ez("#ez-dev").onchange = () => { store("lx_ez_dev", ez("#ez-dev").value); closeMic(); openMic().catch(e => { ez("#ez-mt-msg").textContent = "মাইক চালু করা যায়নি: " + e.message; }); };
  let level = 0;
  function meter() {
    if (!an) return;
    const a = new Float32Array(an.fftSize); an.getFloatTimeDomainData(a); let s = 0, p = 0; for (const v of a) { s += v * v; p = Math.max(p, Math.abs(v)); }
    level = Math.sqrt(s / a.length); const pct = Math.min(100, level * 400);
    ez("#ez-mt").style.width = pct + "%"; ez("#ez-mt").classList.toggle("hot", p > 0.9); ez("#ez-level").style.width = pct + "%";
    if (step === 2) ez("#ez-mt-msg").textContent = p > 0.9 ? "খুব জোরে — একটু দূরে সরুন" : level > 0.02 ? "ঠিক আছে ✓" : "কিছু বলুন…";
    vadTick(); mraf = requestAnimationFrame(meter);
  }
  ez("#ez-test").onclick = async () => {
    try { await openMic(); } catch (e) { ez("#ez-mt-msg").textContent = "মাইক চালু করা যায়নি: " + e.message; return; }
    const r = new MediaRecorder(stream), ch = []; r.ondataavailable = e => ch.push(e.data);
    r.onstop = () => { new Audio(URL.createObjectURL(new Blob(ch, { type: r.mimeType }))).play(); ez("#ez-test").disabled = false; ez("#ez-test").textContent = "● আবার পরীক্ষা"; };
    r.start(); ez("#ez-test").disabled = true; ez("#ez-test").textContent = "রেকর্ড হচ্ছে… ৩ সেকেন্ড"; setTimeout(() => r.stop(), 3000);
  };

  /* ---------- 3 word list ---------- */
  function drawList() {
    const W = S.WORDS; ez("#ez-wcount").textContent = W.length ? `(${toBn(W.length)} · ${toBn(W.filter(w => w.done).length)}টি রেকর্ড হয়েছে)` : "";
    ez("#ez-wlist").innerHTML = W.map((w, i) => `<span class="ez-chip${w.done ? " done" : w.skipped ? " skip" : ""}" data-i="${i}">${esc(w.word)}${w.gloss ? `<small>${esc(w.gloss)}</small>` : ""}<button type="button" aria-label="সরান">✕</button></span>`).join("") || `<p class="ez-sub">তালিকা খালি।</p>`;
  }
  ez("#ez-wlist").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.WORDS.splice(+b.parentElement.dataset.i, 1); S.saveWords(); drawList(); });
  ez("#ez-wadd").onclick = async () => { const n = await S.addWords(ez("#ez-wtext").value); ez("#ez-wtext").value = ""; ez("#ez-wmsg").textContent = `${toBn(n || 0)}টি নতুন শব্দ যোগ হলো`; drawList(); };
  ez("#ez-wwd").onclick = async () => { ez("#ez-wmsg").textContent = "আনা হচ্ছে…"; $("#w-wd").click(); const t0 = Date.now(); await new Promise(r => setTimeout(r, 100)); while (/আনা হচ্ছে/.test($("#w-msg").textContent) && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 300)); ez("#ez-wmsg").textContent = $("#w-msg").textContent; drawList(); };
  ez("#ez-wreset").onclick = () => { S.WORDS.forEach(w => { w.skipped = false; }); S.setWordPos(0); drawList(); };
  ez("#ez-wclear").onclick = () => { if (!confirm("তালিকা খালি করবেন? (রেকর্ডগুলো থাকবে)")) return; S.WORDS.length = 0; S.saveWords(); drawList(); };

  /* ---------- 4 record ---------- */
  ez("#ez-kind").innerHTML = opts(kindList, "word"); ez("#ez-fkind").innerHTML = opts(kindList, "song");
  const clipOf = w => (w?.clip ? S.Q.find(c => c.id === w.clip) : null);
  function drawWord() {
    const W = S.WORDS, i = S.wordPos, w = W[i];
    ez("#ez-word").textContent = w?.word || "—"; ez("#ez-word").classList.toggle("done", !!w?.done);
    ez("#ez-gloss").textContent = w?.gloss || "";
    const c = clipOf(w); ez("#ez-play").disabled = !c; ez("#ez-retake").disabled = !c;
    ez("#ez-info").textContent = c && S.infoCount(c) ? `ⓘ বিস্তারিত (${toBn(S.infoCount(c))})` : "ⓘ বিস্তারিত";
    ez("#ez-strip").innerHTML = W.map((x, k) => `<button type="button" class="ez-pill${k === i ? " cur" : ""}${x.done ? " done" : x.skipped ? " skip" : ""}" data-i="${k}">${x.done ? "✓ " : x.skipped ? "⤼ " : ""}${esc(x.word)}</button>`).join("");
    ez("#ez-strip .cur")?.scrollIntoView({ inline: "center", block: "nearest" });
    if (!rec) ez("#ez-state").textContent = c ? "রেকর্ড আছে — শুনুন, আবার নিন বা পরের শব্দে যান" : w ? "বোতাম চাপুন (বা স্পেস) — বলে থামলেই রেকর্ড শেষ" : "তালিকা শেষ";
    ez("#ez-say").textContent = `${toBn(Math.min(i + 1, W.length))} / ${toBn(W.length)} · ${toBn(W.filter(x => x.done).length)}টি রেকর্ড হয়েছে`;
  }
  ez("#ez-strip").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b && !rec) { S.setWordPos(+b.dataset.i); drawWord(); } });
  const nextOpen = from => { const W = S.WORDS; for (let k = from + 1; k < W.length; k++) if (!W[k].done && !W[k].skipped) return k; return -1; };
  ez("#ez-prev").onclick = () => { if (rec) return; S.setWordPos(S.wordPos - 1); drawWord(); };
  ez("#ez-skip").onclick = () => { if (rec) cancelRec(); const w = S.WORDS[S.wordPos]; if (w && !w.done) { w.skipped = true; S.saveWords(); } const n = nextOpen(S.wordPos); S.setWordPos(n < 0 ? S.wordPos + 1 : n); drawWord(); };
  ez("#ez-play").onclick = async () => { const c = clipOf(S.WORDS[S.wordPos]); if (c) new Audio(URL.createObjectURL(await S.getBlob(c))).play(); };
  ez("#ez-retake").onclick = async () => { const w = S.WORDS[S.wordPos], c = clipOf(w); if (c && c.status !== "done") await S.delClip(c); if (w) { w.done = false; w.clip = ""; S.saveWords(); } drawWord(); startRec(); };
  ez("#ez-info").onclick = () => {
    const w = S.WORDS[S.wordPos], c = clipOf(w);
    if (c) S.openInfo(c, x => { S.putClip(x); drawWord(); });
    else if (w) S.openInfo({ word: w.word, info: w.info || (w.gloss ? { gloss: w.gloss } : {}) }, x => { w.info = x.info; S.saveWords(); }); // kept until the word is recorded
  };

  let rec = null, chunks = [], vad = null, marks = [], recT0 = 0;
  // “⏐ দাগ” while recording: say several words (or verses) in one go, tap after each; split there afterwards.
  ez("#ez-mark").onclick = () => {
    if (!rec) return; marks.push((performance.now() - recT0) / 1000); vad = null; // marks mean a long take: no auto-stop
    const b = ez("#ez-mark"); b.textContent = `⏐ দাগ (${toBn(marks.length)}) — আবার চাপুন পরের শেষে`; b.classList.remove("blink"); void b.offsetWidth; b.classList.add("blink");
    const nx = S.WORDS[nextOpenFrom(S.wordPos, marks.length)];
    ez("#ez-state").textContent = nx ? `এবার বলুন: “${nx.word}” — শেষ হলে ● চাপুন` : "বলতে থাকুন — শেষ হলে ● চাপুন";
  };
  // the n-th open word after i (for naming the pieces of a marked take)
  const nextOpenFrom = (i, n) => { let k = i; for (let c = 0; c < n; c++) { const nx = nextOpen(k); if (nx < 0) return -1; k = nx; } return k; };
  async function startRec() {
    if (rec) return stopRec();
    const w = S.WORDS[S.wordPos]; if (!w) return;
    try { await openMic(); } catch (e) { ez("#ez-state").textContent = "মাইক্রোফোন চালু করা যায়নি: " + e.message; return; }
    chunks = []; marks = []; rec = new MediaRecorder(stream); rec.ondataavailable = e => chunks.push(e.data); rec.onstop = () => finish(w); rec.start(); recT0 = performance.now();
    ez("#ez-mark").hidden = false; ez("#ez-mark").textContent = "⏐ দাগ — এখানে ভাগ হবে";
    const long = ez("#ez-kind").value !== "word";
    vad = long ? null : { t0: performance.now(), spoke: false, quiet: 0 };
    ez("#ez-mic").classList.add("on"); ez("#ez-state").textContent = long ? "রেকর্ড হচ্ছে — শেষ হলে আবার চাপুন" : `বলুন: “${w.word}”`;
  }
  function vadTick() {
    if (!rec || !vad) return; const now = performance.now();
    if (level > 0.03) { vad.spoke = true; vad.quiet = 0; } else if (vad.spoke && !vad.quiet) vad.quiet = now;
    if ((vad.spoke && vad.quiet && now - vad.quiet > 850) || now - vad.t0 > 12000) stopRec();
  }
  function stopRec() { vad = null; if (rec && rec.state !== "inactive") rec.stop(); ez("#ez-mic").classList.remove("on"); ez("#ez-mark").hidden = true; }
  function cancelRec() { if (!rec) return; rec.onstop = null; stopRec(); rec = null; }
  async function finish(w) {
    const r = rec; rec = null; ez("#ez-state").textContent = "প্রক্রিয়া হচ্ছে…";
    try {
      const a = await S.decode(new Blob(chunks, { type: r.mimeType }));
      if (marks.length) return finishMarked(w, a);
      const pcm = clean(a.pcm, a.rate);
      if (!pcm) { ez("#ez-state").textContent = "কিছু শোনা যায়নি — আবার চাপুন।"; return; }
      const kind = ez("#ez-kind").value;
      const c = await S.addClip({ word: w.word, kind, lexeme: kind === "word" ? w.lexeme || "" : "", info: w.info || (w.gloss ? { gloss: w.gloss } : undefined), dur: pcm.length / a.rate, blob: S.encodeWav(pcm, a.rate) });
      w.done = true; w.skipped = false; w.clip = c.id; S.saveWords();
      const n = nextOpen(S.wordPos);
      if (ez("#ez-auto").checked && n >= 0) { S.setWordPos(n); drawWord(); setTimeout(startRec, 550); }
      else { drawWord(); ez("#ez-state").textContent = n < 0 ? "✓ তালিকা শেষ! এবার আপলোডে যান ›" : "✓ রেকর্ড হলো"; }
    } catch (e) { ez("#ez-state").textContent = "রেকর্ড পড়া যায়নি: " + e.message; }
  }
  // A marked take: one clip per piece, named from the word list in order (current word first).
  async function finishMarked(w, a) {
    const pieces = S.splitByMarks(a.pcm, a.rate, marks), kind = ez("#ez-kind").value; let wi = S.wordPos, made = 0;
    for (const [s, e] of pieces) {
      const pcm = clean(a.pcm.slice(s, e), a.rate); if (!pcm) continue; // silence between marks
      const word = made === 0 ? S.WORDS[wi] : S.WORDS[wi = nextOpen(wi)];
      const name = word ? word.word : `${w.word} (${toBn(made + 1)})`;
      const c = await S.addClip({ word: name, kind, lexeme: word && kind === "word" ? word.lexeme || "" : "", info: word?.info || (word?.gloss ? { gloss: word.gloss } : undefined), dur: pcm.length / a.rate, blob: S.encodeWav(pcm, a.rate) });
      if (word) { word.done = true; word.skipped = false; word.clip = c.id; }
      made++;
    }
    S.saveWords(); const n = nextOpen(wi); S.setWordPos(n < 0 ? Math.max(0, wi) : n); drawWord();
    ez("#ez-state").textContent = `✓ ${toBn(made)}টি আলাদা রেকর্ড হলো (দাগ ধরে ভাগ)${n < 0 ? " — তালিকা শেষ, আপলোডে যান ›" : ""}`;
  }
  // Light noise reduction, trim the silence around, steady level.
  function clean(pcm, rate, trim = true) {
    let p = S.peakOf(pcm); if (p < 0.015) return null;
    let o = S.denoise(pcm, 0.35, null);
    if (trim) { p = S.peakOf(o); const thr = p * 0.06, pad = Math.round(rate * 0.2); let s = 0, e = o.length - 1; while (s < e && Math.abs(o[s]) < thr) s++; while (e > s && Math.abs(o[e]) < thr) e--; o = o.slice(Math.max(0, s - pad), Math.min(o.length, e + pad)); }
    p = S.peakOf(o); const g = p > 0 ? 0.89 / p : 1; return o.map(v => v * g);
  }
  ez("#ez-mic").onclick = startRec;
  document.addEventListener("keydown", e => {
    if ($("#easy").hidden || step !== 4 || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === "Space") { e.preventDefault(); startRec(); }
    else if (e.key === "ArrowRight") ez("#ez-skip").click(); else if (e.key === "ArrowLeft") ez("#ez-prev").click();
  });
  let sx = null; // swipe on the word card
  ez("#ez-card").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  ez("#ez-card").addEventListener("touchend", e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) (dx < 0 ? ez("#ez-skip") : ez("#ez-prev")).click(); });

  /* ---------- 5 upload ---------- */
  const unpicked = new Set(); // everything not yet uploaded is ticked unless the user unticks it
  function drawPub() {
    const list = S.Q.slice().sort((a, b) => a.created.localeCompare(b.created));
    ez("#ez-pub").innerHTML = list.map(c => `<div class="ez-pubrow st-${c.status}" data-id="${c.id}">
      ${c.status === "done" ? `<span class="ez-ok">✓</span>` : `<input type="checkbox"${unpicked.has(c.id) ? "" : " checked"}>`}
      <button type="button" class="ez-round sm" data-a="play" aria-label="শুনুন">▶</button>
      <div><b>${esc(c.word || "নামহীন")}</b><small>${esc(c.speaker?.name || "")} · ${esc(S.KINDS[c.kind]?.[0] || "")}${c.info?.gloss ? " · " + esc(c.info.gloss) : ""}${c.status === "done" ? ` · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c.file || "")}" target="_blank" rel="noopener">কমন্সে উঠেছে</a>` : c.status === "uploading" ? " · উঠছে…" : c.status === "error" ? ` · <em>${esc(c.error || "")}</em>` : ""}</small></div>
      <button type="button" class="ez-round sm${S.infoCount(c) ? " has" : ""}" data-a="info" aria-label="বিস্তারিত">ⓘ</button>
      ${c.status === "done" ? "" : `<button type="button" class="ez-round sm" data-a="del" aria-label="মুছুন">✕</button>`}</div>`).join("") || `<p class="ez-sub">এখনো কোনো রেকর্ড নেই।</p>`;
    const n = list.filter(c => c.status !== "done" && !unpicked.has(c.id)).length;
    ez("#ez-up").disabled = !n; ez("#ez-up").textContent = n ? `নির্বাচিত ${toBn(n)}টি কমন্সে আপলোড` : "আপলোড করার কিছু বাছা হয়নি";
  }
  ez("#ez-pub").addEventListener("change", e => { const row = e.target.closest(".ez-pubrow"); if (!row) return; e.target.checked ? unpicked.delete(row.dataset.id) : unpicked.add(row.dataset.id); drawPub(); });
  ez("#ez-all").onchange = e => { S.Q.forEach(c => { e.target.checked ? unpicked.delete(c.id) : unpicked.add(c.id); }); drawPub(); };
  ez("#ez-pub").addEventListener("click", async e => {
    const b = e.target.closest("[data-a]"); if (!b) return; const c = S.Q.find(x => x.id === b.closest(".ez-pubrow").dataset.id); if (!c) return;
    if (b.dataset.a === "play") new Audio(URL.createObjectURL(await S.getBlob(c))).play();
    if (b.dataset.a === "info") S.openInfo(c, x => S.putClip(x));
    if (b.dataset.a === "del" && confirm(`“${c.word || "নামহীন"}” মুছবেন?`)) { S.WORDS.forEach(w => { if (w.clip === c.id) { w.clip = ""; w.done = false; } }); S.saveWords(); S.delClip(c); }
  });
  ez("#ez-up").onclick = () => S.uploadAll(S.Q.filter(c => c.status !== "done" && !unpicked.has(c.id)).map(c => c.id));
  document.addEventListener("sl-queue", () => { if (step === 5 && !$("#easy").hidden) drawPub(); });

  // a file from the phone
  let fileAudio = null, fileInfo = {};
  ez("#ez-file").onchange = async e => {
    const f = e.target.files[0]; if (!f) return; ez("#ez-fmsg").textContent = "ফাইল পড়া হচ্ছে…";
    try { fileAudio = await S.decode(f); ez("#ez-audio").src = URL.createObjectURL(f); ez("#ez-ftitle").value = f.name.replace(/\.[^.]+$/, ""); ez("#ez-t0").value = 0; ez("#ez-t1").value = 100; trimLabels(); ez("#ez-fileform").hidden = false; ez("#ez-fmsg").textContent = ""; }
    catch (err) { ez("#ez-fmsg").textContent = "এই ফাইলটি পড়া যায়নি: " + err.message; }
  };
  const dur = () => (fileAudio ? fileAudio.pcm.length / fileAudio.rate : 0);
  function trimLabels() { if (+ez("#ez-t0").value > +ez("#ez-t1").value - 1) ez("#ez-t0").value = +ez("#ez-t1").value - 1; ez("#ez-t0v").textContent = S.fmtS(dur() * ez("#ez-t0").value / 100); ez("#ez-t1v").textContent = S.fmtS(dur() * ez("#ez-t1").value / 100); }
  ["#ez-t0", "#ez-t1"].forEach(id => ez(id).addEventListener("input", () => { trimLabels(); ez("#ez-audio").currentTime = Math.max(0, dur() * ez(id).value / 100 - (id === "#ez-t1" ? 2 : 0)); }));
  ez("#ez-finfo").onclick = () => S.openInfo({ word: ez("#ez-ftitle").value.trim(), info: fileInfo }, x => { fileInfo = x.info || {}; ez("#ez-finfo").textContent = Object.keys(fileInfo).length ? `ⓘ বিস্তারিত (${toBn(Object.keys(fileInfo).length)})` : "ⓘ শব্দের বিস্তারিত"; });
  ez("#ez-fadd").onclick = async () => {
    if (!fileAudio) return; const title = ez("#ez-ftitle").value.trim(); if (!title) { ez("#ez-fmsg").textContent = "শিরোনাম দিন।"; return; }
    ez("#ez-fmsg").textContent = "প্রস্তুত হচ্ছে…"; await new Promise(r => setTimeout(r, 30));
    const n = fileAudio.pcm.length; let pcm = fileAudio.pcm.slice(Math.floor(n * ez("#ez-t0").value / 100), Math.ceil(n * ez("#ez-t1").value / 100));
    if (ez("#ez-fclean").checked) pcm = clean(pcm, fileAudio.rate, false) || pcm;
    await S.addClip({ word: title, kind: ez("#ez-fkind").value, text: ez("#ez-ftext").value.trim(), info: Object.keys(fileInfo).length ? fileInfo : undefined, dur: pcm.length / fileAudio.rate, blob: S.encodeWav(pcm, fileAudio.rate) });
    fileAudio = null; fileInfo = {}; ez("#ez-fileform").hidden = true; ez("#ez-ftext").value = ""; ez("#ez-file").value = ""; ez("#ez-fmsg").textContent = `✓ “${title}” তালিকায় যোগ হলো`; drawPub();
  };
  ez("#ez-pj").value = S.PJ.name || "";
  ez("#ez-pj").addEventListener("input", () => { $("#pj-name").value = ez("#ez-pj").value; $("#pj-name").dispatchEvent(new Event("input", { bubbles: true })); });

  const path = location.pathname.replace(/\/$/, ""), saved = load("lx_snd_mode", null);
  setMode(path.endsWith("/libre") ? true : path.endsWith("/studio") ? false : saved ? saved === "easy" : matchMedia("(max-width: 760px)").matches);
})();
