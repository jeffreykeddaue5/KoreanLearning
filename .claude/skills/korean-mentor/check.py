#!/usr/bin/env python3
"""End-of-run coherence check for /korean-mentor (asked 2026-11-26). Run from the repo root:

    python3 -I .claude/skills/korean-mentor/check.py

Read-only. Prints one line per check: "ok  …" or "⚠  …" (something to fix before the commit).
Mechanical checks only; the judgment checks are listed in SKILL.md step 5.
"""
import importlib.util
import json
import re
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path

today = date.today()
T = today.isoformat()
warn, ok = [], []


def check(cond, good, bad):
    (ok if cond else warn).append(good if cond else bad)


# ---------- plan: today's row ----------
plans = sorted(Path("weeks").glob("????-??-??.md"))
plan = plans[-1] if plans else None
lessons = sorted(Path("Homework").glob("[0-9][0-9]-????-??-??.md"))
row_blocks = []
if not plan:
    warn.append("no plan in weeks/")
else:
    text = plan.read_text()
    if lessons and date.fromisoformat(lessons[-1].stem[3:]) > date.fromisoformat(plan.stem):
        warn.append(f"{lessons[-1].name} is newer than {plan.name}: lesson-intake not run")
    for line in text.split("## Schedule", 1)[-1].splitlines():
        m = re.match(r"\| \w{3} (\d\d)-(\d\d) \| (.*) \|", line)
        if m and (int(m[1]), int(m[2])) == (today.month, today.day):
            row_blocks = [b.strip() for b in m[3].split("·")]
    check(row_blocks, f"plan {plan.name}: today's row found", f"plan {plan.name}: no row for {T}")
    for h in ("## New grammar", "## Review", "## Schedule", "## Podcast", "## Weekly report"):
        check(h in text, "", f"plan {plan.name}: missing section {h}")
    if text.count("☑") + text.count("☐") == 0:
        warn.append(f"plan {plan.name}: no ☐/☑ blocks at all")

done_today = [b for b in row_blocks if "☑" in b]
practice = [b for b in done_today if re.search(r"grammar|weekly|lesson review|mistakes|homework|pinned", b)]

# ---------- daily mistakes log ----------
daily = Path("progress/daily") / f"{T}.md"
if practice:
    check(daily.exists(), f"progress/daily/{T}.md exists",
          f"practice blocks ticked today ({len(practice)}) but no progress/daily/{T}.md")

# ---------- grammar.md: today's rows have the right Next review ----------
IV = {0: 1, 1: 3, 2: 7, 3: 14, 4: 30, 5: 60}
g = Path("progress/grammar.md").read_text()
bad = []
practiced_today = 0
for line in g.splitlines():
    c = [x.strip() for x in line.strip().strip("|").split("|")]
    if len(c) < 6 or not c[0].rstrip("*").isdigit():
        continue
    try:
        lvl, nxt, last = int(c[2]), date.fromisoformat(c[3]), c[4]
    except ValueError:
        bad.append(f"#{c[0]} unreadable row")
        continue
    if last == T:
        practiced_today += 1
        if nxt != today + timedelta(days=IV.get(lvl, 1)):
            bad.append(f"#{c[0]} L{lvl} next {nxt} (expected {today + timedelta(days=IV.get(lvl, 1))})")
    if last not in ("—", "-", "") and last > nxt.isoformat():
        bad.append(f"#{c[0]} next review {nxt} is before last practiced {last}")
check(not bad, f"grammar.md: {practiced_today} points practiced today, intervals right",
      "grammar.md: " + "; ".join(bad[:6]) + (" …" if len(bad) > 6 else ""))
if practice and not practiced_today and any("grammar" in b or "weekly" in b for b in practice):
    warn.append("grammar/test block ticked today but no point has Last practiced = today")

# ---------- mistakes.md ----------
m = Path("progress/mistakes.md").read_text()
sec = lambda name: m.split(f"## {name}", 1)[1].split("\n## ", 1)[0] if f"## {name}" in m else ""
prac = [l for l in sec("Practice mistakes").splitlines() if l.startswith("- ")]
check(len(prac) <= 10, f"mistakes.md: {len(prac)} practice mistakes (max 10)",
      f"mistakes.md: {len(prac)} practice mistakes, max is 10 (drop the oldest)")
full = [l for l in m.splitlines() if l.startswith("- ") and re.search(r"· 2/2\s*$", l)]
check(not full, "mistakes.md: nothing stuck at 2/2", f"mistakes.md: {len(full)} items at 2/2 should be deleted/archived")
lines = [l for l in m.splitlines() if l.startswith("- ")]
dups = {l for l in lines if lines.count(l) > 1}
check(not dups, "mistakes.md: no duplicate lines", f"mistakes.md: duplicate lines: {list(dups)[:2]}")
untagged = [l for l in sec("Practice mistakes").splitlines() + sec("Lesson mistakes").splitlines()
            if l.startswith("- ") and not re.match(r"- \[(시제|조사|어휘|어순|문법|맞춤법|존댓말)\]", l)]
check(not untagged, "mistakes.md: every item has a type tag", f"mistakes.md: {len(untagged)} items without a [type] tag")

# ---------- website built after the last progress/ or weeks/ write ----------
sj = Path("website/data/study.js")
newest = max((p.stat().st_mtime, str(p)) for d in ("progress", "weeks") for p in Path(d).rglob("*") if p.is_file())
check(sj.exists() and sj.stat().st_mtime >= newest[0], "website: study.js is newer than progress/ and weeks/",
      f"website: rebuild needed ({newest[1]} changed after study.js) → python3 -I website/build_data.py")
tj = Path("website/data/today.js").read_text() if Path("website/data/today.js").exists() else ""
check(f'"{T}"' in tj, "website: today.js has an entry for today",
      "website: no today.js entry for today (website-update step 1: fill the week's list)")
conv = Path(f"website/posts/{T}-conversation.js")
check(conv.exists(), "website: today's 회화 post exists",
      "website: no 회화 post for today yet → python3 -I website/fetch_conversation.py (fine if Naver has none)")

# ---------- listening: notes progress matches the plan ----------
if plan:
    clips = [p for p in sorted(Path("Listening").glob("????-??-??-*")) if p.name[:10] >= plan.stem]
    table = plan.read_text().split("## Schedule", 1)[-1].split("\n## ", 1)[0]
    lis_done = len(re.findall(r"☑[^·|\n]*listening: step", table))  # re-listens aren't steps
    if clips:
        notes = clips[-1] / "notes.md"
        prog = re.search(r"\*\*Progress:\*\*(.*)", notes.read_text()) if notes.exists() else None
        steps = len(re.findall(r"\d ✔", prog[1])) if prog else 0
        check(prog is not None, f"listening: {clips[-1].name} has a Progress line",
              f"listening: {clips[-1].name}/notes.md has no **Progress:** line")
        if prog and lis_done > steps:
            warn.append(f"listening: plan has {lis_done} listening blocks ☑ but notes show {steps} steps ✔")
    elif lis_done:
        warn.append("listening: a listening block is ☑ but there's no clip folder for this week")
    else:
        ok.append("listening: no clip yet this week (lesson-intake picks it)")

# ---------- Anki: newest word list imported, audio present ----------
spec = importlib.util.spec_from_file_location("anki", ".claude/skills/_shared/anki.py")
csvs = sorted(Path("anki").glob("????-??-??.csv"))
if csvs:
    try:
        words = subprocess.run(["python3", "-I", ".claude/skills/_shared/anki.py", "words"],
                               capture_output=True, text=True, timeout=60).stdout.split("\n")
        known = {re.sub(r"\[sound:[^]]*\]|<[^>]*>", "", w).strip() for w in words}
        new = [l.split(";")[0] for l in csvs[-1].read_text().splitlines() if l.strip()]
        missing = [w for w in new if w not in known]
        check(not missing, f"anki: {csvs[-1].name} imported ({len(new)} words)",
              f"anki: {len(missing)}/{len(new)} words of {csvs[-1].name} not in Anki yet (import it)")
        if not missing:
            try:
                import urllib.request
                def ac(a, **p):
                    r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8765",
                        json.dumps({"action": a, "version": 6, "params": p}).encode()), timeout=5)
                    return json.loads(r.read())["result"]
                info = ac("notesInfo", notes=ac("findNotes", query=f"tag:{csvs[-1].stem}"))
                noaudio = [n for n in info if "[sound:" not in n["fields"]["Front"]["value"]]
                check(not noaudio, "anki: new words have audio",
                      f"anki: {len(noaudio)} new words without audio → anki/add_audio.py")
            except Exception:
                ok.append("anki: Anki closed, audio not checked")
    except Exception as e:
        warn.append(f"anki: couldn't read words ({e})")

# ---------- git: what's left uncommitted ----------
st = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout.splitlines()
left = [l[3:] for l in st if not l[3:].startswith(("website/", "anki/pending.json"))]
check(not left, "git: everything outside website/ is committed",
      f"git: uncommitted outside website/: {', '.join(left[:6])}{' …' if len(left) > 6 else ''}")

for s in ok:
    if s:
        print("ok ", s)
for s in warn:
    print("⚠  ", s)
print(f"\n{len(warn)} to check" if warn else "\nall coherent")
