---
name: korean-mentor
description: The user's one daily Korean study command. Shows today's checklist from the week's plan in weeks/ (Anki, grammar, listening, podcast, homework, weekly check, lesson prep, lesson intake), runs the next unfinished block, resumes where the user stopped, folds in missed days, and commits at the end. The grammar block is a conversational tutor session on the week's new points plus spaced-repetition review (session.md). Use when the user runs /korean-mentor (with or without arguments such as point numbers "35-44", "listening", "review", "mistakes"), or wants to study or practice Korean today.
---

# Korean Mentor: the daily command

The user studies every day around a **Wednesday 21:00 lesson** (1 hour: 30 min talking about the weekend, 30 min going over homework). One `/korean-mentor` runs the day: it shows what's planned, runs the next block, and keeps everything in sync. Korean for practice, **English for every explanation**. Keep screen text short.

**Anki word in every prompt:** every practice prompt in every block (grammar, weekly test, homework, mistakes drill, lesson review, podcast fixes) recommends one Anki word in brackets with a short gloss, e.g. `(word: 웬만하면 — if possible)`. Pinned first (`pinned_today` from today.py), then `use_trouble` words; rotate, one that fits the prompt. It's not a grammar hint, so it goes in no-hint items too. No exceptions.

## 1. Start: today's state

```bash
python3 -I .claude/skills/korean-mentor/today.py
```

It prints today's blocks from the plan, unfinished blocks from earlier days (`missed_earlier`), days to the lesson, whether `intake_due`, this week's listening progress, how many grammar points are due, and Anki status (it also sends any queued Anki changes if Anki is open).

- `intake_due` true (a lesson file is newer than the plan) → do **lesson-intake** first, then continue with the new plan.
- No plan at all → say so and offer to run lesson-intake on the newest lesson file.

## 2. Show the checklist

One compact block, then say what's next:

```
목요일 · week of 11-04 · 다음 수업 D-6 (Wed 21:00)
☑ Anki (41 reviews, nothing due) · ☐ grammar: new #57, #58 · ☐ listening: step 1
Missed: Thu listening step 1 (do it next)
Next: grammar (~30 min). Go?
```

- **Anki:** ☑ if reviews were done today and nothing is due (`reviewed_today` > 0, `due_left` 0); otherwise ☐ with the count due. If the user hasn't done Anki yet, remind them once; don't block other work. Mention queued changes only if there are any (`pending`): "Open Anki to apply N queued changes."
- Show `missed_earlier` in one line, with what happens to it (see **Catching up**).

## 3. Pick what to run

**Arguments first:**

| Argument | Runs |
|---|---|
| point numbers or names (`35-44`, `3 17`, `-길래`) | a grammar session on those points |
| `review` | a review grammar session (due points only) |
| `listening` | the listening skill's next step |
| `check` / `weekly` | the weekly check |
| `mistakes` | the practice-mistakes drill |
| `pinned` | the pinned-words drill |
| `podcast` / `speaking` | the podcast setup or log (speaking skill) |
| `intake` | lesson-intake |
| `plan` | just show the checklist and stop |

**No arguments:** the first unfinished (☐) block in today's row, in the order written. Blocks:

| Block | What to do |
|---|---|
| **grammar** | Follow `.claude/skills/korean-mentor/session.md`: timed (30 s) conversation on the week's repeating question set in `progress/questions.md`, after a 5-min warm-up (ask / react / explain). Kind: `new` for "new #…", `long` for "longer session" (role-play + disagree), otherwise `review`. |
| **listening** | Follow `.claude/skills/listening/SKILL.md` (it finds the right step). These are for listening and analysis only: no speaking blocks on the same day. |
| **podcast v1 / v2 / v3** (Mon / Tue / Wed) | Follow `.claude/skills/speaking/SKILL.md`, the section for that version. The same weekend story gets a bit better each day: v1 link the user's own answers to the week's weekend questions into one story and record it, v2 fix it and re-record, v3 tell it with no notes. The user records on their own, so v1/v2 stay ☐ until they say done; then log it. Old plans' `speaking` / `podcast` blocks count as v1. |
| **homework** (Tue, after the weekly test) | Show the 5 **Homework** prompts from the plan (or ask what the tutor assigned), one at a time. The user writes each in Korean and gets feedback **right away**: ✔, or ✏️ with the fix and a one-line English reason (✔ = +1 No-hint for that point, same rules as the weekly check; ✏️ → **Practice mistakes** with `(date homework)`). Nuance questions → **To verify** + **Questions for the tutor**. Save the sentences (with fixes) under `## My homework` in the plan for the tutor. Old plans' `homework sentences` blocks count as this. |
| **weekly test** (Tue) | Follow `.claude/skills/weekly-check/SKILL.md`: the week's question set again, timed, no hints. Old plans' `weekly check` blocks count as this. |
| **mistakes drill** (Sat, optional) | Follow `.claude/skills/practice-mistakes/SKILL.md`. On Saturday, offer it or `pinned` and accept "no" happily. |
| **podcast v3** (Wed, before 21:00) | Replaces the old **lesson prep**. ~20 min: (1) the user tells the weekend story in Korean with no notes (typed here, or said aloud on their own and summarized), as they will to the tutor; light ✏️ fixes in English on the main mistakes only; (2) separate block **lesson review** (~15 min): a no-hint quiz on last week's lesson so it sticks before the new one: 4–5 of the plan's **Lesson words** (situation in natural Korean → use the word) and 3–4 open **Lesson mistakes** from that lesson (set up the same choice again, or "fix this" with the user's old sentence). ✔ / ✏️ right after each; lesson-mistake counts update as in session.md. **Questions for the tutor** stays in the plan as a list the user can glance at; no block for it. |
| **lesson-intake** (Wed after the lesson) | If today's `Homework/` file exists (`lesson_file_today`), follow `.claude/skills/lesson-intake/SKILL.md`. If it's after 21:00 and there's no file yet, ask the user to write their lesson notes first. |

Optional extras like "optional 일상 post" are only offered, never pushed.

Sub-skills normally commit on their own. **When run from korean-mentor, they skip their commit**; this skill commits at the end of the run (step 5).

## 4. Between blocks

After a block ends:
- Tick it in today's row of the plan: `☐ grammar` → `☑ grammar` (`☑ Anki` too once Anki is done). A skipped block becomes `– podcast`.
- Show the updated one-line checklist and ask: `Next: listening step 1 (~30 min). Continue, or stop for today?`
- **그만 / stop / done** ends the run (step 5). The next `/korean-mentor` picks up at the next ☐ block, today or the next day.

## Catching up

Missed blocks from earlier days (not optional ones) don't pile up:
- **grammar** → today's grammar session adds 2 extra due points; no second session.
- **listening** → the listening skill simply does the next step; skip a step only if the user asks.
- **podcast v1/v2** → a missed version merges into the next one (v1 missed Mon → Tue does v1 and skips v2's fixes); v3 is never skipped before the lesson.
- **homework** → do it Wednesday before podcast v3.
- **weekly test** missed on Tuesday → run it Wednesday before podcast v3.

Mark folded-in blocks `☑ (Tue)` on the day they were done, so the weekly check counts them.

## 5. End of the run

When the user stops or today's blocks are done:
1. Recap the day in 2–4 lines: what was done, one highlight (a sentence they got right), one thing for next time.
2. **Website:** run `.claude/skills/daily-update/SKILL.md` (it rebuilds the side panels and pinned words; the 오늘 panel runs itself from the weekly list). No per-session blog post.
   Then, if today's article doesn't exist yet, run `.claude/skills/daily-article/SKILL.md` (one news article for the 기사 section).
3. **Commit** everything this run changed, in one commit, and don't push:

```bash
git add progress/ sessions/ weeks/ Listening/ Grammar/ Homework/README.md
git commit -m "Day 2026-11-05: grammar (new #57, #58), listening step 1"
```

   The second line, if useful, matches the Session log entry. Never stage `website/` (daily-update leaves it for the user) or `anki/pending.json`.
4. Tell the user the short commit hash, what's next (`Tomorrow: grammar review, listening step 2`), and how many Anki changes are queued, if any.
