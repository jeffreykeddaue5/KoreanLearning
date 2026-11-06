# Korean Grammar Study

Personal Korean grammar practice built around my own grammar list and a Claude Code tutor.

| File | What it's for |
| --- | --- |
| `Grammar/` | My numbered grammar points (1–58), grouped by topic, with examples, common mistakes and compare tables. Start at `Grammar/README.md` |
| `StudyGuide.md` | Quick fill-in-the-blank warm-up dialogues |
| `progress/` | What the skills track: `grammar.md` (level 0–5 + next review per point), `mistakes.md`, `words.md`, `notes.md` (to verify, heard in the wild), `log.md`, `archive.md` |
| `weeks/` | One plan per week, named after the Wednesday lesson date: new grammar, due reviews, lesson words, tutor questions, schedule |
| `Grammar/QUEUE.md` | Grammar to learn next, 2 a week |
| `PLAN.md` | The study plan and build order |
| `Homework/` | One file per tutor lesson: notes, homework and corrections |
| `Listening/` | One folder per weekly clip: cleaned transcript plus `notes.md` (progress, what I missed and why, key sentences, vocab). Audio isn't committed. Sources in `sources.md` |
| `anki/` | Weekly vocab CSVs for Anki (`YYYY-MM-DD.csv`, the week's Monday), made by `/anki-vocab` |
| `.claude/skills/korean-mentor/` | The `/korean-mentor` Claude Code skill |
| `.claude/skills/anki-vocab/` | The `/anki-vocab` skill: 70 conversational words a week, with conjugations |
| `.claude/skills/lesson-intake/` | The `/lesson-intake` skill: after the Wednesday lesson, turns the homework file into next week's plan |
| `.claude/skills/weekly-check/` | The `/weekly-check` skill: Tuesday no-hint test + homework check, levels points up/down, writes the weekly report |
| `.claude/skills/listening/` | The `/listening` skill: picks a clip each week from `Listening/sources.md` and runs 4 steps (no transcript, transcript, shadowing, dictation); adds sentence cards to Anki. Needs a current yt-dlp in `~/.local/share/korean-tools` (`python3 -m venv ~/.local/share/korean-tools && ~/.local/share/korean-tools/bin/pip install -U "yt-dlp[default]"`) |

## Practicing

In Claude Code, from this folder:

```
/korean-mentor 35-44      # a range
/korean-mentor 3 17 22    # specific points
/korean-mentor            # this week's plan from weeks/
```

Each session mixes in 2–4 older points that are due for review (spaced repetition). Say **그만** to end and save progress, then commit:

```
(the skill commits for you)
```

## Habits

- Spot your current points in dramas or YouTube and bring the sentences to a session.
- Check items under **To verify** (`progress/notes.md`) with a native speaker or teacher; each week's plan lists 3 to ask. The mentor can be wrong on subtle nuance.
