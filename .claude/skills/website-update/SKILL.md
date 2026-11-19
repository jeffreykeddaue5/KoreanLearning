---
name: website-update
description: Updates the Korean blog in website/ — the weekly list for the 오늘 panel (website/data/today.js: a 써먹을 표현 tied to a grammar point, plus 오늘의 기분, for each day until the next lesson), the automatic posts (수업 after lesson-intake on Wednesday, 주간 정리 after weekly-check on Tuesday), and an 일상 post when the user asks for one (e.g. the weekly podcast write-up), then runs daily-update. Use when the user runs /website-update, asks to update the website or write a post; lesson-intake and weekly-check use its post formats.
---

# Website update

The site is in `website/` (see `website/notes.md`). Posts are one JS file each in `website/posts/`, listed in `website/posts/list.js`. Categories: `lesson` 수업 · `weekly` 주간 정리 · `daily` 일상. (대화 was removed on 2026-11-06.) There is **no** per-session post: a normal study day only changes the panels.

Keep everything short and simple: this is a personal blog, not study notes. Posts are in simple Korean, 반말 diary style like the existing ones.

With no arguments, do step 1 (only if the list has run out or the user asks) and step 3. Do step 2 only when called for a post (by lesson-intake, weekly-check, or the user).

## 1. 오늘 panel: the weekly list (`website/data/today.js`)

The 오늘 page (`#/today`: 써먹을 표현 + 오늘의 문법 · 오늘의 기분 · 오늘 날씨 · 이번 주 표현), linked from a one-line orange box at the top of the home page. Filled **once a week**: lesson-intake calls this on Wednesday for Thursday through the next Wednesday (7 days). Run it by hand any time the list has run out (no entry for today or later in `TODAY.days`).

**Add** one entry per new date (`YYYY-MM-DD`) to `days` and set `week` to the new range. Never delete old dates: the 지난 표현 page (`#/phrases`) lists every past day. Every Korean line has an English `_en` line (shown plainly under the 써먹을 표현 explanations; blurred until tapped for the phrase itself, mood and weather), so the user never needs a dictionary.

- `mood`: one feeling word **the user already knows** (asked 2026-11-18): it must be in Anki (`python3 -I .claude/skills/_shared/anki.py words | grep -x <word>` prints it), e.g. 설레다, 뿌듯하다, 아쉽다, 지치다, 후련하다, 기대되다, 든든하다. Prefer pinned / trouble words, and don't repeat one used in the last 14 days of `days`. The `sentence` also uses only Anki words and basic words (no new vocabulary). Fit it to the day if you can (기대되다 on lesson day). Fields: `face` (kaomoji), `word`, `meaning` (English), `sentence` (short, …요, nothing that claims something about the user's day that may not happen), `sentence_en`.
- `phrase`: one phrase the user can **actually say to their tutor in the Wednesday lesson** (asked 2026-11-19; the model is 이게 맞는지 모르겠어요): checking their Korean (이렇게 말해도 돼요?, 이게 맞는지 모르겠어요), asking what something means or how to say it, asking the tutor to repeat or slow down, explaining what they meant, buying time while thinking, saying they forgot or got it now, talking about homework or practice (숙제를 하느라 바빴어요). Not a random life sentence. Built on that day's **grammar point** (`grammar`: the point number in `progress/grammar.md`, the page links it), and **only grammar the user already knows**: a point already in `progress/grammar.md` (no QUEUE or not-yet-taught points), and only words they know (Anki + basic). Spread the week: the 2 new points first, then due review points (lowest level first), and tie each one to an open mistake in `progress/mistakes.md` when there is one. If a point can't make a natural tutor phrase, pick another known point rather than force it. Not in `past.phrase`. Fields: `text`, `text_en`, `example` + `example_en` (a second short sentence with the same grammar, about the user's own life: work as a programmer, pickleball, dramas, games, the lesson, weekends; something they could say this week), `when` + `when_en` (one or two simple sentences), `fix` (one ✕ → ○ pair) + `fix_en` (why, one line), `tip` + `tip_en` (one-line reminder).
- Append the new words and phrases to `past.mood` and `past.phrase`.
- `weather`: phrase bank by kind (`sun`, `cloud`, `rain`, `snow`, `fog`, `storm`, `cold`), each `{ phrase, en, note, meaning }`. The page picks one by the live weather, rotating daily. **Only Anki words + basic words** (same check as mood); `note` names the Anki word it practices. Leave it alone unless the season changes; then swap in a few fitting ones (e.g. 덥다 / 습하다 in summer). The weather box shows no temperature or advice line, just the picture and the phrase.

No `「」` in any text, the page adds them. Use no Korean the user would have to look up without an English line next to it.

## 2. Posts

Name the file `YYYY-MM-DD-<short-english-slug>.js` (lowercase, hyphens; add `-2` if taken), write it directly, and add the name to the top of `POST_FILES` in `website/posts/list.js`. Use `'` or backticks inside strings that contain `"`.

### 수업 (`lesson`, Wed, from lesson-intake)

Match `website/posts/2026-11-04-homework-review.js`. Tags: `["수업", "<new point 1>", "<new point 2>"]`.

```js
post({
  title: "19회 수업: -았/었더니, -느라(고)",
  date: "YYYY-MM-DD",
  category: "lesson",
  tags: ["수업", "-았/었더니", "-느라(고)"],
  content: [
    "한두 문장: 수업에서 무슨 얘기를 했는지 (주말, 숙제 주제).",
    { heading: "새 문법" },
    "#57 -았/었더니: 한 줄 뜻 + 예문 하나.",
    { heading: "선생님이 고쳐 준 것" },
    { quote: "✕ 틀린 문장<br>○ 맞는 문장" },
    "한 문장: 왜.",
  ],
});
```

- Every tutor correction from the lesson file, condensed: one ✕/○ pair per distinct mistake, a short simplified sentence is fine. One short line of explanation each. Skip nuance.
- At most 3 answered questions from the tutor, one line each, if any.

### 주간 정리 (`weekly`, Tue, from weekly-check)

From the plan's **Weekly report**. Title like `1주차 정리: 문법 8/10`.

```js
content: [
  "한두 문장: 이번 주는 어땠는지.",
  { html: "<pre class='bar'>진도 ████████░░ 17/21\n레벨 3+ 6 → 8\n듣기 60% → 85%\nAnki 12일 연속</pre>" },
  { heading: "잘한 것" }, "…",
  { heading: "아직 틀리는 것" },
  { quote: "✕ …<br>○ …" },
  { heading: "다음 주" }, "한 줄.",
]
```

Numbers come from the report only; don't invent any.

### 일상 (`daily`, only when the user asks)

The user writes these. Help with the file: date, title, tags, their text as paragraphs. If they ask for corrections, add a short `{ heading: "고친 것" }` section at the end with ✕/○ pairs; never silently rewrite their sentences. If it's the podcast write-up, keep any `(?)` marks the user added: those sentences go to the weekly check.

## 3. Panels

Follow `.claude/skills/daily-update/SKILL.md` (the `study.js` rebuild).

## Check

Run `node --check` on `website/data/today.js` and on any new post. Don't stage or commit anything in `website/`. Don't push. Tell the user what changed in a few lines.
