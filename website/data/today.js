// Hand-written daily bits, updated by the daily-update skill (weather, mood) and website-update (phrase).
// `date` is the last day daily-update ran: it updates weather and mood at most once a day.
const TODAY = {
  date: "2026-11-05",
  weather: {
    art: "' , ' , '\n , ' , ' ,",
    label: "비 · 21°C",
    tip: "낮엔 23°, 밤엔 18°예요. 비가 조금 올 수 있으니 우산을 챙기세요",
    phrase: "비가 부슬부슬 내려요",
    note: "부슬부슬: 비가 가늘게 조금씩 내리는 모양",
    meaning: "drizzling lightly",
  },
  mood: {
    face: "( ・_・)?",
    word: "아리송하다",
    sentence: "-(으)ㄹ걸 그랬어요랑 -(으)ㄹ 뻔했어요가 아직 좀 아리송해요",
    meaning: "puzzling, hard to tell apart",
    past: ["상쾌하다", "후련하다", "흐뭇하다", "보람차다", "든든하다", "느긋하다", "산뜻하다", "홀가분하다", "차분하다", "나른하다", "흡족하다", "아리송하다"],
  },
  phrase: {
    text: "진작 할걸 그랬어요",
    when: "이미 지난 일을 후회할 때 써요. 그때 안 해서 아쉬우면 동사 + -(으)ㄹ걸 그랬어요.",
    fix: "✕ 먼저 일을 할 뻔했어요 → ○ 먼저 일을 할걸 그랬어요",
    tip: "후회는 -(으)ㄹ걸, 거의 일어난 일은 -(으)ㄹ 뻔했어요.",
    past: ["하마터면 큰일 날 뻔했어요", "한번 도전해 볼게요", "막상 해 보니까 괜찮더라고요", "어쩐지 사람이 많더라고요", "영화에 푹 몰입했나 봐요", "진작 할걸 그랬어요"],
  },
};
