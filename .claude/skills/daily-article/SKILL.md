---
name: daily-article
description: Writes one short Korean news article a day for the 기사 section of the website (website/posts/, category "article"), about a real news story from today on a rotating topic (게임 / 테크 / K-pop / 요리 / 생활), built around what the user is learning — the week's grammar, due points, the correct forms of their recurring and recent mistakes, lesson and trouble Anki words — with a 문법 · 실수 list, a spot-the-mistake line, a word list and the source link. Use when the user runs /daily-article or asks for today's article; korean-mentor runs it at the end of every run if today's article doesn't exist yet.
---

# Daily article (기사)

One short article a day on the website, written for the user: real news from today, in Korean they can read at about 90–95% known words. Talk to the user in English; the article itself is Korean.

## 1. Already done?

If `website/posts/YYYY-MM-DD-article*.js` exists for today, say so and stop (unless the user asks for another one: then add `-2`).

## 2. Topic of the day

| Mon | Tue | Wed | Thu | Fri | Sat / Sun |
|---|---|---|---|---|---|
| 게임 | 테크 | K-pop | 요리 | 생활 | the day's most interesting story from any of the five |

The user can name a different topic or story; use theirs.

## 3. Find the story

Use WebSearch (standard) for news **from today** (or yesterday if today has nothing yet) on that topic. Prefer Korean sources (연합뉴스, 한겨레, 조선일보, 디스패치, 인벤, 디지털데일리…) and stories with a Korea link; a big global story is fine too. Search in Korean (e.g. `게임 신작 출시 오늘`, `아이돌 컴백 이번 주`, `요즘 유행 레시피`, `생활 물가 뉴스`). Pick one story that's concrete and easy to retell (a release, a comeback, a price change, a trend), not politics or crime.

Check the facts in a second source if the first is thin. Never make up details, numbers or quotes.

## 4. Write it

**The article is built around what the user is learning** (asked 2026-11-18): the news is the topic, the user's own material is the content. Before writing, read:
- `weeks/<newest>.md`: the week's 2 new points, lesson words;
- `progress/grammar.md`: due points and points at level 2+;
- `progress/mistakes.md`: **Recurring** mistakes and open **Lesson** / **Practice** mistakes (the correct forms);
- the newest `sessions/*.md` Corrections (today's or yesterday's mistakes);
- `python3 -I .claude/skills/_shared/anki.py trouble` (2–3 trouble words) and `pinned 1`.

- **Your own words**, never copied or translated sentence by sentence from the source. No direct quotes longer than a few words.
- **Length:** 5–7 short paragraphs, about 400–600 Korean characters in all.
- **Style:** 해요체, short sentences (one idea each), like a friendly news blog. Everyday words; explain a hard word in the text the first time (`출시, 그러니까 새로 나오는 거예요`).
- **Grammar and mistakes (the point of the article):** pick the story so these fit naturally, then use and bold them (`<b>-는 바람에</b>`):
  - both of the week's new points, once each;
  - 2 due points;
  - the **correct form of 2–3 of the user's mistakes** (top Recurring first, then recent session/lesson ones), e.g. tense → past for a finished event (`지난주에 <b>나왔어요</b>`), 이/가 + intransitive (`표가 다 <b>팔렸어요</b>`);
  - 2–3 lesson words and trouble/pinned Anki words.
  Don't force them: rewrite the sentence or pick another point if it sounds odd.
- **End** with one question to the reader (`여러분은 어떻게 생각해요?`, `이 게임 해 보고 싶어요?`). It's a ready conversation topic for the tutor.
- **단어** (after the article): 5–8 words the user probably doesn't know yet, `word — English`; skip basic ones. Don't add them to Anki (Anki words come from `/anki-vocab` only).
- **문법 · 실수** (after 단어): one line per bolded item: the point or mistake it shows, linked to the grammar page: `<a href="#/grammar/59">-는 바람에 (#59)</a>: 갑자기 생긴 일 때문에` · `팔렸어요: 표가 팔다 ✗ → 팔리다 (실수 L6)`.
- **찾아보세요** (1 line): one sentence from the article rewritten with the user's top Recurring mistake, for them to spot: `틀린 곳은? "새 앨범이 다음 주에 나왔어요."` with the answer hidden in `<details><summary>답</summary>…</details>`.
- **출처**: the source title and link.

## 5. Save it

`website/posts/YYYY-MM-DD-article.js`, and add `"YYYY-MM-DD-article"` at the top of `POST_FILES` in `website/posts/list.js`:

```js
post({
  title: "에스파, 다음 주에 컴백해요",
  date: "2026-11-18",
  category: "article",
  tags: ["K-pop", "에스파"],
  summary: "에스파가 다음 주에 새 앨범으로 돌아와요.",
  content: [
    "첫 문단 …",
    "… <b>-는 바람에</b> …",
    "여러분은 이 노래 들어 볼 거예요?",
    { heading: "단어" },
    { html: "<ul><li>컴백 — comeback</li><li>선공개 — pre-release</li></ul>" },
    { heading: "문법 · 실수" },
    { html: '<ul><li><a href="#/grammar/59">-는 바람에 (#59)</a>: 갑자기 생긴 일 때문에</li><li>팔렸어요: 표가 팔다 ✗ → 팔리다 (실수 L6)</li></ul>' },
    { heading: "찾아보세요" },
    { html: '틀린 곳은? "새 앨범이 다음 주에 나왔어요." <details><summary>답</summary>나올 거예요 (다음 주 = 미래)</details>' },
    { heading: "출처" },
    { html: '<a href="https://…" target="_blank" rel="noopener">기사 제목 (언론사)</a>' },
  ],
});
```

Then run `node --check` on the file and on `website/posts/list.js`. Don't stage `website/` (the user commits it).

## 6. Tell the user

One line: today's topic, the headline, the link to the source. If run on its own, also give the page address `#/post/YYYY-MM-DD-article`.
