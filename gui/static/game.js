// Review game: 어제의 실수. Runs in the page with no Claude call.
// The server parses progress/daily/<date>.md (GET /api/review) and saves results
// (POST /api/review/result → gui/state/review-<date>.json); the next grammar
// session uses the misses as follow-up targets (session.md).
// Audio only plays when the 🔊 button is pressed.
// Round 1: pick the right/more natural sentence (5 s for a speed bonus).
// Round 2: type the fix for a real error; checked locally, "I had it" for valid alternatives.

let G = null;

async function startGame(day, then = null) {
  const r = await (await fetch("/api/review" + (day ? "?date=" + day : ""))).json();
  if (!r.total) { if (then) return then(); alert("No mistakes logged for that day."); return; }
  G = { date: r.date, total: r.total, r1: r.round1, r2: r.round2, queue: [], i: 0,
        score: 0, streak: 0, best: 0, results: [], replay: null, mode: "main", key: null, then };
  for (const s of ["start", "chat"]) $(s).hidden = true;
  $("game").hidden = false;
  $("gTitle").textContent = `어제의 실수 · ${r.date.slice(5)}`;
  updateScore();
  gStage(`<div class="gq">${r.total} fixes logged on ${r.date}</div>
    <div class="gres"><div class="big">Round 1 · 어느 게 맞아요? (${r.round1.length})</div>
      <div class="why">Pick the right or more natural sentence. Answer within 5 s for a bonus.</div></div>
    <div class="gres"><div class="big">Round 2 · 고쳐 보세요 (${r.round2.length})</div>
      <div class="why">Type the fix. Spacing and punctuation don't count; "I had it" if your version is also right.</div></div>
    <div class="gbtns"><button class="primary" id="gGo">Start (Enter)</button></div>`);
  $("gGo").onclick = () => runQueue(buildQueue());
  G.key = (e) => { if (e.key === "Enter") runQueue(buildQueue()); };
}

function buildQueue() {
  return [...G.r1.map((it) => ({ it, round: 1 })), ...G.r2.map((it) => ({ it, round: 2 }))];
}

function runQueue(q) { G.queue = q; G.i = 0; next(); }

function next() {
  audio.pause();   // never let a replay run into the next question
  if (G.i >= G.queue.length) return endScreen();
  const { it, round } = G.queue[G.i];
  $("gFill").style.width = (100 * G.i / G.queue.length) + "%";
  round === 1 ? showPick(it) : showFix(it);
}

function tags(it) {
  return `<span class="tag">${esc(it.type)}</span>${it.recurring ? '<span class="tag" title="Recurring mistake">🔁</span>' : ""}`;
}
function counter(round) {
  const n = G.queue.filter((x, j) => j <= G.i && x.round === round).length;
  const t = G.queue.filter((x) => x.round === round).length;
  return `${G.mode === "replay" ? "Replay" : "Round " + round} · ${n}/${t}`;
}

// ---------- round 1: pick ----------
function showPick(it) {
  const right = it.alts[0] || it.better;
  const opts = Math.random() < 0.5 ? [[it.said, false], [right, true]] : [[right, true], [it.said, false]];
  const q = it.natural ? "Which sounds more natural?" : "Which one is right?";
  gStage(`<div class="gq">${counter(1)} · ${q} ${tags(it)}</div>
    <div class="gtimer" id="gT"></div>
    <div class="gchoices">${opts.map(([s], k) => `<button class="gchoice" data-k="${k}"><kbd>${k ? "→" : "←"}</kbd>${esc(s)}</button>`).join("")}</div>
    <div id="gOut"></div>`);
  const t0 = Date.now();
  requestAnimationFrame(() => requestAnimationFrame(() => $("gT").classList.add("go")));
  let done = false;
  const pick = (k) => {
    if (done) return;
    done = true;
    const ok = opts[k][1], fast = Date.now() - t0 <= 5000;
    document.querySelectorAll(".gchoice").forEach((b, j) => b.classList.add(opts[j][1] ? "right" : (j === k ? "wrong" : "x")));
    $("gT").style.visibility = "hidden";
    record(it, 1, ok ? "right" : "wrong", ok ? 10 + (fast ? 5 : 0) : 0);
    $("gOut").innerHTML = resultBox(ok ? `✔${fast ? " · fast +5" : ""}` : "✏️", it) + nextBtn();
    G.say = clean(right);   // no auto-play: only the 🔊 button (asked 2026-11-20)
    bindNext();
  };
  document.querySelectorAll(".gchoice").forEach((b) => (b.onclick = () => pick(Number(b.dataset.k))));
  G.key = (e) => {
    if (e.key === "ArrowLeft" || e.key === "1") pick(0);
    if (e.key === "ArrowRight" || e.key === "2") pick(1);
  };
}

// ---------- round 2: type the fix ----------
function showFix(it) {
  gStage(`<div class="gq">${counter(2)} · Fix it ${tags(it)}</div>
    <div class="gsaid">${esc(it.said)}</div>
    <input class="gans" id="gIn" placeholder="고친 문장 · Enter = check · empty Enter = show answer" autocomplete="off">
    <div id="gOut"></div>`);
  const input = $("gIn");
  input.focus();
  G.key = null;
  input.onkeydown = (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    input.onkeydown = null;
    input.disabled = true;
    check(it, input.value.trim());
  };
}

function check(it, ans) {
  let best = { alt: it.alts[0] || it.better, r: 0 };
  for (const alt of it.alts.length ? it.alts : [it.better]) {
    const r = ratio(norm(ans), norm(alt));
    if (r > best.r) best = { alt, r };
  }
  const same = norm(ans) === norm(it.said);   // typed the original mistake again
  const res = !ans || same ? "wrong" : best.r === 1 ? "right" : best.r >= 0.8 ? "close" : "wrong";
  const head = { right: "✔ 맞아요", close: "≈ Close", wrong: ans ? "✏️ Not quite" : "✏️ Answer" }[res];
  record(it, 2, res, res === "right" ? 10 : 0);
  const diff = ans && res !== "right" ? `<div class="gdiff">${diffHtml(ans, clean(best.alt))}</div>` : "";
  $("gOut").innerHTML = resultBox(head, it, diff, true) +
    `<div class="gbtns"><button class="primary" id="gNext">Next (Enter)</button>${ans && res !== "right" ? '<button id="gHad">I had it ✔</button>' : ""}</div>`;
  G.say = clean(best.alt);
  if ($("gHad")) $("gHad").onclick = () => {
    const last = G.results[G.results.length - 1];
    last.result = "self";
    G.score += 10; G.streak += 1; G.best = Math.max(G.best, G.streak);
    updateScore();
    $("gHad").remove();
  };
  bindNext();
}

// ---------- shared ----------
function resultBox(head, it, extra = "", allAlts = false) {
  const better = allAlts ? it.alts.join(" / ") || it.better : it.alts[0] || it.better;
  return `<div class="gres"><div class="big">${head}</div>${extra}
    <div class="better">${esc(better)} <button class="replay" title="Play again" onclick="play(G.say)">🔊</button></div>
    <div class="why">${esc(it.why)} <span class="dim">· ${esc(it.block)}</span></div></div>`;
}
function nextBtn() { return `<div class="gbtns"><button class="primary" id="gNext">Next (Enter)</button></div>`; }
function bindNext() {
  const go = () => { G.i += 1; next(); };
  $("gNext").onclick = go;
  setTimeout(() => { G.key = (e) => { if (e.key === "Enter") go(); }; }, 150);  // not the same Enter
}

function record(it, round, result, pts) {
  const ok = result === "right";
  if (G.mode === "replay") {
    G.replay.push({ id: it.id, round, said: it.said, better: it.better, type: it.type, result });
    return;
  }
  G.results.push({ id: it.id, round, said: it.said, better: it.better, type: it.type, why: it.why, recurring: it.recurring, result });
  G.score += pts;
  G.streak = ok ? G.streak + 1 : 0;
  G.best = Math.max(G.best, G.streak);
  updateScore();
}

function updateScore() {
  $("gScore").innerHTML = `${G.score} pts${G.streak >= 2 ? ` · <span class="streak">🔥 ${G.streak}</span>` : ""}`;
}

function endScreen() {
  $("gFill").style.width = "100%";
  G.key = null;
  const misses = G.results.filter((r) => r.result === "wrong" || r.result === "close");
  const n = (round, ok) => G.results.filter((r) => r.round === round && (!ok || r.result === "right" || r.result === "self")).length;
  save(misses);
  const replayDone = G.mode === "replay";
  const rp = replayDone ? `<p>Replay: ${G.replay.filter((r) => r.result === "right").length}/${G.replay.length} right</p>` : "";
  gStage(`<div class="gres"><div class="big">🎉 ${G.score} pts · best streak ${G.best}</div>
      <p>Round 1: ${n(1, true)}/${n(1)} · Round 2: ${n(2, true)}/${n(2)}</p>${rp}</div>
    ${misses.length ? `<div class="gq">Still to fix (${misses.length}): these come back in the next grammar session</div>
      <div>${misses.map((m) => `<div class="gmiss">${m.recurring ? "🔁 " : ""}<span class="said">${esc(m.said)}</span> → <span class="better">${esc(m.better)}</span><div class="why">${esc(m.why)}</div></div>`).join("")}</div>`
      : `<div class="gq">No misses. 완벽해요!</div>`}
    <div class="gbtns">${misses.length && !replayDone ? `<button class="primary" id="gReplay">Replay misses (${misses.length})</button>` : ""}
      <button id="gDone" ${misses.length && !replayDone ? "" : 'class="primary"'}>${G.then ? "Start session →" : "Done"}</button></div>`);
  if ($("gReplay")) $("gReplay").onclick = () => {
    G.mode = "replay"; G.replay = [];
    const ids = new Set(misses.map((m) => m.id));
    const q = buildQueue().filter((x) => ids.has(x.it.id)).sort(() => Math.random() - 0.5);
    runQueue(q);
  };
  $("gDone").onclick = quitGame;
  G.key = (e) => { if (e.key === "Enter") ($("gReplay") || $("gDone")).click(); };
}

function save(misses) {
  fetch("/api/review/result", { method: "POST", body: JSON.stringify({
    date: G.date, score: G.score, best_streak: G.best, results: G.results,
    misses: misses.map((m) => ({ said: m.said, better: m.better, type: m.type })),
    replay: G.replay }) });
}

function quitGame() { const then = G && G.then; G = null; $("game").hidden = true; then ? then() : showStart(); }

function gStage(html) { $("gStage").innerHTML = html; }

// "3D 모델링 [쓰리디]" → "3D 모델링": drop notes in brackets for audio and checking.
function clean(s) { return s.replace(/\(.*?\)|\[.*?\]/g, "").replace(/\s+/g, " ").trim(); }
function norm(s) { return clean(s).replace(/[\s.,?!~…·"'“”‘’]/g, ""); }

function ratio(a, b) {
  if (!a && !b) return 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

// Character diff: <del> = only in your answer, <ins> = missing from it.
function diffHtml(a, b) {
  const m = a.length, n = b.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, out = "";
  while (i < m && j < n) {
    if (a[i] === b[j]) { out += esc(a[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out += `<del>${esc(a[i++])}</del>`;
    else out += `<ins>${esc(b[j++])}</ins>`;
  }
  while (i < m) out += `<del>${esc(a[i++])}</del>`;
  while (j < n) out += `<ins>${esc(b[j++])}</ins>`;
  return `you: ${out}`;
}

$("gQuit").onclick = quitGame;
document.addEventListener("keydown", (e) => {
  if (!G || $("game").hidden || !G.key || e.isComposing) return;
  if (document.activeElement && document.activeElement.id === "gIn") return;
  G.key(e);
});
