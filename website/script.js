// ===== 데이터 =====
// data/study.js (STUDY) 는 website/build_data.py 가 만든다. data/today.js (TODAY) 는 날씨·기분·표현.
const S = typeof STUDY !== "undefined" ? STUDY : {};
const T = typeof TODAY !== "undefined" ? TODAY : {};
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ===== 시계 =====
function tick() {
  const d = new Date();
  $("clock").textContent =
    `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
tick();
setInterval(tick, 15000);

// ===== 제목 글리치: 처음 한 번 + 마우스를 올릴 때 =====
const title = document.querySelector("h1.glitch");
function glitch() {
  title.classList.add("active");
  setTimeout(() => title.classList.remove("active"), 180);
}
if (!reduceMotion) setTimeout(glitch, 600);
title.addEventListener("mouseenter", glitch);

// ===== 고정한 단어 (단어 카드 + 흐르는 글자) =====
const pinnedWords = (S.anki && S.anki.pinned) || { date: "", words: [] };
const pinnedToday = pinnedWords.date === ymd(new Date()) && pinnedWords.words.length > 0;

// ===== 다음 수업 =====
const nextLesson = S.week && S.week.next_lesson ? new Date(S.week.next_lesson) : null;
function lessonCountdown() {
  if (!nextLesson) return null;
  const now = new Date();
  const days = Math.round((new Date(ymd(nextLesson)) - new Date(ymd(now))) / 86400000);
  const hours = Math.max(0, Math.round((nextLesson - now) / 3600000));
  if (now > nextLesson) return { label: "수업 끝!", when: "수업 노트를 쓰고 다음 주 계획을 만들어요" };
  if (days === 0) return { label: "D-DAY", when: `오늘 21:00 · ${hours}시간 남았어요` };
  return { label: `D-${days}`, when: `${nextLesson.getMonth() + 1}월 ${nextLesson.getDate()}일 (수) 21:00` };
}

// ===== 흐르는 글자 =====
function renderTicker() {
  const inner = $("ticker-inner");
  const cd = lessonCountdown();
  let html = "";
  if (pinnedToday) {
    html += "★ 오늘의 단어 ★ " + pinnedWords.words
      .map((w) => `<a href="#/cards" title="${esc(w.meaning)}">${esc(w.word)}</a>`)
      .join(" · ");
  } else {
    html += "★ 오늘은 고정한 단어가 없어요 ★ 단어 카드에서 지난 단어를 볼 수 있어요";
  }
  if (cd) html += ` ★ 다음 수업 ${cd.label}`;
  if (S.week && S.week.new && S.week.new.length) {
    html += " ★ 이번 주 문법: " + S.week.new.filter((g) => g.n).map((g) => `#${g.n} ${esc(g.form)}`).join(", ");
  }
  inner.innerHTML = html + " ★";
  // 길이에 맞춰 천천히 (글자 수 × 0.28초, 최소 40초)
  inner.style.animationDuration = `${Math.max(40, inner.textContent.length * 0.28)}s`;
  if (reduceMotion) $("ticker").classList.add("static");
}
renderTicker();

// ===== 왼쪽: 프로필 (기분 · 날씨 · 표현은 홈의 오늘 패널, blog.js) =====
$("lesson-count").textContent = S.lessons ?? "-";
$("generated").textContent = S.generated || "-";
if (S.listening && S.listening.url) {
  const b = $("banner-clip");
  b.href = S.listening.url;
  b.target = "_blank";
  b.rel = "noopener";
  b.title = S.listening.title || "";
}

// ===== 오른쪽: 수업 · 진도 · Anki =====
// ASCII 막대: ███░░░
function bar(done, total, width = 10) {
  if (!total) return "░".repeat(width);
  const n = Math.round((done / total) * width);
  return "█".repeat(n) + "░".repeat(width - n);
}

const cd = lessonCountdown();
if (cd) {
  $("dday").textContent = cd.label;
  $("dday-when").textContent = cd.when;
}
if (S.week) {
  const b = S.week.blocks;
  $("week-bar").textContent = `${bar(b.done, b.planned)} ${b.done}/${b.planned}`;
  const nw = S.week.new.filter((g) => g.n);
  $("week-new").innerHTML = S.week.light
    ? "가벼운 주: 새 문법 없음"
    : "새 문법: " + nw.map((g) => `<a href="#/grammar/${g.n}">#${g.n} ${esc(g.form)}</a>`).join(", ");
}
if (S.grammar) {
  const due = S.grammar.filter((p) => p.due).length;
  $("week-due").textContent = `오늘 복습할 문법 ${due}개`;
}
if (S.anki && !S.anki.error) {
  $("anki-streak").textContent = String(S.anki.streak).padStart(3, "0");
  $("anki-today").textContent = `오늘 ${S.anki.reviewed_today}장 복습 · 카드 ${S.anki.notes}개`;
} else {
  $("anki-today").textContent = "Anki 정보를 불러오지 못했어요";
}

// ===== 순위 목록 (자꾸 까먹는 단어 · 자주 틀리는 문법) =====
// 많이 틀린 순서로 pageSize개씩. detail은 마우스를 올리거나 눌러야 보인다.
function renderRankList({ id, navId, items, pageSize, label, detail, count }) {
  const list = $(id);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  let page = 0;
  let prev, next, pageLabel;

  function render() {
    list.innerHTML = "";
    list.style.counterReset = `rank ${page * pageSize}`;
    items.slice(page * pageSize, (page + 1) * pageSize).forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="word">${label(item)}</span><span class="misses">✕${count(item)}</span>` +
        `<span class="meaning">${detail(item)}</span>`;
      list.appendChild(li);
    });
    if (prev) {
      prev.classList.toggle("off", page <= 0);
      next.classList.toggle("off", page >= pages - 1);
      pageLabel.textContent = `${page + 1} / ${pages}`;
    }
  }

  if (navId && pages > 1) {
    const nav = $(navId);
    nav.innerHTML = '<a href="#">« 이전</a> | <span></span> | <a href="#">다음 »</a>';
    [prev, next] = nav.querySelectorAll("a");
    pageLabel = nav.querySelector("span");
    prev.addEventListener("click", (e) => { e.preventDefault(); if (page > 0) { page--; render(); } });
    next.addEventListener("click", (e) => { e.preventDefault(); if (page < pages - 1) { page++; render(); } });
  }
  render();
}

if (S.anki && S.anki.forgotten) {
  renderRankList({
    id: "forgot-list", navId: "forgot-nav", pageSize: 10,
    items: S.anki.forgotten,
    label: (w) => esc(w.word), detail: (w) => esc(w.meaning), count: (w) => w.misses,
  });
}

const typeName = { 시제: "시제", 조사: "조사", 어휘: "어휘", 어순: "어순", 문법: "문법" };
if (S.mistakes) {
  const order = { recurring: 0, lesson: 1, practice: 2 };
  const items = S.mistakes.items.filter((i) => i.clean)
    .sort((a, b) => b.times - a.times || order[a.section] - order[b.section]);
  renderRankList({
    id: "grammar-list", navId: "grammar-nav", pageSize: 5, items,
    label: (g) => `<span class="type" data-type="${esc(g.type)}">[${esc(g.type)}]</span> ${esc(g.right)}`,
    detail: (g) => `<span class="wrong">✕ ${esc(g.wrong)}</span><br>○ ${esc(g.right)}`,
    count: (g) => g.times,
  });

  // 실수 종류: 지금 열린 실수 수 + 지난주와 비교
  const hist = S.history || [];
  const prevWeek = hist.length > 1 ? hist[hist.length - 2].mistakes : null;
  const byType = S.mistakes.by_type;
  const max = Math.max(1, ...Object.values(byType));
  $("type-list").innerHTML = Object.keys(typeName).map((t) => {
    const n = byType[t] || 0;
    let trend = "";
    if (prevWeek) {
      const d = n - (prevWeek[t] || 0);
      trend = d < 0 ? `<span class="down">▼${-d}</span>` : d > 0 ? `<span class="up">▲${d}</span>` : "<span>－</span>";
    }
    return `<li data-type="${t}"><span class="tname">${t}</span><span class="tbar">${"▮".repeat(Math.round((n / max) * 8)) || "·"}</span>` +
           `<span class="tnum">${n}</span>${trend}</li>`;
  }).join("");
  const english = S.mistakes.names || {};
  $("type-note").textContent = prevWeek ? "▼ 줄었어요 ▲ 늘었어요 (지난주 대비)"
    : Object.entries(english).map(([k, v]) => `${k} ${v}`).join(" · ");
}

// ===== 눌러서 보기 (휴대폰) =====
// .meaning 은 흐리게 보이다가 마우스를 올리면 보인다. 휴대폰에서는 누르면 보인다.
document.addEventListener("click", (e) => {
  const el = e.target.closest(".hint, .rank-list li");
  if (el) el.classList.toggle("open");
});

// ===== 회색 모드 스위치 =====
(function () {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  const label = () => { btn.textContent = root.getAttribute("data-theme") === "grey" ? "◑ 어두운 모드" : "◐ 회색 모드"; };
  label();
  btn.addEventListener("click", () => {
    const grey = root.getAttribute("data-theme") !== "grey";
    if (grey) root.setAttribute("data-theme", "grey"); else root.removeAttribute("data-theme");
    try { localStorage.setItem("theme", grey ? "grey" : "dark"); } catch (e) {}
    label();
  });
})();
