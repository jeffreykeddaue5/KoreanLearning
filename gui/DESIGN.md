# Mentor GUI: design plan

A local window for the `/korean-mentor` grammar session (warm-up + timed questions). Goal: easier Korean typing than the terminal, a picture that helps you imagine the situation, and a real timer.

Mockup: `gui.png`.

## 1. What the GUI does vs what Claude does

| GUI (browser page + small Python server) | Claude (same skill, session.md) |
|---|---|
| Timer (start on show, stop on "done speaking") | Picks questions, writes prompts, follow-ups |
| TTS: plays the prompt (edge-tts, same voice as speak.sh) | Feedback, 💡 lines, logging to progress/ |
| Draws the scene (big emoji) | Writes the emoji scene for each prompt |
| Korean input box, keyboard shortcuts | End-of-session then → now, file updates |

Claude stays the brain; the GUI only renders and times. No session logic is duplicated, so session.md stays the single source of rules.

## 2. Architecture

```
browser (gui/index.html, app.js, style.css)
   ⇅ fetch / SSE on localhost:8765
gui/server.py  (Python stdlib)
   ├─ Claude Agent SDK client, one live session  (fallback: claude -p --resume <id>)
   └─ /tts?text=…  → edge-tts mp3 (reuses speak.sh settings)
```

- One persistent session = no cold start per turn; Claude replies while you read the feedback, so the break between questions hides the latency.

## 3. Start-up

The GUI runs its **own** Claude session, so the terminal and the browser never both talk to the same session. Two ways in, same result:

1. **From Claude Code:** `/korean-mentor gui` (or answer "gui" when the checklist says `Next: grammar. Go?`). korean-mentor runs `gui/start.sh` and replies with one line: `Grammar session open in the browser → http://localhost:8765`. Then the terminal is done; don't type there until the GUI session ends.
2. **Without a terminal:** a desktop launcher (`~/.local/share/applications/korean-mentor.desktop`) or a `mentor` shell alias, both running `gui/start.sh`.

`gui/start.sh`: starts `server.py` in the background if it isn't already running (port check), then opens the browser.

**Start screen** (the page's first view, shown instantly with no Claude call): the server runs `today.py` and shows the checklist:

```
금요일 · week of 11-18 · 다음 수업 D-5
☐ Anki · ☐ grammar: review · ☐ listening: step 2
Paused 16:05 at warm-up react 1/5 → resume Q8, Q9, Q4…
[ Resume grammar ]   [ Review only ]   [ Mistakes drill ]
```

The button starts the Claude session with `/korean-mentor [gui] <args>`. Claude does its setup (reads progress files, picks the questions) while a short "getting today's questions…" line shows, then sends the first prompt. Only timed blocks get buttons; listening, podcast etc. stay in the terminal.

**Closing early:** the 그만 button sends `그만`; closing the tab makes the server send it after 45 s with no page connected, so Claude saves the pause point like it does now (`paused 16:05 at …`) and the start screen offers **Resume** next time.

## 4. Turn protocol

Add a short **GUI mode** section to session.md: when the first message says `[gui]`, Claude

- does **not** call speak.sh or timer.py (the GUI does both),
- ends every prompt message with one fenced block the GUI parses:

```gui
{"type":"prompt","block":"warm-up","kind":"react","n":1,"total":5,
 "ko":"저 어제 놀이공원에서 롤러코스터를 다섯 번이나 탔어요.",
 "word":"멀미하다","gloss":"to get motion sick","extra":"멀미가 나다, 차멀미",
 "target_s":15,"scene":"🎢🎢🎢🎢🎢  →  🤢","speaker":"😆"}
```

- feedback messages use `{"type":"feedback","time":"24s","last":"1:40 ✏️","result":"✔","fixes":[…],"natural":"…","reaction":"헐, 진짜요?"}`
- end uses `{"type":"summary","rows":[…],"avg":"1:12 → 0:38"}`.

The GUI sends answers as: `⏱ 24s spoken\n<typed answer>` (or `?` / English for stuck). Anything Claude writes outside the block shows in a small chat strip, so nothing is lost if the JSON is missing.

## 5. Screens

**A. Prompt** (the mockup)
- Top left: timer ring that fills to the target (15 s warm-up, 30 s questions), then keeps counting in orange. Never cuts you off.
- Picture area: the situation picture (left) + the speaker's face with a reaction (right).
- Card: `워밍업 1/5 · 맞장구`, the Korean line (🔊 replay button, auto-plays once), word line **with English gloss** (`멀미하다 — to get motion sick · 멀미가 나다, 차멀미`).
- Phase 1 *say it*: big button **Done speaking (Space)**. Stops the timer.
- Phase 2 *type it*: answer box gets focus (untimed). Enter = send.
- Buttons: **Stuck (?)**, **Skip**, plus the ← → arrows for going back (below).

**B. Feedback** (the break between questions)
- `⏱ 24s · ✔ · last time 1:40 ✏️` in one line, the 1–2 fixes as `your words → fix` with the reason in English, 💡 line, `+n small slips saved`.
- Speaker's Korean reaction under the picture.
- **Ready (Enter)** loads the next prompt. Ask-a-question box for "why?" questions about the fix.

**C. Going back to earlier questions**
- The page builds every turn of the session (prompt, scene, word, your typed answer, time, feedback, recording) from the server's event list, so a page reload keeps it while the server runs.
- **←** (or Alt+←) steps back through earlier questions; **→** steps forward; **→** on the newest one returns to the live question. A row of dots at the bottom (● ✔ green, ● ✏️ orange, ○ current) shows where you are and jumps on click.
- Looking back is read-only and free: no Claude call, and the live question's timer **pauses** while you're away (the paused seconds don't count) and restarts when you come back.
- On an earlier question: **🔊** replays it, and **Try again** answers it once more (timed). Claude gets `[retry Q4] ⏱ 18s spoken\n<answer>`, gives feedback, and logs it as a second try; then you're back at the live question.

**D. End screen: today's mistakes**
Shown when the turns are done or you press **Finish**. Built by the server from `progress/daily/<today>.md` (the file every block already logs to), so it lists everything, including the small slips that never showed in feedback, plus Claude's summary block for the times.

```
오늘의 실수 · 2026-11-20 · grammar review
⏱ avg 1:12 → 0:38 · ✔ first try 6/8 · smooth this week 2

Then → now
Q1 주말에 뭐 했어요?   1:02 ✔ → 0:28 ✔
Q4 미국 곱창 먹을 만해요?  1:33 ✏️ → 0:35 ✔

✏️ 고쳤어요 (7)            filter: [all] 문법 조사 어휘 맞춤법 …
Q4 · 어휘   한국의 실력이 더 좋아요 → 한국 곱창이 훨씬 맛있어요
            실력 = a person's skill; food = 맛있다  (same as 11-17)
Q2 · 맞춤법 치킨 시당 → 치킨 식당  (small slip)
…
💡 더 자연스러워요 (3)
Q6  칠 만하지 않아요 → 칠 만한 날씨가 아니에요  ⚠ check with tutor

Keep: 미국 곱창이랑 비교하면 한국 곱창이 훨씬 맛있어요.
Next time: 실력 vs 맛있다 / 솜씨
[ Back to questions ]   [ Done ]
```

- Grouped by type (문법, 조사, 어휘…), main fixes first, small slips at the bottom.
- Click a row to go to that question (the go-back view).
- Recurring mistakes (already in `progress/mistakes.md` Recurring, or `same as …`) get a 🔁 mark.
- Only today's rows from timed blocks in this GUI session are shown; the website's 오늘의 실수 page still shows the whole day.
- **Done** tells Claude to do the end-of-session file updates and the commit, as it does now; the page shows "saved ✓" when that's finished and returns to the start screen.

## 6. Pictures: text scenes, no image files

Making a picture for every scenario is too much work, so no image files. Claude writes the scene as text in the same JSON block, so every prompt gets one for free:

```
"scene": "🎢🎢🎢🎢🎢  →  🤢",
"speaker": "😆"
```

- **scene:** 2–6 emoji, drawn big (about 64 px) in the picture area. They show the situation (🎢 x5 → 🤢 = rode it five times, felt sick) without giving away the Korean words.
- **speaker:** one face for the person talking (😆 😮 😢 🤔 😴 🥶), which changes to their reaction on the feedback screen.
- Real ASCII art (drawn with characters) is the fallback for anything that has no emoji. Claude's ASCII drawings come out uneven, so only use it for simple boxes and arrows.
- Repeated questions store their scene in `progress/questions.md` next to the question, so the same question always looks the same, like a flashcard.

## 7. Build order

All 9 steps are built (2026-11-20), plus: closing the tab = 그만 after 45 s with no page connected (`idle_watcher` in server.py; a reload reconnects first), and the server restarts itself when `server.py` changed and no session is running (start screen and `start.sh`).

1. server.py + start.sh + one page: show Claude's text, input box, send. (Korean typing works; already useful.)
2. Start screen from today.py + `/korean-mentor gui` + desktop launcher.
3. GUI mode in session.md + JSON block parsing → prompt card + feedback view.
4. Timer ring + Done-speaking / type phases + keyboard shortcuts.
5. TTS through the server + replay button.
6. Turn history in `gui/state/` + ← → going back + Try again.
7. End screen from `progress/daily/<today>.md`.
8. Emoji scene + speaker face, saved per question.
9. Record the spoken answer (MediaRecorder, from timer start to Done speaking) and play it back on the feedback card next to 🔊 for each fix. Saved to `gui/state/rec/<session id>/<turn>.webm` (retries `<turn>-r<k>`), not committed.

## 8. Review game: 어제의 실수 (built 2026-11-20)

A 5-minute warm-up on the last day's `progress/daily/<date>.md`, run entirely by the page (`static/game.js`) and the server (`/api/review`, `/api/review/result`): no Claude call.

- **Round 1 · 어느 게 맞아요?** (max 10): two sentences, what I said vs the fix, ← / →. Small slips, 💡 rows and ✏️ rows with no Type (rewrites). 10 pts, +5 if under 5 s, streak counter. No auto-play; the 🔊 button reads the right one.
- **Round 2 · 고쳐 보세요** (max 8): ✏️ rows with a Type (real errors), Recurring first. I type the fix; checked ignoring spaces and punctuation against every `/` alternative. ≥ 80% similar = close, with a character diff and an **I had it** button.
- **End:** score, best streak, misses, one replay of the misses. Results go to `gui/state/review-<date>.json`; the next grammar session uses the misses as follow-up targets (session.md setup). Levels and mistake counts don't change.
- Ways in: the 🎮 button on the start screen, `gui/start.sh review-game`, or `/korean-mentor game`.

## 9. Open questions

- Grammar block only, or other blocks too (weekly check, mistakes drill)? Suggest grammar only for v1; the protocol works for any timed prompt later.
- Emoji only, or allow simple ASCII art too?
- Agent SDK vs `claude -p --resume`: SDK is faster per turn; `claude -p` needs nothing installed. Check both on day 1.
