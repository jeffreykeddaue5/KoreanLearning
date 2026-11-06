#!/usr/bin/env python3
"""Today's state for /korean-mentor. Run from the repo root with python3 -I.

Prints JSON: date/time, the current plan, today's blocks, unfinished blocks from earlier days,
days to the next lesson, whether lesson-intake is due, and Anki status.
"""
import importlib.util
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path

now = datetime.now()
today = now.date()
out = {"date": today.isoformat(), "weekday": now.strftime("%a"), "time": now.strftime("%H:%M")}

# lesson files and plans
lessons = sorted(Path("Homework").glob("[0-9][0-9]-????-??-??.md"))
last_lesson = lessons[-1] if lessons else None
plans = sorted(Path("weeks").glob("????-??-??.md"))
plan = plans[-1] if plans else None
out["plan"] = str(plan) if plan else None
out["latest_lesson_file"] = str(last_lesson) if last_lesson else None
lesson_date = date.fromisoformat(last_lesson.stem[3:]) if last_lesson else None
out["intake_due"] = bool(lesson_date and (not plan or date.fromisoformat(plan.stem) < lesson_date))
out["lesson_file_today"] = bool(lesson_date == today)

# next lesson: Wednesday 21:00
days = (2 - today.weekday()) % 7
nxt = datetime.combine(today + timedelta(days=days), datetime.min.time()).replace(hour=21)
if nxt <= now - timedelta(hours=1):
    nxt += timedelta(days=7)
out["next_lesson"] = nxt.strftime("%a %Y-%m-%d %H:%M")
out["days_to_lesson"] = (nxt.date() - today).days

# schedule rows
if plan:
    text = plan.read_text()
    out["light_week"] = "**Type:** light" in text
    sched = text.split("## Schedule", 1)[1].split("\n## ", 1)[0] if "## Schedule" in text else ""
    rows = []
    for line in sched.splitlines():
        m = re.match(r"\| (\w{3}) (\d\d)-(\d\d) \| (.*) \|", line)
        if not m:
            continue
        d = date(int(plan.stem[:4]), int(m[2]), int(m[3]))
        if d < date.fromisoformat(plan.stem):  # year rollover
            d = date(d.year + 1, d.month, d.day)
        blocks = [b.strip() for b in m[4].split("·")]
        rows.append((d, "Optional" in m[4], blocks))
    out["today_blocks"] = next((b for d, o, b in rows if d == today), [])
    out["missed_earlier"] = [f"{d:%a} {b}" for d, o, bl in rows if d < today and not o
                             for b in bl if "☐" in b and "Anki" not in b]
    out["week_blocks"] = {"done": sum(b.count("☑") for _, _, bl in rows for b in bl),
                          "open": sum(b.count("☐") for _, o, bl in rows for b in bl if not o)}

# listening progress for this week's clip
if plan:
    for n in sorted(Path("Listening").glob("*/notes.md")):
        try:
            if date.fromisoformat(n.parent.name[:10]) >= date.fromisoformat(plan.stem):
                p = re.search(r"\*\*Progress:\*\*\s*(.*)", n.read_text())
                out["listening"] = {"clip": n.parent.name, "progress": p[1] if p else None}
        except ValueError:
            pass

# grammar due
due = 0
for line in Path("progress/grammar.md").read_text().splitlines():
    m = re.match(r"\| \d+ \| .*? \| \d \| (\d{4}-\d\d-\d\d) \|", line)
    if m and m[1] <= today.isoformat():
        due += 1
out["grammar_due"] = due

# anki
try:
    spec = importlib.util.spec_from_file_location("anki", Path(".claude/skills/_shared/anki.py"))
    A = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(A)
    import contextlib, io
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        A.flush(quiet=True)
        A.status()
    lines = buf.getvalue().strip().splitlines()
    out["anki"] = json.loads(lines[-1])
    out["anki_flush"] = lines[:-1]
except Exception as e:
    out["anki"] = {"error": str(e)}

print(json.dumps(out, ensure_ascii=False, indent=1))
