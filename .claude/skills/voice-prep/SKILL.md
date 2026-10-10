---
name: voice-prep
description: Builds a ready-to-paste ChatGPT prompt for a Korean voice-conversation session, with a checklist of targets to hit, built from the user's current weak grammar points, homework mistakes and this week's Anki words, and afterwards logs ChatGPT's recap into KoreanProgress.md. Use when the user runs /voice-prep, wants to practice speaking with ChatGPT voice, or pastes a recap from a voice session (/voice-prep recap).
---

# Voice Prep

ChatGPT can't see this folder, so the prompt has to include everything it needs.

## Mode 1: build the prompt (`/voice-prep`, optionally with a topic)

1. **Targets (5–7 points).** Read `KoreanProgress.md`.
   - Start with the "Focus next time" points from the latest session log line, then Shaky points, then New points with the oldest "Last practiced" date.
   - Look up each point in `Grammar/README.md` and its file. For each, write a one-line gloss that includes the user's specific trap, e.g. `#11 -기는 했지만 (past: the past goes on 하다 → 쉽기는 했지만)`.
2. **Mistakes (4–6).** Take them from **Recurring mistakes** and the **Lesson mistakes** not yet marked ✓. Add the newest `(❌)` items from the 2 most recent `Homework/` lessons. Write each as `wrong → right`.
3. **Words (10–12).** Use the `anki/` file for the week that contains today, or the newest file if none does. Take words from the days that have started so far (day 1 = Monday). If the week hasn't started yet, use days 1–2.
4. **Topic ideas (3).** Pick topics that suit the targets. Prefer things from the user's life: recent session log lines and `Homework/` 💬 sections (dramas, work, moving, pickleball, 3D modeling, trips). Don't reuse the previous session's exact topics. These are only starting points; the conversation can go anywhere.

There is no time plan or minute breakdown. The session is a checklist: it ends when every target is hit or the user says stop.

Print the prompt in a single code block, filled in from the template below. Then add one line: "Paste this into ChatGPT, switch to voice, and send me the recap afterwards with `/voice-prep recap`."

```
You are my Korean conversation partner for a voice session. I'm intermediate (aiming for TOPIK 4급).

Rules
- Speak polite 해요체, slowly and naturally. Keep each turn to 1–2 short sentences so I talk more than you.
- Have a natural conversation, and steer it so I have to use the targets below. Don't tell me which one you're testing.
- Keep track of the checklist. Once a target is hit, move on to targets that haven't been hit yet.
- If I make a mistake, say the corrected sentence once in Korean, then continue. Explain in English only if I ask.
- If I get stuck, give me the start of the sentence in Korean, not the English.
- Don't correct pronunciation unless it changes the meaning.

Checklist
Grammar: I use each one correctly at least 2 times.
- {#N form (gloss + my trap)}
…
Words: I use each one at least once.
{word, word, …}
Mistakes: set up a situation where I might make each one again. It counts as hit if I get it right.
- {wrong → right}
…

Topic ideas (just starting points): {topic 1}, {topic 2}, {topic 3}

Ending
When everything is hit, or when I say "stop", switch to English and give a recap:
- the checklist, with each item marked ✅ hit or ❌ missed
- every correction you made, as "wrong → right"
```

## Mode 2: log the recap (`/voice-prep recap`, with the recap pasted)

1. **Check each correction ChatGPT made** against `Grammar/` and the tutor's corrections in `Homework/`:
   - If it's clearly right, log it.
   - If it's wrong, don't log it, and tell the user in one line.
   - If it depends on nuance, add it to **To verify**.
2. **Update `KoreanProgress.md`** using the rules in the Ending section of `.claude/skills/korean-mentor/SKILL.md`: Grammar points, Recurring mistakes, Lesson mistakes, To verify, and the Session log.
   - A voice session counts as a session.
   - A point used correctly counts as "without hints" unless the recap says ChatGPT helped.
   - A ❌ missed target means it never came up, which isn't a mistake. Leave its status alone; it becomes a target again next time.
   - The log line gets `voice (ChatGPT)` as its mode, e.g. `2026-10-09 · #11, 29, 37, 41, 45 · voice (ChatGPT) · strong: … · fix: …`.
3. Reply with a short recap of what changed, plus a one-line suggestion to `git commit`.
