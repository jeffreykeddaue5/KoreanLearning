// ===== 블로그 설정 =====
const CATEGORIES = {
  daily: { name: "일상", color: "yellow" },
  lesson: { name: "수업", color: "blue" },
  weekly: { name: "주간 정리", color: "green" },
};
// 카테고리 색 (style.css의 .ac-*)
const acOf = (key) => (CATEGORIES[key] ? `ac-${CATEGORIES[key].color}` : "");
const HOME_POSTS_PER_CATEGORY = 3;
const SITE_TITLE = "일지";

const content = document.getElementById("content");
const allPosts = [];

// 글 파일(posts/*.js)에서 호출한다. 글의 id는 파일 이름이 된다.
function post(data) {
  const file = document.currentScript.src.split("/").pop();
  const id = decodeURIComponent(file.replace(/\.js$/, ""));
  allPosts.push({ id, tags: [], content: [], ...data });
}

// list.js에 있는 글 파일을 순서대로 불러온다. 없는 파일은 건너뛴다.
function loadPosts() {
  return Promise.all(POST_FILES.map((name) => new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = `posts/${name}.js`;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => {
      console.warn(`글 파일을 찾을 수 없음: posts/${name}.js`);
      resolve();
    };
    document.head.appendChild(s);
  })));
}

// 초안이 아닌 글만, 최신 글부터
function visiblePosts() {
  return allPosts
    .filter((p) => !p.draft)
    .sort((a, b) => normDate(b.date).localeCompare(normDate(a.date)));
}

function normDate(d) {
  return String(d || "").replace(/[-/]/g, ".");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ===== 본문 블록 =====
function figure(inner, caption) {
  return `<figure>${inner}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
}

function renderBlock(b) {
  if (typeof b === "string") return `<p>${b}</p>`;
  if (b.heading) return `<h4>${b.heading}</h4>`;
  if (b.quote) return `<blockquote>${b.quote}</blockquote>`;
  if (b.image) {
    return figure(
      `<a href="${b.image}" target="_blank"><img src="${b.image}" alt="${escapeHtml(b.caption || "")}" loading="lazy"></a>`,
      b.caption);
  }
  if (b.video) {
    // gif: true 이면 GIF처럼 소리 없이 자동 반복 재생
    const attrs = b.gif ? "autoplay loop muted playsinline" : "controls";
    return figure(`<video src="${b.video}" ${attrs}></video>`, b.caption);
  }
  if (b.audio) return figure(`<audio src="${b.audio}" controls preload="none"></audio>`, b.caption);
  if (b.youtube) {
    return figure(
      `<div class="yt"><iframe src="https://www.youtube.com/embed/${b.youtube}" allowfullscreen></iframe></div>`,
      b.caption);
  }
  if (b.gallery) {
    const imgs = b.gallery
      .map((src) => `<a href="${src}" target="_blank"><img src="${src}" loading="lazy"></a>`)
      .join("");
    return figure(`<div class="gallery">${imgs}</div>`, b.caption);
  }
  if (b.html) return b.html;
  return "";
}

// ===== 목록용 조각 =====
function excerpt(p) {
  if (p.summary) return p.summary;
  const first = p.content.find((b) => typeof b === "string") || "";
  const text = first.replace(/<[^>]+>/g, "");
  return text.length > 110 ? text.slice(0, 110) + "..." : text;
}

function mediaBadges(p) {
  const has = (key) => p.content.some((b) => typeof b === "object" && b[key]);
  let out = "";
  if (has("image") || has("gallery")) out += '<span class="badge">사진</span>';
  if (has("video") || has("youtube")) out += '<span class="badge">영상</span>';
  if (has("audio")) out += '<span class="badge">음성</span>';
  return out;
}

function tagLinks(p) {
  return p.tags
    .map((t) => `<a class="tag${/^[-~#0-9]/.test(t) ? " grammar" : ""}" href="#/tag/${encodeURIComponent(t)}">#${t}</a>`)
    .join(" ");
}

function postMeta(p) {
  const cat = CATEGORIES[p.category];
  const catLink = cat ? `<a class="cat" href="#/category/${p.category}">${cat.name}</a>` : "";
  return `<p class="meta">[${normDate(p.date)}] ${catLink} ${tagLinks(p)}</p>`;
}

function postItem(p) {
  const cover = p.cover
    ? `<a href="#/post/${p.id}"><img class="cover" src="${p.cover}" alt="" loading="lazy"></a>`
    : "";
  return `
    <article class="post ${acOf(p.category)}">
      ${cover}
      ${postMeta(p)}
      <h3><a href="#/post/${p.id}">${p.title}</a> ${mediaBadges(p)}</h3>
      <p>${excerpt(p)}</p>
      <a class="more" href="#/post/${p.id}">→ 계속 읽기</a>
    </article>`;
}

function listBox(title, posts, footer = "", cls = "") {
  const body = posts.length
    ? posts.map(postItem).join("")
    : '<p class="small">아직 글이 없습니다.</p>';
  return `
    <section class="box ${cls}">
      <div class="box-title">${title}</div>
      <div class="box-body">${body}${footer}</div>
    </section>`;
}

function template(id) {
  return document.getElementById(id).innerHTML;
}

// ===== 화면 =====
// 써먹을 표현 (data/today.js)
function phraseBox() {
  const p = (typeof TODAY !== "undefined" && TODAY.phrase) || null;
  if (!p) return "";
  return `
    <div class="box notice ac-yellow">
      <div class="box-title">▼ 써먹을 표현</div>
      <div class="box-body">
        <p class="phrase">「${p.text}」</p>
        <p>${p.when}</p>
        <p class="small">${p.fix}<br>${p.tip}</p>
      </div>
    </div>`;
}

// 홈 맨 위: 이번 주 요약
function weekSummary() {
  const w = S.week;
  if (!w) return "";
  const cd = lessonCountdown();
  const nw = w.new.filter((g) => g.n);
  return `
    <div class="box ac-blue">
      <div class="box-title">▼ 이번 주 <a class="title-link" href="#/week">전체 보기 »</a></div>
      <div class="box-body week-mini">
        <p><b>${cd ? cd.label : ""}</b> 다음 수업 · <span class="bar">${bar(w.blocks.done, w.blocks.planned)}</span> ${w.blocks.done}/${w.blocks.planned}</p>
        <p>${w.light ? "가벼운 주: 새 문법 없이 복습해요" :
          "새 문법: " + nw.map((g) => `<a href="#/grammar/${g.n}">#${g.n} ${esc(g.form)}</a> <span class="small">${esc(g.meaning)}</span>`).join(" · ")}</p>
      </div>
    </div>`;
}

function viewHome() {
  const posts = visiblePosts();
  let html = phraseBox() + weekSummary();
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const inCat = posts.filter((p) => p.category === key);
    const more = inCat.length > HOME_POSTS_PER_CATEGORY
      ? `<p class="all"><a href="#/category/${key}">→ 전체 보기 (${inCat.length})</a></p>`
      : "";
    html += listBox(`▣ ${cat.name}`, inCat.slice(0, HOME_POSTS_PER_CATEGORY), more, acOf(key));
  }
  return { title: "", html };
}

function viewCategory(key) {
  const cat = CATEGORIES[key];
  if (!cat) return viewNotFound();
  const posts = visiblePosts().filter((p) => p.category === key);
  return {
    title: cat.name,
    html: listBox(`▣ ${cat.name} (${posts.length})`, posts, "", acOf(key)),
  };
}

function viewTag(tag) {
  const posts = visiblePosts().filter((p) => p.tags.includes(tag));
  return { title: `#${tag}`, html: listBox(`▣ 태그: #${escapeHtml(tag)} (${posts.length})`, posts) };
}

function viewPost(id) {
  const posts = visiblePosts();
  const i = posts.findIndex((p) => p.id === id);
  if (i === -1) return viewNotFound();
  const p = posts[i];
  const newer = posts[i - 1];
  const older = posts[i + 1];
  const cat = CATEGORIES[p.category];
  return {
    title: p.title,
    html: `
      <article class="box post-full ${acOf(p.category)}">
        <div class="box-title">▣ ${cat ? cat.name : "글"}</div>
        <div class="box-body">
          ${postMeta(p)}
          <h2>${p.title}</h2>
          <div class="post-content">${p.content.map(renderBlock).join("\n")}</div>
          <div class="post-nav">
            <span>${older ? `<a href="#/post/${older.id}">« ${older.title}</a>` : ""}</span>
            <span>${newer ? `<a href="#/post/${newer.id}">${newer.title} »</a>` : ""}</span>
          </div>
          <p class="back"><a href="${cat ? `#/category/${p.category}` : "#/"}">↑ 목록으로</a></p>
        </div>
      </article>`,
  };
}

function viewGuestbook() {
  // 로컬용: 이 브라우저에만 저장된다
  const entries = JSON.parse(localStorage.getItem("guestbook") || "[]");
  const list = entries.length
    ? entries.map((e) => `
        <div class="gb-entry">
          <p class="meta"><b>${escapeHtml(e.name)}</b> · ${e.date}</p>
          <p>${escapeHtml(e.msg).replace(/\n/g, "<br>")}</p>
        </div>`).join("")
    : '<p class="small">아직 아무도 글을 남기지 않았어요. 첫 번째가 되어 주세요!</p>';
  return {
    title: "방명록",
    html: `
      <div class="box ac-red">
        <div class="box-title">▣ 방명록</div>
        <div class="box-body">
          <form id="gb-form" class="gb-form">
            <input name="name" placeholder="이름" maxlength="20" required>
            <textarea name="msg" placeholder="한마디 남겨 주세요..." rows="3" maxlength="500" required></textarea>
            <button type="submit">글 남기기</button>
          </form>
          ${list}
        </div>
      </div>`,
    after() {
      document.getElementById("gb-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        entries.unshift({
          name: f.name.value.trim(),
          msg: f.msg.value.trim(),
          date: new Date().toLocaleString("ko-KR"),
        });
        localStorage.setItem("guestbook", JSON.stringify(entries));
        route();
      });
    },
  };
}

// 단어 카드: 누르면 뒤집힌다. "알아요"는 빼고, "다시"는 맨 뒤로 보낸다.
function viewCards() {
  const title = pinnedToday ? "오늘의 단어" : `${normDate(pinnedWords.date)} 단어`;
  return {
    title,
    html: `
      <div class="box ac-green">
        <div class="box-title">▣ ${title}</div>
        <div class="box-body">
          <p id="card-count" class="small"></p>
          <button id="card" class="card" type="button"></button>
          <div id="card-grade" class="card-grade">
            <button id="card-again" type="button">✕ 다시</button>
            <button id="card-know" type="button">○ 알아요</button>
          </div>
        </div>
      </div>`,
    after() {
      const card = document.getElementById("card");
      const count = document.getElementById("card-count");
      const grade = document.getElementById("card-grade");
      const total = pinnedWords.words.length;
      let queue, flipped;

      function show() {
        flipped = false;
        grade.classList.remove("on");
        count.textContent = `남은 카드 ${queue.length} / ${total}`;
        card.innerHTML = queue.length
          ? `<b>${escapeHtml(queue[0].word)}</b>`
          : "<b>끝!</b><small>누르면 처음부터 다시 해요</small>";
      }

      function restart() {
        queue = pinnedWords.words.slice().sort(() => Math.random() - 0.5);
        show();
      }

      card.addEventListener("click", () => {
        if (!queue.length) return restart();
        flipped = !flipped;
        grade.classList.toggle("on", flipped);
        const w = queue[0];
        card.innerHTML = `<b>${escapeHtml(w.word)}</b>` + (flipped
          ? `<span class="card-meaning">${escapeHtml(w.meaning)}</span>` +
            `<span>${escapeHtml(w.example)}</span><small>${escapeHtml(w.translation)}</small>`
          : "");
      });
      document.getElementById("card-again").addEventListener("click", () => {
        queue.push(queue.shift());
        show();
      });
      document.getElementById("card-know").addEventListener("click", () => {
        queue.shift();
        show();
      });
      restart();
    },
  };
}

// ===== 이번 주 =====
const BLOCK_ICON = { done: "☑", todo: "☐", skip: "–", note: "·" };
const DAY_KO = { Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토", Sun: "일" };

function viewWeek() {
  const w = S.week;
  if (!w) return { title: "이번 주", html: listBox("▣ 이번 주", [], "", "ac-blue") };
  const cd = lessonCountdown();
  const today = ymd(new Date());
  const rows = w.schedule.map((r) => `
      <tr class="${r.date === today ? "today" : ""}${r.optional ? " optional" : ""}">
        <th>${DAY_KO[r.day] || r.day}<br><span class="small">${r.date.slice(5).replace("-", ".")}</span></th>
        <td>${r.blocks.map((b) => `<span class="blk ${b.state}">${BLOCK_ICON[b.state]} ${esc(b.text)}</span>`).join("")}</td>
      </tr>`).join("");
  const nw = w.new.filter((g) => g.n);
  const listen = S.listening;
  const box = (t, body) => `<div class="box ac-blue"><div class="box-title">${t}</div><div class="box-body page">${body}</div></div>`;
  let html = box(`▣ 이번 주 · ${normDate(w.start)} 수업 (${w.lesson}회) 다음 주`, `
      <p class="week-head"><span class="dday">${cd ? cd.label : ""}</span> ${cd ? cd.when : ""}</p>
      <p>진도 <span class="bar">${bar(w.blocks.done, w.blocks.planned, 20)}</span> ${w.blocks.done}/${w.blocks.planned}</p>
      <h4>새 문법</h4>
      ${w.light ? "<p>가벼운 주: 새 문법 없이 지난 3주 문법을 복습해요.</p>" :
        `<ul>${nw.map((g) => `<li><a href="#/grammar/${g.n}">#${g.n} ${esc(g.form)}</a> — ${esc(g.meaning)}</li>`).join("")}</ul>`}
      <h4>계획</h4>
      <table class="sched">${rows}</table>`);
  html += box("▣ 복습", `<p>${w.review}</p>`);
  if (listen) {
    html += box("▣ 이번 주 듣기", `
      <p><a href="${esc(listen.url)}" target="_blank" rel="noopener">${esc(listen.title)}</a> <span class="small">${esc(listen.channel)} · ${esc(listen.section || "")}</span></p>
      <p class="small">${esc(listen.progress || "")}${listen.result ? " · " + esc(listen.result) : ""}</p>`);
  }
  if (w.words.length) html += box(`▣ 수업 단어 (${w.lesson}회)`, `<ul>${w.words.map((x) => `<li>${x}</li>`).join("")}</ul>`);
  if (w.questions.length) html += box("▣ 선생님께 물어볼 것", `<ol>${w.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>`);
  if (w.report) html += box("▣ 주간 리포트", `<p>${w.report.replace(/\n/g, "<br>")}</p>`);
  return { title: "이번 주", html };
}

// ===== 문법 =====
function levelBar(l) {
  return `<span class="lv lv${l}">${"▮".repeat(l)}${"▯".repeat(5 - l)}</span>`;
}

function viewGrammar(focus) {
  const pts = S.grammar || [];
  const today = ymd(new Date());
  const counts = [0, 1, 2, 3, 4, 5].map((l) => pts.filter((p) => p.level === l).length);
  const max = Math.max(1, ...counts);
  const names = ["새로/틀림", "힌트 있으면", "힌트 없이", "주간 테스트 통과", "또 통과", "완벽"];
  const chart = counts.map((n, l) => `
      <tr><th>${levelBar(l)}</th><td><span class="bar">${"█".repeat(Math.round((n / max) * 20)) || "·"}</span> ${n}</td>
      <td class="small">${names[l]}</td></tr>`).join("");
  const newOnes = new Set(((S.week && S.week.new) || []).map((g) => g.n));
  const rows = pts.map((p) => {
    const days = Math.round((new Date(p.next) - new Date(today)) / 86400000);
    const next = p.due ? '<span class="due">오늘</span>' : `D-${days}`;
    return `
      <tr id="g-${p.n}" class="${String(p.n) === focus ? "focus" : ""}">
        <td>${p.n}</td>
        <td>${esc(p.point)} ${newOnes.has(p.n) ? '<span class="badge">이번 주</span>' : ""}</td>
        <td>${levelBar(p.level)}</td>
        <td>${next}</td>
      </tr>`;
  }).join("");
  const solid = pts.filter((p) => p.level >= 3).length;
  return {
    title: "문법",
    html: `
      <div class="box ac-blue">
        <div class="box-title">▣ 문법 ${pts.length}개 · 레벨 3 이상 ${solid}개</div>
        <div class="box-body page">
          <table class="levels">${chart}</table>
          <p class="small">레벨은 복습할 때마다 올라가고 (틀리면 내려가요) 다음 복습 날짜가 정해져요: 1 · 3 · 7 · 14 · 30 · 60일.</p>
        </div>
      </div>
      <div class="box ac-blue">
        <div class="box-title">▣ 전체 목록</div>
        <div class="box-body">
          <table class="gtable"><tr><th>#</th><th>문법</th><th>레벨</th><th>복습</th></tr>${rows}</table>
        </div>
      </div>`,
  };
}

function viewNotFound() {
  return {
    title: "404",
    html: `
      <div class="box ac-red">
        <div class="box-title">!! 404 !!</div>
        <div class="box-body">
          <p>페이지를 찾을 수 없어요.</p>
          <p><a href="#/">→ 홈으로 돌아가기</a></p>
        </div>
      </div>`,
  };
}

// ===== 라우터 =====
// 주소 예: #/  #/category/daily  #/post/2026-10-20-rain-wires  #/tag/코딩
function route() {
  const [, view = "", arg = ""] = location.hash.split("/");
  const param = decodeURIComponent(arg);

  const views = {
    "": viewHome,
    category: () => viewCategory(param),
    tag: () => viewTag(param),
    post: () => viewPost(param),
    about: () => ({ title: "자기소개", html: template("page-about") }),
    links: () => ({ title: "링크", html: template("page-links") }),
    guestbook: viewGuestbook,
    cards: viewCards,
    week: viewWeek,
    grammar: () => viewGrammar(param),
  };
  const page = (views[view] || viewNotFound)();

  content.innerHTML = page.html;
  if (page.after) page.after();
  document.title = page.title ? `${page.title} :: ${SITE_TITLE}` : `${SITE_TITLE} :: 한국어 공부 일지`;

  // 메뉴 강조: 글 화면에서는 그 글의 카테고리를 강조한다
  let current = view ? `#/${view}${arg ? "/" + arg : ""}` : "#/";
  if (view === "grammar") current = "#/grammar";
  if (view === "post") {
    const p = allPosts.find((x) => x.id === param);
    if (p) current = `#/category/${p.category}`;
  }
  document.querySelectorAll("#menu a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === current);
  });

  // 휴대폰에서는 본문이 왼쪽 메뉴 아래에 있어서, 카드는 바로 보이도록 본문까지 내려간다
  if (view === "cards") content.scrollIntoView();
  else if (view === "grammar" && param) {
    const row = document.getElementById(`g-${param}`);
    if (row) row.scrollIntoView({ block: "center" });
  } else window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
loadPosts().then(route);
