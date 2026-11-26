---
name: weekly-check
description: Tuesday test/review before the Wednesday lesson — the week's question set from progress/questions.md asked again, timed, in the same card format as a grammar session with the format and past-mistake hints (no penalty) (7 scored items covering the week's new grammar, due older points and the user's worst mistake type, then the 5 homework sentences as unscored cards), plus a check of the podcast v1's unsure sentences — then levels points up or down (the only way to reach levels 3–5), writes the weekly report (blocks done vs planned, levels, no-hint uses, open mistakes by type, listening result, Anki streak) and the questions for the tutor. Use when the user runs /weekly-check, on Tuesday, or when korean-mentor reaches the weekly check block.
---

# Weekly check

Runs the night before the lesson, so what goes wrong becomes Wednesday's questions. Prompts are in Korean, feedback in English. **Normal review format with hints (asked 2026-11-25, replaced the no-hint fun mode):** every item is a regular prompt card like a grammar session, with the 💬 format hint (`frame`) and 🔁 past-mistake hint (`trap`) behind their buttons, and one Anki word (pinned first, then `use_trouble`). Hints carry no penalty (see **How it runs**).

## Setup

1. Read the newest plan in `weeks/`, `progress/grammar.md`, `progress/mistakes.md`, and `Grammar/README.md` to find the point files you need.
2. If **Weekly report** in the plan is already filled in, say so and ask whether to run it again (counts don't change twice in a week).
3. Pick 7 scored items (cut from 10 by 3/4 on 2026-11-26, quality over quantity) **from the week's question set** in `progress/questions.md` (since 2026-11-18 the test asks the questions the user practiced all week, not new situations, so the score shows whether the practice stuck):
   - **5 week-set questions**, roughest first, so that each new point is the natural answer to at least 2 of them (in a light week: the last 3 weeks' points). Weekend questions are asked in their past version.
   - **2 follow-ups**, each carrying one older point: first those at level 2+ due within 7 days (a pass moves them to 3–5), then any due point. No two items on the same point.
   - **The worst mistake type** (most open items by tag in `progress/mistakes.md`; for `[문법]`, the point that shows up most): one of the follow-ups must force it (e.g. for `[시제]`, ask about yesterday right after a question about tomorrow).
   - A follow-up reacts to what the user just said, like in a session; only its target is planned.
4. Tell the user in one line (terminal only; the GUI shows no setup text): `Weekly test: this week's questions, hints if you need them. ⏱ 30 s each, say it, send ., then type it.`

## Format (asked 2026-11-25)

Same as every other review block, no game wrapping (no story, hearts, boss or stars):
- **7 scored items**, labelled `Test n/7`, worded like grammar-session prompts (a short reaction to the last answer can open the next one, as in a session). Weekend questions in their past version, last.
- **Hints on every card**, built exactly as in a grammar session (gui-mode.md **Hints**): `frame` = a whole-sentence frame with the point the item targets and natural chunks, blanks labelled `___(word)` / `___(phrase)`; `trap` = the past mistake the item is most likely to trigger (for the worst-type item, that Recurring item), or `null`.
- **Then the 5 homework sentences**, labelled `Homework n/5`, same cards with hints. A/B dialogue items: A in `ko`, the user answers as B. Others: a cue question whose natural answer is the homework sentence, with the English sentence to say in `extra` (`say: That drama is worth watching…`). Unscored (see **Podcast unsure sentences** below for how they're logged).
- No `game` field in the GUI. In the terminal, the usual one-line feedback.
- The test ends with the homework cards, then a summary (the 어제 실수 game runs before it, on the page).

## How it runs

Same as a grammar session (`.claude/skills/korean-mentor/session.md`: prompt card, speak.sh + timer started before the card, say it → `.` → type it), with these differences:
- **Hints as in a grammar session, no penalty** (asked 2026-11-25): an answer after `used: frame` / `trap` is graded like any other (levels, +1 No-hint, Smooth all as normal); mark the history line `(frame)` so it's visible. `?` = stuck: give the model sentence, the item is ✏️.
- `Test n/7` instead of `Qn / total`. Every card has one Anki word.
- One-line ✔ or ✏️ right after each answer, with last time (from the question's history) so the user sees the week's change: `⏱ 18s spoken · ✔ (Thu 1:12 ✏️)`. Don't re-ask missed items.
- Log every fix and 💡 to `progress/daily/<today>.md` (`.claude/skills/_shared/daily-mistakes.md`), Block `weekly n`.
- Add each answer to the question's history line in `progress/questions.md` with `(weekly)`; ✔ ≤ 30 s twice in a row still moves it to **Smooth**.

A point counts as **right** only if it's used correctly and naturally, **within 60 s** (a hint doesn't change this). Over 60 s it's ✔ for the history but no level change. Using a different, also-correct structure is not wrong, but it doesn't count as a pass for that point (say so and give the target version).

## Podcast unsure sentences

Right after the 7 items: if **Podcast** in the plan lists `Unsure:` sentences (from the user's podcast or blog post), check those the same way: ✔ or ✏️ with a short reason. If one is still a nuance question, add it to **To verify** and **Questions for the tutor**.

The 5 homework sentences come right after the 7 items as `Homework n/5` cards (see **Format**; inside the test since 2026-11-24, when a separate homework block was too much for Tuesday), with feedback right away (✔ = +1 No-hint, no level change; ✏️ → Practice mistakes `(date homework)`), logged to `progress/daily/` (Block `homework n`) and saved under `## My homework` in the plan as the homework block would, but not counted in the score; then tick the homework too.

## Update progress

- **`progress/grammar.md`** for every point tested (rules in **How levels work**):
  - right → +1 level (this can go above 2), +1 No-hint
  - wrong → −1 level
  - one change per point per day
  - Last practiced = today, Next review = today + interval
- **`progress/mistakes.md`:**
  - New clear mistakes from the items → **Practice mistakes** with a type tag, `(YYYY-MM-DD weekly)` · 0/2.
  - The worst-type item: if right, add `· right <date>` to the matching **Recurring** item if there is one; if wrong, add the date and sentence to it.
- **`progress/notes.md`:** nuance questions → **To verify**.

## Weekly report

Copy the Anki collection to the scratchpad (`cp ~/snap/anki-desktop/common/User\ 1/collection.anki2 "$SCRATCH/collection.anki2"`), then run:

```bash
python3 -I .claude/skills/weekly-check/stats.py weeks/<plan>.md "$SCRATCH/collection.anki2"
```

Add to the line the test's average spoken time and how it compares with the first time those questions were asked (Thu): `check 7/10 · avg 0:31 (Thu 1:05)`.

Last week's numbers are in **Weekly reports** in `progress/log.md`. Write a one-line report at the top of that section, and a short version under **Weekly report** in the plan:

```
2026-11-10 · week 1 · blocks 15/21 · check 7/10 · avg 0:31 (Thu 1:05) · new: #57 L1, #58 L2 · level 3+: 8 (+2) · no-hint 34 (+6) · open mistakes 28 (−2), most: [조사] 6 · listening 60% → 85% · podcast 3:10 (self 4/3/4/3) · Anki 80-day streak, 6/7 days
```

- **podcast** = the newest `Speaking/log.md` podcast line this week, or `podcast –` if there isn't one.

- **check** = items right out of 7 (out of 10 before 2026-11-26; compare as a fraction). **(+n)** = change since last week's line; leave it out the first week.
- In the plan, add 2–3 lines under the numbers: what improved, what to watch, and the focus for next week (in English).
- **Too much planned?** If blocks done are under 70% of planned this week *and* last week, suggest a lighter plan in one line (e.g. make Thursday's podcast v1 one unscripted minute, or drop Saturday), and ask before changing anything.

## Questions for the tutor

Update **Questions for the tutor** in the plan so it's ready for tomorrow: the existing 3, plus anything from today that the tutor should settle (a structure the user got wrong and doesn't understand, or a homework nuance). Keep it to 5 at most, worded so the user can ask them in Korean or English.

## Website

Write the 주간 정리 post (format in `.claude/skills/website-update/SKILL.md`, step 2) from the report, then run `python3 -I website/build_data.py` so the 이번 주 page and 문법 levels show the new numbers. Don't stage `website/`.

## Finish

- Tick `☐ weekly test` → `☑ weekly test` in today's Schedule row (old plans: `weekly check`).
- Recap in a few lines: the score, points that moved up or down, the report line, and the questions for tomorrow.
- Commit, don't push:

```bash
git add progress/ weeks/
git commit -m "Weekly check 2026-11-10: 7/10"
```

Give the short hash.

When this runs as a block of `/korean-mentor`, skip the commit above: korean-mentor ticks the block and commits at the end of the run.
