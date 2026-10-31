---
name: pinned-words
description: 20–25 minute Korean drill that takes the user's pinned Anki words from recognizing them to using them, covering about 15 words from the last 7 days ranked by how often they were pinned and missed in Anki, and tracks them in KoreanProgress.md. Use when the user runs /pinned-words or wants to practice this week's or today's pinned words (e.g. "/pinned-words", "/pinned-words today").
---

# Pinned Words

A drill run 1–2 times a week, separate from `korean-mentor` sessions.

## Setup

Read this week's pins from a fresh copy of the collection, and only read the copy. The last number is how many days to include: 7 for `/pinned-words`, 1 for `/pinned-words today`.

```bash
SCRATCH=<your scratchpad directory>
cp ~/snap/anki-desktop/common/User\ 1/collection.anki2 "$SCRATCH/collection.anki2"
python3 -I - "$SCRATCH/collection.anki2" 7 <<'EOF'
import json, re, sqlite3, sys, time
c = sqlite3.connect(sys.argv[1])
crt = c.execute("select crt from col").fetchone()[0]
today = int((time.time() - crt) // 86400)
first = today - int(sys.argv[2]) + 1
cut = (crt + first * 86400) * 1000
def clean(s):
    return re.sub(r"\[sound:[^]]*\]|<[^>]+>", "", s).strip()
words = []
for nid, tags, flds in c.execute("select id, tags, flds from notes where tags like '%review_pinned_day_%'").fetchall():
    pins = {int(d) for d in re.findall(r"review_pinned_day_(\d+)", tags) if int(d) >= first}
    if not pins:
        continue
    again = c.execute("select count(*) from revlog r join cards k on k.id = r.cid where k.nid = ? and r.ease = 1 and r.id >= ?", (nid, cut)).fetchone()[0]
    f = [clean(x) for x in flds.split("\x1f")] + ["", "", "", ""]
    w = dict(zip(("word", "meaning", "example", "translation"), f))
    w.update(pins=len(pins), again=again, day=max(pins), pinned=time.strftime("%F", time.localtime(crt + max(pins) * 86400)))
    words.append(w)
words.sort(key=lambda w: (-w["pins"], -w["again"], -w["day"]))
for w in words:
    print(json.dumps(w, ensure_ascii=False))
EOF
```

The output is already ranked: most pins, then most Again presses, then newest pin. If it's empty, say so and stop.

Then read **Pinned drill** in `KoreanProgress.md` and pick the words:

1. Leave out words marked `passed`, unless their `pinned` date in the output is later than the passed date.
2. Move words marked `missed` to the top, keeping their order.
3. `/pinned-words`: take the first 15. `/pinned-words today`: take them all.

If no words are left, say so and stop. Split the words into groups of about 6, keeping the order.

## How to run it

Run these steps for each group, and ask whether to carry on before starting the next group.

1. **Recall:** Show each Korean word and ask what it means and when you'd use it. If the answer is right, the word skips to Produce.
2. **Use:** For words missed in Recall, give a new sentence with a blank that tests the chunk, not just the meaning, e.g. `다음 주 금요일에 연차를 ___ 여행 갈 거예요.`
3. **Produce:** For every word in the group, in a new order, give only a situation in English and have the user write the sentence. Don't name the word, and don't ask for a specific word form. This step decides whether the word passes.
4. **Put it together:** Have a short conversation with about 3–5 exchanges, set up so the user needs as many of the group's words as possible. Prompt each reply with a situation in English. This step doesn't change any results.

Rules for every step:

- Show one prompt at a time, with `[n/total]` for its place in the step.
- **Don't reuse the Anki example.** Change the situation so a memorized answer won't work.
- Don't show what you're looking for until the user has answered.
- Follow **Feedback** in `.claude/skills/korean-mentor/SKILL.md`, with a one-line ✔ or ✏️ for each answer.
- Read each Korean prompt aloud as in `korean-mentor`, with `.claude/skills/korean-mentor/speak.sh "<Korean text>"` (plain Bash, not `run_in_background`). Don't mention the audio unless it fails. Pass only the Korean sentence, and skip the Produce step, which has no Korean. If the script fails, say so in one line and carry on without audio.
- After the last word in Recall, Use and Produce, ask the missed words again in a new sentence or situation. Only the first answer in Produce counts.

## Ending

When the words are done or the user stops, recap in a few lines: the words that passed, and the words that were missed, each with a fixed sentence. Then update `KoreanProgress.md`.

**Results.** A word passes if the user's first Produce answer uses it correctly without a hint. Otherwise it's missed. Words that didn't reach Produce get no result.

**Pinned drill.** Keep one line per word, using today's date and the `pinned` date from the output:

- Passed: `- 역전하다 · pinned 2026-10-30 · passed 2026-10-31`, replacing any line for that word.
- First miss: `- 역전하다 · pinned 2026-10-30 · missed 2026-10-31`
- Word already marked `missed`: remove the line and add the word to **Hard words**, following **Add** in `.claude/skills/hard-words/SKILL.md`.
- Delete any line whose `pinned` date is more than 7 days ago.

**New mistakes** in the user's own sentences, other than missing the word, go under **Practice mistakes** in the usual format, keeping at most 10 items and dropping the oldest.

Don't update **Session log**: `practice-mistakes` treats any line dated today as a reason not to raise its counts. Don't update the Grammar points table, `sessions/` or the website.

Then commit only that file (`git add KoreanProgress.md`), with a message like the one below, and don't push:

```
Pinned words 2026-10-31

passed: 역전하다, 연차 · missed: 뒤끝
```

Finally, tell the user in one line that progress was saved and committed, with the short commit hash.
