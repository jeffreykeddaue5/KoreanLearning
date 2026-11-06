---
name: website-update
description: Updates the Korean blog in website/ — the 써먹을 표현 panel (website/data/today.js), the automatic posts (수업 after lesson-intake on Wednesday, 주간 정리 after weekly-check on Tuesday), and an 일상 or 대화 post when the user asks for one, then runs daily-update. Use when the user runs /website-update, asks to update the website or write a post; lesson-intake and weekly-check use its post formats.
---

# Website update

The site is in `website/` (see `website/notes.md`). Posts are one JS file each in `website/posts/`, listed in `website/posts/list.js`. Categories: `lesson` 수업 · `weekly` 주간 정리 · `daily` 일상 · `talk` 대화. There is **no** per-session post: a normal study day only changes the panels.

Keep everything short and simple: this is a personal blog, not study notes. Posts are in simple Korean, 반말 diary style like the existing ones.

With no arguments, do step 1 and step 3. Do step 2 only when called for a post (by lesson-intake, weekly-check, or the user).

## 1. 써먹을 표현 (`TODAY.phrase` in `website/data/today.js`)

The top panel on the home page. Pick one natural Korean phrase that fixes or goes with a mistake from today's session (or an open item in `progress/mistakes.md`), something the user can actually say in conversation. Not one in `phrase.past`.

- `text`: the phrase (no 「」, the page adds them).
- `when`: one or two simple Korean sentences on when to use it.
- `fix`: one ✕ → ○ pair it helps with.
- `tip`: a one-line reminder.
- Append `text` to `past`.

Skip this step if `past` already ends with a phrase picked today and nothing new came up.

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

### 일상 / 대화 (`daily` / `talk`, only when the user asks)

The user writes these. Help with the file: date, title, tags, their text as paragraphs. If they ask for corrections, add a short `{ heading: "고친 것" }` section at the end with ✕/○ pairs; never silently rewrite their sentences. 대화 = a conversation written out (e.g. from a lesson or speaking session), one line per speaker: `"<b>나:</b> …"`.

## 3. Panels

Follow `.claude/skills/daily-update/SKILL.md` (weather and mood once a day, then the `study.js` rebuild).

## Check

Run `node --check` on `website/data/today.js` and on any new post. Don't stage or commit anything in `website/`. Don't push. Tell the user what changed in a few lines.
