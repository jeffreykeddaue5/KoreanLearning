---
name: lesson-intake
description: Processes the newest Wednesday lesson file in Homework/ and builds the week's study plan in weeks/ — adds the lesson's new grammar (and, to make 2 a week, points from Grammar/QUEUE.md) to Grammar/ and progress/grammar.md, adds the tutor's corrections to progress/mistakes.md, applies answers to To verify questions, and lists due reviews, lesson words, tutor questions and the day-by-day schedule. Use after the user's Wednesday lesson, when the user runs /lesson-intake, or when korean-mentor finds a lesson file with no plan yet.
---

# Lesson intake

The user has a 1-hour lesson every **Wednesday at 9pm** (30 min talking about their weekend, 30 min going over homework) and writes the notes to `Homework/NN-YYYY-MM-DD.md`. This skill turns that file into next week's plan. Explanations to the user are in English. Keep everything short.

## 1. Find the lesson

- The newest `Homework/NN-YYYY-MM-DD.md` is the lesson. Its date names the plan: `weeks/YYYY-MM-DD.md`.
- If that plan already exists, say so and ask whether to redo it. Stop if not.
- If the lesson file is missing or nearly empty, ask the user to finish their notes first.
- Add the lesson to the table in `Homework/README.md` if it isn't there.

## 2. Read the lesson

Read the lesson file in full. Mistakes are marked `(❌)`, fixes come after `➡️` or as `(✅)`, and explanations are in `cf)` and `💡` lines.

**a. Answers to questions.** If `🧐질문` has answers, match them to **To verify** in `progress/notes.md` and to **Questions for the tutor** in last week's plan. For each answered item:
- delete it from To verify;
- if the answer changes a rule, fix the note in `Grammar/` (drop the ⚠).

**b. New grammar.** Look in `🧩문법`, and in `💬표현` / `📝숙제` / `💡` lines, for grammar not yet in `Grammar/README.md`. Grammar from the lesson always gets added, even if there are more than 2.

**c. Tutor corrections.** For each distinct `(❌)` → fix:
- Add it to **Lesson mistakes** in `progress/mistakes.md` with a type tag and the lesson number: `[조사] 몸으로 좋은 → 몸에 좋은 (L19) · 0/2`. Tags: `[시제]` tense · `[조사]` particles · `[어휘]` word choice · `[어순]` word order · `[문법]` grammar.
- Skip it if the same mistake is already open. If it's in the ✓ list in `progress/archive.md`, bring it back with 0/2 and add it to **Recurring mistakes**.
- If it illustrates a numbered point, also add a `❌ → ✅ (L#)` line under that point in `Grammar/`.

**d. Words.** List the `📚어휘` words (with the tutor's contrasts, e.g. 불안하다 vs 어색하다) for the plan.

## 3. Week type

Count the files in `weeks/` including this one: that's the week number. Every 4th week (4, 8, 12…) is a **light week**: no points from the queue, and the plan is a review of the last 3 weeks' new points plus a longer podcast (e.g. a recap of the month). Lesson grammar is still added.

## 4. New points (2 a week)

1. Lesson grammar from step 2b comes first.
2. If that's fewer than 2 and it isn't a light week, fill up to 2 from the top of `Grammar/QUEUE.md` (conversation section first). Skip a queue item if it's too close to this week's other point to learn the same week.

For every new point:
- Give it the next number and write its entry in the `Grammar/` file that fits (same format as the others: **Form**, **Meaning**, 3–4 spoken examples with 🔁, a ❌ → ✅ line if there's a likely mistake, ✔ notes, and a row in that file's **Compare** table). Mark it `(L#)` if it came from the lesson.
- Add it to the **By number** table in `Grammar/README.md`.
- Add a row to `progress/grammar.md`: level 0, Next review = Thursday (tomorrow), Last practiced —, No-hint 0, note "New (week of YYYY-MM-DD)".
- Delete it from `Grammar/QUEUE.md`.

## 5. Write the plan

Write `weeks/YYYY-MM-DD.md`:

```markdown
# Week of 2026-11-04 · Lesson 19 · week 1

**Type:** normal · **Next lesson:** Wed 2026-11-11, 21:00

## New grammar
- #57 -았/었더니 — I did A, and found / the result was B (queue)
- #58 -느라(고) — because I was busy doing… (queue)

## Review
12 points due by Tue (lowest level first): #5, #6, #12, … Sessions pick from `progress/grammar.md` each day; this is a preview.

## Lesson words (L19)
- 불안하다 (anxious) vs 어색하다 (awkward)

## Questions for the tutor
1. … (the 3 oldest items in To verify, worded so they can be asked in Korean or English)

## Homework (Mon)
If the tutor gave homework, do that and use this week's points where they fit. Otherwise:
1. (English sentence to translate, using a new point + a due review point, in the tutor's homework style)
… 5 in total

## Schedule
Each skill ticks its own block (☐ → ☑). The weekly check counts them.

| Day | Blocks |
|---|---|
| Thu 11-12 | ☐ Anki · ☐ grammar: new #57, #58 · ☐ listening: step 1 (pick Didi clip, listen with no transcript, %) |
| Fri 11-13 | ☐ Anki · ☐ grammar: review · ☐ listening: step 2 (transcript + why I missed it) |
| Sat 11-14 | Optional: ☐ Anki · ☐ mistakes drill |
| Sun 11-15 | ☐ Anki · ☐ grammar: longer session on #57, #58 · ☐ listening: step 3 (speech patterns to borrow) |
| Mon 11-16 | ☐ Anki · ☐ grammar: mixed review · ☐ homework sentences · ☐ listening: step 4 (shadowing + final %) · ☐ podcast: my weekend, on my own + 일상 post |
| Tue 11-17 | ☐ Anki · ☐ weekly check (+ homework + podcast unsure sentences) |
| Wed 11-18 | ☐ Anki · ☐ lesson prep (questions above) · lesson 21:00 · ☐ lesson-intake |

## Podcast
(filled in by listening step 3 and the speaking skill: patterns to borrow, topic, length, unsure sentences)

## Weekly report
(filled in by the weekly check on Tuesday)
```

- For a light week, **New grammar** says "Light week: no new points" and lists the last 3 weeks' new points to review instead; Monday's podcast is a longer topic that uses them.
- Use the new points' numbers in the grammar blocks. Keep every block even if its skill doesn't exist yet; each skill ticks its own block (`☐ grammar` → `☑ grammar`).

## 6. Website

Write the 수업 post (format in `.claude/skills/website-update/SKILL.md`, step 2) from the lesson file, fill the 오늘 panel's list for Thursday through the next Wednesday from the new plan (same file, step 1), then run `python3 -I website/build_data.py` so the 이번 주 page shows the new plan. Don't stage `website/`.

## 7. Finish

Tell the user in a few lines: the 2 new points (one-line English meaning each), how many reviews are due this week, mistakes added, questions answered, and the light week if it is one.

Then commit only what this skill changed, and don't push:

```bash
git add Grammar/ Homework/README.md progress/ weeks/
git commit -m "Lesson intake L19 (2026-11-04): #57, #58"
```

Give the short commit hash.

When this runs as a block of `/korean-mentor`, skip the commit above: korean-mentor ticks the block and commits at the end of the run.
