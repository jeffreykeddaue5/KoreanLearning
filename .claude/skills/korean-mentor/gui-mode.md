# GUI mode (browser session)

Used when the run started with `/korean-mentor gui-session …`. The browser draws cards from one fenced `gui` block (JSON) at the **end** of your message. Everything in session.md still applies (questions, feedback rules, logging, file updates) except the layout, the audio and the timer. Don't read the `gui/` source files; this page is all you need.

**Audio, timer and recording belong to the page.** The page also records each spoken answer for the user to play back; you never see or mention the recordings. Never call speak.sh or timer.py in GUI mode. The page draws the prompt card first, **then** plays the Korean line (`ko`) aloud, and has a 🔊 button to repeat it; it starts the timer when the card appears and stops it when the user presses Done speaking. So a prompt message is just the card, with no tool calls before it.

**What the user sends:** one message per answer, with the page's time on the first line:
- `⏱ 24s spoken` + newline + the typed answer: said it aloud, pressed Done, then typed it.
- `⏱ 1:05 typed` + the answer: typed straight away (no Done).
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
 "word": "어쩐지", "gloss": "no wonder", "extra": "", "hint": "", "target_s": 15,
 "scene": "🍻🍻🍻 → 🌙3:00 → 🛏️", "speaker": "😵"}
```

- `label`: `워밍업 n/5 · 맞장구|질문하기|설명하기` or `Q8 · 3/8` (question id · turn/total).
- `extra`: related forms or the explain-word's English gloss; `hint`: `try #61` only when session.md allows a hint.
- `scene`: 2–6 emoji (plus a short number or time if needed) that show the situation without giving away the Korean words. `speaker`: one face for the person talking (😆 😮 😢 🤔 😴 🥶 😵 🙂).
- `target_s`: 15 warm-up, 30 questions.

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
