---
name: practice-mistakes
description: Quick 10-item Korean drill on the user's open mistakes from KoreanProgress.md (Practice, Lesson and Recurring mistakes), optionally limited to one type of mistake, then updates the counts. Use when the user runs /practice-mistakes or wants to practice or review their mistakes outside a korean-mentor session (e.g. "/practice-mistakes", "/practice-mistakes 시제").
---

# Practice Mistakes

A 5–10 minute drill on the user's own mistakes, separate from `korean-mentor` sessions.

## Setup

1. Read **Recurring mistakes**, **Practice mistakes**, **Lesson mistakes** and **Session log** in `KoreanProgress.md`. Open items are all Recurring mistakes, plus Practice and Lesson mistakes not marked ✓. If there are none, say so and stop.
2. Pick 10 items:
   - `/practice-mistakes`: 3 Recurring mistakes with the newest dates, then 7 Practice and Lesson items, lowest count first, then oldest.
   - `/practice-mistakes 시제`: only open items of that type, e.g. 시제 (tense), 조사 (particles), 어휘 (word choice), or a grammar point such as `-는 데`. Same order as above. If fewer than 10 fit, ask only those.

## How to run it

- Show one item at a time, with `[n/total]` in front.
- Items 1–8 are "fix this sentence". The last 2 give only a situation in English or simple Korean, and the user writes the sentence.
- **Change the situation.** Don't reuse the wrong sentence as written: keep the mistake but change the people, place or verb, so a memorized answer won't work. Don't say what's being tested until the user has answered.
- For Lesson mistakes, grep the `Homework/` lesson named in the item and use the tutor's wording in the feedback.
- Follow **Feedback** in `.claude/skills/korean-mentor/SKILL.md`, with a one-line ✔ or ✏️ for each answer.
- Read each Korean prompt aloud as in `korean-mentor`, with `.claude/skills/korean-mentor/speak.sh "<Korean text>"` (plain Bash, not `run_in_background`). Don't mention the audio unless it fails. Pass only the sentence to answer or fix. If the script fails, say so in one line and carry on without audio.
- After the last item, ask the missed items again, each with a new situation. Only the first answer changes the counts.

## Ending

When the items are done or the user stops, recap in a few lines: what they got right, and what still came up, with the fixed sentence. If they stop early, count only the items they answered.

Then update `KoreanProgress.md`. A hint means the answer doesn't count as right.

Counts go up at most once a day. If **Session log** already has a line dated today, nothing goes up this run, but resets still apply.

- **Practice mistakes:** +1 if right, and delete the item at 2/2. Reset to 0/2 if wrong.
- **Lesson mistakes:** +1 if right, and at 2/2 mark it `· ✓ <date>`. If wrong, reset to 0/2 and add it to **Recurring mistakes**.
- **Recurring mistakes:** these have no count, and being right doesn't remove them. If right, add or update `· right <date>` on the item. If wrong, add the date and sentence to its list, e.g. `2026-10-30 drill: 들어요 → 들었어요`.
- **New mistakes** in the user's own sentences go under **Practice mistakes** in the usual format, keeping at most 10 items and dropping the oldest. Add subtle nuance questions to **To verify**.
- **Session log:** add one line at the top, e.g. `2026-10-30 · practice-mistakes · drill · strong: 걸릴 거예요 · fix: 들었어요`. Keep only the last 15 lines.

Don't update the Grammar points table, `sessions/` or the website.

Then commit only that file (`git add KoreanProgress.md`), with a message like the one below, and don't push:

```
Practice mistakes 2026-10-30

strong: 걸릴 거예요 · fix: 들었어요
```

Finally, tell the user in one line that progress was saved and committed, with the short commit hash.
