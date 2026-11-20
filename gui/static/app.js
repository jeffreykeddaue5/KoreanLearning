// Korean Mentor GUI, build steps 1–2: start screen + chat (see gui/DESIGN.md).
const $ = (id) => document.getElementById(id);
const DAYS = { Mon: "월요일", Tue: "화요일", Wed: "수요일", Thu: "목요일", Fri: "금요일", Sat: "토요일", Sun: "일요일" };
let source = null;
let busy = false;

// ---------- start screen ----------
async function showStart() {
  $("chat").hidden = true;
  $("start").hidden = false;
  $("day").textContent = "…";
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
}

async function startSession(args) {
  await fetch("/api/start", { method: "POST", body: JSON.stringify({ args }) });
  showChat();
}

// ---------- session (focus view) ----------
let phase = "wait";          // wait | speak | type | feedback | summary
let timer = { start: 0, target: 30, id: null };
let replayUpTo = 0;          // events with id <= this are old (page reload): draw them, no audio
let lastKo = "";             // the Korean line the 🔊 button repeats
const audio = new Audio();
let elapsed = "";            // frozen time after Done speaking

function showChat() {
  $("start").hidden = true;
  $("chat").hidden = false;
  $("closed").hidden = true;
  $("history").innerHTML = "";
  $("history").hidden = true;
  setCard('<p class="dim typing">getting ready</p>');
  setPicture("", "");
  $("note").innerHTML = "";
  stopTimer(true);
  setPhase("wait");
  if (source) source.close();
  fetch("/api/state").then((r) => r.json()).then((st) => {
    replayUpTo = st.count || 0;
    source = new EventSource("/api/events?since=0");
    source.onmessage = (e) => onEvent(JSON.parse(e.data), Number(e.lastEventId) > replayUpTo);
  });
}

function onEvent(ev, live = true) {
  if (ev.kind === "busy") return setBusy(ev.on);
  if (ev.kind === "exit") { setBusy(false); $("closed").hidden = false; $("bar").hidden = true; return; }
  if (ev.kind === "tool") return;                       // never shown
  if (ev.kind === "user") return addHistory("user", esc(ev.text));
  if (ev.kind === "error") return addHistory("error", esc(ev.text));
  // assistant text
  addHistory("text", markdown(ev.text));
  const m = ev.text.match(/```gui\s*\n([\s\S]*?)```/);
  let block = null;
  if (m) { try { block = JSON.parse(m[1]); } catch (e) { block = null; } }
  const rest = (block ? ev.text.replace(m[0], "") : ev.text).trim();
  if (block) render(block, live);
  if (rest) {
    const div = document.createElement("div");
    div.className = "msg";
    div.innerHTML = markdown(rest);
    $("note").append(div);
  }
}

function render(b, live = true) {
  $("note").innerHTML = "";
  $("bubble").hidden = true;
  if (b.type === "prompt") {
    setPicture(b.scene, b.speaker);
    lastKo = b.ko || "";
    setCard(`<div class="label">${esc(b.label || "")}</div>
      <div class="ko">${esc(b.ko || "")} <button class="replay" title="Play again (Alt+R)" onclick="replay()">🔊</button></div>
      ${b.word ? `<div class="word">단어: <b>${esc(b.word)}</b> — ${esc(b.gloss || "")}${b.extra ? ` <span class="dim">· ${esc(b.extra)}</span>` : ""}</div>` : ""}
      ${b.hint ? `<div class="hint">${esc(b.hint)}</div>` : ""}`);
    stopTimer(true);
    elapsed = "";
    setPhase("speak");
    // Audio strictly AFTER the card is on screen: wait for two paints, then play.
    // The timer starts when the audio ends (or right away if there's no audio).
    const target = b.target_s || 30;
    if (!live) return startTimer(target);
    requestAnimationFrame(() => requestAnimationFrame(() => play(lastKo, () => startTimer(target))));
  } else if (b.type === "feedback") {
    stopTimer(false, b.time);
    if (b.speaker) $("speaker").textContent = b.speaker;
    if (b.reaction) {
      $("bubble").innerHTML = `${esc(b.reaction)} <button class="replay" title="Play again (Alt+R)" onclick="replay()">🔊</button>`;
      $("bubble").hidden = false;
      lastKo = b.reaction;
      if (live) requestAnimationFrame(() => requestAnimationFrame(() => play(lastKo)));
    }
    const fixes = (b.fixes || []).map((f) => `<div class="fix"><span class="said">${esc(f.said)}</span> → <span class="better">${esc(f.better)}</span><div class="why">${esc(f.why || "")}</div></div>`).join("");
    const nat = b.natural ? `<div class="fix">💡 <span>${esc(b.natural.said)}</span> → <span class="better">${esc(b.natural.better)}</span><div class="why">${esc(b.natural.why || "")}</div></div>` : "";
    setCard(`<div class="label">${esc(b.label || "")}</div>
      <div class="res">⏱ ${esc(b.time || "")} · ${esc(b.result || "")}${b.last ? ` <span class="dim">(last time ${esc(b.last)})</span>` : ""}</div>
      ${fixes}${nat}
      ${b.slips ? `<p class="dim small">+${b.slips} small slips saved to 오늘의 실수</p>` : ""}
      ${b.note ? `<p class="dim small">${esc(b.note)}</p>` : ""}`);
    setPhase("feedback");
  } else if (b.type === "summary") {
    stopTimer(true);
    setPicture("🎉", "");
    const rows = (b.rows || []).map((r) => `<tr><td>${esc(r.q)}</td><td class="dim">${esc(r.then)}</td><td>→</td><td><b>${esc(r.now)}</b></td></tr>`).join("");
    setCard(`<div class="label">Then → now</div><table>${rows}</table>
      <p>⏱ avg ${esc(b.avg || "")} · ✔ first try ${esc(b.first_try || "")}${b.smooth != null ? ` · smooth this week ${b.smooth}` : ""}</p>
      ${(b.keep || []).map((k) => `<p>Keep: <b>${esc(k)}</b></p>`).join("")}
      ${b.next ? `<p class="dim">Next time: ${esc(b.next)}</p>` : ""}`);
    setPhase("summary");
  }
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
function replay() {
  if (!lastKo) return;
  if (!audio.paused) audio.pause();
  audio.currentTime = 0;
  if (timer.start || phase !== "speak") audio.onended = audio.onerror = null;  // else: still starts the clock when it ends
  audio.src = "/api/tts?text=" + encodeURIComponent(lastKo);
  audio.play().catch(() => {});
  $("input").focus();
}

function setCard(html) { $("card").innerHTML = html; }
function setPicture(scene, speaker) { $("scene").textContent = scene || ""; $("speaker").textContent = speaker || ""; }

function setPhase(p) {
  phase = p;
  const done = $("done");
  if (p === "feedback") { done.textContent = "Ready ▶"; done.className = "ready"; }
  else { done.textContent = "● Done speaking"; done.className = ""; }
  done.hidden = !(p === "speak" || p === "feedback");
  $("input").placeholder = p === "feedback" ? "Question about the fix? (or Enter = ready)"
    : p === "type" ? "Now type what you said · Enter = send" : "대답 · Enter = send · Shift+Enter = new line";
  if (p === "type" || p === "speak") $("input").focus();
}

// The page's timer is the official time in GUI mode (sent with each answer).
function startTimer(target) {
  stopTimer(true);
  timer = { start: Date.now(), target, id: setInterval(tick, 250) };
  tick();
}
function seconds() { return timer.start ? Math.floor((Date.now() - timer.start) / 1000) : 0; }
function fmtAnswer(s) { return s < 60 ? `${s}s` : fmt(s); }
function tick() {
  const s = seconds();
  $("timer").textContent = "⏱ " + fmt(s);
  $("timer").className = s > timer.target ? "over" : "";
}
function stopTimer(clear, label) {
  clearInterval(timer.id);
  timer.id = null;
  if (clear) timer.start = 0;
  if (clear) $("timer").textContent = "";
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
  $("status").textContent = on ? "" : "";
  $("status").className = on ? "dim typing" : "dim";
  $("send").disabled = $("done").disabled = on;
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  const control = /^(그만|ready|\?)$/.test(text);   // commands, not answers: no time prefix
  // Answers carry the page's time on the first line (gui-mode.md).
  if (control) { /* sent as is */ }
  else if (phase === "type") text = `⏱ ${elapsed} spoken\n${text}`;
  else if (phase === "speak" && timer.start && !/^[a-zA-Z]/.test(text)) {
    const t = fmtAnswer(seconds());
    stopTimer(false, t);
    text = `⏱ ${t} typed\n${text}`;
  }
  const r = await fetch("/api/send", { method: "POST", body: JSON.stringify({ text }) });
  if (!r.ok) { addHistory("error", "Session is not running."); return; }
  $("input").value = "";
  if (phase === "type" || phase === "speak") setPhase("wait");
}

// Done speaking: stop the clock locally (no Claude call), then type it.
function doneSpeaking() {
  if (!timer.start) return;     // audio still playing, the clock hasn't started
  elapsed = fmtAnswer(seconds());
  stopTimer(false, elapsed);
  $("card").insertAdjacentHTML("beforeend", `<p class="dim">⏱ ${esc(elapsed)} · now type what you said</p>`);
  setPhase("type");
}

function primary() {
  if (phase === "feedback") return send("ready");
  if (phase === "speak") return doneSpeaking();
}

$("send").onclick = () => send($("input").value);
$("done").onclick = primary;
$("end").onclick = () => send("그만");
$("histBtn").onclick = () => { $("history").hidden = !$("history").hidden; $("history").scrollTop = 1e9; };
$("home").onclick = async () => { await fetch("/api/close", { method: "POST" }); $("bar").hidden = false; showStart(); };
$("input").addEventListener("keydown", (e) => {
  // isComposing: Enter that finishes a Korean syllable must not send.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!$("input").value.trim() && phase === "feedback") send("ready");
    else send($("input").value);
  }
});
document.addEventListener("keydown", (e) => {
  if ($("chat").hidden) return;
  if (e.ctrlKey && e.code === "Space") { e.preventDefault(); primary(); }
  if (e.altKey && e.code === "KeyR") { e.preventDefault(); replay(); }
});

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
  if (st.alive) showChat();
  else if (start) startSession(start);
  else showStart();
})();
