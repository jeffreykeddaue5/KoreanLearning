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

// ===== 화면 =====
// ===== 오늘 패널: 써먹을 표현 + 오늘의 문법 · 기분 · 날씨 (data/today.js) =====
// 접혀 있을 때는 제목 한 줄만 보이고, 누르면 펼쳐진다. 한국어 줄은 누르면 영어가 보인다.

// 오늘 항목. 없으면 오늘 전의 마지막 항목 (목록이 밀려도 빈칸이 안 되게).
function todayEntry() {
  const days = (typeof TODAY !== "undefined" && TODAY.days) || {};
  const today = ymd(new Date());
  if (days[today]) return { ...days[today], date: today, stale: false };
  const before = Object.keys(days).filter((d) => d < today).sort().pop();
  return before ? { ...days[before], date: before, stale: true } : null;
}

// 한국어 한 줄 + 흐린 영어
function ko(text, en, cls = "") {
  if (!text) return "";
  return `<p class="hint ${cls}">${esc(text)}${en ? `<span class="meaning">${esc(en)}</span>` : ""}</p>`;
}

// 날씨: Open-Meteo (키 필요 없음). 한 번만 가져온다.
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=38.85&longitude=-77.30" +
  "&current=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
  "&timezone=America%2FNew_York&forecast_days=1";
let weatherPromise = null;
function loadWeather() {
  if (!weatherPromise) {
    weatherPromise = fetch(WEATHER_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => ({
        now: Math.round(j.current.temperature_2m),
        max: Math.round(j.daily.temperature_2m_max[0]),
        min: Math.round(j.daily.temperature_2m_min[0]),
        rain: j.daily.precipitation_probability_max[0] ?? 0,
        code: j.daily.weather_code[0],
      }))
      .catch(() => null);
  }
  return weatherPromise;
}

const WEATHER_KIND = {
  sun: { icon: "☼", art: "\\  |  /\n— ☼ —" },
  cloud: { icon: "☁", art: "  .--.\n(    )." },
  rain: { icon: "☂", art: "' , ' , '\n , ' , ' ," },
  snow: { icon: "❄", art: "* . * . *\n . * . * ." },
  fog: { icon: "≋", art: "≋≋≋≋≋≋≋\n ≋≋≋≋≋≋" },
  storm: { icon: "ϟ", art: "  .--.\n(  ϟ  )." },
};
function weatherKind(w) {
  const c = w.code;
  if (c >= 95) return "storm";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
  if (c === 45 || c === 48) return "fog";
  return c <= 1 ? "sun" : "cloud";
}
function weatherTip(w, kind) {
  const base = [`낮엔 ${w.max}°, 밤엔 ${w.min}°예요.`, `High ${w.max}°, low ${w.min}°.`];
  if (w.rain >= 50 && kind !== "snow") return [`${base[0]} 비가 올 수 있으니 우산을 챙기세요.`, `${base[1]} It may rain, so take an umbrella.`];
  if (kind === "snow") return [`${base[0]} 길이 미끄러우니까 조심하세요.`, `${base[1]} The roads are slippery, so be careful.`];
  if (w.min <= 3) return [`${base[0]} 따뜻하게 입으세요.`, `${base[1]} Dress warmly.`];
  if (w.max - w.min >= 10) return [`${base[0]} 일교차가 크니까 겉옷을 챙기세요.`, `${base[1]} Big gap between day and night, so bring a jacket.`];
  if (kind === "sun") return [`${base[0]} 햇볕이 좋아요.`, `${base[1]} Lovely sunshine.`];
  return [`${base[0]} 좋은 하루 보내세요.`, `${base[1]} Have a good day.`];
}
// 날씨 종류에 맞는 표현을 날마다 돌아가면서 하나
function weatherPhrase(w, kind) {
  const bank = (typeof TODAY !== "undefined" && TODAY.weather) || {};
  const list = (w.max <= 5 && (kind === "sun" || kind === "cloud") && bank.cold) || bank[kind] || bank.cloud || [];
  if (!list.length) return null;
  const day = Math.floor(new Date(ymd(new Date())) / 86400000);
  return list[day % list.length];
}

// 한국어 한 줄 + 영어 (흐리지 않게, 설명용)
function koPlain(text, en, cls = "") {
  if (!text) return "";
  return `<p class="${cls}">${esc(text)}${en ? `<span class="en">${esc(en)}</span>` : ""}</p>`;
}

function fillWeather() {
  const peek = document.getElementById("peek-weather");
  const body = document.getElementById("today-weather");
  if (!body && !peek) return;
  loadWeather().then((w) => {
    if (!w) {
      if (body) body.innerHTML = ko("날씨를 못 불러왔어요.", "Couldn't load the weather.", "small");
      if (peek) peek.textContent = "";
      return;
    }
    const kind = weatherKind(w);
    const [tip, tipEn] = weatherTip(w, kind);
    const p = weatherPhrase(w, kind);
    if (peek) peek.textContent = `${WEATHER_KIND[kind].icon} ${w.now}°C`;
    if (!body || !document.body.contains(body)) return;
    body.innerHTML = `
      <pre class="rain">${esc(WEATHER_KIND[kind].art)}</pre>
      <p class="temp">${w.now}°C</p>
      ${ko(tip, tipEn, "small")}
      ${p ? `<div class="today-sub">
        <p class="small">날씨 표현</p>
        ${ko(`「${p.phrase}」`, p.en, "phrase")}
        ${ko(p.note, p.meaning, "small")}
      </div>` : ""}`;
  });
}

function grammarOf(p) {
  return p && p.grammar ? (S.grammar || []).find((x) => x.n === p.grammar) || { n: p.grammar, point: "" } : null;
}

// 홈: 오늘 페이지로 가는 한 줄
function todayLink() {
  const d = todayEntry();
  const m = d && d.mood;
  const p = d && d.phrase;
  const peek = [
    p ? `「${esc(p.text)}」` : "",
    m ? `${esc(m.face)} ${esc(m.word)}` : "",
    `<span id="peek-weather">…</span>`,
  ].filter(Boolean).join(" · ");
  return `
    <a class="box today-link ac-orange" href="#/today">
      <div class="box-title">▼ 오늘 <span class="title-link">표현 · 기분 · 날씨 »</span></div>
      <div class="box-body"><p class="today-peek">${peek}</p></div>
    </a>`;
}

// "오늘 써 봤어요" 기록: 이 브라우저에만 저장된다 ({ "YYYY-MM-DD": { sentence, at } }).
// 주간 점검 때 "기록 복사"로 복사해서 세션에 붙여 넣는다.
function usedLog() {
  try { return JSON.parse(localStorage.getItem("used-phrases") || "{}"); } catch (e) { return {}; }
}
function saveUsedLog(log) {
  try { localStorage.setItem("used-phrases", JSON.stringify(log)); return true; } catch (e) { return false; }
}

function dayLabel(date) {
  const dt = new Date(date + "T00:00");
  return `${dt.getMonth() + 1}/${dt.getDate()} (${"일월화수목금토"[dt.getDay()]})`;
}
function allDays() {
  return (typeof TODAY !== "undefined" && TODAY.days) || {};
}
// 이번 주 날짜: TODAY.week ("2026-11-07 ~ 2026-11-11") 범위
function weekDates() {
  const [from, to] = ((typeof TODAY !== "undefined" && TODAY.week) || "").split("~").map((x) => x.trim());
  return Object.keys(allDays()).sort().filter((x) => (!from || x >= from) && (!to || x <= to));
}

// 주간 점검에 붙여 넣을 글
function usedExport() {
  const log = usedLog();
  const days = allDays();
  const lines = Object.keys(log).sort().filter((date) => days[date]).map((date) => {
    const x = days[date].phrase || {};
    return `${date} #${x.grammar || "?"} 「${x.text}」 → ${log[date].sentence || "(문장 없음)"}`;
  });
  return lines.length ? "오늘 써 봤어요:\n" + lines.join("\n") : "";
}

// 오늘 페이지 (#/today)
function viewToday() {
  const d = todayEntry();
  const m = d && d.mood;
  const p = d && d.phrase;
  const g = grammarOf(p);
  const used = d ? usedLog()[d.date] : null;

  const phraseHtml = p ? `
    <div class="box ac-orange">
      <div class="box-title">▼ 써먹을 표현</div>
      <div class="box-body today-phrase">
        ${ko(`「${p.text}」`, p.text_en, "big-phrase")}
        ${g ? `<p class="gram-chip"><span>오늘의 문법</span> <a href="#/grammar/${g.n}">#${g.n} ${esc(g.point)}</a></p>` : ""}
        ${p.example ? `<h4>이렇게 말해 봐요</h4>${koPlain(p.example, p.example_en, "example")}` : ""}
        <h4>언제 써요?</h4>
        ${koPlain(p.when, p.when_en)}
        <h4>이렇게 고쳐요</h4>
        ${koPlain(p.fix, p.fix_en, "fix")}
        <h4>기억하기</h4>
        ${koPlain(p.tip, p.tip_en)}
        <div class="used-box">
          <h4>오늘 써 봤어요</h4>
          <label class="used-check"><input type="checkbox" id="used-check"${used ? " checked" : ""}> 대화나 글에서 이 문법을 써 봤어요</label>
          <textarea id="used-text" rows="2" maxlength="300" placeholder="실제로 쓴 문장을 적어 주세요 (Write the sentence you actually used)">${esc(used ? used.sentence : "")}</textarea>
          <p><button type="button" class="en-toggle" id="used-save">저장</button> <span class="small" id="used-status">${used ? "저장됐어요 ✔" : ""}</span></p>
        </div>
      </div>
    </div>` : "";

  const moodHtml = m ? `
    <div class="box ac-orange">
      <div class="box-title">▼ 오늘의 기분</div>
      <div class="box-body today-center">
        <p class="face">${esc(m.face)}</p>
        ${ko(m.word, m.meaning, "mood-word")}
        ${ko(m.sentence, m.sentence_en, "small")}
      </div>
    </div>` : "";

  const weatherHtml = `
    <div class="box ac-orange">
      <div class="box-title">▼ 오늘 날씨</div>
      <div class="box-body today-center" id="today-weather"><p class="small">불러오는 중...</p></div>
    </div>`;

  const days = allDays();
  const log = usedLog();
  const rows = weekDates().map((date) => {
    const x = days[date].phrase || {};
    const gx = grammarOf(x);
    return `<tr class="${d && date === d.date ? "today" : ""}">
      <th>${dayLabel(date)}</th>
      <td>「${esc(x.text || "")}」</td>
      <td class="small">${gx ? `<a href="#/grammar/${gx.n}">#${gx.n} ${esc(gx.point)}</a>` : ""}</td>
      <td class="used-mark" title="${log[date] ? "써 봤어요" : ""}">${log[date] ? "✔" : ""}</td>
    </tr>`;
  }).join("");

  return {
    title: "오늘",
    html: `
      <div class="today-page" id="today-page">
        ${!d ? `<div class="box ac-orange"><div class="box-body"><p>이번 주 목록이 아직 없어요.</p></div></div>` : ""}
        ${d && d.stale ? `<p class="small today-stale">이번 주 목록이 끝났어요. 마지막 날 것을 보여 줘요.</p>` : ""}
        ${phraseHtml}
        <div class="today-pair">${moodHtml}${weatherHtml}</div>
        ${rows ? `<div class="box ac-orange">
          <div class="box-title">▼ 이번 주 표현 <a class="title-link" href="#/phrases">지난 표현 »</a></div>
          <div class="box-body">
            <table class="sched today-week">${rows}</table>
            <p class="today-copy"><button type="button" class="en-toggle" id="used-copy">기록 복사</button>
              <span class="small" id="copy-status">✔ 표시한 문장을 복사해서 주간 점검 때 붙여 넣어요</span></p>
            <textarea id="copy-fallback" class="copy-fallback" rows="4" readonly hidden></textarea>
          </div>
        </div>` : ""}
        <p class="today-foot small">
          <button type="button" class="en-toggle" id="en-toggle">영어 모두 보기</button>
          흐린 영어는 누르면 (마우스를 올려도) 보여요
        </p>
      </div>`,
    after: () => {
      const page = document.getElementById("today-page");
      const btn = document.getElementById("en-toggle");
      btn.addEventListener("click", () => {
        const on = page.classList.toggle("show-en");
        btn.textContent = on ? "영어 숨기기" : "영어 모두 보기";
      });

      const save = document.getElementById("used-save");
      if (save && d) {
        const check = document.getElementById("used-check");
        const text = document.getElementById("used-text");
        const status = document.getElementById("used-status");
        text.addEventListener("input", () => { if (text.value.trim()) check.checked = true; });
        save.addEventListener("click", () => {
          const log = usedLog();
          if (check.checked) log[d.date] = { sentence: text.value.trim(), at: new Date().toISOString() };
          else delete log[d.date];
          status.textContent = saveUsedLog(log)
            ? (check.checked ? "저장됐어요 ✔" : "지웠어요")
            : "이 브라우저에서는 저장할 수 없어요";
          const mark = document.querySelector(".today-week tr.today .used-mark");
          if (mark) mark.textContent = check.checked ? "✔" : "";
        });
      }

      const copy = document.getElementById("used-copy");
      if (copy) copy.addEventListener("click", () => {
        const text = usedExport();
        const status = document.getElementById("copy-status");
        const fallback = document.getElementById("copy-fallback");
        if (!text) { status.textContent = "아직 기록이 없어요"; return; }
        const manual = () => {
          fallback.hidden = false;
          fallback.value = text;
          fallback.select();
          status.textContent = "아래 글을 복사해 주세요 (Ctrl+C)";
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => { status.textContent = "복사했어요 ✔"; }, manual);
        } else manual();
      });

      fillWeather();
    },
  };
}

// 지난 표현 (#/phrases): 오늘 전 날짜의 표현을 최신 순으로. 누르면 펼쳐진다.
function viewPhrases() {
  const today = ymd(new Date());
  const days = allDays();
  const log = usedLog();
  const dates = Object.keys(days).filter((x) => x < today).sort().reverse();
  const items = dates.map((date) => {
    const p = days[date].phrase || {};
    const m = days[date].mood;
    const g = grammarOf(p);
    const u = log[date];
    return `
      <details class="past-item">
        <summary><span class="past-date">${dayLabel(date)}</span> 「${esc(p.text || "")}」
          ${g ? `<span class="small">#${g.n} ${esc(g.point)}</span>` : ""}${u ? ` <span class="used-mark">✔</span>` : ""}</summary>
        <div class="past-body today-phrase">
          ${ko(p.text, p.text_en, "small")}
          ${g ? `<p class="small">문법: <a href="#/grammar/${g.n}">#${g.n} ${esc(g.point)}</a></p>` : ""}
          ${p.example ? `<h4>이렇게 말해 봐요</h4>${koPlain(p.example, p.example_en, "example")}` : ""}
          <h4>언제 써요?</h4>${koPlain(p.when, p.when_en)}
          <h4>이렇게 고쳐요</h4>${koPlain(p.fix, p.fix_en, "fix")}
          <h4>기억하기</h4>${koPlain(p.tip, p.tip_en)}
          ${u ? `<h4>내가 쓴 문장</h4><p>${esc(u.sentence || "(문장 없음)")}</p>` : ""}
          ${m ? `<h4>그날의 기분</h4>${koPlain(`${m.face} ${m.word}`, m.meaning)}` : ""}
        </div>
      </details>`;
  }).join("");

  const inDays = new Set(Object.values(days).map((x) => x.phrase && x.phrase.text));
  const older = (((typeof TODAY !== "undefined" && TODAY.past) || {}).phrase || []).filter((t) => !inDays.has(t));

  return {
    title: "지난 표현",
    html: `
      <div class="today-page">
        <div class="box ac-orange">
          <div class="box-title">▼ 지난 표현 (${dates.length}) <a class="title-link" href="#/today">오늘 »</a></div>
          <div class="box-body">
            ${items || `<p class="small">아직 지난 표현이 없어요.</p>`}
            ${older.length ? `<h4>예전 표현</h4><ul class="older">${older.map((t) => `<li>「${esc(t)}」</li>`).join("")}</ul>` : ""}
          </div>
        </div>
      </div>`,
  };
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
  let html = todayLink() + listenLink() + weekSummary();
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const inCat = posts.filter((p) => p.category === key);
    const more = inCat.length > HOME_POSTS_PER_CATEGORY
      ? `<p class="all"><a href="#/category/${key}">→ 전체 보기 (${inCat.length})</a></p>`
      : "";
    html += listBox(`▣ ${cat.name}`, inCat.slice(0, HOME_POSTS_PER_CATEGORY), more, acOf(key));
  }
  return { title: "", html, after: fillWeather };
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

// ===== 단어 카드 =====
// 오늘 집중할 단어 (S.anki.focus, 최대 5개, 많이 틀린 순서). 누르면 뒤집힌다.
// 한→영: 단어를 보고 뜻을 떠올린다. 영→한: 뜻을 보고 한국어를 써 본다 (입력하면 맞는지 확인).
// "알아요"는 빼고 (오늘 하루 이 브라우저에 기억), "다시"는 맨 뒤로 보낸다.
// 단축키: Space 뒤집기 · 1 다시 · 2 알아요 · 입력칸에서 Enter = 확인

// 예문에서 단어를 굵게: 기본형에서 "다"를 떼고, 맞는 앞부분이 나올 때까지 줄여서 찾는다 (지겹다 → 지겨워요).
// 받침이 바뀌는 불규칙 (지겹 → 지겨워, 듣 → 들어)은 끝 글자의 받침을 뗀 형태로도 찾아본다.
function dropBatchim(s) {
  const c = s.charCodeAt(s.length - 1) - 0xac00;
  if (c < 0 || c > 11171 || c % 28 === 0) return null;
  return s.slice(0, -1) + String.fromCharCode(0xac00 + c - (c % 28));
}

function boldWord(sentence, word) {
  const stem = word.replace(/다$/, "");
  // 한 글자만 남으면 어절 첫 글자일 때만 인정한다 (데우다 → "데워"는 OK, "그런데"는 아님)
  const find = (p, short) => {
    let i = sentence.indexOf(p);
    while (short && i > 0 && !/\s/.test(sentence[i - 1])) i = sentence.indexOf(p, i + 1);
    return i;
  };
  for (let n = stem.length; n >= 1; n--) {
    const part = stem.slice(0, n), short = n === 1;
    let i = find(part, short);
    if (i < 0 && dropBatchim(part)) i = find(dropBatchim(part), short);
    if (i < 0) continue;
    let j = i + n;
    while (j < sentence.length && !/[\s.,!?~]/.test(sentence[j])) j++;
    return escapeHtml(sentence.slice(0, i)) + `<b>${escapeHtml(sentence.slice(i, j))}</b>` + escapeHtml(sentence.slice(j));
  }
  return escapeHtml(sentence);
}

// 띄어쓰기 여러 칸·앞뒤 공백·마침표는 무시하고, 띄어쓰기 자체는 그대로 비교한다.
const normAnswer = (s) => s.normalize("NFC").trim().replace(/\s+/g, " ").replace(/[.!?~]+$/, "");

const cardStore = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 안 돼도 카드는 된다 */ }
  },
};

function speakKo(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.9;
  const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.replace("_", "-").startsWith("ko"));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

function viewCards() {
  const fallback = { date: pinnedWords.date, words: pinnedWords.words };
  const focus = (S.anki && S.anki.focus && S.anki.focus.words.length) ? S.anki.focus : fallback;
  const isToday = focus.date === ymd(new Date());
  const title = isToday ? "오늘의 단어" : `${normDate(focus.date)} 단어`;
  return {
    title,
    html: `
      <div class="box ac-green">
        <div class="box-title">▣ ${title} · 집중 ${focus.words.length}개</div>
        <div class="box-body">
          <div class="card-top">
            <div class="card-mode" role="group" aria-label="방향">
              <button type="button" data-mode="ko">한 → 영</button>
              <button type="button" data-mode="en">영 → 한</button>
            </div>
            <span id="card-count" class="small"></span>
          </div>
          <div id="card" class="card" role="button" tabindex="0" aria-live="polite"></div>
          <form id="card-type" class="card-type">
            <input id="card-input" type="text" size="1" lang="ko" autocomplete="off" autocapitalize="off" spellcheck="false"
                   placeholder="한국어로 써 보세요 (Enter)">
            <button type="submit">확인</button>
          </form>
          <div id="card-grade" class="card-grade">
            <button id="card-again" type="button">✕ 다시 <kbd>1</kbd></button>
            <button id="card-know" type="button">○ 알아요 <kbd>2</kbd></button>
          </div>
          <p class="small card-keys">Space 뒤집기 · 1 다시 · 2 알아요</p>
        </div>
      </div>`,
    after() {
      const $c = (id) => document.getElementById(id);
      const card = $c("card"), count = $c("card-count"), grade = $c("card-grade");
      const typeForm = $c("card-type"), input = $c("card-input");
      const total = focus.words.length;
      const knownKey = "cards-known";
      let mode = cardStore.get("cards-mode", "ko");
      let queue, flipped, typed;

      const known = () => {
        const k = cardStore.get(knownKey, {});
        return k.date === focus.date ? k.words || [] : [];
      };
      const markKnown = (word) => cardStore.set(knownKey, { date: focus.date, words: [...new Set([...known(), word])] });

      function badges(w) {
        const b = [];
        if (w.again) b.push(`<span class="badge bad">✕${w.again} 오늘 틀림</span>`);
        if (w.trouble) b.push(`<span class="badge warn">trouble</span>`);
        if (w.pins > 1) b.push(`<span class="badge">📌${w.pins}</span>`);
        return b.length ? `<span class="card-badges">${b.join("")}</span>` : "";
      }

      function front(w) {
        return mode === "ko"
          ? `${badges(w)}<b>${escapeHtml(w.word)}</b>`
          : `${badges(w)}<span class="card-meaning big">${escapeHtml(w.meaning)}</span><small>한국어로?</small>`;
      }

      function back(w) {
        let check = "";
        if (mode === "en" && typed !== null) {
          check = normAnswer(typed) === normAnswer(w.word)
            ? `<span class="card-check ok">✔ ${escapeHtml(typed)}</span>`
            : `<span class="card-check no">✕ ${escapeHtml(typed || "(빈칸)")}</span>`;
        }
        const speak = "speechSynthesis" in window && w.example
          ? `<button type="button" class="card-speak" aria-label="예문 듣기">🔊</button>` : "";
        return `${check}<b>${escapeHtml(w.word)}</b>` +
          `<span class="card-meaning">${escapeHtml(w.meaning)}</span>` +
          (w.example ? `<span class="card-ex">${boldWord(w.example, w.word)} ${speak}</span>` : "") +
          (w.translation ? `<small>${escapeHtml(w.translation)}</small>` : "") +
          (w.cf ? `<span class="card-cf">cf) ${escapeHtml(w.cf)}</span>` : "");
      }

      function show() {
        flipped = false;
        typed = null;
        grade.classList.remove("on");
        count.textContent = `남은 카드 ${queue.length} / ${total}`;
        typeForm.hidden = !(mode === "en" && queue.length);
        input.value = "";
        card.innerHTML = queue.length
          ? front(queue[0])
          : "<b>끝!</b><small>누르면 처음부터 다시 해요</small>";
        if (!typeForm.hidden && matchMedia("(hover: hover)").matches) input.focus();
      }

      function flip() {
        if (!queue.length) return restart(true);
        flipped = !flipped;
        grade.classList.toggle("on", flipped);
        typeForm.hidden = flipped || mode !== "en";
        card.innerHTML = flipped ? back(queue[0]) : front(queue[0]);
        if (flipped) card.focus();
      }

      function restart(clear) {
        if (clear) cardStore.set(knownKey, {});
        const skip = known();
        queue = focus.words.filter((w) => !skip.includes(w.word));   // 많이 틀린 순서 그대로
        show();
      }

      function again() { if (flipped) { queue.push(queue.shift()); show(); } }
      function know() { if (flipped) { markKnown(queue[0].word); queue.shift(); show(); } }

      function setMode(m) {
        mode = m;
        cardStore.set("cards-mode", m);
        document.querySelectorAll(".card-mode button").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
        if (queue) show();
      }

      card.addEventListener("click", (e) => {
        const sp = e.target.closest(".card-speak");
        if (sp) { e.stopPropagation(); return speakKo(queue[0].example); }
        flip();
      });
      typeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        typed = input.value;   // back()이 이 값으로 맞는지 보여 준다
        if (!flipped) flip();
        typed = null;          // 다음 뒤집기에는 다시 비교하지 않는다
      });
      $c("card-again").addEventListener("click", again);
      $c("card-know").addEventListener("click", know);
      document.querySelectorAll(".card-mode button").forEach((b) =>
        b.addEventListener("click", () => setMode(b.dataset.mode)));

      // 단축키 (다른 화면으로 가면 스스로 빠진다)
      function onKey(e) {
        if (!document.getElementById("card")) return document.removeEventListener("keydown", onKey);
        if (e.target === input || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === " " || (e.key === "Enter" && e.target === card)) { e.preventDefault(); flip(); }
        else if (e.key === "1") again();
        else if (e.key === "2") know();
      }
      document.addEventListener("keydown", onKey);

      setMode(mode === "en" ? "en" : "ko");
      restart(false);
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
      <p class="small">${esc(listen.progress || "")}${listen.result ? " · " + esc(listen.result) : ""}</p>
      <p><a href="#/listening">→ 듣기 페이지 (구간 재생 · 스크립트 · 한 줄 반복)</a></p>`);
  }
  if (w.words.length) html += box(`▣ 수업 단어 (${w.lesson}회)`, `<ul>${w.words.map((x) => `<li>${x}</li>`).join("")}</ul>`);
  if (w.questions.length) html += box("▣ 선생님께 물어볼 것", `<ol>${w.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>`);
  if (w.report) html += box("▣ 주간 리포트", `<p>${w.report.replace(/\n/g, "<br>")}</p>`);
  return { title: "이번 주", html };
}

// ===== 듣기 (#/listening, #/listening/<folder>) =====
// 이번 주 디디 클립을 YouTube에서 그 구간만 재생한다 (mp3는 공개 사이트에 올리지 않는다).
// 스크립트는 1단계(스크립트 없이 듣기)가 끝나기 전에는 숨기고, 그 뒤에는 눌러서 보기.
const STEP_NAMES = ["스크립트 없이 듣기", "스크립트로 확인", "말투 패턴", "따라 말하기"];
const STEP_TIPS = [
  "자막 없이 끝까지 들어요. 몇 % 알아들었는지 생각해 보세요.",
  "스크립트를 눌러서 보면서, 놓친 부분이 왜 안 들렸는지 확인해요.",
  "디디가 이야기를 시작하고, 잇고, 끝내는 말투를 찾아요.",
  "한 줄씩 🔁 반복: 0.75×로 따라 말하고, 1×로 한 번 더.",
];
const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const shortTitle = (c) => String(c.title || c.folder).split("|")[0].trim();
const allClips = () => S.clips || [];

function currentClip() {
  const cur = S.listening && allClips().find((c) => c.folder === S.listening.folder);
  return cur || allClips()[0] || null;
}

function stepIndex(c) {
  const i = (c.steps || []).indexOf(false);
  return i < 0 ? 4 : i;   // 0..3 = next step, 4 = all done
}

// 홈: 이번 주 듣기로 가는 한 줄
function listenLink() {
  const c = currentClip();
  if (!c) return "";
  const next = stepIndex(c);
  const state = next >= 4 ? "4단계 모두 완료 ✔" : `다음: ${next + 1}단계 ${STEP_NAMES[next]}`;
  return `
    <a class="box today-link ac-blue" href="#/listening">
      <div class="box-title">▼ 이번 주 듣기 <span class="title-link">${(c.steps || []).filter(Boolean).length}/4 단계 »</span></div>
      <div class="box-body"><p class="today-peek">🎧 ${esc(shortTitle(c))} <span class="small">(${esc(c.section)}) · ${state}</span></p></div>
    </a>`;
}

function viewListening(folder) {
  const c = folder ? allClips().find((x) => x.folder === folder) : currentClip();
  if (!c) {
    return { title: "듣기", html: `<div class="box ac-blue"><div class="box-title">▣ 듣기</div><div class="box-body"><p>아직 클립이 없어요.</p></div></div>` };
  }
  const next = stepIndex(c);
  const isCurrent = S.listening && S.listening.folder === c.folder;
  const ytLink = `${esc(c.url)}&t=${Math.floor(c.start)}s`;

  // 놓친 부분 → 그 시간에 시작하는 줄에 표시
  const why = {};
  const missedLine = new Set();
  for (const [a, b, , reason] of c.missed || []) {
    let first = -1;
    c.lines.forEach(([st], i) => {
      if (st >= a - 1.5 && st <= Math.max(a, b) + 1.5) {
        missedLine.add(i);
        if (first < 0) first = i;
      }
    });
    if (first < 0) {
      first = c.lines.findIndex(([st]) => st >= a - 1.5);
      if (first >= 0) missedLine.add(first);
    }
    if (first >= 0 && reason) why[first] = (why[first] ? why[first] + " / " : "") + reason;
  }
  const showMissed = c.steps[1];
  const lines = c.lines.map(([st, , text], i) => `
      <li class="ln${showMissed && missedLine.has(i) ? " missed" : ""}" data-i="${i}">
        <button type="button" class="ln-time" data-seek="${i}">${fmtTime(st)}</button>
        <span class="ln-text">${esc(text)}${showMissed && why[i] ? `<span class="ln-why">${esc(why[i])}</span>` : ""}</span>
        <button type="button" class="ln-loop" data-loop="${i}" title="이 줄 반복">🔁</button>
      </li>`).join("");

  const chips = STEP_NAMES.map((name, i) => `<span class="step ${c.steps[i] ? "done" : i === next ? "next" : ""}">${c.steps[i] ? "✔" : i + 1} ${name}</span>`).join("");
  const scriptHidden = !c.steps[0];
  const box = (t, body, cls = "ac-blue") => `<div class="box ${cls}"><div class="box-title">${t}</div><div class="box-body page">${body}</div></div>`;

  let html = box(`▣ ${isCurrent ? "이번 주 듣기" : "지난 클립"} · ${esc(c.section)}`, `
      <p class="listen-title">🎧 <a href="${ytLink}" target="_blank" rel="noopener">${esc(shortTitle(c))}</a></p>
      <p class="small">${esc(c.channel || "")}${c.result ? ` · 알아들은 정도 ${esc(c.result)}` : ""}</p>
      <div class="steps">${chips}</div>
      ${next < 4 ? `<p class="step-tip"><b>${next + 1}단계</b> ${STEP_TIPS[next]}</p>` : `<p class="step-tip">4단계 모두 끝났어요. 처음부터 다시 들어 보세요.</p>`}
      <div class="player-wrap"><div id="yt-player"></div></div>
      <div class="player-bar">
        <button type="button" class="en-toggle" id="pl-play">▶ 재생</button>
        <button type="button" class="en-toggle" id="pl-back">↺ 5초</button>
        <span class="speeds">${[0.75, 1, 1.25].map((r) => `<button type="button" class="en-toggle speed${r === 1 ? " on" : ""}" data-rate="${r}">${r}×</button>`).join("")}</span>
        <span class="small" id="pl-status"></span>
      </div>
      <p class="small">재생이 안 되면 <a href="${ytLink}" target="_blank" rel="noopener">YouTube에서 열기</a> (${esc(c.section)} 구간)</p>`);

  html += box(`▣ 스크립트 (${c.lines.length}줄)`, `
      <p class="small">시간을 누르면 그 줄로 가요 · 🔁 그 줄만 반복 · 문장을 누르면 보여요${showMissed ? " · <span class=\"missed-key\">빨간 줄</span> = 놓친 부분" : ""}</p>
      ${scriptHidden ? `<p class="script-gate"><button type="button" class="en-toggle" id="script-show">그래도 스크립트 보기</button> <span class="small">1단계는 스크립트 없이 들어요</span></p>` : ""}
      <p class="script-tools"${scriptHidden ? " hidden" : ""}><button type="button" class="en-toggle" id="script-all">모두 보기</button></p>
      <ol class="lines blur"${scriptHidden ? " hidden" : ""} id="lines">${lines}</ol>`);

  if (c.patterns && c.patterns.length) {
    html += box("▣ 말투 패턴 (팟캐스트에 써 보기)", `<table class="gtable"><tr><th>종류</th><th>패턴</th><th>디디의 문장</th></tr>${c.patterns.map((x) => `
        <tr><td class="small">${esc(x.kind)}</td><td>${esc(x.pattern)}</td><td>${esc(x.sentence)}<br><span class="small">${esc(x.does)}</span></td></tr>`).join("")}</table>`);
  }
  if (c.sentences.length) {
    html += box("▣ 문장", c.sentences.map((x) => ko(`${x.ko}${/^#/.test(x.n) ? "  " + x.n : ""}`, x.why)).join(""));
  }
  if (c.words.length) {
    html += box(`▣ 단어 (${c.words.length})`, c.words.map((w) => ko(`${w.word} · ${w.example}`, w.meaning)).join("") +
      `<p class="small hover-tip">눌러서 뜻 보기</p>`, "ac-green");
  }
  const others = allClips().filter((x) => x.folder !== c.folder);
  if (others.length || !isCurrent) {
    html += box("▣ 다른 클립", `<ul>${allClips().map((x) => `<li>${x.folder === c.folder ? "▶ " : ""}<a href="#/listening/${encodeURIComponent(x.folder)}">${esc(x.folder.slice(0, 10))} · ${esc(shortTitle(x))}</a> <span class="small">${esc(x.section)}${x.result ? " · " + esc(x.result) : ""}</span></li>`).join("")}</ul>`);
  }
  return { title: "듣기", html, after: () => setupListening(c) };
}

// YouTube IFrame API는 듣기 페이지를 열 때 한 번만 불러온다.
let ytPromise = null;
function loadYouTube() {
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => resolve(null);
      document.head.appendChild(tag);
    });
  }
  return ytPromise;
}

let listenTimer = null;
function setupListening(c) {
  clearInterval(listenTimer);
  const list = document.getElementById("lines");
  const status = document.getElementById("pl-status");
  const playBtn = document.getElementById("pl-play");
  let player = null;
  let loop = null;      // 반복 중인 줄 번호
  let nowLine = -1;

  const showScript = () => {
    list.hidden = false;
    document.querySelector(".script-tools").hidden = false;
    const gate = document.querySelector(".script-gate");
    if (gate) gate.remove();
  };
  const gateBtn = document.getElementById("script-show");
  if (gateBtn) gateBtn.addEventListener("click", showScript);
  document.getElementById("script-all").addEventListener("click", (e) => {
    const blurred = list.classList.toggle("blur");
    e.target.textContent = blurred ? "모두 보기" : "다시 가리기";
  });

  const setLoop = (i) => {
    loop = loop === i ? null : i;
    list.querySelectorAll(".ln").forEach((li) => li.classList.toggle("looping", Number(li.dataset.i) === loop));
    status.textContent = loop === null ? "" : `🔁 ${loop + 1}번 줄 반복 중 (🔁 다시 누르면 끝)`;
    if (loop !== null) seekLine(loop);
  };
  const seekLine = (i) => {
    if (!player) return;
    player.seekTo(c.start + c.lines[i][0], true);
    player.playVideo();
  };

  list.addEventListener("click", (e) => {
    const seek = e.target.closest("[data-seek]");
    const lp = e.target.closest("[data-loop]");
    if (seek) return seekLine(Number(seek.dataset.seek));
    if (lp) return setLoop(Number(lp.dataset.loop));
    const li = e.target.closest(".ln");
    if (li) li.classList.toggle("open");
  });

  playBtn.addEventListener("click", () => {
    if (!player) return;
    if (player.getPlayerState() === 1) player.pauseVideo();
    else player.playVideo();
  });
  document.getElementById("pl-back").addEventListener("click", () => {
    if (player) player.seekTo(Math.max(c.start, player.getCurrentTime() - 5), true);
  });
  document.querySelectorAll(".speed").forEach((b) => b.addEventListener("click", () => {
    if (!player) return;
    player.setPlaybackRate(Number(b.dataset.rate));
    document.querySelectorAll(".speed").forEach((x) => x.classList.toggle("on", x === b));
  }));

  loadYouTube().then((YT) => {
    if (!YT || !document.getElementById("yt-player")) {
      status.textContent = "플레이어를 불러올 수 없어요. YouTube에서 열어 주세요.";
      return;
    }
    player = new YT.Player("yt-player", {
      host: "https://www.youtube-nocookie.com",
      videoId: c.id,
      playerVars: { start: Math.floor(c.start), end: Math.ceil(c.end), playsinline: 1, rel: 0, cc_load_policy: 0, iv_load_policy: 3 },
      events: {
        onStateChange: (e) => { playBtn.textContent = e.data === 1 ? "❚❚ 멈춤" : "▶ 재생"; },
        onError: () => { status.textContent = "재생이 안 돼요. 아래 YouTube 링크로 열어 주세요."; },
      },
    });
    listenTimer = setInterval(() => {
      if (!document.getElementById("lines")) return clearInterval(listenTimer);   // 다른 페이지로 갔다
      if (!player || !player.getCurrentTime) return;
      const rel = player.getCurrentTime() - c.start;
      if (loop !== null) {
        const [st, en] = c.lines[loop];
        if (rel > en + 0.25 || rel < st - 1) player.seekTo(c.start + st, true);
      }
      let i = -1;
      for (let k = 0; k < c.lines.length && c.lines[k][0] <= rel + 0.1; k++) i = k;
      if (i !== nowLine) {
        nowLine = i;
        list.querySelectorAll(".ln.now").forEach((li) => li.classList.remove("now"));
        const li = list.querySelector(`.ln[data-i="${i}"]`);
        if (li) li.classList.add("now");
      }
    }, 200);
  });
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
    cards: viewCards,
    week: viewWeek,
    today: viewToday,
    phrases: viewPhrases,
    grammar: () => viewGrammar(param),
    listening: () => viewListening(param),
  };
  const page = (views[view] || viewNotFound)();

  content.innerHTML = page.html;
  if (page.after) page.after();
  document.title = page.title ? `${page.title} :: ${SITE_TITLE}` : `${SITE_TITLE} :: 한국어 공부 일지`;

  // 메뉴 강조: 글 화면에서는 그 글의 카테고리를 강조한다
  let current = view ? `#/${view}${arg ? "/" + arg : ""}` : "#/";
  if (view === "grammar") current = "#/grammar";
  if (view === "listening") current = "#/listening";
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
