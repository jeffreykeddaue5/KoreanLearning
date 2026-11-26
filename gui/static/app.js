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
  const lesson = blocks.find((b) => /lesson (review|prep)/.test(b) && b.includes("☐"));
  // One button: the next block the GUI can run (asked 2026-11-24). Each session starts with yesterday's 실수 game (once a day).
  let next = null;
  if (t.intake_due) next = ["Lesson intake", "intake"];
  else if (grammar) next = [/paused/.test(grammar) ? "Resume grammar" : "Start grammar", "grammar"];
  else if (lesson) next = ["Start lesson review", "lesson-review"];
  else if (test) next = ["Start weekly test", "check"];
  $("choices").innerHTML = "";
  if (next) {
    const btn = document.createElement("button");
    btn.textContent = next[0];
    btn.className = "primary";
    btn.onclick = () => startSession(next[1]);
    $("choices").append(btn);
  } else {
    const open = blocks.find((b) => b.includes("☐") && !/optional|Anki/.test(b));
    const p = document.createElement("p");
    p.className = "dim";
    p.textContent = open ? `Next: ${open.replace(/☐\s*/, "").split(":")[0]}, in the terminal.` : "All done for today.";
    $("choices").append(p);
  }
}

async function startSession(args, warmedUp = false) {
  // 어제의 실수 game first, once a day (asked 2026-11-25; replaced the end-of-session mistakes drill).
  // Quitting the game also goes on to the session.
  if (!warmedUp && !/^(intake|review-game)\b/.test(args)) {
    try {
      const r = await (await fetch("/api/review?count=1")).json();
      if (r.total && !r.played) return startGame(null, () => startSession(args, true));
    } catch (e) { /* no game, go straight on */ }
  }
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
let typeOpen = false;    // "Type instead" pressed while speaking
let viewUsed = {};       // reveal/hint state of the earlier question on screen (read-only view)
let bubbleShown = false; // the reaction under the picture was uncovered
// What the user opened on a question: frame (format hint), trap (past mistake), text (showed the Korean).
const newUsed = () => ({ frame: false, trap: false, text: false });
const usedTag = (u) => { const l = ["frame", "trap", "text"].filter((k) => u && u[k]); return l.length ? " · used: " + l.join(", ") : ""; };
const usedOf = (t) => { const m = t.match(/^⏱[^\n]*· used: ([^\n]+)/m); const u = newUsed(); if (m) for (const k of m[1].split(/,\s*/)) if (k in u) u[k] = true; return u; };

const ICON = {
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  frame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h7"/></svg>',
  trap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M7 4l13 8-13 8z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};

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
    const r = { answer: answerOf(t), time: timeOf(t), rec: recNames.has(`${i}-r${k}`) ? recUrl(`${i}-r${k}`) : null, feedback: null, used: usedOf(t) };
    if (retry && retry.i === i && retry.recUrl) r.rec = retry.recUrl;
    turns[i].retries.push(r);
    pendingRetry = i;
    return;
  }
  if (/^(그만|ready|\?)$/.test(t.trim()) || !turns.length) return;
  const cur = turns[turns.length - 1];
  if (cur.answer == null && !cur.feedback) {
    cur.answer = answerOf(t); cur.time = timeOf(t);
    const u = usedOf(t);                       // page reload: rebuild what was opened from the message
    for (const k in u) cur.used[k] = cur.used[k] || u[k];
  }
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
                 rec: recNames.has(String(i)) ? recUrl(i) : null, feedback: null, retries: [], used: newUsed() });
    live.kind = "prompt"; live.block = b;
    stopTimer(true);
    elapsed = "";
    typeOpen = false;
    if (rec && !retry) recStop();             // never carry a running take into the next question
    if (viewing !== null) { live.pendingStart = true; savedPhase = "speak"; drawNav(); return; }
    phase = "speak";
    drawLive();
    if (!isNew) return startTimer(b.target_s || 30);
    startPrompt(b);
  } else if (b.type === "feedback") {
    const cur = turns[turns.length - 1];
    if (cur) { cur.feedback = b; cur.time = cur.time || b.time; }
    live.kind = "feedback"; live.block = b;
    bubbleShown = false;
    stopTimer(false, b.time);
    if (viewing !== null) { savedPhase = "feedback"; drawNav(); return; }
    phase = "feedback";
    drawLive();
    if (isNew && b.reaction) afterPaint(() => play(b.reaction));
  } else if (b.type === "summary") {
    live.kind = "summary"; live.block = b;
    if (isNew) saveNotes(b);
    stopTimer(true);
    if (viewing !== null) { savedPhase = "summary"; drawNav(); return; }
    phase = "summary";
    drawLive();
  }
}

// Audio strictly AFTER the card is on screen: wait for two paints, then play.
// The timer starts when the audio ends and runs until Done speaking (the whole answer).
// Recording is separate: the Record button (Alt+R), on and off as often as you like.
function afterPaint(f) { requestAnimationFrame(() => requestAnimationFrame(f)); }
function startPrompt(b) {
  lastKo = b.ko || "";
  afterPaint(() => play(lastKo, () => startTimer(b.target_s || 30)));
}

// ---------- weekly test game (asked 2026-11-24): hearts, combo, boss, stars, story, beat last week ----------
// Prompts carry "game": {"kind": "test"|"boss"|"star", "last_week": {...}?}. Everything else is counted here
// from the feedback results, so it's only for fun: levels are graded by Claude as usual.
let lastWeek = null;
function gameState() {
  const g = turns.filter((t) => t.prompt && t.prompt.game);
  const ok = (t) => t.feedback && /✔/.test(t.feedback.result || "");
  const bad = (t) => t.feedback && !ok(t);
  const scored = g.filter((t) => t.prompt.game.kind !== "star");
  const stars = g.filter((t) => t.prompt.game.kind === "star");
  let combo = 0, best = 0;
  for (const t of g) { if (!t.feedback) continue; combo = ok(t) ? combo + 1 : 0; best = Math.max(best, combo); }
  const secs = scored.filter((t) => t.feedback).map((t) => toSecs(t.time || t.feedback.time)).filter((x) => x > 0);
  const boss = scored.filter((t) => t.prompt.game.kind === "boss");
  return {
    on: g.length > 0, cur: g.length ? g[g.length - 1] : null,
    hearts: Math.max(0, 3 - scored.filter(bad).length),
    combo, best, right: scored.filter(ok).length, done: scored.filter((t) => t.feedback).length,
    stars: stars.filter(ok).length, starsAsked: stars.length,
    bossLeft: Math.max(0, 2 - boss.filter(ok).length), bossOn: boss.length > 0,
    avg: secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0,
    lines: g,
  };
}
function toSecs(t) { const m = String(t || "").match(/(?:(\d+):)?(\d+)/); return m ? (+(m[1] || 0)) * 60 + +m[2] : 0; }
function drawGame() {
  const s = gameState();
  $("hud").hidden = !s.on; $("story").hidden = !s.on;
  if (!s.on) return;
  for (const t of s.lines) if (t.prompt.game.last_week) lastWeek = t.prompt.game.last_week;
  const kind = s.cur.prompt.game.kind;
  const hearts = "♥".repeat(s.hearts) + "♡".repeat(3 - s.hearts);
  $("hud").innerHTML = `<span class="hearts" title="Lose one per wrong answer (just for fun)">${hearts}</span>
    ${s.combo >= 2 ? `<span class="combo">COMBO ×${s.combo}</span>` : ""}
    <span class="dim">✔ ${s.right}/${s.done} · ★ ${s.stars}/${Math.max(5, s.starsAsked)}</span>
    ${kind === "boss" ? `<span class="boss">BOSS <span class="hp">${"■".repeat(s.bossLeft)}${"□".repeat(2 - s.bossLeft)}</span></span>` : ""}
    ${kind === "star" ? '<span class="starTag">★ homework line · bonus star</span>' : ""}`;
  // story so far: the last 3 finished exchanges, as a chat
  const past = s.lines.filter((t) => t.feedback).slice(-3);
  $("story").innerHTML = past.map((t) => `<div class="sl tutor">${esc(t.prompt.ko || "")}</div>
    <div class="sl me ${t.prompt.game.kind === "star" ? "star" : ""}">${t.prompt.game.kind === "star" ? "★ " : ""}${esc(t.answer || "")} ${/✔/.test(t.feedback.result || "") ? "✔" : "✏️"}</div>`).join("");
  $("story").hidden = !past.length;
}
// The final page's notes → progress/daily/<today>.md (website 오늘의 실수 · 세션 노트, folded)
function saveNotes(b) {
  const done = turns.filter((t) => t.prompt && t.feedback);
  const s = gameState();
  const blocks = [...new Set(done.map((t) => (t.label || "").replace(/\s*[\d/]+.*$/, "").replace(/^Q$/, "grammar").trim() || "grammar"))];
  const stats = [["avg", b.avg || "–"], ["first try", b.first_try || "–"],
    ["heard", `${done.filter((t) => !t.used.text).length}/${done.length}`],
    ["hints", `${done.filter((t) => t.used.frame).length} format · ${done.filter((t) => t.used.trap).length} mistake`]];
  if (s.on) stats.push(["test", `${s.right}/${s.done} · ★ ${s.stars}/${s.starsAsked} · best combo ${s.best}`]);
  const help = (q) => { const i = findTurn(qidOf(String(q).split(" ")[0])); if (i < 0) return ""; const u = turns[i].used; return [u.frame && "format hint", u.trap && "past mistake", u.text && "read text"].filter(Boolean).join(", "); };
  const now = new Date();
  const title = `${blocks.slice(0, 3).join(" + ")} (GUI) · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  fetch("/api/notes", { method: "POST", body: JSON.stringify({
    title, stats, rows: (b.rows || []).map((r) => [r.q || "", r.then || "", r.now || "", help(r.q)]),
    keep: b.keep || [], next: b.next || "" }) }).catch(() => {});
}

function beatHtml() {
  const s = gameState();
  if (!s.on) return "";
  const lw = lastWeek || {};
  const row = (k, a, b) => `<tr><td>${k}</td><td class="dim">${esc(a == null ? "–" : String(a))}</td><td><b>${esc(String(b))}</b></td></tr>`;
  return `<div class="label">Beat last week</div><table class="beat">
    <tr><td></td><td class="dim small">last week</td><td class="small">now</td></tr>
    ${row("Score", lw.score, `${s.right}/${s.done}`)}${row("Avg time", lw.avg, s.avg ? s.avg + "s" : "–")}
    ${row("Best combo", lw.combo, s.best)}${row("Hearts left", null, "♥".repeat(s.hearts) || "0")}${row("Stars ★", null, `${s.stars}/${s.starsAsked}`)}
    ${s.bossOn ? row("Boss", null, s.bossLeft ? "survived" : "beaten 🎉") : ""}</table>`;
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
    setCard(promptHtml(b, "", (turns[turns.length - 1] || {}).used) + (phase === "type" ? `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>` : ""));
  } else if (live.kind === "feedback") {
    const cur = turns[turns.length - 1] || {};
    setPicture(cur.prompt ? cur.prompt.scene : "", b.speaker || (cur.prompt || {}).speaker);
    if (b.reaction) {
      drawBubble(b.reaction);
      lastKo = b.reaction;
    }
    setCard(feedbackHtml(b, cur.rec, cur.used));
  } else if (live.kind === "summary") {
    setPicture("🎉", "");
    setCard(beatHtml() + summaryHtml(b) + '<div id="daily"></div>');
    drawDaily();
  }
  setPhase(phase);
  drawGame();
  drawNotes();
  drawNav();
}

// Shown Korean line: click it (or Alt+K) to cover it again (asked 2026-11-24).
const koShown = (u) => u.shown !== undefined ? u.shown : !!u.text;
const shownKo = (text) => `<p class="ko shown" data-hide="ko" title="Hide the Korean again (Alt+K)">${esc(text)} <span class="hideTag">${ICON.eye} hide</span></p>`;
// The Korean line starts covered (listening first); `used` remembers what was opened on this question.
// Hints: `frame` (format to answer with; old `hint` field as a fallback) and `trap` (a past mistake).
const speakerBtn = (text, title) => `<button class="replay" data-say="${attr(text)}" aria-label="${attr(title)}" title="${attr(title)}">${ICON.speaker}</button>`;
function promptHtml(b, label, used) {
  used = used || {};
  const frame = b.frame || b.hint || "";
  const trap = b.trap && b.trap.better ? b.trap : null;
  const ko = koShown(used) ? shownKo(b.ko || "")
    : `<button class="cover" data-reveal="ko" aria-label="Show the Korean sentence (Alt+K)">${ICON.eye} Listen first · tap to show Korean <kbd>Alt K</kbd></button>`;
  const frameBox = `<div class="hintBox frame" data-box="frame"${used.frameOpen ? "" : " hidden"}><div class="head">Say it with this pattern</div>
      <div class="body">${esc(frame)}</div><div class="note">No penalty: use it whenever it helps.</div></div>`;
  const trapBox = trap ? `<div class="hintBox trap" data-box="trap"${used.trapOpen ? "" : " hidden"}><div class="head">You said this before${trap.date ? ` (${esc(trap.date)})` : ""}</div>
      <div class="body"><span class="said">${esc(trap.said || "")}</span> → <span class="better">${esc(trap.better)}</span></div>
      <div class="note">${esc(trap.why || "")}${trap.why ? " · " : ""}Doesn't count as a hint.</div></div>` : "";
  const hints = frame || trap ? `<div class="hints">
      ${frame ? `<button class="frame${used.frameOpen ? " on" : ""}" data-hint="frame" aria-expanded="${!!used.frameOpen}">${ICON.frame} Format hint <kbd>Alt 1</kbd></button>` : ""}
      ${trap ? `<button class="trap${used.trapOpen ? " on" : ""}" data-hint="trap" aria-expanded="${!!used.trapOpen}">${ICON.trap} Past mistake <kbd>Alt 2</kbd></button>` : ""}
    </div>${frame ? frameBox : ""}${trapBox}` : "";
  return `<div class="label">${esc(label || b.label || "")}</div>
    <div class="koRow">${ko} ${speakerBtn(b.ko || "", "Play the question again (Alt+P)")}</div>
    ${b.word ? `<div class="word">단어: <b>${esc(b.word)}</b> — ${esc(b.gloss || "")}${b.extra ? ` <span class="dim">· ${esc(b.extra)}</span>` : ""}</div>` : ""}
    ${hints}`;
}

function recBtn(url) { return url ? ` <button class="replay rec" data-rec="${attr(url)}" title="Your recording">${ICON.play} 내 목소리</button>` : ""; }

function usedChips(u) {
  if (!u) return "";
  return (u.frame ? '<span class="used">Format hint used</span>' : "") +
    (u.trap ? '<span class="used trap">Past mistake shown</span>' : "") +
    (u.text ? '<span class="used text">Showed Korean</span>' : "");
}

function fixesHtml(b) {
  const fx = (b.fixes || []).map((f) => `<div class="fix"><span class="said">${esc(f.said)}</span> → <span class="better">${esc(f.better)}</span>
      ${speakerBtn(f.better.split(" / ")[0], "Hear the fix")}<div class="why">${esc(f.why || "")}</div></div>`).join("");
  const nat = b.natural ? `<div class="fix">💡 <span>${esc(b.natural.said)}</span> → <span class="better">${esc(b.natural.better)}</span>
      ${speakerBtn(b.natural.better.split(" / ")[0], "Hear it")}<div class="why">${esc(b.natural.why || "")}</div></div>` : "";
  return fx + nat;
}

function feedbackHtml(b, rec, used) {
  return `<div class="label">${esc(b.label || "")}</div>
    <div class="res">⏱ ${esc(b.time || "")} · ${esc(b.result || "")}${b.last ? ` <span class="dim">(last time ${esc(b.last)})</span>` : ""}${recBtn(rec)}</div>
    ${fixesHtml(b)}
    ${usedChips(used) ? `<p>${usedChips(used)}</p>` : ""}
    ${b.slips ? `<p class="dim small">+${b.slips} small slips saved to 오늘의 실수</p>` : ""}
    ${b.note ? `<p class="dim small">${esc(b.note)}</p>` : ""}`;
}

// The reaction under the picture is covered too (more listening).
function drawBubble(text) {
  $("bubble").innerHTML = (bubbleShown ? `<span data-reveal="bubble" class="shown" title="Hide again (Alt+K)">${esc(text)}</span>`
    : `<button class="cover" data-reveal="bubble" aria-label="Show the reaction in Korean (Alt+K)">${ICON.eye} Reaction · tap to show</button>`) +
    " " + speakerBtn(text, "Play again");
  $("bubble").hidden = false;
}

function summaryHtml(b) {
  const done = turns.filter((t) => t.prompt && t.feedback);
  const heard = done.filter((t) => !t.used.text).length;
  const frames = done.filter((t) => t.used.frame).length, traps = done.filter((t) => t.used.trap).length;
  const help = (q) => { const i = findTurn(qidOf(String(q).split(" ")[0])); return i < 0 ? "" : usedChips(turns[i].used); };
  const rows = (b.rows || []).map((r) => `<tr><td>${esc(r.q)}</td><td class="dim">${esc(r.then)}</td><td>→</td><td><b>${esc(r.now)}</b></td><td>${help(r.q)}</td></tr>`).join("");
  return `<div class="tiles">
      <div class="tile"><div class="k">Average time</div><div class="v">${esc(b.avg || "–")}</div></div>
      <div class="tile"><div class="k">Right first try</div><div class="v">${esc(b.first_try || "–")}</div></div>
      <div class="tile"><div class="k">Understood without the text</div><div class="v">${done.length ? `${heard} / ${done.length}` : "–"}</div></div>
      <div class="tile"><div class="k">Hints used</div><div class="v">${frames} format · ${traps} mistake</div></div>
    </div>
    <div class="label">Then → now</div><div style="overflow-x:auto"><table>${rows}</table></div>
    ${b.smooth != null ? `<p class="dim">Smooth this week: ${b.smooth}</p>` : ""}
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
    html = promptHtml(p, `${t.qid} · try again`, retry.used) +
      (phase === "rtype" ? `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>` : "") +
      (phase === "rwait" ? '<p class="dim typing">checking</p>' : "");
  } else if (phase === "rfeedback") {
    const r = t.retries[t.retries.length - 1];
    html = feedbackHtml(r.feedback, r.rec, r.used) + '<p class="dim small">Enter = back to the live question</p>';
  } else {
    const fb = t.feedback;
    const tries = t.retries.filter((r) => r.feedback).map((r, k) =>
      `<div class="try"><div class="dim small">Try ${k + 2}</div><div>${esc(r.answer || "")}</div>${feedbackHtml(r.feedback, r.rec, r.used)}</div>`).join("");
    html = promptHtml(p, "", viewUsed) +
      (t.answer != null ? `<div class="mine"><span class="dim small">You${t.time ? " · ⏱ " + esc(t.time) : ""}</span>${recBtn(t.rec)}<div>${esc(t.answer)}</div></div>` : "") +
      (fb ? `<div class="res">${esc(fb.result || "")}${fb.last ? ` <span class="dim">(before: ${esc(fb.last)})</span>` : ""}</div>${fixesHtml(fb)}${usedChips(t.used) ? `<p>${usedChips(t.used)}</p>` : ""}` : "") +
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
  viewUsed = newUsed();           // the Korean is covered again when you go back
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
    startPrompt(live.block);
  } else {
    resumeTimer();
    recResume();
  }
  updateBar();
}

function tryAgain(i) {
  if (busy || exited) return;
  const t = turns[i];
  retry = { i, k: t.retries.length, recUrl: null, used: newUsed() };
  liveTimer = timer;
  parkedRec = rec;              // the live answer's recording (paused) waits here
  rec = null;
  $("input").value = "";
  timer = { start: 0, target: t.prompt.target_s || 30, id: null, pausedAt: 0 };
  elapsed = "";
  typeOpen = false;
  phase = "rspeak";
  drawTurn(i);
  updateBar();
  startPrompt(t.prompt);
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
  r.startedAt = Date.now();
  rec = r;
}

// Record button: on = a new take (the old one is thrown away), off = keep it. The timer never depends on it.
const canRecord = () => ["speak", "type", "rspeak", "rtype"].includes(phase);
function takeUrl() { return retry ? retry.recUrl : (turns[turns.length - 1] || {}).rec; }
function setTake(url) { if (retry) retry.recUrl = url; else if (turns.length) turns[turns.length - 1].rec = url; }
let recTick = null;
async function toggleRec() {
  if (!canRecord() || (viewing !== null && !retry)) return;
  if (rec && rec.state !== "inactive") {
    const url = await recStop();
    if (url) setTake(url);
  } else {
    setTake(null);
    await recStart(retry ? `${retry.i}-r${retry.k}` : String(turns.length - 1));
  }
  drawRec();
}
function drawRec() {
  const on = !!(rec && rec.state === "recording");
  const has = !!takeUrl();
  $("rec").classList.toggle("on", on);
  $("rec").setAttribute("aria-pressed", String(on));
  $("rec").querySelector("svg").outerHTML = on ? ICON.stop : ICON.mic;
  const secs = on ? Math.floor((Date.now() - rec.startedAt) / 1000) : 0;
  $("recLabel").textContent = on ? `Stop · ${fmt(secs)}` : has ? "Record again" : "Record";
  $("take").innerHTML = !on && has && canRecord() ? recBtn(takeUrl()) : "";
  $("recHelp").textContent = !canRecord() ? "" : mic === false ? "Mic is off, so nothing is recorded."
    : on ? "Recording… press again to keep this take."
    : has ? "Record again replaces this take." : "Recording is optional; the timer runs either way.";
  clearInterval(recTick);
  recTick = on ? setInterval(drawRec, 500) : null;
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

// Footer: actions row (Record · take · Done/Next) and the typing row, each shown only when it's useful.
function setPhase(p) {
  phase = p;
  const speaking = p === "speak" || p === "rspeak";
  $("doneLabel").textContent = { feedback: "Next question", rfeedback: "Back to live" }[p] || "Done speaking";
  $("done").hidden = !["speak", "rspeak", "feedback", "rfeedback"].includes(p);
  $("rec").hidden = !canRecord();
  $("typeInstead").hidden = !speaking || typeOpen;
  $("actions").hidden = $("done").hidden && $("rec").hidden;
  const typing = ["type", "rtype", "feedback", "rfeedback", "summary"].includes(p) || (speaking && typeOpen);
  $("typing").hidden = !typing;
  const fb = p === "feedback" || p === "rfeedback";
  $("inputLabel").textContent = fb ? "Ask about the fix" : p === "summary" ? "Message" : "Your answer";
  $("input").placeholder = fb ? "Question about the fix? (empty Enter = " + (p === "feedback" ? "next)" : "back)")
    : p === "type" || p === "rtype" ? "Now type what you said · Enter = send" : "대답 · Enter = send · Shift+Enter = new line";
  if (typing && !fb) $("input").focus();
  drawRec();
  drawSteps();
  updateBar();
}
function updateBar() {
  $("bar").hidden = exited || (viewing !== null && !["rspeak", "rtype", "rfeedback"].includes(phase));
}
// Listen → Speak → Type → Feedback, for the question on screen.
function drawSteps() {
  const p = phase.replace(/^r(?=speak|type|feedback|wait)/, "");
  let n = -1;
  if (p === "speak") n = timer.start ? 1 : 0;
  else if (p === "type") n = 2;
  else if (p === "feedback" || (p === "wait" && (live.kind === "prompt" || retry))) n = 3;
  $("steps").hidden = n < 0 || phase === "view";
  [...$("steps").children].forEach((li, i) => {
    li.className = i < n ? "done" : i === n ? "now" : "";
    if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
}

// The page's timer is the official time in GUI mode (sent with each answer).
function startTimer(target) {
  stopTimer(true);
  timer = { start: Date.now(), target, id: setInterval(tick, 250), pausedAt: 0 };
  $("clock").hidden = false;
  tick();
  drawSteps();
}
function seconds() { return timer.start ? Math.floor(((timer.pausedAt || Date.now()) - timer.start) / 1000) : 0; }
function fmtAnswer(s) { return s < 60 ? `${s}s` : fmt(s); }
// The ring fills to the goal (15 s warm-up, 30 s questions), then turns orange; the text says it too.
function drawRing(s, state) {
  const t = timer.target || 30;
  $("ringFill").style.strokeDasharray = `${Math.min(s / t, 1) * 125.7} 126`;
  $("ring").setAttribute("class", state);
  $("timer").className = state;
  $("goal").textContent = state === "stopped" ? (s <= t ? `✓ under ${fmt(t)}` : `goal ${fmt(t)}`)
    : state === "paused" ? "paused" : s > t ? `over goal ${fmt(t)}` : `goal ${fmt(t)}`;
}
function tick() {
  const s = seconds();
  $("timer").textContent = fmt(s);
  drawRing(s, s > timer.target ? "over" : "");
}
function pauseTimer() {
  if (!timer.id) return;
  clearInterval(timer.id);
  timer.id = null;
  timer.pausedAt = Date.now();
  $("timer").textContent = "⏸ " + fmt(seconds());
  drawRing(seconds(), "paused");
}
function resumeTimer() {
  if (!timer.pausedAt) return;
  timer.start += Date.now() - timer.pausedAt;
  timer.pausedAt = 0;
  timer.id = setInterval(tick, 250);
  tick();
}
function stopTimer(clear, label) {
  const s = seconds();
  clearInterval(timer.id);
  timer.id = null;
  timer.pausedAt = 0;
  if (clear) { timer.start = 0; $("timer").textContent = ""; $("clock").hidden = true; }
  else if (label) {
    $("clock").hidden = false;
    drawRing(timer.start ? s : 0, "stopped");
    $("timer").textContent = label;
    if (!timer.start) $("goal").textContent = "";     // page reload: only the logged time is known
  }
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
  // `· used: frame, trap, text` = the hints opened and whether the Korean was shown (gui-mode.md).
  const used = usedTag(retrying ? retry.used : (turns[turns.length - 1] || {}).used);
  if (control) { /* sent as is */ }
  else if (phase === "type" || phase === "rtype") text = `⏱ ${elapsed} spoken${used}\n${text}`;
  else if ((phase === "speak" || phase === "rspeak") && timer.start && !/^[a-zA-Z]/.test(text)) {
    const t = fmtAnswer(seconds());
    stopTimer(false, t);
    const url = await recStop();
    if (url) setTake(url);
    text = `⏱ ${t} typed${used}\n${text}`;
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
  const url = await recStop();      // a take still running ends with the answer
  if (url) setTake(url);
  if (phase === "rspeak") {
    phase = "rtype";
    drawTurn(retry.i);
  } else {
    $("card").insertAdjacentHTML("beforeend", `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>`);
    setPhase("type");
  }
}

// Uncover the Korean (or the reaction), open/close a hint: remembered per question, sent with the answer.
function curUsed() { return retry ? retry.used : viewing !== null ? viewUsed : (turns[turns.length - 1] || {}).used; }
function redrawCard() { if (viewing !== null) drawTurn(viewing); else drawLive(); }
function reveal(which) {
  if (which === "bubble" || (which !== "ko" && phase === "feedback" && !$("card").querySelector('[data-reveal="ko"]'))) {
    if (live.kind !== "feedback" || viewing !== null) return;
    bubbleShown = !bubbleShown;
    return drawBubble(live.block.reaction || "");
  }
  const u = curUsed();
  if (!u) return;
  const btn = $("card").querySelector('[data-reveal="ko"]');
  const shown = $("card").querySelector('[data-hide="ko"]');
  if (btn) { u.text = true; u.shown = true; btn.outerHTML = shownKo(lastKo); }
  else if (shown) { u.shown = false; shown.outerHTML = `<button class="cover" data-reveal="ko" aria-label="Show the Korean sentence (Alt+K)">${ICON.eye} Listen first · tap to show Korean <kbd>Alt K</kbd></button>`; }
}
function toggleHint(kind) {
  const u = curUsed();
  const btn = $("card").querySelector(`[data-hint="${kind}"]`);
  if (!u || !btn) return;
  const open = !u[kind + "Open"];
  u[kind + "Open"] = open;
  if (open && viewing === null || open && retry) u[kind] = true;     // read-only views don't count
  btn.classList.toggle("on", open);
  btn.setAttribute("aria-expanded", String(open));
  $("card").querySelector(`[data-box="${kind}"]`).hidden = !open;
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
$("rec").onclick = toggleRec;
$("typeInstead").onclick = () => { typeOpen = true; setPhase(phase); };
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
  if (e.altKey && e.code === "KeyR") { e.preventDefault(); toggleRec(); }
  if (e.altKey && e.code === "KeyP") { e.preventDefault(); replay(); }
  if (e.altKey && e.code === "KeyK") { e.preventDefault(); reveal(); }
  if (e.altKey && e.code === "Digit1") { e.preventDefault(); toggleHint("frame"); }
  if (e.altKey && e.code === "Digit2") { e.preventDefault(); toggleHint("trap"); }
  if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); step(1); }
});
document.addEventListener("click", (e) => {
  if ($("chat").hidden) return;
  const rv = e.target.closest("[data-reveal]");
  if (rv) return reveal(rv.dataset.reveal);
  if (e.target.closest("[data-hide]")) return reveal("ko");
  const h = e.target.closest("[data-hint]");
  if (h) return toggleHint(h.dataset.hint);
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
