---
name: daily-update
description: Updates the website's side panels for the day — 오늘 날씨 (Northern Virginia weather and a weather expression), 오늘의 기분, 자꾸 까먹는 단어 from the Anki database, and 자주 틀리는 문법 from KoreanProgress.md — plus today's pinned Anki words (marquee and flash cards). The panels run at most once per day; the pinned words refresh on every run. Use when the user runs /daily-update or asks to update the side panels or pinned words; website-update also runs it after a korean-mentor session.
---

# Daily update

Updates the four side panels in `website/` (see `website/notes.md`). Keep everything short and simple: this is a personal blog, not study notes.

## 0. Once a day only

`website/index.html` has a `<!-- daily-update: YYYY-MM-DD -->` comment right after `<!-- 왼쪽 메뉴 -->`. Compare it with today's date (`date +%F`):

- Same date: the panels were already updated today. Do step 5 only, since the user may have pinned more words.
- Different date or missing: do steps 1–5, then set the comment to today's date (add it if missing).

## 1. 오늘 날씨 (`website/index.html`, the `▼ 오늘 날씨` box)

Get today's weather for Northern Virginia (Fairfax) from Open-Meteo, no key needed:

```bash
curl -s 'https://api.open-meteo.com/v1/forecast?latitude=38.85&longitude=-77.30&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FNew_York&forecast_days=1'
```

Use the daily `weather_code` (WMO: 0 맑음, 1–3 구름 조금/흐림, 45–48 안개, 51–67 비, 71–77 눈, 80–82 소나기, 95+ 뇌우). If the request fails, say so and leave the weather as it is. Don't guess.

Update in that box:
- The ASCII art in `<pre class="rain">` to match: rain `' , ' , '`, snow `* . * . *`, sun `\ | /  — ☼ —  / | \`, clouds `.--.  (    ).`. Two short lines max.
- `<p>날씨 · NN°C</p>` using the current temperature, rounded.
- The `small` line under it: a short tip for the day, e.g. 우산을 챙기세요, 겉옷을 챙기세요, 햇볕이 좋아요.
- **오늘의 표현:** one natural Korean expression for today's weather in 「…요」 form, plus a short meaning line in simple Korean, e.g. 「하늘이 쨍해요」 / 쨍하다: 햇빛이 아주 밝고 맑다. Don't reuse the expression that's there now.

## 2. 오늘의 기분 (`index.html`, the `▼ 오늘의 기분` box)

Pick one feeling word (adjective or expression) the user hasn't studied. Check it isn't in the Anki deck (step 3), `forgottenWords` in `website/script.js`, or the `<!-- 지난 기분: … -->` comment in the box. Fit it to the day if you can, e.g. the weather or how the latest session in `KoreanProgress.md` went (뿌듯하다 after a strong session).

Update:
- `class="face"`: a kaomoji that fits.
- The middle `<p>`: the word.
- The `small` line: a short sentence with the word, e.g. 오늘 문법을 다 맞혀서 뿌듯해요.
- Add the word to the `<!-- 지난 기분: … -->` comment just inside the box (create it if it's missing).

## 3. 자꾸 까먹는 단어 (`forgottenWords` in `website/script.js`)

The Anki collection is at `~/snap/anki-desktop/common/User 1/collection.anki2`. Copy it to the scratchpad first (Anki may have it open) and only read the copy. Count "Again" presses per card:

```bash
SCRATCH=<your scratchpad directory>
cp ~/snap/anki-desktop/common/User\ 1/collection.anki2 "$SCRATCH/collection.anki2"
python3 -I - "$SCRATCH/collection.anki2" <<'EOF'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
q = """select n.flds, sum(r.ease = 1) from revlog r
       join cards c on c.id = r.cid join notes n on n.id = c.nid
       group by c.id having sum(r.ease = 1) > 0 order by 2 desc limit 20"""
for flds, again in c.execute(q):
    f = flds.split("\x1f")
    print(again, f[0], "|", f[1])
EOF
```

Replace the whole `forgottenWords` array with these words, most-missed first. `misses` = the Again count. `meaning` is a short definition **in simple Korean** (not the English from Anki), like the existing entries. Leave the comments and the code below the array alone.

## 4. 자주 틀리는 문법 (`misusedGrammar` in `website/script.js`)

Build it from `KoreanProgress.md`: **Recurring mistakes** first, then **Practice mistakes** and **Lesson mistakes** that aren't ✓. Up to 10 entries, each:
- `grammar`: the point in a few words, e.g. `-(으)ㄹ까 봐 (+서 ✕)`
- `wrong` / `right`: one short example sentence pair, using the user's real sentence
- `misses`: the number of dates the mistake shows up with (at least 1)

Replace the whole array. Leave the rest of the file alone.

## 5. 오늘의 단어 (`pinnedWords` in `website/script.js`)

Read today's pinned words from a fresh copy of the collection. They're tagged `review_pinned_day_<N>`, where N is Anki's day number:

```bash
SCRATCH=<your scratchpad directory>
cp ~/snap/anki-desktop/common/User\ 1/collection.anki2 "$SCRATCH/collection.anki2"
python3 -I - "$SCRATCH/collection.anki2" <<'EOF'
import json, re, sqlite3, sys, time
c = sqlite3.connect(sys.argv[1])
crt = c.execute("select crt from col").fetchone()[0]
day = int((time.time() - crt) // 86400)
def clean(s):
    return re.sub(r"\[sound:[^]]*\]|<[^>]+>", "", s).strip()
for (flds,) in c.execute("select flds from notes where ' ' || tags || ' ' like ?", (f"% review_pinned_day_{day} %",)):
    f = [clean(x) for x in flds.split("\x1f")] + ["", "", "", ""]
    print(json.dumps(dict(zip(("word", "meaning", "example", "translation"), f)), ensure_ascii=False))
EOF
```

- Words printed: set `date` to today (`date +%F`) and replace the whole `words` array with them, keeping Anki's English as written. Leave the code around it alone.
- Nothing printed: leave `pinnedWords` as it is. The flash cards keep the last set, and the marquee hides it because the date isn't today.

## Check

Run `node --check website/script.js`. Don't stage or commit anything in `website/`. Don't push. Then tell the user what changed in a few lines.
