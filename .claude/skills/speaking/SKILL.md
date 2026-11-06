---
name: speaking
description: Korean speaking practice by recording — the user gets a topic with situations that call for this week's grammar, speaks for 1–4 minutes, the recording is transcribed locally (free, faster-whisper), and the user gets short English feedback (at most 3 corrections) and says it again. Modes - retell the week's listening clip (Fri), my weekend 4/3/2 (Sun, rehearsal for the Wednesday lesson), Q&A with spoken follow-up questions (Tue), and a monthly same-topic recording to compare over time. Use when the user runs /speaking, wants speaking practice, or korean-mentor reaches a speaking block.
---

# Speaking

The user speaks; you listen through a transcript. Prompts in Korean, **feedback in English**. Keep screen text short; the user should spend the time talking.

Helper (`R=.claude/skills/speaking/record.py`, always `python3 -I`):

```bash
python3 -I $R start Speaking/<folder>/take1.wav 240   # records from the default mic; auto-stops at 240 s
python3 -I $R stop Speaking/<folder>/take1.wav        # length + loudness (warns if too quiet)
python3 -I $R transcribe Speaking/<folder>/take1.wav  # transcript, [?] = unsure word, fluency numbers → take1.json
python3 -I $R play Speaking/<folder>/take1.wav 12.4   # replay a moment
```

- Transcription takes about 1.3× the recording length. For a long take, run it with `run_in_background` and carry on (e.g. keyword notes for the next take); you'll be notified when it's done.
- The user can also record on their phone and give a file path; transcribe that file directly.
- Folder: `Speaking/YYYY-MM-DD-<mode>/` (`retell`, `weekend`, `qa`, `topic`; monthly ones in `Speaking/monthly/`). Audio isn't committed; the `.json` and `notes.md` are.

## Recording a take

1. Show the prompt, then say: `Recording… speak when ready, and type "done" when you finish.` Run `start` with the take's time limit (+20 s of slack).
2. When the user types anything, run `stop`. If it warns "very quiet" or the take is under 10 seconds, offer to redo it.
3. Transcribe. While it runs, don't show anything long.

## What to practice: targets as situations

Pick 3–4 targets from the newest plan in `weeks/` and `progress/`:
- the week's 2 new points
- 1 due grammar point (`progress/grammar.md`, Next review ≤ today)
- 1 recurring mistake from `progress/mistakes.md`

**Don't name the grammar.** Turn each target into a content prompt in English that naturally calls for it, so a correct use counts as no-hint:
- #58 -느라고 → "something you couldn't do because you were busy with something else"
- #57 -았/었더니 → "something you tried, and what happened"

Also give 1 trouble word **by name** (`python3 -I .claude/skills/_shared/anki.py trouble`), e.g. `Try to use: 실컷`.

Show them as a short checklist under the topic. Allow 1 minute of keyword notes (Korean or English words only, no full sentences), then record.

## Feedback (after each first take)

Read the transcript critically:
- `[?]` marks words Whisper wasn't sure about.
- Whisper sometimes turns a wrong particle or ending into a different one, or "fixes" it. If a particle or ending looks like it could be a mishearing (에/의, 을/를/이, 봤/받, -았/-어), don't correct it as fact: ask `Did you say 오늘에 or 오늘의?` and offer `play` at that moment.
- Ignore spacing, punctuation and fillers.

Then give, in English, at most this much:
1. **Targets:** each one ✔ (with the user's sentence and the point name) or ✘ (with a sentence they could have said).
2. **Up to 3 corrections:** the most useful ones, as `✏️ 봤느라고 → 보느라고 (no past tense before -느라고)`.
3. **One more natural way** to say one of their sentences.
4. **Numbers, in one line:** `1:52 · 74 words/min · 2 long pauses · 0 English · 3 connectors` (compare with their last take of the same mode in `Speaking/log.md` if there is one).

Nuance doubts → **To verify** in `progress/notes.md`.

## Say it again

Right after feedback, the user records the same topic again (same time limit), using the fixes. Transcribe and give a 2-line follow-up: what's better (a sentence they fixed), and any correction that still came up. No new list of corrections.

## Modes

| Mode | When | How |
|---|---|---|
| **retell** | Fri | Retell this week's listening clip (`Listening/<this week>/`) in 2 min, as if telling a friend. In feedback, also say what content they got right or missed (compare with `transcript.md`) and which words from the clip they used. |
| **weekend** (4/3/2) | Sun | "Tell me about your weekend": take 1 (4 min), take 2 (3 min), take 3 (2 min), no feedback in between; just a 1-line "next: 3 minutes, same story" (start transcribing take 1 in the background while they record take 2). Feedback on take 3 only; numbers for all three (words/min should go up). Then say it again (2 min). It's the rehearsal for the first half of the Wednesday lesson. |
| **qa** | Tue | 4–5 rounds: ask a question in Korean (show it and play it with `.claude/skills/korean-mentor/speak.sh "<question>"`), record the answer (max 60 s), transcribe, then ask a natural follow-up about what they said, as a tutor would. Questions should pull the week's targets. Corrections only at the end (max 3 for the whole Q&A), no say-it-again. |
| **monthly** | last week of the month | Same topic every month: **"자기소개 + 요즘 생활"** (who you are, what your days are like lately), 3 min, no targets, no notes. Save as `Speaking/monthly/YYYY-MM.wav`. Feedback as usual, then compare the numbers and 1–2 sentences with the previous months (`Speaking/monthly/*.json`). |
| **topic** | any other time | Topic from the user, or one that fits the week's lesson topics; 2 min. |

## Update progress

Only the **first take** counts toward levels; the say-it-again take is practice.

- **`progress/grammar.md`:** a target point used correctly in the first take → +1 level (recordings may go above 2) and +1 No-hint; tried but wrong → −1. One change per point per day. Last practiced = today, Next review = today + interval. Points the user didn't attempt: no change.
- **`progress/mistakes.md`:** clear mistakes (not ones that may be mishearings) → **Practice mistakes** with a type tag, `(YYYY-MM-DD speaking) · 0/2`. A recurring mistake that was right → `· right <date>`.
- **Anki:** the named trouble word used correctly → `anki.py tag <word> right`; clearly misused → `tag <word> trouble`.
- **`Speaking/log.md`:** one line per first take, newest first (create the file with a `# Speaking log` heading if it's missing):
  `2026-11-08 · weekend take 3 · 2:00 · 81 wpm · 1 pause · 0 English · 4 connectors · targets 3/4 · fix: 봤느라고`
- **`Speaking/<folder>/notes.md`:** the topic, targets, the transcript of each take, the feedback.

## Finish

- Tick `☐ speaking` → `☑ speaking` in today's row of the newest `weeks/` plan.
- Commit (`git add Speaking/ progress/ weeks/`), message like `Speaking 2026-11-08: weekend 4/3/2`. Don't push.

When this runs as a block of `/korean-mentor`, skip the commit: korean-mentor ticks the block and commits at the end of the run.
