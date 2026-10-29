---
name: website-update
description: Updates the Korean blog in website/ after a study session — a short 실수 blog post from today's session and the 써먹을 표현 panel, then runs daily-update for the side panels if it hasn't run yet today. Runs at the end of every korean-mentor session; also use when the user runs /website-update or asks to update the website after a session.
---

# Website update

The site is in `website/` (see `website/notes.md`). Do steps 1–3, then tell the user what changed in a few lines. Keep everything short and simple: this is a personal blog, not study notes.

## 1. 실수 blog post (`website/posts/`)

Write one post about today's session mistakes. Name it `YYYY-MM-DD-<short-english-slug>` (lowercase, hyphens; add `-2` if taken), write the file directly (don't copy `_template.js`), and add the name to the top of `POST_FILES` in `website/posts/list.js`. Match `website/posts/2026-10-21-banmal-mistake.js`:

```js
post({
  title: "짧은 제목",
  date: "YYYY-MM-DD",
  category: "mistakes",
  tags: ["한국어", "<main grammar point>"],
  content: [
    "한두 문장: 무엇을 하다가 틀렸는지.",
    { quote: "✕ 틀린 문장<br>○ 맞는 문장" },
    "한 문장: 왜 틀렸는지 / 기억할 점.",
  ],
});
```

- Written in simple Korean (반말 diary style like the existing posts), easy to read.
- Include every mistake from the session, but condensed: one ✕/○ pair per distinct mistake (if the same mistake happened more than once, show it once). The ✕/○ sentences don't have to be the user's exact words. A short, simplified sentence showing the same error is better. Keep the explanation line to one short sentence each. Skip nuance tips.
- If there were no real mistakes, write about the one correction or near-miss instead, still short.
- Use `'` or backticks inside strings that contain `"`.

## 2. 써먹을 표현 (`index.html`, the `<template id="page-phrase">` block at the bottom)

The top panel on the home page. Pick one natural Korean phrase that fixes or goes with a mistake from today's session (or a recurring mistake in `KoreanProgress.md`), something the user can actually say in conversation. Don't reuse a phrase from the `<!-- 지난 표현: … -->` comment.

Update:
- `<p class="phrase">`: the phrase in 「…」.
- The next `<p>`: one or two simple Korean sentences on when to use it.
- The `small` line: one ✕ → ○ pair from today that the phrase helps with, plus a one-line reminder.
- Add the phrase to the `<!-- 지난 표현: … -->` comment.

## 3. Side panels

Check the `<!-- daily-update: YYYY-MM-DD -->` comment in `website/index.html`. If it isn't today's date (`date +%F`), follow `.claude/skills/daily-update/SKILL.md`. If it is, skip this step and leave the side panels alone.

## Check

Run `node --check` on the new post (and on `website/script.js` if step 3 ran). Don't stage or commit anything in `website/`. Don't push.
