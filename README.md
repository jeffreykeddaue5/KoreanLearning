# Korean Grammar Study

Personal Korean grammar practice built around my own grammar list and a Claude Code tutor.

| File | What it's for |
| --- | --- |
| `GrammarList.md` | My numbered grammar points (1–44) with meanings, examples and notes |
| `StudyGuide.md` | Quick fill-in-the-blank warm-up dialogues |
| `KoreanProgress.md` | Progress the mentor tracks: status per point, recurring mistakes, nuance to verify, sentences heard in the wild, session log |
| `.claude/skills/korean-mentor/` | The `/korean-mentor` Claude Code skill |

## Practicing

In Claude Code, from this folder:

```
/korean-mentor 35-44      # a range
/korean-mentor 3 17 22    # specific points
/korean-mentor            # asks which points
```

Each session mixes in 2–3 older points for review. Say **그만** to end and save progress, then commit:

```
git add -A && git commit -m "Session YYYY-MM-DD"
```

## Habits

- Spot your current points in dramas or YouTube and bring the sentences to a session.
- Check items under **To verify** with a native speaker or teacher. The mentor can be wrong on subtle nuance.
