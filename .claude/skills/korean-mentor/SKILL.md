---
name: korean-mentor
description: The user's one daily Korean study command. Shows today's checklist from the week's plan in weeks/ (Anki, grammar, listening, podcast, homework, weekly check, lesson prep, lesson intake), runs the next unfinished block, resumes where the user stopped, folds in missed days, and commits at the end. The grammar block is a conversational tutor session on the week's new points plus spaced-repetition review (session.md). Use when the user runs /korean-mentor (with or without arguments such as point numbers "35-44", "listening", "review", "mistakes"), or wants to study or practice Korean today.
---

# Korean Mentor: the daily command

The user studies every day around a **Wednesday 21:00 lesson** (1 hour: 30 min talking about the weekend, 30 min going over homework). One `/korean-mentor` runs the day: it shows what's planned, runs the next block, and keeps everything in sync. Korean for practice, **English for every explanation**. Keep screen text short.

**Anki word in every prompt:** every practice prompt in every block (grammar, weekly test, homework, mistakes drill, lesson review, podcast fixes) recommends one Anki word in brackets with a short gloss, e.g. `(word: 웬만하면 — if possible)`. Pinned first (`pinned_today` from today.py), then `use_trouble` words; rotate, one that fits the prompt. It's not a grammar hint, so it goes in no-hint items too. Only exception: the pinned-words drill (its prompts already are the pinned words).

**Audio after text, always:** every spoken prompt (speak.sh) must play **after** its text is on screen, never before: speak.sh is the last call before the prompt text (it waits 1.5 s), and in the browser GUI the page plays it after drawing the card, so don't call speak.sh there (session.md **Timer**).

**🥇 GOLD RULE: update the website after every session (asked 2026-11-24):** when any korean-mentor session is done (every block: Anki, grammar, review, listening, podcast, homework, lesson review, mistakes drill, weekly check, lesson intake; terminal or GUI), always run step 5.2 (daily-update rebuild + 회화 fetch) before ending the turn, even if the user stops early or just says bye. Run it **after** the last write to `progress/` (mistakes drill, counts, daily log), so the site shows the final state; if anything in `progress/` changes afterwards, rebuild again. Say `Website updated.` in the recap. Never skip it. (In the GUI, `gui/server.py` also rebuilds `study.js` after every Claude turn when `progress/` is newer, as a safety net; still run step 5.2 yourself for the 회화 fetch.)

**오늘의 실수 log in every block:** every correction (small slips too) and every 💡 더 자연스러워요 goes to `progress/daily/YYYY-MM-DD.md` right after the feedback (`.claude/skills/_shared/daily-mistakes.md`). The website shows it. No exceptions, like the Anki word.

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
- **Review game:** the GUI runs it automatically before its first session of the day. Only if today's blocks are all terminal ones and it hasn't been played (no `gui/state/review-<date>.json` for the newest earlier `progress/daily/` file), add one line: `Warm-up option: 어제 실수 게임, 5 min (/korean-mentor game)`. It isn't a block and is never ticked or caught up.

## 3. Pick what to run

**Arguments first:**

| Argument | Runs |
|---|---|
| point numbers or names (`35-44`, `3 17`, `-길래`) | a grammar session on those points |
| `review` | a review grammar session (due points only) |
| `listening` | the listening skill's next step |
| `check` / `weekly` | the weekly check |
| `lesson-review` / `lesson` | the lesson review block |
| `mistakes` | the practice-mistakes drill |
| `pinned` | the pinned-words drill |
| `podcast` / `speaking` | the podcast setup or log (speaking skill) |
| `homework` | the homework block |
| `article` | the daily-article skill (only on request) |
| `game` | the 어제의 실수 review game: run `gui/start.sh review-game` and reply with one line, `Opened in the browser → <url>.` Nothing else; the game needs no Claude. |
| `intake` | lesson-intake |
| `plan` | just show the checklist and stop |
| `grammar` | today's grammar block (resumes a paused one) |
| `gui` [args] | open the browser GUI: run `gui/start.sh [args]` and reply with one line, `Opened in the browser → <url>. Use the GUI until you press 그만 there.` Do nothing else in this run (the GUI runs its own session). |

**GUI session:** when the first message is `/korean-mentor gui-session <args>`, the user is in the browser GUI, started from its start screen, which already showed the checklist. Follow `.claude/skills/korean-mentor/gui-mode.md` for every message's layout (don't read the `gui/` source). Skip step 2 (don't show the checklist again), run `<args>` as above, and when the block ends offer only the GUI's timed blocks (grammar, review, lesson review, check, mistakes, pinned); for anything else say `Next: <block>, in the terminal.` Everything else is the same: the timer, speak.sh, feedback, logging, ticking the block and the end-of-run steps and commit. The user sends `.` for "done speaking" as usual.

**어제 실수 game first (GUI, asked 2026-11-25; replaced the end-of-session mistakes drill):** when a GUI session starts, the page runs the 어제의 실수 review game on its own first (once a day: only if the newest `progress/daily/` file before today has rows and there's no `gui/state/review-<that date>.json` yet), then starts the session. It needs no Claude, so do nothing for it; there's **no mistakes drill at the end** of GUI sessions any more. The game's misses are follow-up targets in the session (session.md).

**No arguments:** the first unfinished (☐) block in today's row, in the order written. Blocks:

| Block | What to do |
|---|---|
| **grammar** | Follow `.claude/skills/korean-mentor/session.md`: timed (30 s) conversation on the week's repeating question set in `progress/questions.md`. Kind: `new` for "new #…", `weekend` for "weekend session" (Sun; old plans' "longer session" counts as this), otherwise `review`. |
| **listening** | Follow `.claude/skills/listening/SKILL.md` (it finds the right step). |
| **podcast v1 / v2 / v3 / v4** (Thu / Mon / Tue / Wed, v4 before 21:00) | Follow `.claude/skills/speaking/SKILL.md`, the section for that version. v1 the user's weekend plans (short), v2 what they actually did, linked from their own answers to Sunday's weekend questions and recorded, v3 fix it and re-record, v4 tell it with no notes. The user records on their own, so v1–v3 stay ☐ until they say done; then log it. Old plans' `speaking` / `podcast` blocks count as the next version due. |
| **homework** (inside the weekly test since 2026-11-24; a separate block only in older plans or when the tutor's homework isn't short sentences) | Normally done as the 5 `Homework n/5` cards at the end of the weekly test (weekly-check **Format**), with the rules below. As its own block: show the 5 **Homework** prompts from the plan (or ask what the tutor assigned), one at a time. The user writes each in Korean and gets feedback **right away**: ✔, or ✏️ with the fix and a one-line English reason (✔ = +1 No-hint for that point, same rules as the weekly check; ✏️ → **Practice mistakes** with `(date homework)`). Nuance questions → **To verify** + **Questions for the tutor**. Save the sentences (with fixes) under `## My homework` in the plan for the tutor, and log every fix and 💡 to `progress/daily/` (Block `homework n`). Old plans' `homework sentences` blocks count as this. |
| **weekly test** (Tue) | Follow `.claude/skills/weekly-check/SKILL.md`: the week's question set again, timed, normal card format with hints (no penalty), then the homework sentences (ticks homework too). Old plans' `weekly check` blocks count as this. |
| **회화 recording** (Mon–Thu, optional; never Fri–Sun, asked 2026-11-24) | The user memorizes the day's 오늘의 회화 (`website/posts/<date>-conversation.js`; fetch it first if missing, see step 5) and records it on their own. Offer it once at the end of the day's blocks; tick it when they say done, never push it or catch it up. |
| **listening (re-listen)** (Sat, Tue; 5 min) | Play the week's clip once (Sat: no transcript; Tue: with the transcript). No notes, no %. Tick it when they say done. |
| **recording (1-min voice memo)** (Fri, Sat, Sun) | The user records a 1-minute answer on their own: Fri one of the week's questions, Sat 오늘 뭐 했어요?, Sun 주말에 뭐 했어요? (feeds podcast v2). Show the question with one Anki word; tick it when they say done. If they paste a transcript, ✔/✏️ it and log fixes to `progress/daily/`. Never caught up. |
| **mistakes drill** (Sat, optional) | Follow `.claude/skills/practice-mistakes/SKILL.md`. On Saturday, offer it or `pinned` and accept "no" happily. |
| **lesson review** (Wed, after podcast v4, before 21:00) | ~15 min, a quiz on last week's lesson (hints available in the GUI, no penalty for using them) so it sticks before the new one: 3–4 of the plan's **Lesson words** (situation in natural Korean → use the word) and 2–3 open **Lesson mistakes** (cut by 3/4 on 2026-11-26, quality over quantity) from that lesson (set up the same choice again, or "fix this" with the user's old sentence). ✔ / ✏️ right after each; lesson-mistake counts update as in session.md; log fixes to `progress/daily/` (Block `lesson review`). **Questions for the tutor** stays in the plan as a list the user can glance at; no block for it. Old plans' `lesson prep` blocks count as this. Runs in the GUI too (`gui lesson-review`; layout in gui-mode.md). |
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
- **podcast v1–v3** → a missed version merges into the next one (v1 missed Thu → no plans version, Mon's v2 goes on; v2 missed Mon → Tue does v2 and skips v3's fixes); v4 is never skipped before the lesson.
- **homework** → do it Wednesday before podcast v4.
- **weekly test** missed on Tuesday → run it Wednesday before podcast v4.

Mark folded-in blocks `☑ (Tue)` on the day they were done, so the weekly check counts them.

## 5. End of the run

When the user stops or today's blocks are done:
1. Recap the day in 2–4 lines: what was done, one highlight (a sentence they got right), one thing for next time.
2. **Website (GOLD RULE, never skip):** after every `progress/` write is done, run `.claude/skills/daily-update/SKILL.md` (it rebuilds the side panels and pinned words; the 오늘 panel runs itself from the weekly list). No per-session blog post.
   Then, if `website/posts/<today>-conversation.js` doesn't exist yet, run `python3 -I website/fetch_conversation.py` (Naver 오늘의 회화 with audio for the 회화 section; replaced the daily 기사 on 2026-11-19 — run `/daily-article` only if the user asks). If Naver has no conversation yet for today, say so and move on. If it prints `NEED NOTE: <title>`, write your own explanation of that grammar into `website/data/conversation_grammar.json` (key = the title exactly; `form`, `meaning`, 2–4 short `notes` in English, like the Grammar/ files: when to use it, how it differs from a similar point the user knows, one ❌ → ✅) and run the script again. The user prefers these to Naver's explanations (2026-11-19).
3. **Commit** everything this run changed, in one commit, and don't push:

```bash
git add progress/ sessions/ weeks/ Listening/ Speaking/ Grammar/ Homework/README.md
git commit -m "Day 2026-11-05: grammar (new #57, #58), listening step 1"
```

   The second line, if useful, matches the Session log entry. Never stage `website/` (daily-update leaves it for the user) or `anki/pending.json`.
4. Tell the user the short commit hash, what's next (`Tomorrow: grammar review, listening step 2`), and how many Anki changes are queued, if any.
