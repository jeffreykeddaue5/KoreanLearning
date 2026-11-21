# Daily mistakes log (오늘의 실수)

Every block that gives feedback on the user's Korean (grammar session, warm-up, lesson review, homework, weekly test, practice-mistakes, pinned-words, podcast fixes, listening answers in Korean) writes **every** correction and **every** more-natural suggestion to `progress/daily/YYYY-MM-DD.md`, right after giving the feedback. The website's 오늘의 실수 page shows this file (asked 2026-11-18: "way more detail").

- **Chat stays short** (1–2 main fixes per answer, as each skill says). The log gets **everything**: main errors, small slips you let go in chat (spelling, particles, spacing that changes meaning, word choice), and every 💡.
- If a fix was only logged, not shown, add one line in chat: `+2 small slips saved to 오늘의 실수`.
- **💡 더 자연스러워요:** the sentence was correct but a Korean would say it differently (a tutor-style rewrite, a more natural word, a set phrase, a better ending). Log one even on a ✔ answer. Never present a 💡 as an error.
- **Every ✏️ row has a Type.** A row with no clear error type is a rewrite and goes under 💡 instead. The review game (`gui/static/game.js`) quizzes ✏️ rows by typing the fix and 💡 rows by picking, so mixing them up makes the game unfair.
- One row per fix. Write the user's sentence as they wrote it (short part around the error is fine), the fix, and a short English reason. Nuance guesses get `(⚠ check with tutor)`.

Create the file if missing:

```markdown
# 2026-11-19

## ✏️ 고쳤어요
| Block | Type | You said | Better | Why |
|---|---|---|---|---|
| grammar Q1 | 문법 | 여자친구가 피곤하는 바람에 | 피곤해서 / 과제가 많은 바람에 | -는 바람에 = an event, not a state |
| grammar Q1 | 맞춤법 | 위로해 줄려고 | 위로해 주려고 | -(으)려고, no ㄹ (small slip) |

## 💡 더 자연스러워요
| Block | You said | More natural | Why |
|---|---|---|---|
| grammar Q2 | 맛있어서 또 가고 싶어요 | 너무 맛있어서 또 가 보고 싶어요 | 가 보다 = try going again, softer |
```

**Block:** `grammar Q3`, `warm-up`, `lesson review`, `homework 2`, `weekly 4`, `mistakes drill`, `pinned`, `podcast v3`, `listening`, `article`.
**Type:** `시제` tense · `조사` particles · `어휘` word choice · `어순` word order · `문법` grammar · `맞춤법` spelling · `존댓말` politeness.

This log is in addition to `progress/mistakes.md` (which tracks what to practice) and the session notes; don't skip those.
