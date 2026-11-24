# Daily mistakes log (오늘의 실수)

Every block that gives feedback on the user's Korean (grammar session, warm-up, lesson review, homework, weekly test, practice-mistakes, pinned-words, podcast fixes, listening answers in Korean) writes **every** correction and **every** more-natural suggestion to `progress/daily/YYYY-MM-DD.md`, right after giving the feedback. The website's 오늘의 실수 page shows this file (asked 2026-11-18: "way more detail").

- **Chat stays short** (1–2 main fixes per answer, as each skill says). The log gets **everything**: main errors, small slips you let go in chat (spelling, particles, spacing that changes meaning, word choice), and every 💡.
- If a fix was only logged, not shown, add one line in chat: `+2 small slips saved to 오늘의 실수`.
- **💡 더 자연스러워요:** the sentence was correct but a Korean would say it differently (a tutor-style rewrite, a more natural word, a set phrase, a better ending). Log one even on a ✔ answer. Never present a 💡 as an error.
- **Every ✏️ row has a Type.** A row with no clear error type is a rewrite and goes under 💡 instead. The review game (`gui/static/game.js`) quizzes ✏️ rows by typing the fix and 💡 rows by picking, so mixing them up makes the game unfair.
- **Example (asked 2026-11-24):** every row ends with one new example sentence that uses the right form in a different, everyday situation (short, only grammar the user knows), e.g. `볼지도 몰라요` → `내일 비가 올지도 몰라요.` The website shows it as 예) under the reason.
- **Kind (💡 only):** `단어 선택` (a better word), `표현` (a better pattern/ending), `더 정확하게` (say it more exactly: how far, how many, 만/도). The website groups 💡 cards by it.
- One row per fix. Write the user's sentence as they wrote it (short part around the error is fine), the fix, and a short English reason. Nuance guesses get `(⚠ check with tutor)`.

Create the file if missing:

```markdown
# 2026-11-19

## ✏️ 고쳤어요
| Block | Type | You said | Better | Why | Example |
|---|---|---|---|---|---|
| grammar Q1 | 문법 | 여자친구가 피곤하는 바람에 | 피곤해서 / 과제가 많은 바람에 | -는 바람에 = an event, not a state | 길이 막히는 바람에 늦었어요. |
| grammar Q1 | 맞춤법 | 위로해 줄려고 | 위로해 주려고 | -(으)려고, no ㄹ (small slip) | 친구를 도와주려고 일찍 왔어요. |

## 💡 더 자연스러워요
| Block | You said | More natural | Why | Kind | Example |
|---|---|---|---|---|---|
| grammar Q2 | 맛있어서 또 가고 싶어요 | 너무 맛있어서 또 가 보고 싶어요 | 가 보다 = try going again, softer | 표현 | 그 카페 다음에 또 가 보고 싶어요. |
```

**Block:** `grammar Q3`, `warm-up`, `lesson review`, `homework 2`, `weekly 4`, `mistakes drill`, `pinned`, `podcast v4`, `listening`, `article`.
**Type:** `시제` tense · `조사` particles · `어휘` word choice · `어순` word order · `문법` grammar · `맞춤법` spelling · `존댓말` politeness.

The GUI also appends a `## 📝 세션 노트` section at its final page (stats, then → now, keep, next); don't edit it by hand. The website shows it folded.

This log is in addition to `progress/mistakes.md` (which tracks what to practice) and the session notes; don't skip those.
