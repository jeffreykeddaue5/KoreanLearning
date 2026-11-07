// Hand-written daily bits, updated by the daily-update skill (weather, mood) and website-update (phrase).
// `date` is the last day daily-update ran: it updates weather and mood at most once a day.
const TODAY = {
  date: "2026-11-06",
  weather: {
    art: "' , ' , '\n , ' , ' ,",
    label: "날씨 · 15°C",
    tip: "낮엔 20°, 밤엔 12°예요. 소나기가 올 수 있으니 우산을 챙기세요",
    phrase: "소나기가 한바탕 쏟아졌어요",
    note: "한바탕: 한 번 크게, 세게",
    meaning: "a (big) bout of",
  },
  mood: {
    face: "(๑•̀ㅂ•́)و✧",
    word: "대견하다",
    sentence: "새 문법을 힌트 없이 써서 제가 좀 대견해요",
    meaning: "proud of (someone, even yourself)",
    past: ["상쾌하다", "후련하다", "흐뭇하다", "보람차다", "든든하다", "느긋하다", "산뜻하다", "홀가분하다", "차분하다", "나른하다", "흡족하다", "아리송하다", "대견하다"],
  },
  phrase: {
    text: "진작 할걸 그랬어요",
    when: "이미 지난 일을 후회할 때 써요. 그때 안 해서 아쉬우면 동사 + -(으)ㄹ걸 그랬어요.",
    fix: "✕ 먼저 일을 할 뻔했어요 → ○ 먼저 일을 할걸 그랬어요",
    tip: "후회는 -(으)ㄹ걸, 거의 일어난 일은 -(으)ㄹ 뻔했어요.",
    past: ["하마터면 큰일 날 뻔했어요", "한번 도전해 볼게요", "막상 해 보니까 괜찮더라고요", "어쩐지 사람이 많더라고요", "영화에 푹 몰입했나 봐요", "진작 할걸 그랬어요"],
  },
};
