---
name: hard-words
description: Keeps a list of Anki words the user struggles to use, in the Hard words section of KoreanProgress.md, so korean-mentor can work them into sessions. Use when the user runs /hard-words, says they have trouble with certain Korean words, or wants to see or change that list (e.g. "/hard-words 막상 어쩐지", "/hard-words", "/hard-words remove 막상").
---

# Hard Words

Manage the **Hard words** section of `KoreanProgress.md`. Create the section after **Lesson mistakes** if it's missing.

## Add: `/hard-words 막상 어쩐지 …`

For each word:

1. Grep `anki/*.csv` for a row whose first field is the word. The fields are `word;meaning;example;translation;notes;tags`, and the tags end with the week and day (e.g. `2026-10-12 day1`).
2. Add one line: `- word — meaning; short usage tip from the notes (anki <week> <day>) · 0/2`
   e.g. `- 어쩐지 — no wonder; often + -더라고요 (anki 2026-10-12 day2) · 0/2`
3. If the word isn't in Anki, add it with a short meaning and `(not in anki)`, and say so.
4. If it's already listed, don't duplicate it. If it's marked ✓, reset it to 0/2.

Then show the updated list.

## List: `/hard-words`

Show each word with its meaning and count, ✓ items last.

## Remove: `/hard-words remove 막상`

Delete the line and confirm in one line.

## Counting

`korean-mentor` updates the counts: +1 for each session where the user used the word correctly without a hint, ✓ with the date at 2/2 (e.g. `· ✓ 2026-10-20`), and back to 0/2 if they misuse it later.
