# Study Plan (agreed 2026-11-05)

**Goal:** 2 new grammar points a week, older points kept alive by spaced repetition, with daily listening and speaking. Everything runs through one command: `/korean-mentor`.

## 1. Weekly cycle (Wed lesson → next Wed lesson, ~13–15 h)

| Day | Time | Blocks |
|---|---|---|
| **Wed** | ~2 h + lesson | Anki · lesson prep (review, 3 questions for tutor) · **Lesson 9pm** (30 min weekend talk, 30 min homework) · intake after `Homework/NN` exists |
| **Thu** | 2–2.5 h | Anki · **2 new points** · listening: new Didi clip, no transcript + % |
| **Fri** | 1.5–2 h | Anki · grammar · listening: transcript + why I missed it |
| **Sat** | 0–1 h | Optional buffer: Anki + mistakes drill or free watching |
| **Sun** | 2 h | Anki · longer session on the week's points · listening: speech patterns to borrow |
| **Mon** | 2–2.5 h | Anki · mixed review (due points) · **homework sentences** · listening: shadowing + final % · **podcast** on my own + 일상 post |
| **Tue** | 1.5 h | Anki · **weekly check** (no hints) + homework check + podcast unsure sentences |

- Every 4th week is a **light week**: no new grammar, review the month's 8 points, longer podcast.
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
| **listening** | Picks a 5–10 min section of a Didi의 한국문화 Podcast video, analyzes her speech patterns for the podcast, gets Korean subs with `yt-dlp`, cleans transcript + notes. Logs grammar heard; 2–3 sentence cards with audio go to Anki (see §2a) |
| **speaking** | Weekly podcast setup: topic (default: my weekend), length (3 min+), Didi patterns + grammar to use. I record and rate myself on my own; unsure sentences go to the weekly check (see §2b) |
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

### 2b. Speaking method (changed 2026-11-06)

- **One podcast a week, on my own time** (Mon, after listening step 4): a podcast-style monologue, by default about my weekend, so it rehearses the first half of the Wednesday lesson.
- **Starts at 3 minutes**; +30 s after 3 comfortable weeks, up to 6.
- **Uses 5–8 patterns borrowed from the week's Didi clip** (listening step 3), plus the week's 2 new points.
- **Self-rated** (flow / patterns / grammar / comfort, 1–5), logged in `Speaking/log.md`. No transcription or corrections from Claude.
- **Then a blog post** on the same topic. 1–2 sentences I'm unsure about go to the weekly check, and then to the tutor if needed.
- Why: listening to a clip and speaking on the same day was too much, and it's more useful to study one clip deeply and reuse its patterns.

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
3. ✅ `/korean-mentor` as daily command (checklist, resume, English explanations, AnkiConnect words) — done 2026-11-05 (live AnkiConnect test pending: open Anki)
4. ✅ weekly-check — done 2026-11-05
5. ✅ speaking (faster-whisper small, local and free) — done 2026-11-05
6. ✅ listening (`Listening/sources.md`, `yt-dlp`, sentence cards) — done 2026-11-05
7. ✅ Website: look cleanup → JSON data → new pages/panels → categories — done 2026-11-05
8. ✅ Cleanup: shared Anki helper, remove old skills, `.gitignore` audio, rewrite README — done 2026-11-05
