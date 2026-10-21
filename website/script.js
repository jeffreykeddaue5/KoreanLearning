// ===== 부팅 화면 =====
const bootLines = [
  "코플랜드 OS 엔터프라이즈 v2.3",
  "(c) 타치바나 종합 연구소",
  "",
  "메모리 확인 중 ........ 640K 확인",
  "NAVI 하드웨어 초기화 중 ........ 완료",
  "와이어드 프로토콜 7 로드 중 ........ 완료",
  "사용자 인증 중 ........ 익명_01",
  "",
  "현재 날짜. 현재 시간.",
  "와이어드에 연결되었습니다.",
];

const boot = document.getElementById("boot");
const bootText = document.getElementById("boot-text");
const bootEnter = document.getElementById("boot-enter");

let line = 0;
function typeBoot() {
  if (line < bootLines.length) {
    bootText.textContent += bootLines[line] + "\n";
    line++;
    setTimeout(typeBoot, 180 + Math.random() * 220);
  } else {
    bootEnter.style.display = "block";
  }
}

// 한 번 본 뒤에는 이번 세션 동안 부팅 화면을 건너뛴다
if (sessionStorage.getItem("booted")) {
  boot.remove();
} else {
  typeBoot();
  boot.addEventListener("click", () => {
    sessionStorage.setItem("booted", "1");
    boot.classList.add("done");
    setTimeout(() => boot.remove(), 700);
  });
}

// ===== 시계 =====
const clock = document.getElementById("clock");
function tick() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  clock.textContent =
    `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일 ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tick();
setInterval(tick, 1000);

// ===== 방문자 카운터 (로컬용 가짜 카운터) =====
const todayKey = "visits-" + new Date().toDateString();
const today = Number(localStorage.getItem(todayKey) || 0) + 1;
const total = Number(localStorage.getItem("visits-total") || 1337) + 1;
localStorage.setItem(todayKey, today);
localStorage.setItem("visits-total", total);
// 방문자 박스가 없으면 (숨겼으면) 건너뛴다
if (document.getElementById("today")) {
  document.getElementById("today").textContent = String(today).padStart(4, "0");
  document.getElementById("total").textContent = String(total).padStart(6, "0");
}

// ===== 제목 글리치 =====
const title = document.querySelector("h1.glitch");
function glitch() {
  title.classList.add("active");
  setTimeout(() => title.classList.remove("active"), 120 + Math.random() * 200);
  setTimeout(glitch, 2000 + Math.random() * 5000);
}
setTimeout(glitch, 2500);

// ===== 신호 세기 =====
// 시스템 박스가 없으면 (숨겼으면) 건너뛴다
const signal = document.getElementById("signal");
if (signal) {
  setInterval(() => {
    const n = 2 + Math.floor(Math.random() * 5);
    signal.textContent = "|".repeat(n) + ".".repeat(6 - n);
  }, 800);
}

// ===== 이달의 음악 =====
// 매달 새 항목을 맨 위에 추가하면 된다. plays는 1~5.
const monthlyMusic = [
  {
    month: "2026.10",
    note: "이번 달은 밤에 걷는 음악이 많았다.",
    tracks: [
      { title: "Duvet", artist: "bôa", plays: 5 },
      { title: "Teardrop", artist: "Massive Attack", plays: 4 },
      { title: "위잉위잉", artist: "혁오", plays: 4 },
      { title: "Roygbiv", artist: "Boards of Canada", plays: 3 },
      { title: "Glory Box", artist: "Portishead", plays: 2 },
    ],
  },
  {
    month: "2026.09",
    note: "비가 많이 와서 조용한 노래만 들었다.",
    tracks: [
      { title: "Avril 14th", artist: "Aphex Twin", plays: 5 },
      { title: "기다린 만큼, 더", artist: "검정치마", plays: 4 },
      { title: "Heaven or Las Vegas", artist: "Cocteau Twins", plays: 3 },
      { title: "Flora", artist: "吉村弘", plays: 3 },
      { title: "Duvet", artist: "bôa", plays: 2 },
    ],
  },
];

let musicIndex = 0;
const musicPrev = document.getElementById("music-prev");
const musicNext = document.getElementById("music-next");

function renderMusic() {
  const m = monthlyMusic[musicIndex];
  document.getElementById("music-month").textContent = m.month;
  document.getElementById("music-note").textContent = `"${m.note}"`;
  const list = document.getElementById("music-list");
  list.innerHTML = "";
  for (const t of m.tracks) {
    const li = document.createElement("li");
    li.innerHTML =
      `${t.title} <span class="artist">— ${t.artist}</span>` +
      `<span class="plays">${"▮".repeat(t.plays)}${"▯".repeat(5 - t.plays)}</span>`;
    list.appendChild(li);
  }
  // 배열의 뒤쪽이 더 옛날 달
  musicPrev.classList.toggle("off", musicIndex >= monthlyMusic.length - 1);
  musicNext.classList.toggle("off", musicIndex <= 0);
}

// 패널을 index.html에서 주석 처리하면 건너뛴다
if (musicPrev) {
  musicPrev.addEventListener("click", (e) => {
    e.preventDefault();
    if (musicIndex < monthlyMusic.length - 1) { musicIndex++; renderMusic(); }
  });
  musicNext.addEventListener("click", (e) => {
    e.preventDefault();
    if (musicIndex > 0) { musicIndex--; renderMusic(); }
  });
  renderMusic();
}

// ===== 자꾸 까먹는 단어 =====
// 몇 개든 추가할 수 있다. 까먹을 때마다 misses를 1씩 올린다.
// 많이 까먹은 순서로 10개씩 보이고, « 이전 | 다음 » 으로 넘긴다. 외웠으면 지우면 된다.
const forgottenWords = [
  { word: "왕복", meaning: "갔다가 다시 돌아오는 것", misses: 4 },
  { word: "질리다", meaning: "너무 많이 해서 싫증이 나다", misses: 4 },
  { word: "여유", meaning: "시간이나 마음에 남는 넉넉함", misses: 3 },
  { word: "막상", meaning: "실제로 그때가 되니까", misses: 3 },
  { word: "억울하다", meaning: "잘못이 없는데 피해를 받아서 속상하다", misses: 3 },
  { word: "실컷", meaning: "하고 싶은 만큼 마음껏", misses: 3 },
  { word: "숙소", meaning: "여행할 때 머무는 곳", misses: 3 },
  { word: "도전하다", meaning: "어려운 일을 해 보려고 하다", misses: 3 },
  { word: "꾸준히", meaning: "쉬지 않고 계속 조금씩", misses: 3 },
  { word: "화해하다", meaning: "싸운 뒤에 다시 사이가 좋아지다", misses: 3 },
  { word: "볼만하다", meaning: "볼 가치가 있다", misses: 3 },
  { word: "맞추다", meaning: "다른 것과 같게 하다, 알람을 설정하다", misses: 2 },
  { word: "핑계", meaning: "하기 싫어서 대는 이유", misses: 2 },
  { word: "웬만하면", meaning: "특별한 이유가 없으면, 가능하면", misses: 2 },
  { word: "귀찮다", meaning: "하기 싫고 성가시다", misses: 2 },
  { word: "답답하다", meaning: "마음이 막힌 것처럼 시원하지 않다", misses: 2 },
  { word: "곰팡이", meaning: "습한 곳에 생기는 얼룩 같은 것", misses: 2 },
  { word: "맡다", meaning: "어떤 일을 책임지고 하다", misses: 2 },
  { word: "버티다", meaning: "힘들어도 참고 견디다", misses: 2 },
  { word: "은근히", meaning: "티는 안 나지만 생각보다 꽤", misses: 2 },
];

// 많이 틀린 순서로 정렬해서 pageSize개씩 보여 준다. detail은 마우스를 올려야 보인다.
// navId가 있으면 « 이전 | 다음 » 으로 페이지를 넘길 수 있고, 없으면 첫 페이지만 보인다.
function renderRankList({ id, navId, items, pageSize, label, detail }) {
  const list = document.getElementById(id);
  const sorted = items.slice().sort((a, b) => b.misses - a.misses);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  let page = 0;

  function render() {
    list.innerHTML = "";
    // 번호가 페이지마다 이어지도록 (2페이지는 11번부터)
    list.style.counterReset = `rank ${page * pageSize}`;
    sorted.slice(page * pageSize, (page + 1) * pageSize).forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="word">${label(item)}</span><span class="misses">✕${item.misses}</span>` +
        `<span class="meaning">${detail(item)}</span>`;
      list.appendChild(li);
    });
    if (navId) {
      prev.classList.toggle("off", page <= 0);
      next.classList.toggle("off", page >= pages - 1);
      pageLabel.textContent = `${page + 1} / ${pages}`;
    }
  }

  let prev, next, pageLabel;
  if (navId) {
    const nav = document.getElementById(navId);
    nav.innerHTML = '<a href="#">« 이전</a> | <span></span> | <a href="#">다음 »</a>';
    [prev, next] = nav.querySelectorAll("a");
    pageLabel = nav.querySelector("span");
    prev.addEventListener("click", (e) => {
      e.preventDefault();
      if (page > 0) { page--; render(); }
    });
    next.addEventListener("click", (e) => {
      e.preventDefault();
      if (page < pages - 1) { page++; render(); }
    });
  }
  render();
}

renderRankList({
  id: "forgot-list",
  navId: "forgot-nav",
  items: forgottenWords,
  pageSize: 10,
  label: (w) => w.word,
  detail: (w) => w.meaning,
});

// ===== 자주 틀리는 문법 =====
// 몇 개든 추가할 수 있다. 틀릴 때마다 misses를 1씩 올린다.
// 많이 틀린 순서로 5개씩 보이고, « 이전 | 다음 » 으로 넘긴다.
const misusedGrammar = [
  { grammar: "시제 (과거/현재/진행)", wrong: "요즘 버텼거든요", right: "요즘 버티고 있거든요", misses: 7 },
  { grammar: "-(으)ㄹ까 봐 (+서 ✕)", wrong: "멀미할까 봐서 약을 먹었어요", right: "멀미할까 봐 약을 먹었어요", misses: 2 },
  { grammar: "-(으)ㄹ까 봐 (못 빠짐)", wrong: "표를 받을까 봐 걱정했어요", right: "표를 못 받을까 봐 걱정했어요", misses: 2 },
  { grammar: "-다 보니 vs -아/어 보니까", wrong: "확인하다 보니 틀렸더라고요", right: "확인해 보니까 틀렸더라고요", misses: 2 },
  { grammar: "N에 N (복합 명사)", wrong: "일본에 여행은 어땠어요?", right: "일본 여행은 어땠어요?", misses: 2 },
  { grammar: "커피를 먹다 → 마시다", wrong: "커피를 먹었어요", right: "커피를 마셨어요", misses: 2 },
  { grammar: "ㅂ 불규칙", wrong: "친구를 사귀는 게 쉬었어요", right: "친구를 사귀는 게 쉬웠어요", misses: 1 },
  { grammar: "동사 + -는군요", wrong: "그 식당에 자주 가군요", right: "그 식당에 자주 가는군요", misses: 1 },
  { grammar: "-(으)ㄹ 테니까 vs -는 걸 보니까", wrong: "사람이 많을 걸 보니까 표를 사 두려고 해요", right: "사람이 많을 테니까 표를 사 두려고 해요", misses: 1 },
  { grammar: "부터 ~ 까지", wrong: "어젯밤에 지금까지 정주행했어요", right: "어젯밤부터 지금까지 정주행했어요", misses: 1 },
];

renderRankList({
  id: "grammar-list",
  navId: "grammar-nav",
  items: misusedGrammar,
  pageSize: 5,
  label: (g) => g.grammar,
  detail: (g) => `<span class="wrong">✕ ${g.wrong}</span><br>○ ${g.right}`,
});
