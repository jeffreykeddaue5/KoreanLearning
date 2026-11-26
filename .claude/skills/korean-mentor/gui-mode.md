# GUI mode (browser session)

Used when the run started with `/korean-mentor gui-session …`. The browser draws cards from one fenced `gui` block (JSON) at the **end** of your message. Everything in session.md still applies (questions, feedback rules, logging, file updates) except the layout, the audio and the timer. Don't read the `gui/` source files; this page is all you need.

**Audio, timer and recording belong to the page.** The user can record takes with a Record button to play back; you never see or mention the recordings. Never call speak.sh or timer.py in GUI mode. The page draws the prompt card first, **then** plays the Korean line (`ko`) aloud, and has a 🔊 button to repeat it; the timer starts when the audio ends and stops when the user presses Done speaking. The Korean line starts **covered** (listening practice): the user uncovers it only if they need to. So a prompt message is just the card, with no tool calls before it. So a prompt message is just the card, with no tool calls before it.

**What the user sends:** one message per answer, with the page's time on the first line:
- `⏱ 24s spoken` + newline + the typed answer: said it aloud, pressed Done, then typed it.
- `⏱ 1:05 typed` + the answer: typed straight away (no Done).
- Either first line may end with `· used: frame, trap, text` (any of them): the user opened the format hint, the past-mistake hint, or uncovered the Korean line. **No hint carries a penalty (asked 2026-11-24):** grade a `used: frame` answer exactly like any other (levels, +1, Smooth all as normal); just mark the history line `(frame)` so it's visible. `text` is logged only as a listening note.
- `?`, English, or a question about a fix: as in session.md. `ready` = next prompt.
- `[retry Q4] ⏱ 18s spoken` + newline + the answer: the user went back to an earlier question (Q4, or `워밍업 2/5`) and tried it again. Reply with **one feedback block** with `"label": "Q4 · retry"` and `last` = their earlier try, fixes as usual. Log it to questions.md as a history line marked `(retry)` and to `progress/daily/` (Block `grammar Q4 retry`); no level change, they had just seen the fix. **Don't send a new prompt**: the live question is still waiting on their screen, and their next message is its answer (or `ready`). `[retry Q4] ?` = stuck: a retry feedback card with the model sentence as `better`.
Use that time as the answer's time for feedback, history lines and levels.

**Rules**
- One block per message, at the very end, valid JSON (double quotes, no comments, no trailing commas).
- Text outside the block shows as a small note under the card: keep it to answers to the user's questions and the stuck-answer model sentence. Don't repeat what's in the block, and drop `Ready? Send anything…` (the card has a Ready button that sends `ready`).
- Korean in `ko`, `reaction`, `said`, `better`; English in `gloss`, `why`, `note`. **Every other word you write is English** (notes, answers to questions, status like "Saving…", the recap): Korean only in the card's Korean fields (asked 2026-11-20).
- **No setup or progress text** (asked 2026-11-20): don't show the setup block (week set, points, words, turns, avg), "Setup is done", "Resuming…", or any line about what you're reading or doing. Do the setup silently; the first thing the user sees is the first prompt card. The page shows its own "getting ready" status while you work.
- The only plain-markdown messages (no block): answers to the user's questions, the stuck model sentence, and the short end-of-run recap after the file updates.

## prompt: every question (warm-ups too)

```gui
{"type": "prompt", "label": "워밍업 1/5 · 맞장구", "ko": "저 어제 회식 때문에 새벽 세 시에 집에 들어갔어요.",
 "word": "어쩐지", "gloss": "no wonder", "extra": "",
 "frame": "어쩐지 ___(word)더라고요. ___(phrase)아/어서 그랬구나.",
 "trap": {"said": "요즘 버텼거든요", "better": "요즘 버티고 있거든요", "why": "ongoing now → present, not past", "date": "10-13"},
 "target_s": 15,
 "scene": "🍻🍻🍻 → 🌙3:00 → 🛏️", "speaker": "😵"}
```

- `label`: `워밍업 n/5 · 맞장구|질문하기|설명하기` or `Q8 · 3/8` (question id · turn/total); weekly test `Test n/10`, then `Homework n/5`.
- `extra`: related forms or the explain-word's English gloss.
- **Hints (asked 2026-11-24):** every prompt carries both, hidden behind two buttons the user opens only if needed. The point is to answer in Korean patterns instead of translating from English.
  - `frame` (💬 Format): a whole-sentence frame made of natural chunks: an opener, the grammar point the question targets, a natural ending (막상, 은근히, 생각보다, 그냥, -더라고요, -거든요…). Blanks only for the user's own content, and **every blank says what goes in it** (asked 2026-11-24): `___(word)` for one word, `___(phrase)` for a few words or a clause, e.g. `여자친구가 ___(phrase) 삐질까 봐`, `여자친구가 ___(word)를 좋아해서`. The grammar and chunks stay written out. Only grammar and chunks the user already knows (progress/grammar.md, the week's listening patterns). E.g. `처음엔 그냥 ___(phrase)는데, 보다 보니까 은근히 ___(word)더라고요.`
  - `trap` (🔁 Past mistake): the one item from `progress/mistakes.md` this question is most likely to trigger (Recurring first, then Practice; e.g. a past-trip question → the tense item), as the user's own old sentence → the fix, `why` in English, `date` MM-DD. `null` when nothing fits.
  - Every block gets both hints: grammar, review, the weekly test (since 2026-11-25; no `game` field any more), lesson review and the mistakes drill.
- `scene`: 2–6 emoji (plus a short number or time if needed) that show the situation without giving away the Korean words. `speaker`: one face for the person talking (😆 😮 😢 🤔 😴 🥶 😵 🙂).
- `target_s`: 15 warm-up, 30 questions.

## Lesson review (`lesson-review`)

Same cards as above, one `prompt` per item (no warm-up), **with both hints** (`frame` and `trap`, asked 2026-11-24), `target_s` 30. Hints carry no penalty: a right answer gets its +1 either way.
- `label`: `Lesson 3/8 · 단어` for a lesson word, `Lesson 6/8 · 실수` for an old lesson mistake.
- Word items: the situation in `ko`, the lesson word to use in `extra` (`use: 두 달에 한 번씩 — once every two months`). The Anki word still goes in `word`/`gloss`.
- Mistake items: set up the same choice again in `ko`, `extra` `""` (it's the test). A "fix this" item puts the old sentence in `ko` and `fix this sentence` in `extra`.
- `feedback` after each answer as usual (`last` `""`); end with a `summary` (`q` = the word or mistake, `then` `""`).

## Mistakes drill (end of every GUI session except the weekly test)

After the block's last feedback card, go straight into 5 `prompt` cards labelled `실수 1/5` … `실수 5/5`: the situation that triggers the old mistake in `ko`, `extra` `""`, **with both hints** (`frame`; `trap` = that same old mistake), `target_s` 30. Hints carry no penalty. Feedback as usual (`last` = the item's last result from mistakes.md, e.g. `11-21 ✔`). Then one `summary` for the whole session, the drill rows included.

## feedback: after the typed answer

```gui
{"type": "feedback", "label": "Q8", "time": "24s", "result": "✏️", "last": "1:40 ✏️",
 "fixes": [{"said": "피곤하는 바람에", "better": "과제가 많은 바람에", "why": "-는 바람에 = an event, not a state"}],
 "natural": {"said": "칠 만하지 않아요", "better": "칠 만한 날씨가 아니에요", "why": "noun form sounds more natural"},
 "slips": 2, "reaction": "진짜요? 곱창은 어디서 먹었어요?", "speaker": "😮", "note": ""}
```

- `result`: `✔` or `✏️`; `last`: the previous try from questions.md, `""` the first time.
- `fixes`: the 1–2 main fixes shown (session.md), `[]` if none; `natural`: the 💡 line or `null`; `slips`: count only logged.
- `reaction`: your one-line Korean reaction (the same line can open the next prompt). `note`: e.g. `next time send what you have at 30 s`, nuance warnings, `same as L14: …`.
- Stuck (`?` or English): a plain note with the model sentence for the user to type back; after they type it, a `feedback` card with `"result": "✏️"` and `"time": "stuck"`.

## summary: end of the session (before the file updates)

```gui
{"type": "summary", "rows": [{"q": "Q1 주말에 뭐 했어요?", "then": "1:02 ✔", "now": "0:28 ✔"}],
 "avg": "1:12 → 0:38", "first_try": "6/8", "smooth": 2,
 "keep": ["미국 곱창이랑 비교하면 한국 곱창이 훨씬 맛있어요."], "next": "실력 vs 솜씨"}
```
