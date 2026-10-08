---
name: anki-vocab
description: Generates a week of Korean vocab (70 words, 10 per day) as a semicolon CSV in anki/ for Anki import, focused on conversational words, with conjugation help for verbs and adjectives and no repeats of words already learned. Use when the user wants new Anki vocab or runs /anki-vocab, optionally with a theme (e.g. "/anki-vocab travel").
---

# Anki Vocab

Make one CSV of 70 new words for the week: 7 days × 10 words.

## Setup

1. **File name.** Name the file after the Monday its week starts: `anki/YYYY-MM-DD.csv`. Use the Monday after the newest existing week file. If there isn't one, use the coming Monday, or today if today is Monday. If the user names a week, use that week.
2. **Known words. Never repeat these:**
   - the first field of every row in `anki/*.csv`
   - the 📚 vocabulary sections of `Homework/[0-9]*.md`
3. **Level and topics.** Read `KoreanProgress.md` for the user's level (intermediate, aiming for TOPIK 4급). Skim the 2–3 most recent `Homework/` lessons to see which topics come up in their conversations.

## Choosing words

- **Conversation first.** Pick words people say in everyday speech:
  - common verbs and adjectives (챙기다, 미루다, 귀찮다)
  - reactions and fillers (그러게요, 어쩐지, 설마)
  - collocations (약속을 잡다, 시간을 내다)
  - words for the user's lesson topics
- Aim for TOPIK 3–4. Include TOPIK words only if they're also common in speech. Skip words that are rare, technical, or only used in writing.
- Mix of roughly 50% verbs and adjectives, 35% nouns, and 15% adverbs and expressions.
- **Each day is a small theme**, e.g. making plans, feelings and reactions, at home, work, going out, health, money. If the user gave a theme, build the week around it.
- Count the rows yourself: exactly 70, 10 per day, with no duplicates.

## Row format

Six fields separated by `;`, with no header row:

```
word;meaning;Korean example;English translation;note;tags
```

- **word:** the dictionary form (미루다), or the expression as people say it (그러게요).
- **meaning:** short English glosses separated by commas.
- **Korean example:** one natural spoken sentence in 해요체 that someone would actually say. Keep it under about 15 syllable blocks when possible. Use a grammar point from `Grammar/` in it when that fits naturally.
- **English translation:** natural English for the example sentence.
- **note:** conjugation help and usage, separated by `<br>`:
  - Verbs and adjectives start with `Conj:` followed by the present (해요), past, future (-(으)ㄹ 거예요), modifier, and -아/어서 forms. Mark irregular verbs and adjectives, e.g. `(르 irregular)` or `(ㅂ irregular)`.
    `Conj: 미뤄요 · 미뤘어요 · 미룰 거예요 · 미루는 N · 미뤄서`
  - Next comes `Use:` with the particle pattern and a common collocation.
    `Use: N을/를 미루다 · 약속을 미루다, 내일로 미루다`
  - Optionally add `cf)` with a near-synonym and how it differs.
    `cf) 연기하다 = more formal (postpone an event)`
  - Nouns: give the related 하다 verb or common collocations. Expressions: say when to use them.
- **tags:** `conversation YYYY-MM-DD dayN`, using the week's Monday and the day number 1–7.
- Never put `;` or `"` inside a field. Write `<br>` for line breaks, never actual newlines.

Example row:

```
미루다;put off, postpone;숙제를 자꾸 미루다 보니 일이 많아졌어요.;I kept putting off my homework, and now I have a lot to do.;Conj: 미뤄요 · 미뤘어요 · 미룰 거예요 · 미루는 N · 미뤄서<br>Use: N을/를 미루다 · 약속을 미루다, 내일로 미루다<br>cf) 연기하다 = more formal;conversation 2026-10-12 day1
```

## Finish

Write the file as UTF-8. Check that every row has exactly 6 fields and that there are 70 rows. Then tell the user, in a few lines:
- the file name and the 7 day themes
- the import steps the first time only: in Anki, go to File → Import and set Field separator to Semicolon, check Allow HTML, map field 6 to Tags, and set the deck's New cards/day to 10
- that they can `git commit` it
