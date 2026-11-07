---
name: korean-mentor
description: The user's one daily Korean study command. Shows today's checklist from the week's plan in weeks/ (Anki, grammar, listening, podcast, homework, weekly check, lesson prep, lesson intake), runs the next unfinished block, resumes where the user stopped, folds in missed days, and commits at the end. The grammar block is a conversational tutor session on the week's new points plus spaced-repetition review (session.md). Use when the user runs /korean-mentor (with or without arguments such as point numbers "35-44", "listening", "review", "mistakes"), or wants to study or practice Korean today.
---

# Korean Mentor: the daily command

The user studies every day around a **Wednesday 21:00 lesson** (1 hour: 30 min talking about the weekend, 30 min going over homework). One `/korean-mentor` runs the day: it shows what's planned, runs the next block, and keeps everything in sync. Korean for practice, **English for every explanation**. Keep screen text short.

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
| **grammar** | Follow `.claude/skills/korean-mentor/session.md`. Kind: `new` for "new #…", `long` for "longer session", otherwise `review`. |
| **listening** | Follow `.claude/skills/listening/SKILL.md` (it finds the right step). These are for listening and analysis only: no speaking blocks on the same day. |
| **podcast** (Mon, after listening step 4) | Follow `.claude/skills/speaking/SKILL.md`: show the topic, length and self-check list. The user records on their own, so the block stays ☐ until they say it's done; then log it. Old plans' `speaking` blocks count as this. |
| **homework sentences** (Mon) | Show the 5 **Homework** prompts from the plan (or ask what the tutor assigned). The user writes them in Korean; save them under `## My homework` in the plan. No corrections now: the weekly check reviews them Tuesday. |
| **weekly check** (Tue) | Follow `.claude/skills/weekly-check/SKILL.md`. |
| **mistakes drill** (Sat, optional) | Follow `.claude/skills/practice-mistakes/SKILL.md`. On Saturday, offer it or `pinned` and accept "no" happily. |
| **lesson prep** (Wed, before 21:00) | ~20 min: (1) 2 quick no-hint prompts per new point this week; (2) **weekend rehearsal**: 3 questions about the user's weekend in Korean, as the tutor will ask (그 주말에 뭐 했어요? …), with light corrections in English; (3) go over **Questions for the tutor** and help phrase them in simple Korean. |
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
- **podcast** → it moves to the next day, until Wednesday's lesson prep; after that it's skipped (`– podcast`).
- **homework sentences** → do them before the weekly check (Tue) or before lesson prep (Wed).
- **weekly check** missed on Tuesday → run it Wednesday before lesson prep.

Mark folded-in blocks `☑ (Tue)` on the day they were done, so the weekly check counts them.

## 5. End of the run

When the user stops or today's blocks are done:
1. Recap the day in 2–4 lines: what was done, one highlight (a sentence they got right), one thing for next time.
2. **Website:** run `.claude/skills/daily-update/SKILL.md` (it updates the side panels once a day and refreshes the pinned words every run). No per-session blog post.
3. **Commit** everything this run changed, in one commit, and don't push:

```bash
git add progress/ sessions/ weeks/ Listening/ Grammar/ Homework/README.md
git commit -m "Day 2026-11-05: grammar (new #57, #58), listening step 1"
```

   The second line, if useful, matches the Session log entry. Never stage `website/` (daily-update leaves it for the user) or `anki/pending.json`.
4. Tell the user the short commit hash, what's next (`Tomorrow: grammar review, listening step 2`), and how many Anki changes are queued, if any.
