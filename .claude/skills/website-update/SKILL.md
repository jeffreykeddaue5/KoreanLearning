---
name: website-update
description: Updates the Korean blog in website/ after a study session — today's Northern Virginia weather and a weather expression, 오늘의 기분, 자꾸 까먹는 단어 from the Anki database, 자주 틀리는 문법 from KoreanProgress.md, and a short 실수 blog post from today's session. Runs at the end of every korean-mentor session; also use when the user runs /website-update or asks to update the website.
---

# Website update

The site is in `website/` (see `website/notes.md`). Do all five steps, then tell the user what changed in a few lines. Keep everything short and simple: this is a personal blog, not study notes.

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

Pick one feeling word (adjective or expression) the user hasn't studied. Check it isn't in the Anki deck (step 3), `forgottenWords` in `website/script.js`, or the `<!-- 지난 기분: … -->` comment in the box. Fit it to how the session went if you can, e.g. 뿌듯하다 after a strong session.

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

## 5. 실수 blog post (`website/posts/`)

Write one post about today's session mistakes. Name it `YYYY-MM-DD-<short-english-slug>` (lowercase, hyphens; add `-2` if taken), write the file directly (don't copy `_template.js`), and add the name to the top of `POST_FILES` in `website/posts/list.js`. Match `website/posts/2026-10-21-banmal-mistake.js`:

```js
post({
  title: "짧은 제목",
  date: "YYYY-MM-DD",
  category: "mistakes",
  tags: ["한국어", "<main grammar point>"],
  content: [
    "한두 문장: 무엇을 하다가 틀렸는지.",
    { quote: "✕ 틀린 문장<br>○ 맞는 문장" },
    "한 문장: 왜 틀렸는지 / 기억할 점.",
  ],
});
```

- Written in simple Korean (반말 diary style like the existing posts), easy to read.
- Include every mistake from the session, but condensed: one ✕/○ pair per distinct mistake (if the same mistake happened more than once, show it once). The ✕/○ sentences don't have to be the user's exact words. A short, simplified sentence showing the same error is better. Keep the explanation line to one short sentence each. Skip nuance tips.
- If there were no real mistakes, write about the one correction or near-miss instead, still short.
- Use `'` or backticks inside strings that contain `"`.

## Check

Run `node --check website/script.js` and `node --check` on the new post. Don't stage or commit anything in `website/`. Don't push.
