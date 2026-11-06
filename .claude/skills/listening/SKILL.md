---
name: listening
description: Weekly intensive listening on one 5–10 minute Korean YouTube clip that the skill picks itself (from Listening/sources.md, at about 90–95% known words, matching the week's grammar and lesson topics) — 4 steps across the week (Thu listen with no transcript + spoken summary, Fri transcript + why each part was missed, Mon shadowing at 0.8×, Tue dictation + final rating), saving notes in Listening/, grammar heard in progress/notes.md, and 2–3 sentence cards with audio in Anki. Use when the user runs /listening, wants listening practice, or korean-mentor reaches a listening block.
---

# Listening

One clip a week, worked through in 4 steps. Explanations to the user are in English; the clip and summaries are in Korean. Keep turns short.

Helper (always `python3 -I`): `.claude/skills/listening/listen.py` (run it with no arguments for usage). It uses a current yt-dlp in `~/.local/share/korean-tools`; the system `yt-dlp` is too old for YouTube.

```bash
L=.claude/skills/listening/listen.py
python3 -I $L channel <channel url> 10       # latest uploads: id | minutes | subs | channel | title
python3 -I $L search "<query>" 8
python3 -I $L subs <id> "$SCRATCH/<id>"      # whole-video subtitles to read before choosing
python3 -I $L fetch <id> Listening/<folder> 12:30-20:10   # section audio + lines.tsv + info.json
python3 -I $L play Listening/<folder> 4 4 0.8 # play line 4 at 0.8×; returns at once
python3 -I $L card Listening/<folder> 4 5 "<Korean>" "<English>" "<note>"
python3 -I $L flush                          # send queued cards once Anki is open
```

## Which step

Find this week's clip: the newest `Listening/YYYY-MM-DD-*` folder dated on or after the newest `weeks/` plan's lesson date. Its `notes.md` starts with a **Progress** line, e.g. `**Progress:** 1 ✔ (60%) · 2 ☐ · 3 ☐ · 4 ☐`.

- No clip this week → **Step 1** (normally Thursday).
- Otherwise do the next ☐ step. The weekday in the plan is a guide, not a rule: if the user is behind, do the next step; don't skip steps. If all 4 are done, say so and offer to replay the clip or practice extensive listening (suggest 2–3 other videos from the sources to just watch).

At the start of every step, run `flush` in case cards are still queued.

## Step 1: pick the clip, listen with no transcript (Thu, ~30 min)

**Pick.**
1. Read the week's plan in `weeks/` (new grammar, due review points, lesson topics) and the **Used** list in `Listening/sources.md`. Don't use the same channel as last week, and never reuse a video.
2. List the latest 10 uploads from 2–3 channels in `sources.md` (`channel`). Prefer `ko subs`, Korean-only content, and topics close to the lesson (weekend, work, food, daily life). Members-only and English-language lesson videos are out.
3. For the 2–3 best candidates, get the subtitles (`subs` into the scratchpad) and choose a 5–10 minute section that stands on its own (a topic start to a topic end).
4. **Level check.** List the words already in Anki with `python3 -I .claude/skills/_shared/anki.py words`, and compare with the section text plus the grammar list in `Grammar/README.md`. Estimate the share of words the user knows (assume common basic vocabulary is known). Aim for **90–95%**; skip anything under ~85% or over ~98%. Also note which grammar points appear, preferring sections that use this week's new or due points.
5. Pick one. Fetch it into `Listening/YYYY-MM-DD-<short-korean-or-english-slug>/` (today's date). Add a line to **Used** in `sources.md`.

Tell the user in 3–4 lines: title, channel, section and length, ~% known, and why (e.g. "uses #35 3 times, and #57"). Give the YouTube link with the start time (`&t=<seconds>`). They can watch it there **with subtitles off**, or you play the whole clip in the terminal (`play <folder> 1 <last line>`).

**Listen.** The user listens once or twice with no transcript. Don't show any of the text.

**Summary.** Ask for a 1-minute summary in Korean of what they understood. They record it with the speaking helper (`python3 -I .claude/skills/speaking/record.py start Listening/<folder>/summary.wav 90`, then `stop` and `transcribe`), or type it if they prefer. Reply in English: what they got right, and the main point(s) they missed, without quoting the transcript. Don't correct their Korean here, except one major mistake at most.

**Rating.** Ask: "About what % did you understand?" Save it.

Write `notes.md` (see **Notes format**) with the Progress line `1 ✔ (60%) · 2 ☐ · 3 ☐ · 4 ☐` and the summary.

## Step 2: transcript, and why each part was missed (Fri, ~30–40 min)

1. Write `transcript.md` from `lines.tsv`: clean paragraphs with a heading and timestamp every 1–2 minutes, like `Listening/2026-10-27-전세/transcript.md`. For auto captions, fix obvious caption errors and list the fixes at the top (`Caption fixes: 7:10 "몰려요" → 몰라요`).
2. The user reads it while listening again, then tells you the parts they didn't catch (quote the words or give the time).
3. For each missed part, decide why and explain in English:
   - **단어**: unknown word → meaning, and whether it's worth learning
   - **속도**: knew it but it was too fast → play that line at 0.8× and then at normal speed
   - **소리**: sounds changed in speech: 연음 (linking, 먹어요 [머거요]), 경음화 (tensing, 학교 [학꾜]), ㅎ dropping (좋아요 [조아요]), nasalization (합니다 [함니다]), contractions (그런데 → 근데, 것 → 거) → write the sound out
   - **문법**: grammar they don't know or didn't recognize → explain, and link the `Grammar/` point if it's numbered
4. Fill in `notes.md`: the **Missed** list (with type), the **문장** table (useful sentences, grammar # from `Grammar/README.md`, why it's useful) and the **단어** table (new words with the example from the clip).
5. **Heard in the wild:** add 2–4 sentences that use numbered points to `progress/notes.md` (`| date | sentence | # | channel, clip title |`).
6. **Sentence cards:** pick 2–3 sentences that are short (one or two lines), useful in conversation, and contain a new word or this week's grammar. Add each with `card` (Front = the Korean sentence with the key part in `<b>…</b>`, Back = a natural English translation, note = `#57 · <channel>: <title>`). If Anki isn't open, they're queued; tell the user.

Progress: `2 ✔ (missed: 4 소리, 2 단어, 1 속도)`.

## Step 3: shadowing (Mon, ~30 min)

1. Choose 6–8 lines: ones from **Missed**, plus lines with useful grammar.
2. For each line: show it, play it at 0.8× (`play … 0.8`), the user repeats it aloud, then play it at normal speed and they repeat again. Point out one sound or rhythm thing per line in English if useful (linking, where the pitch rises at the end). Move on when the user says next.
3. Then pick a ~1-minute passage (consecutive lines). Play it at normal speed 2–3 times while the user speaks along with it, showing the text the first two times and hiding it the last time.
4. Optionally record the last round (`record.py start Listening/<folder>/shadow.wav 90`); transcribe it and compare with the original lines, pointing out words that came out differently (a hint about pronunciation, not a verdict).

Progress: `3 ✔`.

## Step 4: dictation and final rating (Tue, ~20–30 min)

1. Pick 3–5 lines the user missed before (from **Missed**), without showing them. Play each one; they can ask to replay it or slow it to 0.8×. They type what they hear.
2. Compare with the original: show the line, mark the differences, explain each in English (sound, word or grammar). Count a line right if the differences are only spacing.
3. **Final listen:** the whole clip with no text (terminal or YouTube with subtitles off). Ask for the % understood again.
4. Write the result at the top of `notes.md`: `**Listening:** 60% → 85% · dictation 3/5`.

Progress: `4 ✔ (85%)`. The weekly check reads this.

## Notes format

`Listening/<folder>/notes.md` (`audio/` is not committed):

```markdown
# <slug> — 문장 & 단어

**Progress:** 1 ✔ (60%) · 2 ✔ · 3 ☐ · 4 ☐
**Listening:** 60% → (final) · dictation –/5
Source: <channel>, <title> (<section>) · <YouTube link with &t=> · ~92% known · Full text: [transcript.md](transcript.md)

## My summary (step 1)
<the user's Korean summary> · Feedback: <one line>

## Missed (step 2)
| Time | What | Why |
|---|---|---|
| 2:14 | 근데 | 소리: 그런데 → 근데 |

## 문장
| # | 문장 | Why it's useful |
|---|---|---|

## 단어
| 단어 | 뜻 | 예 (from the clip) |
|---|---|---|

## Anki cards
- <sentence> (added / queued)
```

## Finish each step

- If the newest `weeks/` plan has a Schedule row for today, tick the listening block (`☐ listening` → `☑ listening`).
- Commit only what this step changed (`git add Listening/ progress/notes.md weeks/`), message like `Listening 2026-11-05: step 1, <slug>`. Don't push. Give the short hash in one line.

When this runs as a block of `/korean-mentor`, skip the commit above: korean-mentor ticks the block and commits at the end of the run.
