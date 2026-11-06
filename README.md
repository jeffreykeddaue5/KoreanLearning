# Korean Grammar Study

Personal Korean study built around a weekly tutor lesson (Wed 9pm), my own numbered grammar list, Anki, and one Claude Code command: `/korean-mentor`. The full plan is in `PLAN.md`.

## Daily use

In Claude Code, from this folder:

```
/korean-mentor            # today's checklist, then the next unfinished block
/korean-mentor 35-44      # a grammar session on those points
/korean-mentor listening  # or: review, check, mistakes, pinned, speaking [weekend|retell|qa|monthly], intake, plan
```

Say **그만** to stop; the next run picks up at the next block. Prompts are in Korean, explanations in English. The command commits once at the end of the day.

## The week

| Day | Blocks |
|---|---|
| Wed | Anki · lesson prep · **lesson** · intake (`Homework/NN` → next week's plan) |
| Thu | Anki · 2 new grammar points · listening 1 (no transcript) |
| Fri | Anki · review · speaking: retell the clip · listening 2 (transcript) |
| Sat | optional: mistakes or pinned-words drill |
| Sun | Anki · long session · speaking: my weekend 4/3/2 |
| Mon | Anki · review · homework sentences · listening 3 (shadowing) |
| Tue | Anki · **weekly check** (no hints) · listening 4 (dictation) · speaking: Q&A |

Every 4th week is light: no new grammar. Grammar points have levels 0–5 with spaced review (1 → 3 → 7 → 14 → 30 → 60 days); only the weekly check promotes to 3+.

## Files

| Path | What it's for |
| --- | --- |
| `PLAN.md` | The study plan |
| `Grammar/` | Numbered grammar points with examples, common mistakes and compare tables. Start at `Grammar/README.md`; next points in `Grammar/QUEUE.md` |
| `Homework/` | One file per tutor lesson: notes, homework, corrections |
| `weeks/` | One plan per week, named after the lesson date: new points, due reviews, lesson words, tutor questions, schedule (☐/☑), weekly report |
| `progress/` | `grammar.md` (level + next review per point), `mistakes.md` (tagged 시제 · 조사 · 어휘 · 어순 · 문법), `notes.md` (to verify, heard in the wild), `words.md`, `log.md`, `stats.json` (weekly snapshots), `archive.md` |
| `sessions/` | Notes from each grammar session |
| `Listening/` | One folder per weekly clip: transcript + `notes.md`. Sources in `sources.md`. Audio isn't committed |
| `Speaking/` | Recording log and transcripts. Audio isn't committed |
| `anki/` | Weekly vocab CSVs from `/anki-vocab`; `pending.json` queues Anki changes while Anki is closed (not committed) |
| `website/` | The blog 일지 (open `website/index.html`). `build_data.py` builds `data/study.js` from the files above; see `website/notes.md` |

## Skills (`.claude/skills/`)

| Skill | What it does |
| --- | --- |
| `korean-mentor` | The daily command: checklist, resume, runs the blocks below. `session.md` = the grammar session, `today.py` = today's state, `speak.sh` = reads prompts aloud |
| `lesson-intake` | Wed: lesson file → new grammar, tutor mistakes, the week's plan, 수업 post |
| `listening` | Weekly clip from `Listening/sources.md` at ~90–95% known words, 4 steps; sentence cards to Anki |
| `speaking` | Record (`record.py`), local transcription (faster-whisper `small`), ≤3 corrections in English, say it again |
| `weekly-check` | Tue: 10 items with no hints, homework check, levels, weekly report, 주간 정리 post |
| `practice-mistakes` | Short drill on open mistakes |
| `pinned-words` | Drill on the week's pinned Anki words |
| `anki-vocab` | 70 conversational words a week as a CSV for Anki |
| `daily-update` | Website: weather, mood, rebuilds `website/data/study.js` |
| `website-update` | Website: 써먹을 표현 panel and post formats |
| `_shared/anki.py` | Anki helper for every skill: AnkiConnect when Anki is open, a read-only copy + `anki/pending.json` queue when it isn't. Trouble words are tagged `use_trouble` |

## Setup

- **Anki** with AnkiConnect (add-on 2055492159).
- **Tools venv** for yt-dlp and faster-whisper:
  ```
  python3 -m venv ~/.local/share/korean-tools
  ~/.local/share/korean-tools/bin/pip install -U "yt-dlp[default]" faster-whisper
  ```
- `ffmpeg` and `arecord` for listening and speaking.

## Habits

- Spot this week's points in dramas or YouTube and bring the sentences to a session.
- The mentor can be wrong on nuance: anything under **To verify** in `progress/notes.md` goes to the tutor, 3 a week.
