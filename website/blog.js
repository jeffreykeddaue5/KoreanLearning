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
  let html = todayLink() + weekSummary();
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
    cards: viewCards,
    week: viewWeek,
    today: viewToday,
    phrases: viewPhrases,
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
