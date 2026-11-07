---
name: speaking
description: Sets up the user's weekly self-recorded Korean podcast — a 3-minute-and-up monologue the user records on their own (Mon, after listening step 4), by default about their weekend so it doubles as rehearsal for the Wednesday lesson, using 5–8 speech patterns borrowed from the week's Didi clip plus the week's new grammar. Suggests the topic (only if the user wants one), the length and a self-check list; the user rates themselves and writes a blog post on the same topic, marking 1–2 sentences they're unsure about for the weekly check. No recording or transcription here. Use when the user runs /speaking, asks for a podcast topic, or korean-mentor reaches a podcast/speaking block.
---

# Podcast (speaking)

The user speaks **on their own time**: they record themselves podcast-style, rate themselves, and write a blog post on the same topic. This skill only prepares it and logs it. Explanations in English. Keep it short: the whole setup should fit on one screen.

Don't record, transcribe or correct the recording, and don't ask the user to speak here.

## 1. Prepare (when the block comes up, usually Mon after listening step 4)

Read the newest plan in `weeks/` (new grammar, the **Podcast** section with the patterns from listening step 3), `Speaking/log.md` (last lengths), `progress/mistakes.md` (Recurring), and `python3 -I .claude/skills/_shared/anki.py trouble`.

Show:

```
🎙 Podcast · week of 11-04
Topic: 내 주말 (what you did, one thing that went wrong or surprised you, what's next)
Length: 3:00 (aim), 2:30–3:30 is fine
Borrow from Didi: 제가 얼마 전에 ~했거든요 · 그러다 보니까 · 근데 진짜 · -더라고요 · 아무튼 · 오늘은 여기까지
Grammar: #57 -았/었더니 (something you did and what happened) · #58 -느라(고) (something you couldn't do because you were busy)
Watch: tense (past for what's done, present for now)
Word: 실컷
```

- **Topic:** default is **the user's weekend**, framed as an episode (a start, 2–3 parts, a wrap-up), because the first half of the Wednesday lesson is about the weekend. If the user already has a topic, use theirs. If they ask for something else, or the weekend was quiet, suggest 2–3 topics that fit the clip, the lesson topics or the week's grammar.
- **Length:** start at **3:00**. After 3 podcasts at a length that the user marked as comfortable (`self` ≥ 4 in the log), suggest 30 s more, up to 6:00. If the last one felt hard (`self` ≤ 2), keep the length.
- **Borrow from Didi:** the **Patterns to borrow** from this week's listening notes. If step 3 isn't done, use the 문장 table or skip this line.
- **Grammar:** the week's 2 new points, each as a situation (don't phrase it as a drill), plus the top Recurring mistake as one **Watch** line, and 1 trouble word.

Add the same block under **Podcast** in the plan.

## 2. Tips (once, only the first time or if asked)

- 1 minute of keyword notes (no full sentences), then record in one go. Don't stop to fix mistakes; keep talking like a podcast.
- Listen back once. Rate yourself 1–5 on: **flow** (few long pauses), **patterns** (used 4+ of them), **grammar** (used both new points), **comfort** (how it felt).
- Then write the **blog post** on the same topic (an 일상 post, `website-update`). Mark 1–2 sentences you weren't sure about with `(?)`: the weekly check looks at those, and anything still unclear goes to the tutor.

## 3. Log it (when the user says done)

Ask in one line: `Length? Self-rating 1–5 (flow / patterns / grammar / comfort)? Any sentence you weren't sure about?`

- **`Speaking/log.md`**, newest first (create it with a `# Speaking log` heading if missing):
  `2026-11-09 · podcast · 내 주말 · 3:10 · self 4/3/4/3 · patterns 5/6 · unsure: 일하느라고 산책을 못 할 것 같아요`
- **Unsure sentences:** add them under **Podcast** in the plan as `Unsure:` so the weekly check reviews them. Don't correct them now unless the user asks.
- Don't change grammar levels or mistakes: self-rated practice doesn't count toward levels.

If the blog post is written in the same run, follow `.claude/skills/website-update/SKILL.md` for the 일상 post.

## Finish

- Tick `☐ podcast` → `☑ podcast` in the plan's Schedule row for today (or the day it was planned, marked `☑ (Tue)` if done later).
- Commit (`git add Speaking/ weeks/`), message like `Podcast 2026-11-09: 내 주말, 3:10`. Don't push.

When this runs as a block of `/korean-mentor`, skip the commit: korean-mentor ticks the block and commits at the end of the run.
