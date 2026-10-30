// ===== 블로그 설정 =====
const CATEGORIES = {
  daily: { name: "일상" },
  talk: { name: "대화" },
  mistakes: { name: "실수" },
  homework: { name: "숙제" },
};
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
    .map((t) => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">#${t}</a>`)
    .join(" ");
}

function postMeta(p) {
  const cat = CATEGORIES[p.category];
  const catLink = cat ? `<a href="#/category/${p.category}">${cat.name}</a>` : "";
  return `<p class="meta">[${normDate(p.date)}] ${catLink} ${tagLinks(p)}</p>`;
}

function postItem(p) {
  const cover = p.cover
    ? `<a href="#/post/${p.id}"><img class="cover" src="${p.cover}" alt="" loading="lazy"></a>`
    : "";
  return `
    <article class="post">
      ${cover}
      ${postMeta(p)}
      <h3><a href="#/post/${p.id}">${p.title}</a> ${mediaBadges(p)}</h3>
      <p>${excerpt(p)}</p>
      <a class="more" href="#/post/${p.id}">→ 계속 읽기</a>
    </article>`;
}

function listBox(title, posts, footer = "") {
  const body = posts.length
    ? posts.map(postItem).join("")
    : '<p class="small">아직 글이 없습니다.</p>';
  return `
    <section class="box">
      <div class="box-title">${title}</div>
      <div class="box-body">${body}${footer}</div>
    </section>`;
}

function template(id) {
  return document.getElementById(id).innerHTML;
}

// ===== 화면 =====
function viewHome() {
  const posts = visiblePosts();
  let html = template("page-phrase");
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const inCat = posts.filter((p) => p.category === key);
    const more = inCat.length > HOME_POSTS_PER_CATEGORY
      ? `<p class="all"><a href="#/category/${key}">→ 전체 보기 (${inCat.length})</a></p>`
      : "";
    html += listBox(`▣ ${cat.name}`, inCat.slice(0, HOME_POSTS_PER_CATEGORY), more);
  }
  return { title: "", html };
}

function viewCategory(key) {
  const cat = CATEGORIES[key];
  if (!cat) return viewNotFound();
  const posts = visiblePosts().filter((p) => p.category === key);
  return {
    title: cat.name,
    html: listBox(`▣ ${cat.name} (${posts.length})`, posts),
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
      <article class="box post-full">
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
      <div class="box">
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
      <div class="box">
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

function viewNotFound() {
  return {
    title: "404",
    html: `
      <div class="box">
        <div class="box-title">!! 404 !!</div>
        <div class="box-body">
          <p>이 페이지는 와이어드 어디에도 없습니다.</p>
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
  };
  const page = (views[view] || viewNotFound)();

  content.innerHTML = page.html;
  if (page.after) page.after();
  document.title = page.title ? `${page.title} ::: ${SITE_TITLE}` : `::: ${SITE_TITLE} :::`;

  // 메뉴 강조: 글 화면에서는 그 글의 카테고리를 강조한다
  let current = view ? `#/${view}${arg ? "/" + arg : ""}` : "#/";
  if (view === "post") {
    const p = allPosts.find((x) => x.id === param);
    if (p) current = `#/category/${p.category}`;
  }
  document.querySelectorAll("#menu a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === current);
  });

  // 휴대폰에서는 본문이 왼쪽 메뉴 아래에 있어서, 카드는 바로 보이도록 본문까지 내려간다
  if (view === "cards") content.scrollIntoView();
  else window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
loadPosts().then(route);
