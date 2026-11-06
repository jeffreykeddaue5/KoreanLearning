# Study Plan (agreed 2026-11-05)

**Goal:** 2 new grammar points a week, older points kept alive by spaced repetition, with daily listening and speaking. Everything runs through one command: `/korean-mentor`.

## 1. Weekly cycle (Wed lesson → next Wed lesson, ~13–15 h)

| Day | Time | Blocks |
|---|---|---|
| **Wed** | ~2 h + lesson | Anki · lesson prep (review, 3 questions for tutor) · **Lesson 9pm** (30 min weekend talk, 30 min homework) · intake after `Homework/NN` exists |
| **Thu** | 2–2.5 h | Anki · **2 new points** · listening: new clip, no transcript + spoken summary |
| **Fri** | 2–2.5 h | Anki · grammar · **speaking: retell the clip** · listening: transcript + why I missed it |
| **Sat** | 0–1 h | Optional buffer: Anki + mistakes drill or free watching |
| **Sun** | 2 h | Anki · longer session on the week's points · **speaking: my weekend, 4/3/2** (rehearsal for Wed) · optional 일상 post |
| **Mon** | 2–2.5 h | Anki · mixed review (due points) · **homework sentences** · listening: shadowing |
| **Tue** | 2–2.5 h | Anki · **weekly check** (no hints) + homework check · listening: dictation + final rating · **speaking: Q&A** |

- Every 4th week is a **light week**: no new grammar, review the month's 8 points, longer speaking task.
- Missed days don't pile up: the next day folds in the due reviews.
- Typical weekday: Anki 20–30 · grammar 30–40 · listening 30–40 · speaking 20–30 · writing 10–15 (optional).

## 2. `/korean-mentor` = the daily command

- Shows today's checklist (weekday, week number, D-n to the lesson, ☑/☐ per block, Anki reviews done) and runs the next unfinished block.
- 그만 saves; the next run resumes at the next block.
- Wednesday: prep before 9pm, intake once today's `Homework/NN` file exists.
- Korean prompts, **English explanations** for every correction and grammar note.
- One commit at the end of the day. No blog post per session.

Steps it runs (kept as files under `.claude/skills/`, still callable by name):

| Step | What |
|---|---|
| **lesson-intake** | Homework file → new grammar into `Grammar/` (#48+), tutor ❌ into lesson mistakes, writes `weeks/YYYY-Www.md` (2 new points, due reviews, words, 3 tutor questions → `🧐질문`) |
| **grammar** | New points / review from the weekly plan and spaced repetition |
| **listening** | Picks a 5–10 min YouTube clip from `Listening/sources.md`, gets Korean subs with `yt-dlp`, cleans transcript + notes. Logs grammar heard; 2–3 sentence cards with audio go to Anki (see §2a) |
| **speaking** | Topic + 3–4 targets → you record (`arecord` or phone file) → whisper.cpp transcribes → English feedback, targets hit count toward levels. Monthly: same topic to compare. Audio in `Speaking/`, not in git (see §2b) |
| **weekly-check** | 10 items, no hints (week's points + random old + worst mistake type), homework check, weekly report |
| **practice-mistakes** | Short mistakes drill (Sat or as filler) |

### 2a. Listening method

- **Level check:** before picking, compare the transcript with Anki + grammar list and estimate % known. Aim for ~90–95%; skip under ~85% or over ~98%.
- **Content:** vlogs, interviews, talk shows, everyday-conversation podcasts (how people actually talk). No news or formal dramas for now. Match the lesson's topics (weekend, work, food) when possible.
- **One clip a week:**

| Day | Step |
|---|---|
| Thu | Listen with no transcript → 1-min spoken Korean summary (recorded) → rate % understood |
| Fri | Transcript: mark each miss and why: unknown word, too fast, sounds blending (연음, 경음화, ㅎ dropping), grammar |
| Mon | Shadowing: sentence by sentence at 0.8× (`ffmpeg`), then a 1-min section at full speed |
| Tue | Dictation of 3–5 hard lines → final listen with no transcript, rate again (e.g. 60% → 85%) = listening metric |

### 2b. Speaking method

- **Prep:** 1 min of keyword notes, never a script.
- **Feedback:** at most 3 corrections + 1 more natural phrasing + targets hit. All in English.
- **Say it again:** after feedback, record the same topic again using the fixes. Targets count on this second take.
- **Sunday, 4/3/2:** tell "my weekend" 3 times in 4, 3, then 2 minutes, then feedback, then say it again. Rehearsal for the Wednesday lesson.
- **Fri, retell:** retell the week's clip in your own words, using its new words and grammar.
- **Tue, Q&A mode:** the skill reads a question aloud (`speak.sh`), you record an answer, it asks a follow-up based on what you said (4–5 rounds), like the lesson's first half.
- ⚠ Whisper may silently fix grammar: use literal settings, flag low-confidence words, listen back to anything that matters. The tutor is the final judge.

Removed: `/voice-prep` (ChatGPT), `/hard-words`, `/pinned-words` (folded in), per-session `website-update` posts, `StudyGuide.md`.

## 3. Words = Anki

- AnkiConnect (installed, add-on 2055492159) is the word source: today's pins, most-missed cards, words added in the last 1–2 weeks.
- Misused words get tagged `use_trouble` in Anki; listening sentence cards are added directly.
- Anki closed → read a copy; writes wait in `anki/pending.json`.
- Current Hard words list gets tagged in Anki once, then deleted.

## 4. Progress tracking

- **Spaced repetition:** each point has level 0–5 + next review date (1 → 3 → 7 → 14 → 30 → 60 days). Only weekly-check promotes; struggling demotes.
- Never-practiced #5, 6, 12, 13, 15, 24, 27, 28, 34 start at level 0; the 9 unnumbered lesson points get numbers.
- **Queue** `Grammar/QUEUE.md`: lesson grammar → common conversation → common in media → TOPIK.
- **Mistakes** tagged 시제 · 조사 · 어휘 · 어순 · 문법.
- **To verify:** 3 a week go to the lesson; deleted once answered.
- **Main metric:** grammar used without a hint (sessions, recordings, lessons).
- **Weekly report:** blocks done vs planned (lighten the plan if often under), points at level ≥3, unprompted uses, mistakes closed, mistake types, new points, Anki streak.
- Split `KoreanProgress.md` into progress / mistakes / log; finished items to `archive/`.

## 5. Website

- **Keep:** power-line SVG header, black/red 2000s look, boxed panels, kaomoji, ASCII weather, blurred meanings.
- **Remove:** boot screen, all Lain text (neutral retro Korean instead), flicker, most blinking, crosshair cursor (header only at most).
- **Tone down:** faint scanlines/vignette, slow marquee with pinned words (pause on hover), glitch title once/on hover.
- **Usability:** text 15–16px, better contrast, phone layout, tap to reveal, banner buttons as real links.
- **Menu:** 홈 · 이번 주 · 문법 · 단어 카드 · 일상 · 수업 · 주간 정리 · 대화 · 자기소개 · 링크.
- **New pages:** 이번 주 (countdown, new points, reviews due, clip, tutor questions), 문법 (all points with ASCII level bars).
- **Panels:** keep 기분, 날씨, 까먹는 단어, 틀리는 문법; add 다음 수업 D-n, Anki 연속 n일, weekly bar `███░░`, mistake-type trend.
- **Posts:** 수업 (Wed, auto), 주간 정리 (Tue, auto), 일상 (me), 대화.
- **Data:** skills write `website/data/*.json`; the page renders it.
- **Updates:** daily (weather, mood, Anki), Wed (수업, 이번 주), Tue (주간 정리, levels).

## 6. TOPIK

Optional, April. Decide mid-January; if yes, weekend TOPIK block Feb–Apr.

## 7. Build order

1. ✅ Data migration + spaced repetition (split progress file, number points, levels, queue) — done 2026-11-05
2. ✅ lesson-intake + weekly plan — done 2026-11-05
3. `/korean-mentor` as daily command (checklist, resume, English explanations, AnkiConnect words)
4. ✅ weekly-check — done 2026-11-05
5. speaking (install whisper.cpp)
6. ✅ listening (`Listening/sources.md`, `yt-dlp`, sentence cards) — done 2026-11-05
7. Website: look cleanup → JSON data → new pages/panels → categories
8. Cleanup: shared Anki helper, remove old skills, `.gitignore` audio, rewrite README
