---
name: weekly-check
description: Tuesday no-hint test before the Wednesday lesson — 10 items on the week's new grammar, older points and the user's worst mistake type, plus a check of the homework sentences and the podcast's unsure sentences — then levels points up or down (the only way to reach levels 3–5), writes the weekly report (blocks done vs planned, levels, no-hint uses, open mistakes by type, listening result, Anki streak) and the questions for the tutor. Use when the user runs /weekly-check, on Tuesday, or when korean-mentor reaches the weekly check block.
---

# Weekly check

Runs the night before the lesson, so what goes wrong becomes Wednesday's questions. Prompts are in Korean, feedback in English. **No hints of any kind**: don't name the grammar point, don't put it in brackets, don't give the first word.

## Setup

1. Read the newest plan in `weeks/`, `progress/grammar.md`, `progress/mistakes.md`, and `Grammar/README.md` to find the point files you need.
2. If **Weekly report** in the plan is already filled in, say so and ask whether to run it again (counts don't change twice in a week).
3. Pick 10 items:
   - **4 on this week's new points** (2 each; in a light week, 4 on the last 3 weeks' new points).
   - **4 older points**: first those at level 2 or higher that are due within the next 7 days (a pass moves them up to 3–5), then any due point. No two items on the same point.
   - **1 on the worst mistake type**: the type tag with the most open items in `progress/mistakes.md`. If that's `[문법]`, use the grammar point that shows up most among those items. Use a new situation, not the old sentence.
   - **1 open item** combining a new point with a due point in one answer (e.g. a 2–3 sentence story).
4. Tell the user in one line: `Weekly check: 10 items, no hints. Take your time.`

## Item formats

Mix them; most should make the user produce Korean:
- **Situation → Korean** (5–6 items): a short situation in English, e.g. "You had coffee at 9pm and couldn't sleep. Tell your friend." The point must be the natural choice, but don't name it.
- **Fix this sentence** (2 items): a sentence with one mistake, in a new situation.
- **Question → 2–3 sentences** (the last 1–2 items): a Korean question that calls for a short story or reason.

Show `[n/10]` before each item. Play each Korean prompt with `.claude/skills/korean-mentor/speak.sh "<Korean>"` (plain Bash, only the Korean sentence). Give a one-line ✔ or ✏️ right after each answer, with a short English reason for ✏️. Don't re-ask missed items; the result is what counts.

A point counts as **right** only if it's used correctly and naturally with no hint. Using a different, also-correct structure is not wrong, but it doesn't count as a pass for that point (say so and give the target version).

## Homework check

First ask for the week's **오늘 써 봤어요** sentences: on the site's 오늘 page, the user presses **기록 복사** and pastes the text (lines like `2026-11-07 #58 「…」 → <sentence they used>`). They live only in the browser, so if the user has none or skips it, move on. For each sentence: ✔ if the point is used correctly and naturally, or ✏️ with the fix and a short English reason. A ✔ counts as a no-hint use of that point (+1 No-hint, and +1 level like a check item, still one change per point per day); a ✏️ goes to **Practice mistakes** like any other. Mention the count in the report line as `used n/7`.

Then, if **Podcast** in the plan lists `Unsure:` sentences (from the user's podcast or blog post), check those the same way: ✔ or ✏️ with a short reason. If one is still a nuance question, add it to **To verify** and **Questions for the tutor**.

After item 10, ask for the homework sentences (the 5 in the plan, or whatever the tutor assigned). If the user hasn't done them, skip this. For each sentence: ✔, or ✏️ with the fix and a short English reason. Keep it light: the tutor checks them tomorrow, and this is just to catch the easy mistakes first. Nuance questions go to **To verify**.

## Update progress

- **`progress/grammar.md`** for every point tested (rules in **How levels work**):
  - right → +1 level (this can go above 2), +1 No-hint
  - wrong → −1 level
  - one change per point per day
  - Last practiced = today, Next review = today + interval
- **`progress/mistakes.md`:**
  - New clear mistakes from the items and the homework → **Practice mistakes** with a type tag, `(YYYY-MM-DD weekly)` · 0/2.
  - The worst-type item: if right, add `· right <date>` to the matching **Recurring** item if there is one; if wrong, add the date and sentence to it.
- **`progress/notes.md`:** nuance questions → **To verify**.

## Weekly report

Copy the Anki collection to the scratchpad (`cp ~/snap/anki-desktop/common/User\ 1/collection.anki2 "$SCRATCH/collection.anki2"`), then run:

```bash
python3 -I .claude/skills/weekly-check/stats.py weeks/<plan>.md "$SCRATCH/collection.anki2"
```

Last week's numbers are in **Weekly reports** in `progress/log.md`. Write a one-line report at the top of that section, and a short version under **Weekly report** in the plan:

```
2026-11-10 · week 1 · blocks 15/21 · check 7/10 · new: #57 L1, #58 L2 · level 3+: 8 (+2) · no-hint 34 (+6) · open mistakes 28 (−2), most: [조사] 6 · listening 60% → 85% · podcast 3:10 (self 4/3/4/3) · used 3/7 · Anki 80-day streak, 6/7 days
```

- **podcast** = the newest `Speaking/log.md` podcast line this week, or `podcast –` if there isn't one.

- **check** = items right out of 10. **(+n)** = change since last week's line; leave it out the first week.
- In the plan, add 2–3 lines under the numbers: what improved, what to watch, and the focus for next week (in English).
- **Too much planned?** If blocks done are under 70% of planned this week *and* last week, suggest a lighter plan in one line (e.g. drop Saturday and the Friday listening step), and ask before changing anything.

## Questions for the tutor

Update **Questions for the tutor** in the plan so it's ready for tomorrow: the existing 3, plus anything from today that the tutor should settle (a structure the user got wrong and doesn't understand, or a homework nuance). Keep it to 5 at most, worded so the user can ask them in Korean or English.

## Website

Write the 주간 정리 post (format in `.claude/skills/website-update/SKILL.md`, step 2) from the report, then run `python3 -I website/build_data.py` so the 이번 주 page and 문법 levels show the new numbers. Don't stage `website/`.

## Finish

- Tick `☐ weekly check` → `☑ weekly check` in today's Schedule row.
- Recap in a few lines: the score, points that moved up or down, the report line, and the questions for tomorrow.
- Commit, don't push:

```bash
git add progress/ weeks/
git commit -m "Weekly check 2026-11-10: 7/10"
```

Give the short hash.

When this runs as a block of `/korean-mentor`, skip the commit above: korean-mentor ticks the block and commits at the end of the run.
