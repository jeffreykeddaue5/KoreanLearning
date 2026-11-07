// 오늘 페이지 (#/today) 와 지난 표현 (#/phrases). 매주 수요일 lesson-intake 가 website-update 로 다음 7일치 (목–수) 를 days 에 더한다.
// 지난 날짜는 지우지 않는다: 지난 표현 페이지가 그걸 보여 준다.
// 페이지는 오늘 날짜의 항목을 보여 준다. 오늘 항목이 없으면 그 전의 마지막 항목을 보여 준다.
// 날씨는 페이지가 Open-Meteo 에서 바로 가져오고, 표현은 아래 weather 모음에서 날씨에 맞게 고른다.
// 한국어 줄마다 *_en 이 있어야 한다 (흐리게 보이다가 누르면 보인다).
const TODAY = {
  week: "2026-11-07 ~ 2026-11-11",
  days: {
    "2026-11-07": {
      mood: {
        face: "( ˘▽˘)っ♨",
        word: "개운하다",
        meaning: "refreshed, feeling clean and light (after sleep, a bath, a good cry)",
        sentence: "푹 자고 일어나서 몸이 개운해요",
        sentence_en: "I slept deeply and woke up, so my body feels refreshed",
      },
      phrase: {
        grammar: 58,
        text: "일하느라 정신이 없었어요",
        text_en: "I was so busy working I didn't know which way was up",
        example: "어제 버그 고치느라 점심도 못 먹었어요",
        example_en: "Yesterday I was so busy fixing a bug I couldn't even eat lunch",
        when: "바빠서 다른 걸 못 했을 때 써요. 내가 A를 하느라 B를 못 했어요.",
        when_en: "Use it when you were too busy to do something else: I was busy doing A, so I couldn't do B.",
        fix: "✕ 동료가 이야기해서 방해되느라고 → ○ 일하느라고 칼퇴를 못 했어요",
        fix_en: "-느라(고) needs something I was doing, not something that happened to me.",
        tip: "-느라(고) 다음에는 보통 못 했어요, 늦었어요, 바빴어요가 와요.",
        tip_en: "After -느라(고) you usually get 'couldn't', 'was late' or 'was busy'.",
      },
    },
    "2026-11-08": {
      mood: {
        face: "(っ˘ω˘ς )",
        word: "포근하다",
        meaning: "cozy, soft and warm (a blanket, a mild winter day, a hug)",
        sentence: "이불이 포근해서 일어나기 싫어요",
        sentence_en: "The blanket is so cozy I don't want to get up",
      },
      phrase: {
        grammar: 57,
        text: "오랜만에 푹 쉬었더니 살 것 같아요",
        text_en: "I finally rested properly, and now I feel alive again",
        example: "주말에 피클볼을 쳤더니 온몸이 쑤셔요",
        example_en: "I played pickleball on the weekend, and now my whole body aches",
        when: "내가 뭘 했고, 그 결과가 지금 어떤지 말할 때 써요.",
        when_en: "Use it to say what you did and how things turned out because of it.",
        fix: "✕ 4시간이나 운동했더니 내일 피곤할 거예요 → ○ 운동했더니 피곤해요",
        fix_en: "The result after -았/었더니 already happened, so no future tense.",
        tip: "-았/었더니 + 결과 (지금이나 과거). 미래는 안 돼요.",
        tip_en: "-았/었더니 + a result (now or past). Never the future.",
      },
    },
    "2026-11-09": {
      mood: {
        face: "(・_・;)",
        word: "막막하다",
        meaning: "at a loss, not knowing where to even start",
        sentence: "숙제가 너무 많아서 어디서부터 시작해야 할지 막막해요",
        sentence_en: "There's so much homework I don't know where to start",
      },
      phrase: {
        grammar: 21,
        text: "벌써 세 시간이나 지났어요",
        text_en: "Three whole hours have already gone by",
        example: "어젯밤에 드라마를 다섯 편이나 봤어요",
        example_en: "Last night I watched five whole episodes of a drama",
        when: "생각보다 많을 때 숫자 뒤에 (이)나를 붙여요.",
        when_en: "Put (이)나 after a number when it's more than you expected.",
        fix: "✕ 많이나 먹었어요 → ○ 세 그릇이나 먹었어요",
        fix_en: "(이)나 goes after a number or amount, not after 많이.",
        tip: "받침 있으면 이나, 없으면 나: 세 시간이나, 두 번이나.",
        tip_en: "이나 after a consonant, 나 after a vowel.",
      },
    },
    "2026-11-10": {
      mood: {
        face: "(ﾉ≧∀≦)ﾉ",
        word: "짜릿하다",
        meaning: "thrilling, a tingly rush of excitement",
        sentence: "롤러코스터가 떨어질 때 정말 짜릿했어요",
        sentence_en: "When the roller coaster dropped, it was a real thrill",
      },
      phrase: {
        grammar: 5,
        text: "가격은 비싼 반면에 맛은 최고예요",
        text_en: "It's expensive, but on the other hand the taste is the best",
        example: "재택근무는 편한 반면에 좀 외로워요",
        example_en: "Working from home is comfortable, but on the other hand a bit lonely",
        when: "한 가지의 좋은 점과 나쁜 점을 비교할 때 써요.",
        when_en: "Use it to compare a good side and a bad side of one thing.",
        fix: "✕ 게임은 씌우는 반면에 → ○ 게임은 쉬운 반면에",
        fix_en: "쉽다 is an adjective → 쉬운 반면에. (씌우다 means 'to cover'.)",
        tip: "형용사는 -(으)ㄴ 반면에, 동사는 -는 반면에.",
        tip_en: "Adjective → -(으)ㄴ 반면에, verb → -는 반면에.",
      },
    },
    "2026-11-11": {
      mood: {
        face: "ヽ(°〇°)ﾉ",
        word: "들뜨다",
        meaning: "to be excited and restless, hard to sit still",
        sentence: "오늘 수업이 있어서 아침부터 마음이 들떠요",
        sentence_en: "I have a lesson today, so I've been excited since morning",
      },
      phrase: {
        grammar: 55,
        text: "익숙해지기까지 시간이 좀 걸릴 거예요",
        text_en: "It'll take a little while to get used to it",
        example: "한국어로 편하게 말하기까지 시간이 꽤 걸릴 거예요",
        example_en: "It'll take quite a while until I can speak Korean comfortably",
        when: "어떤 일이 될 때까지 얼마나 걸리는지 말할 때 써요.",
        when_en: "Use it to say how long it takes until something happens.",
        fix: "✕ 풀리기까지 2달이 걸려요 → ○ 풀리기까지 2달이 걸릴 거예요",
        fix_en: "If it hasn't happened yet, use the future: 걸릴 거예요.",
        tip: "-기까지 + 기간 + 걸렸어요 (과거) / 걸릴 거예요 (미래).",
        tip_en: "-기까지 + time + took (past) / will take (future).",
      },
    },
  },

  // 날씨 표현 모음: 날씨 종류마다 몇 개. 날마다 돌아가면서 하나를 보여 준다.
  weather: {
    sun: [
      { phrase: "하늘이 쨍해요", en: "The sky is bright and clear", note: "쨍하다: 햇빛이 아주 밝다", meaning: "dazzlingly bright (sunlight)" },
      { phrase: "구름 한 점 없어요", en: "There isn't a single cloud", note: "한 점: 아주 조금", meaning: "a single speck of" },
      { phrase: "햇살이 따사로워요", en: "The sunlight is pleasantly warm", note: "따사롭다: 따뜻하고 부드럽다", meaning: "gently warm" },
    ],
    cloud: [
      { phrase: "하늘이 잔뜩 흐려요", en: "The sky is completely overcast", note: "잔뜩: 아주 많이, 가득", meaning: "heavily, fully" },
      { phrase: "날씨가 꾸물꾸물해요", en: "The weather is gloomy, like it might rain", note: "꾸물꾸물하다: 곧 비가 올 것처럼 흐리다", meaning: "gloomy and heavy (weather)" },
      { phrase: "구름이 껴서 쌀쌀해요", en: "It's cloudy, so it's chilly", note: "구름이 끼다: 구름이 생기다", meaning: "clouds gather" },
    ],
    rain: [
      { phrase: "비가 추적추적 내려요", en: "The rain keeps drizzling down", note: "추적추적: 비가 조용히 계속 오는 모양", meaning: "steady, dreary drizzle" },
      { phrase: "소나기가 한바탕 쏟아졌어요", en: "There was a big burst of showers", note: "한바탕: 한 번 크게, 세게", meaning: "a (big) bout of" },
      { phrase: "비가 오락가락해요", en: "The rain keeps starting and stopping", note: "오락가락하다: 왔다 갔다 하다", meaning: "on and off" },
    ],
    snow: [
      { phrase: "눈이 펑펑 와요", en: "It's snowing heavily", note: "펑펑: 눈이 많이 오는 모양", meaning: "heavily (snow)" },
      { phrase: "길이 꽁꽁 얼었어요", en: "The roads are frozen solid", note: "꽁꽁: 아주 단단하게 언 모양", meaning: "frozen solid" },
    ],
    fog: [
      { phrase: "안개가 자욱해요", en: "The fog is thick", note: "자욱하다: 안개나 연기가 가득하다", meaning: "thick, dense (fog, smoke)" },
    ],
    storm: [
      { phrase: "천둥이 치고 번개가 쳐요", en: "There's thunder and lightning", note: "치다: 천둥, 번개가 생기다", meaning: "to strike (thunder, lightning)" },
    ],
    cold: [
      { phrase: "날씨가 쌀쌀해요", en: "The weather is chilly", note: "쌀쌀하다: 조금 춥다", meaning: "chilly" },
      { phrase: "손이 꽁꽁 얼 것 같아요", en: "My hands feel like they'll freeze", note: "꽁꽁: 아주 단단하게 언 모양", meaning: "frozen solid" },
      { phrase: "바람이 매서워요", en: "The wind is biting", note: "매섭다: 아주 차고 세다", meaning: "fierce, biting (cold)" },
    ],
  },

  // 이미 쓴 것 (다시 쓰지 않는다). days 가 생기기 전 표현은 여기에만 있다.
  past: {
    mood: ["상쾌하다", "후련하다", "흐뭇하다", "보람차다", "든든하다", "느긋하다", "산뜻하다", "홀가분하다", "차분하다", "나른하다", "흡족하다", "아리송하다", "대견하다", "개운하다", "포근하다", "막막하다", "짜릿하다", "들뜨다"],
    phrase: ["하마터면 큰일 날 뻔했어요", "한번 도전해 볼게요", "막상 해 보니까 괜찮더라고요", "어쩐지 사람이 많더라고요", "영화에 푹 몰입했나 봐요", "진작 할걸 그랬어요", "일하느라 정신이 없었어요", "오랜만에 푹 쉬었더니 살 것 같아요", "벌써 세 시간이나 지났어요", "가격은 비싼 반면에 맛은 최고예요", "익숙해지기까지 시간이 좀 걸릴 거예요"],
  },
};
