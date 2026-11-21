---
name: listening
description: Weekly intensive listening on one 5–10 minute section of a Talk To Me In 100% Korean (TTMIK) video that the skill picks (at about 90–95% known words, matching the week's grammar and lesson topics), studied for its speech patterns — 4 steps across the week (Thu listen with no transcript + % understood, Fri transcript + why each part was missed, Sun speech patterns to borrow for the user's own podcast, Mon shadowing + final rating), saving notes in Listening/, and grammar heard in progress/notes.md. Nothing from the clip goes into Anki. No speaking practice here; the user's podcast is the speaking skill. Use when the user runs /listening, wants listening practice, or korean-mentor reaches a listening block.
---

# Listening

One clip a week from Talk To Me In 100% Korean, worked through in 4 steps. The goal is to understand the clip fully **and** to learn how the speakers talk (their openers, connectors, endings, fillers, reactions), so the user can reuse those patterns in their own podcast at the end of the week (`.claude/skills/speaking/SKILL.md`). Explanations are in English; the clip is in Korean. Keep turns short. **Don't ask the user to speak or summarize aloud** in any step except repeating lines in shadowing.

Helper (always `python3 -I`): `.claude/skills/listening/listen.py` (run it with no arguments for usage). It uses a current yt-dlp in `~/.local/share/korean-tools`; the system `yt-dlp` is too old for YouTube.

```bash
L=.claude/skills/listening/listen.py
python3 -I $L channel <channel url> 15       # latest uploads: id | minutes | subs | channel | title
python3 -I $L subs <id> "$SCRATCH/<id>"      # whole-video subtitles to read before choosing
python3 -I $L fetch <id> Listening/<folder> 12:30-20:10   # section audio + lines.tsv + info.json
python3 -I $L play Listening/<folder> 4 4 0.8 # play line 4 at 0.8×; returns at once
```

## Which step

Find this week's clip: the newest `Listening/YYYY-MM-DD-*` folder dated on or after the newest `weeks/` plan's lesson date. Its `notes.md` starts with a **Progress** line, e.g. `**Progress:** 1 ✔ (60%) · 2 ☐ · 3 ☐ · 4 ☐`.

- No clip this week → **Step 1** (normally Thursday).
- Otherwise do the next ☐ step. The weekday in the plan is a guide, not a rule: if the user is behind, do the next step; don't skip steps. If all 4 are done, say so and offer to replay the clip.

## Step 1: pick the clip, listen with no transcript (Thu, ~20 min)

**Pick.** Clips come only from **Talk To Me In 100% Korean** (`Listening/sources.md`). It's TTMIK staff (2–3 people) chatting about everyday topics at a calm, natural pace, easier than Didi (dropped 2026-11-17 as too hard and overbearing).
1. Read the week's plan in `weeks/` (new grammar, due review points, lesson topics) and the **Candidates** and **Used** lists in `sources.md` (look at Candidates first; the user already liked jb-b_H3FkUw). Never reuse a video, and prefer a different section of the topic range from last week's.
2. List the latest uploads (`channel https://www.youtube.com/@TalkToMeIn100Korean/videos 30`). Only videos marked `ko subs` (creator-made) qualify; skip `auto` ones, beginner-program videos and short announcements. The podcast season ended in late 2026, so new uploads may stop: older videos are fine, just never reuse one.
3. For the 2–3 best candidates, get the subtitles (`subs` into the scratchpad) and choose a 5–10 minute section that stands on its own (a topic start to a topic end). Prefer sections where one speaker tells a story or gives an opinion (with the others reacting), since those have the patterns the user can reuse in a podcast.
4. **Level check.** List the words already in Anki with `python3 -I .claude/skills/_shared/anki.py words`, and compare with the section text plus the grammar list in `Grammar/README.md`. Estimate the share of words the user knows (assume common basic vocabulary is known). Aim for **90–95%**; skip anything under ~85% or over ~98%. Note which grammar points appear, preferring sections that use this week's new or due points.
5. Fetch it into `Listening/YYYY-MM-DD-<short-korean-or-english-slug>/` (today's date). Add a line to **Used** in `sources.md`.

Tell the user in 3–4 lines: title, section and length, ~% known, and why (e.g. "uses #35 3 times, and #57"). Give the YouTube link with the start time (`&t=<seconds>`) and the end time. They can watch it there **with subtitles off**, or you play the whole clip in the terminal (`play <folder> 1 <last line>`).

**Listen.** The user listens once or twice with no transcript. Don't show any of the text.

**Rating.** Ask: "About what % did you understand?" and, optionally, "In a line or two (English is fine), what was it about?" Reply with one line on what they got. No spoken summary.

Write `notes.md` (see **Notes format**) with the Progress line `1 ✔ (60%) · 2 ☐ · 3 ☐ · 4 ☐`.

## Step 2: transcript, and why each part was missed (Fri, ~30 min)

1. Write `transcript.md` from `lines.tsv`: clean paragraphs with a heading and timestamp every 1–2 minutes, like `Listening/2026-10-27-전세/transcript.md`. For auto captions, fix obvious caption errors and list the fixes at the top (`Caption fixes: 7:10 "몰려요" → 몰라요`).
2. The user reads it while listening again, then tells you the parts they didn't catch (quote the words or give the time).
3. For each missed part, decide why and explain in English:
   - **단어**: unknown word → meaning, and whether it's worth learning
   - **속도**: knew it but it was too fast → play that line at 0.8× and then at normal speed
   - **소리**: sounds changed in speech: 연음 (linking, 먹어요 [머거요]), 경음화 (tensing, 학교 [학꾜]), ㅎ dropping (좋아요 [조아요]), nasalization (합니다 [함니다]), contractions (그런데 → 근데, 것 → 거) → write the sound out
   - **문법**: grammar they don't know or didn't recognize → explain, and link the `Grammar/` point if it's numbered
4. Fill in `notes.md`: the **Missed** list (with type), the **문장** table (useful sentences, grammar # from `Grammar/README.md`, why it's useful) and the **단어** table (new words with the example from the clip).
5. **Heard in the wild:** add 2–4 sentences that use numbered points to `progress/notes.md` (`| date | sentence | # | channel, clip title |`).
6. **No Anki cards.** Don't add sentences or words from the clip to Anki (no `card`, no `anki.py add`). The 단어 table stays in `notes.md` for reference only; Anki vocab comes only from the anki-vocab skill.

Progress: `2 ✔ (missed: 4 소리, 2 단어, 1 속도)`.

## Step 3: speech patterns (Sun, ~25 min)

Take apart **how** the speakers talk, not what they say. From `transcript.md`, find real examples of:

| Kind | What to look for | e.g. |
|---|---|---|
| **Openers** | how they start a topic or a story | 오늘은 ~에 대해서 이야기해 볼게요 · 제가 얼마 전에 ~했거든요 |
| **Connectors** | how they move between points | 그래서 · 근데 · 그러다 보니까 · 아무튼 · 그 다음에 |
| **Endings** | the sentence endings that make it sound spoken | -거든요 · -더라고요 · -잖아요 · -(으)ㄴ 것 같아요 |
| **Fillers & softeners** | how they buy time or soften | 뭔가 · 약간 · 좀 · 그 · 진짜 |
| **Reactions & asides** | how they react to each other or comment on their own story | 진짜요? · 맞아요 · 어떻게 아셨지? · 너무 충격적이었어요 |
| **Closers** | how they wrap up | 오늘은 여기까지 · 다음에 또 ~ |

1. Show 10–12 patterns in a short table: the pattern, the speaker's sentence (with time), what it does, in English. Play 3–4 of them (`play`) so the user hears the rhythm.
2. Link any numbered point (`#35 -더라고요`). Patterns that aren't numbered but are worth learning go to `Grammar/QUEUE.md` only if the user asks.
3. The user picks **5–8 patterns to borrow** for this week's podcast. Save them in `notes.md` under **Patterns to borrow**, and copy that list into the plan under **Podcast** (the speaking skill reads it from there).

Progress: `3 ✔ (6 patterns)`.

## Step 4: shadowing and final rating (Mon, ~25 min)

1. Choose 6–8 lines: the lines with the **Patterns to borrow** first, then lines from **Missed**.
2. For each line: show it, play it at 0.8× (`play … 0.8`), the user repeats it aloud, then play it at normal speed and they repeat again. Point out one sound or rhythm thing per line in English if useful (linking, where the pitch rises at the end). Move on when the user says next.
3. Then pick a ~1-minute passage (consecutive lines). Play it at normal speed 2–3 times while the user speaks along with it, showing the text the first two times and hiding it the last time.
4. **Final listen:** the whole clip with no text (terminal or YouTube with subtitles off). Ask for the % understood again, and write it at the top of `notes.md`: `**Listening:** 60% → 85%`.
5. Remind the user that **podcast v1** comes next (speaking skill), ideally today after shadowing while the patterns are fresh.

Progress: `4 ✔ (85%)`. The weekly check reads this.

## Notes format

`Listening/<folder>/notes.md` (`audio/` is not committed):

```markdown
# <slug> — 문장 & 패턴

**Progress:** 1 ✔ (60%) · 2 ✔ · 3 ☐ · 4 ☐
**Listening:** 60% → (final)
Source: <channel>, <title> (<section>) · <YouTube link with &t=> · ~92% known · Full text: [transcript.md](transcript.md)

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

## Speech patterns (step 3)
| Kind | Pattern | Sentence (speaker) | What it does |
|---|---|---|---|

## Patterns to borrow
- 제가 얼마 전에 ~했거든요 (opener)
```

## Finish each step

- If the newest `weeks/` plan has a Schedule row for today, tick the listening block (`☐ listening` → `☑ listening`).
- Commit only what this step changed (`git add Listening/ progress/notes.md weeks/`), message like `Listening 2026-11-05: step 1, <slug>`. Don't push. Give the short hash in one line.

When this runs as a block of `/korean-mentor`, skip the commit above: korean-mentor ticks the block and commits at the end of the run.
