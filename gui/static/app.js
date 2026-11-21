// Korean Mentor GUI: start screen + focus session view (see gui/DESIGN.md).
// Review game: game.js.
const $ = (id) => document.getElementById(id);
const DAYS = { Mon: "월요일", Tue: "화요일", Wed: "수요일", Thu: "목요일", Fri: "금요일", Sat: "토요일", Sun: "일요일" };
let source = null;
let busy = false;

// ---------- start screen ----------
async function showStart() {
  $("chat").hidden = true;
  $("game").hidden = true;
  $("start").hidden = false;
  $("day").textContent = "…";
  // server.py changed and no session is running → restart it so the change takes effect.
  const st = await (await fetch("/api/state")).json();
  if (st.stale && !st.alive) {
    $("day").textContent = "Updating the server…";
    await fetch("/api/restart", { method: "POST" }).catch(() => {});
    for (let n = 0; n < 50; n++) {
      await new Promise((r) => setTimeout(r, 200));
      try { if (!(await (await fetch("/api/state")).json()).stale) return location.reload(); } catch (e) { /* restarting */ }
    }
  }
  const t = await (await fetch("/api/today")).json();
  if (t.error) { $("day").textContent = t.error; return; }
  $("day").textContent = `${DAYS[t.weekday] || t.weekday} · ${t.date}`;
  $("meta").textContent = `Plan ${t.plan || "none"} · next lesson ${t.next_lesson} (D-${t.days_to_lesson})`;
  const blocks = t.today_blocks || [];
  $("blocks").innerHTML = "";
  for (const b of blocks) {
    const li = document.createElement("li");
    li.textContent = b;
    if (b.includes("☑")) li.className = "done";
    $("blocks").append(li);
  }
  $("missed").textContent = (t.missed_earlier || []).length ? "Missed: " + t.missed_earlier.join(" · ") : "";

  const grammar = blocks.find((b) => /grammar/.test(b) && b.includes("☐"));
  const test = blocks.find((b) => /weekly test/.test(b) && b.includes("☐"));
  const choices = [];
  if (t.intake_due) choices.push(["Lesson intake", "intake", true]);
  if (grammar) choices.push([/paused/.test(grammar) ? "Resume grammar" : "Start grammar", "grammar", !t.intake_due]);
  if (test) choices.push(["Weekly test", "check", !grammar]);
  choices.push(["Review session", "review"], ["Mistakes drill", "mistakes"], ["Pinned words", "pinned"]);
  $("choices").innerHTML = "";
  for (const [label, args, primary] of choices) {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (primary) btn.className = "primary";
    btn.onclick = () => startSession(args);
    $("choices").append(btn);
  }
  // Review game (game.js): yesterday's logged mistakes, no Claude call.
  const rv = await (await fetch("/api/review?count=1")).json();
  if (rv.total) {
    const y = new Date(Date.now() - 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const btn = document.createElement("button");
    btn.textContent = `🎮 ${rv.date === y ? "어제 실수 게임" : "실수 게임 " + rv.date.slice(5)} (${rv.total})`;
    btn.title = "5-minute game on the last day's 오늘의 실수";
    btn.onclick = () => startGame(rv.date);
    $("choices").prepend(btn);
  }
}

async function startSession(args) {
  await fetch("/api/start", { method: "POST", body: JSON.stringify({ args }) });
  showChat();
}

// ---------- session state ----------
// Live screen = the newest Claude block (prompt / feedback / summary).
// Earlier questions can be viewed (← →) and tried again while the live timer is paused.
let phase = "wait";      // wait | speak | type | feedback | summary | view | rspeak | rtype | rwait | rfeedback
let turns = [];          // {label, qid, prompt, answer, time, rec, feedback, retries: [{answer, time, rec, feedback}]}
let live = { kind: "wait", block: null, notes: [], pendingStart: false, daily: null, filter: "all" };
let viewing = null;      // index of the earlier turn on screen, null = live
let savedPhase = "wait"; // live phase while viewing
let retry = null;        // {i, k, recUrl} while trying turn i again
let liveTimer = null;    // the live timer, parked during a retry
let pendingRetry = null; // turn index a [retry] message was about
let exited = false;
let sid = "";
let recNames = new Set();
let timer = { start: 0, target: 30, id: null, pausedAt: 0 };
let replayUpTo = 0;      // events with id <= this are old (page reload): draw them, no audio
let lastKo = "";         // the Korean line the 🔊 button repeats
const audio = new Audio();
let elapsed = "";        // frozen time after Done speaking

function showChat() {
  $("start").hidden = true;
  $("game").hidden = true;
  $("chat").hidden = false;
  $("closed").hidden = true;
  $("history").innerHTML = "";
  $("history").hidden = true;
  turns = []; viewing = null; retry = null; pendingRetry = null; exited = false;
  live = { kind: "wait", block: null, notes: [], pendingStart: false, daily: null, filter: "all" };
  stopTimer(true);
  phase = "wait";
  drawLive();
  micStream();             // ask for the mic now, not in the middle of a question
  if (source) source.close();
  fetch("/api/state").then((r) => r.json()).then(async (st) => {
    replayUpTo = st.count || 0;
    sid = st.sid || "";
    const names = sid ? await fetch("/api/rec/list?sid=" + sid).then((r) => r.json()).catch(() => []) : [];
    recNames = new Set(Array.isArray(names) ? names : []);   // old server: no recordings list
    source = new EventSource("/api/events?since=0");
    source.onmessage = (e) => onEvent(JSON.parse(e.data), Number(e.lastEventId) > replayUpTo);
  });
}

function onEvent(ev, isNew = true) {
  if (ev.kind === "busy") return setBusy(ev.on);
  if (ev.kind === "exit") { setBusy(false); exited = true; $("closed").hidden = false; updateBar(); drawNav(); return; }
  if (ev.kind === "tool") return;                       // never shown
  if (ev.kind === "user") { addHistory("user", esc(ev.text)); return onUser(ev.text); }
  if (ev.kind === "error") return addHistory("error", esc(ev.text));
  // assistant text
  addHistory("text", markdown(ev.text));
  const m = ev.text.match(/```gui\s*\n([\s\S]*?)```/);
  let block = null;
  if (m) { try { block = JSON.parse(m[1]); } catch (e) { block = null; } }
  const rest = (block ? ev.text.replace(m[0], "") : ev.text).trim();
  if (block) onBlock(block, isNew);
  if (rest) { live.notes.push(rest); drawNotes(); }
}

const timeOf = (t) => (t.match(/⏱ (\S+) (spoken|typed)/) || [])[1] || "";
const answerOf = (t) => t.replace(/^\[retry [^\]]*\]\s*/, "").replace(/^⏱[^\n]*\n?/, "").trim();
const qidOf = (label) => (label || "").split(" · ")[0].trim();
const findTurn = (qid) => { for (let i = turns.length - 1; i >= 0; i--) if (turns[i].qid === qid) return i; return -1; };
const recUrl = (name) => `/api/rec?sid=${sid}&name=${name}`;

function onUser(t) {
  const m = t.match(/^\[retry ([^\]]+)\]/);
  if (m) {
    const i = findTurn(m[1]);
    if (i < 0) return;
    const k = turns[i].retries.length;
    const r = { answer: answerOf(t), time: timeOf(t), rec: recNames.has(`${i}-r${k}`) ? recUrl(`${i}-r${k}`) : null, feedback: null };
    if (retry && retry.i === i && retry.recUrl) r.rec = retry.recUrl;
    turns[i].retries.push(r);
    pendingRetry = i;
    return;
  }
  if (/^(그만|ready|\?)$/.test(t.trim()) || !turns.length) return;
  const cur = turns[turns.length - 1];
  if (cur.answer == null && !cur.feedback) { cur.answer = answerOf(t); cur.time = timeOf(t); }
}

function onBlock(b, isNew) {
  if (b.type === "feedback" && pendingRetry != null) {      // the answer to a [retry] (label "Qn · retry")
    const rs = turns[pendingRetry].retries;
    rs[rs.length - 1].feedback = b;
    if (retry && retry.i === pendingRetry && viewing === retry.i) { phase = "rfeedback"; drawTurn(retry.i); }
    pendingRetry = null;
    drawNav();
    return;
  }
  live.notes = [];
  drawNotes();
  if (b.type === "prompt") {
    const i = turns.length;
    turns.push({ label: b.label || "", qid: qidOf(b.label), prompt: b, answer: null, time: "",
                 rec: recNames.has(String(i)) ? recUrl(i) : null, feedback: null, retries: [] });
    live.kind = "prompt"; live.block = b;
    stopTimer(true);
    elapsed = "";
    if (viewing !== null) { live.pendingStart = true; savedPhase = "speak"; drawNav(); return; }
    phase = "speak";
    drawLive();
    if (!isNew) return startTimer(b.target_s || 30);
    startPrompt(b, String(i));
  } else if (b.type === "feedback") {
    const cur = turns[turns.length - 1];
    if (cur) { cur.feedback = b; cur.time = cur.time || b.time; }
    live.kind = "feedback"; live.block = b;
    stopTimer(false, b.time);
    if (viewing !== null) { savedPhase = "feedback"; drawNav(); return; }
    phase = "feedback";
    drawLive();
    if (isNew && b.reaction) afterPaint(() => play(b.reaction));
  } else if (b.type === "summary") {
    live.kind = "summary"; live.block = b;
    stopTimer(true);
    if (viewing !== null) { savedPhase = "summary"; drawNav(); return; }
    phase = "summary";
    drawLive();
  }
}

// Audio strictly AFTER the card is on screen: wait for two paints, then play.
// The timer (and the recording) start when the audio ends.
function afterPaint(f) { requestAnimationFrame(() => requestAnimationFrame(f)); }
function startPrompt(b, recName) {
  lastKo = b.ko || "";
  afterPaint(() => play(lastKo, () => { startTimer(b.target_s || 30); recStart(recName); }));
}

// ---------- drawing ----------
function drawLive() {
  $("bubble").hidden = true;
  const b = live.block;
  if (live.kind === "wait" || !b) {
    setPicture("", "");
    setCard('<p class="dim typing">getting ready</p>');
  } else if (live.kind === "prompt") {
    setPicture(b.scene, b.speaker);
    lastKo = b.ko || "";
    setCard(promptHtml(b) + (phase === "type" ? `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>` : ""));
  } else if (live.kind === "feedback") {
    const cur = turns[turns.length - 1] || {};
    setPicture(cur.prompt ? cur.prompt.scene : "", b.speaker || (cur.prompt || {}).speaker);
    if (b.reaction) {
      $("bubble").innerHTML = `${esc(b.reaction)} <button class="replay" data-say="${attr(b.reaction)}" title="Play again">🔊</button>`;
      $("bubble").hidden = false;
      lastKo = b.reaction;
    }
    setCard(feedbackHtml(b, cur.rec));
  } else if (live.kind === "summary") {
    setPicture("🎉", "");
    setCard(summaryHtml(b) + '<div id="daily"></div>');
    drawDaily();
  }
  setPhase(phase);
  drawNotes();
  drawNav();
}

function promptHtml(b, label) {
  return `<div class="label">${esc(label || b.label || "")}</div>
    <div class="ko">${esc(b.ko || "")} <button class="replay" data-say="${attr(b.ko || "")}" title="Play again (Alt+R)">🔊</button></div>
    ${b.word ? `<div class="word">단어: <b>${esc(b.word)}</b> — ${esc(b.gloss || "")}${b.extra ? ` <span class="dim">· ${esc(b.extra)}</span>` : ""}</div>` : ""}
    ${b.hint ? `<div class="hint">${esc(b.hint)}</div>` : ""}`;
}

function recBtn(url) { return url ? ` <button class="replay rec" data-rec="${attr(url)}" title="Your recording">▶ 내 목소리</button>` : ""; }

function fixesHtml(b) {
  const fx = (b.fixes || []).map((f) => `<div class="fix"><span class="said">${esc(f.said)}</span> → <span class="better">${esc(f.better)}</span>
      <button class="replay" data-say="${attr(f.better.split(" / ")[0])}" title="Hear the fix">🔊</button><div class="why">${esc(f.why || "")}</div></div>`).join("");
  const nat = b.natural ? `<div class="fix">💡 <span>${esc(b.natural.said)}</span> → <span class="better">${esc(b.natural.better)}</span>
      <button class="replay" data-say="${attr(b.natural.better.split(" / ")[0])}" title="Hear it">🔊</button><div class="why">${esc(b.natural.why || "")}</div></div>` : "";
  return fx + nat;
}

function feedbackHtml(b, rec) {
  return `<div class="label">${esc(b.label || "")}</div>
    <div class="res">⏱ ${esc(b.time || "")} · ${esc(b.result || "")}${b.last ? ` <span class="dim">(last time ${esc(b.last)})</span>` : ""}${recBtn(rec)}</div>
    ${fixesHtml(b)}
    ${b.slips ? `<p class="dim small">+${b.slips} small slips saved to 오늘의 실수</p>` : ""}
    ${b.note ? `<p class="dim small">${esc(b.note)}</p>` : ""}`;
}

function summaryHtml(b) {
  const rows = (b.rows || []).map((r) => `<tr><td>${esc(r.q)}</td><td class="dim">${esc(r.then)}</td><td>→</td><td><b>${esc(r.now)}</b></td></tr>`).join("");
  return `<div class="label">Then → now</div><table>${rows}</table>
    <p>⏱ avg ${esc(b.avg || "")} · ✔ first try ${esc(b.first_try || "")}${b.smooth != null ? ` · smooth this week ${b.smooth}` : ""}</p>
    ${(b.keep || []).map((k) => `<p>Keep: <b>${esc(k)}</b></p>`).join("")}
    ${b.next ? `<p class="dim">Next time: ${esc(b.next)}</p>` : ""}`;
}

// An earlier question (read-only), or the retry of it.
function drawTurn(i) {
  const t = turns[i];
  const p = t.prompt;
  $("bubble").hidden = true;
  setPicture(p.scene, p.speaker);
  lastKo = p.ko || "";
  let html;
  if (phase === "rspeak" || phase === "rtype" || phase === "rwait") {
    html = promptHtml(p, `${t.qid} · try again`) +
      (phase === "rtype" ? `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>` : "") +
      (phase === "rwait" ? '<p class="dim typing">checking</p>' : "");
  } else if (phase === "rfeedback") {
    const r = t.retries[t.retries.length - 1];
    html = feedbackHtml(r.feedback, r.rec) + '<p class="dim small">Enter = back to the live question</p>';
  } else {
    const fb = t.feedback;
    const tries = t.retries.filter((r) => r.feedback).map((r, k) =>
      `<div class="try"><div class="dim small">Try ${k + 2}</div><div>${esc(r.answer || "")}</div>${feedbackHtml(r.feedback, r.rec)}</div>`).join("");
    html = promptHtml(p) +
      (t.answer != null ? `<div class="mine"><span class="dim small">You${t.time ? " · ⏱ " + esc(t.time) : ""}</span>${recBtn(t.rec)}<div>${esc(t.answer)}</div></div>` : "") +
      (fb ? `<div class="res">${esc(fb.result || "")}${fb.last ? ` <span class="dim">(before: ${esc(fb.last)})</span>` : ""}</div>${fixesHtml(fb)}` : "") +
      tries +
      `<div class="gbtns">${!exited && fb ? `<button id="tryAgain" ${busy ? "disabled" : ""}>Try again (timed)</button>` : ""}
        <button id="toLive">Back to ${live.kind === "summary" ? "the summary" : "the live question"} (Alt+→)</button></div>`;
  }
  setCard(html);
  if ($("tryAgain")) $("tryAgain").onclick = () => tryAgain(i);
  if ($("toLive")) $("toLive").onclick = backToLive;
  setPhase(phase);
  drawNav();
}

function drawNotes() {
  $("note").innerHTML = live.notes.map((n) => `<div class="msg">${markdown(n)}</div>`).join("");
}

// ---------- going back (← →) ----------
// The live turn is the newest one while a prompt or its feedback is on screen.
function liveIndex() { return live.kind === "prompt" || live.kind === "feedback" ? turns.length - 1 : -1; }
function viewable() { const li = liveIndex(); return turns.map((_, i) => i).filter((i) => i !== li && turns[i].prompt); }

function drawNav() {
  const li = liveIndex();
  const dots = turns.map((t, i) => {
    const r = t.feedback ? t.feedback.result : "";
    const cls = ["dot", r === "✔" ? "ok" : r ? "fix" : "", i === li ? "live" : "", i === viewing ? "cur" : ""].join(" ");
    return `<span class="${cls}" data-go="${i}" title="${attr(t.label)}"></span>`;
  });
  if (li < 0 && turns.length) dots.push(`<span class="dot live ${viewing === null ? "cur" : ""}" data-go="live" title="summary"></span>`);
  $("dots").innerHTML = dots.join("");
  const lock = phase.startsWith("r");            // no moving around mid-retry
  $("prev").disabled = lock || !viewable().some((i) => viewing === null || i < viewing);
  $("next").disabled = lock || viewing === null;
}

function go(target) {
  if (phase.startsWith("r")) return;
  const li = liveIndex();
  if (target === "live" || target === li) return backToLive();
  if (!turns[target] || !turns[target].prompt) return;
  if (viewing === null) {                         // leaving the live screen: pause everything
    savedPhase = phase;
    savedInput = $("input").value;
    pauseTimer();
    recPause();
    audio.pause();
  }
  viewing = target;
  phase = "view";
  drawTurn(target);
  updateBar();
}
function step(dir) {
  const v = viewable();
  if (viewing === null) { if (dir < 0 && v.length) go(v[v.length - 1]); return; }
  const j = v.indexOf(viewing) + dir;
  if (j >= 0 && j < v.length) go(v[j]); else if (dir > 0) backToLive();
}

function backToLive() {
  if (viewing === null) return;
  if (retry) { recStop(); rec = parkedRec; parkedRec = null; stopTimer(true); timer = liveTimer; retry = null; }
  $("input").value = savedInput;
  viewing = null;
  phase = savedPhase;
  drawLive();
  if (live.pendingStart && live.kind === "prompt") {     // the prompt came in while you were looking back
    live.pendingStart = false;
    startPrompt(live.block, String(turns.length - 1));
  } else {
    resumeTimer();
    recResume();
  }
  updateBar();
}

function tryAgain(i) {
  if (busy || exited) return;
  const t = turns[i];
  retry = { i, k: t.retries.length, recUrl: null };
  liveTimer = timer;
  parkedRec = rec;              // the live answer's recording (paused) waits here
  rec = null;
  $("input").value = "";
  timer = { start: 0, target: t.prompt.target_s || 30, id: null, pausedAt: 0 };
  elapsed = "";
  phase = "rspeak";
  drawTurn(i);
  updateBar();
  startPrompt(t.prompt, `${i}-r${retry.k}`);
}

// ---------- recording your spoken answer ----------
let mic = null, rec = null, parkedRec = null, savedInput = "";
async function micStream() {
  if (mic !== null) return mic;
  try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { mic = false; live.notes.push("🎙 Mic is off, so answers aren't recorded."); drawNotes(); }
  return mic;
}
async function recStart(name) {
  const s = await micStream();
  if (!s || (rec && rec.state !== "inactive")) return;
  const r = new MediaRecorder(s);
  r.name = name;
  r.chunks = [];
  r.ondataavailable = (e) => r.chunks.push(e.data);
  r.start();
  rec = r;
}
function recPause() { if (rec && rec.state === "recording") rec.pause(); }
function recResume() { if (rec && rec.state === "paused") rec.resume(); }
function recStop() {
  return new Promise((res) => {
    if (!rec || rec.state === "inactive") { rec = null; return res(null); }
    const r = rec;
    rec = null;
    r.onstop = () => {
      const blob = new Blob(r.chunks, { type: r.mimeType || "audio/webm" });
      if (sid) fetch(recUrl(r.name), { method: "POST", body: blob }).catch(() => {});
      res(URL.createObjectURL(blob));
    };
    r.stop();
  });
}
function playUrl(url) {
  audio.pause();
  audio.onended = audio.onerror = null;
  audio.src = url;
  audio.play().catch(() => {});
}

// ---------- audio ----------
function play(text, after) {
  if (!text) { if (after) after(); return; }
  let called = false;
  const done = () => { if (!called) { called = true; if (after) after(); } };
  audio.onended = done;
  audio.onerror = done;
  audio.src = "/api/tts?text=" + encodeURIComponent(text);
  audio.play().catch(done);
  setTimeout(done, 15000);    // never leave the timer waiting
}
function replay() { if (lastKo) play(lastKo); }

function setCard(html) { $("card").innerHTML = html; }
function setPicture(scene, speaker) { $("scene").textContent = scene || ""; $("speaker").textContent = speaker || ""; }

function setPhase(p) {
  phase = p;
  const done = $("done");
  const label = { feedback: "Ready ▶", rfeedback: "Back to live ▶" }[p];
  done.textContent = label || "● Done speaking";
  done.className = label ? "ready" : "";
  done.hidden = !["speak", "rspeak", "feedback", "rfeedback"].includes(p);
  $("input").placeholder = p === "feedback" || p === "rfeedback" ? "Question about the fix? (or Enter = " + (p === "feedback" ? "ready)" : "back)")
    : p === "type" || p === "rtype" ? "Now type what you said · Enter = send" : "대답 · Enter = send · Shift+Enter = new line";
  if (["type", "speak", "rtype", "rspeak"].includes(p)) $("input").focus();
  updateBar();
}
function updateBar() {
  $("bar").hidden = exited || (viewing !== null && !["rspeak", "rtype", "rfeedback"].includes(phase));
}

// The page's timer is the official time in GUI mode (sent with each answer).
function startTimer(target) {
  stopTimer(true);
  timer = { start: Date.now(), target, id: setInterval(tick, 250), pausedAt: 0 };
  tick();
}
function seconds() { return timer.start ? Math.floor(((timer.pausedAt || Date.now()) - timer.start) / 1000) : 0; }
function fmtAnswer(s) { return s < 60 ? `${s}s` : fmt(s); }
function tick() {
  const s = seconds();
  $("timer").textContent = "⏱ " + fmt(s);
  $("timer").className = s > timer.target ? "over" : "";
}
function pauseTimer() {
  if (!timer.id) return;
  clearInterval(timer.id);
  timer.id = null;
  timer.pausedAt = Date.now();
  $("timer").textContent = "⏸ " + fmt(seconds());
  $("timer").className = "stopped";
}
function resumeTimer() {
  if (!timer.pausedAt) return;
  timer.start += Date.now() - timer.pausedAt;
  timer.pausedAt = 0;
  timer.id = setInterval(tick, 250);
  tick();
}
function stopTimer(clear, label) {
  clearInterval(timer.id);
  timer.id = null;
  timer.pausedAt = 0;
  if (clear) { timer.start = 0; $("timer").textContent = ""; }
  else if (label) { $("timer").textContent = "⏱ " + label; $("timer").className = "stopped"; }
}
function fmt(s) { return s < 60 ? `0:${String(s).padStart(2, "0")}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

function addHistory(kind, html) {
  const div = document.createElement("div");
  div.className = "msg " + (kind === "text" ? "" : kind);
  div.innerHTML = html;
  $("history").append(div);
}

function setBusy(on) {
  busy = on;
  $("status").className = on ? "dim typing" : "dim";
  $("send").disabled = $("done").disabled = on;
  if ($("tryAgain")) $("tryAgain").disabled = on;
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  const control = /^(그만|ready|\?)$/.test(text);   // commands, not answers: no time prefix
  const retrying = phase === "rspeak" || phase === "rtype";
  // Answers carry the page's time on the first line (gui-mode.md).
  if (control) { /* sent as is */ }
  else if (phase === "type" || phase === "rtype") text = `⏱ ${elapsed} spoken\n${text}`;
  else if ((phase === "speak" || phase === "rspeak") && timer.start && !/^[a-zA-Z]/.test(text)) {
    const t = fmtAnswer(seconds());
    stopTimer(false, t);
    const url = await recStop();
    if (retrying) retry.recUrl = url; else if (turns.length) turns[turns.length - 1].rec = url;
    text = `⏱ ${t} typed\n${text}`;
  }
  if (retrying && text !== "그만") text = `[retry ${turns[retry.i].qid}] ${text}`;
  const r = await fetch("/api/send", { method: "POST", body: JSON.stringify({ text }) });
  if (!r.ok) { addHistory("error", "Session is not running."); return; }
  $("input").value = "";
  if (retrying && text !== "그만") { phase = "rwait"; drawTurn(retry.i); updateBar(); }
  else if (phase === "type" || phase === "speak") setPhase("wait");
}

// Done speaking: stop the clock and the recording locally (no Claude call), then type it.
async function doneSpeaking() {
  if (!timer.start) return;     // audio still playing, the clock hasn't started
  elapsed = fmtAnswer(seconds());
  stopTimer(false, elapsed);
  if (phase === "rspeak") {
    phase = "rtype";
    drawTurn(retry.i);
    retry.recUrl = await recStop();
  } else {
    $("card").insertAdjacentHTML("beforeend", `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>`);
    setPhase("type");
    const url = await recStop();
    if (turns.length) turns[turns.length - 1].rec = url;
  }
}

function primary() {
  if (phase === "feedback") return send("ready");
  if (phase === "rfeedback") return backToLive();
  if (phase === "speak" || phase === "rspeak") return doneSpeaking();
}

// ---------- end screen: today's 오늘의 실수 (progress/daily/<today>.md) ----------
const TYPE_ORDER = ["문법", "시제", "조사", "어휘", "어순", "존댓말", "맞춤법"];
function localToday() { return new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function turnForBlock(block) {
  let m = block.match(/Q(\d+)/);
  if (m) return findTurn("Q" + m[1]);
  m = block.match(/warm-up (\d+)/);
  if (m) { for (let i = turns.length - 1; i >= 0; i--) if (turns[i].qid.startsWith(`워밍업 ${m[1]}/`)) return i; }
  return -1;
}
async function drawDaily() {
  const box = $("daily");
  if (!box) return;
  if (!live.daily) {
    box.innerHTML = '<p class="dim typing">오늘의 실수</p>';
    try { live.daily = (await (await fetch("/api/daily?date=" + localToday())).json()).items || []; }
    catch (e) { live.daily = []; }
    if (!$("daily")) return;
  }
  const items = live.daily;
  if (!items.length) { $("daily").innerHTML = ""; return; }
  const fixes = items.filter((x) => !x.natural);
  const nats = items.filter((x) => x.natural);
  const types = TYPE_ORDER.filter((t) => fixes.some((x) => x.type === t)).concat([...new Set(fixes.map((x) => x.type))].filter((t) => !TYPE_ORDER.includes(t)));
  const f = live.filter;
  const shown = fixes.filter((x) => f === "all" || x.type === f)
    .sort((a, b) => (a.slip - b.slip) || (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)));
  const row = (x) => {
    const i = turnForBlock(x.block);
    return `<div class="drow${i >= 0 ? " link" : ""}"${i >= 0 ? ` data-go="${i}"` : ""}>
      <span class="dim small">${esc(x.block)}${x.natural ? "" : " · " + esc(x.type)}${x.slip ? " · small slip" : ""}</span>${x.recurring ? " 🔁" : ""}<br>
      <span class="said">${esc(x.said)}</span> → <span class="better">${esc(x.better)}</span>
      <div class="why">${esc(x.why)}</div></div>`;
  };
  $("daily").innerHTML = `<h3>오늘의 실수 · ${esc(localToday())}</h3>
    <div class="chips">${["all", ...types].map((t) => `<button class="chip${t === f ? " on" : ""}" data-filter="${attr(t)}">${t === "all" ? "all" : esc(t)}</button>`).join("")}</div>
    <div class="label">✏️ 고쳤어요 (${shown.length})</div>${shown.map(row).join("")}
    ${nats.length && f === "all" ? `<div class="label">💡 더 자연스러워요 (${nats.length})</div>${nats.map(row).join("")}` : ""}
    <p class="dim small">Click a row to see that question again.</p>`;
}

// ---------- input ----------
$("send").onclick = () => send($("input").value);
$("done").onclick = primary;
$("end").onclick = () => send("그만");
$("prev").onclick = () => step(-1);
$("next").onclick = () => step(1);
$("histBtn").onclick = () => { $("history").hidden = !$("history").hidden; $("history").scrollTop = 1e9; };
$("home").onclick = async () => { await fetch("/api/close", { method: "POST" }); exited = false; showStart(); };
$("input").addEventListener("keydown", (e) => {
  // isComposing: Enter that finishes a Korean syllable must not send.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!$("input").value.trim() && (phase === "feedback" || phase === "rfeedback")) primary();
    else send($("input").value);
  }
});
document.addEventListener("keydown", (e) => {
  if ($("chat").hidden) return;
  if (e.ctrlKey && e.code === "Space") { e.preventDefault(); primary(); }
  if (e.altKey && e.code === "KeyR") { e.preventDefault(); replay(); }
  if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); step(1); }
});
document.addEventListener("click", (e) => {
  if ($("chat").hidden) return;
  const say = e.target.closest("[data-say]");
  if (say) return play(say.dataset.say);
  const r = e.target.closest("[data-rec]");
  if (r) return playUrl(r.dataset.rec);
  const fl = e.target.closest("[data-filter]");
  if (fl) { live.filter = fl.dataset.filter; return drawDaily(); }
  const g = e.target.closest("[data-go]");
  if (g) return go(g.dataset.go === "live" ? "live" : Number(g.dataset.go));
});
function attr(s) { return esc(String(s)).replace(/"/g, "&quot;"); }

// ---------- tiny markdown ----------
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
}
function markdown(src) {
  const out = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const code = [];
      while (++i < lines.length && !lines[i].startsWith("```")) code.push(lines[i]);
      out.push(`<pre>${esc(code.join("\n"))}</pre>`);
    } else if (/^\s*\|/.test(l)) {
      const rows = [];
      for (; i < lines.length && /^\s*\|/.test(lines[i]); i++) {
        if (/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) continue;
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|");
        rows.push("<tr>" + cells.map((c) => `<td>${inline(c.trim())}</td>`).join("") + "</tr>");
      }
      i--;
      out.push(`<table>${rows.join("")}</table>`);
    } else if (/^>\s?/.test(l)) {
      const q = [];
      for (; i < lines.length && /^>\s?/.test(lines[i]); i++) q.push(inline(lines[i].replace(/^>\s?/, "")));
      i--;
      out.push(`<blockquote>${q.join("<br>")}</blockquote>`);
    } else if (/^\s*[-*] /.test(l)) {
      const items = [];
      for (; i < lines.length && /^\s*[-*] /.test(lines[i]); i++) items.push(`<li>${inline(lines[i].replace(/^\s*[-*] /, ""))}</li>`);
      i--;
      out.push(`<ul>${items.join("")}</ul>`);
    } else if (/^---+\s*$/.test(l)) {
      out.push("<hr>");
    } else if (/^#{1,6} /.test(l)) {
      out.push(`<h3>${inline(l.replace(/^#+ /, ""))}</h3>`);
    } else if (l.trim()) {
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  return out.join("");
}

// ---------- boot ----------
(async () => {
  const start = new URLSearchParams(location.search).get("start");
  history.replaceState(null, "", "/");
  const st = await (await fetch("/api/state")).json();
  if (start === "review-game") { showStart(); startGame(); }
  else if (st.alive) showChat();
  else if (start) startSession(start);
  else showStart();
})();
