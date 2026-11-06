#!/usr/bin/env python3
"""Numbers for the weekly report. Run from the repo root with python3 -I.

  stats.py <weeks/plan.md> [anki collection copy]

Prints JSON: grammar levels, no-hint total, open mistakes by type, blocks done in the plan,
listening result for the week, and (with a collection copy) Anki reviews this week + streak.
"""
import json
import re
import sqlite3
import sys
import time
from collections import Counter
from datetime import date, datetime
from pathlib import Path

plan = Path(sys.argv[1])
week_start = date.fromisoformat(plan.stem)
out = {"week": plan.stem}

# grammar
levels, nohint, due = Counter(), 0, 0
for line in Path("progress/grammar.md").read_text().splitlines():
    m = re.match(r"\| (\d+) \| .*? \| (\d) \| (\S+) \| (\S+) \| (\d+) \|", line)
    if m:
        levels[int(m[2])] += 1
        nohint += int(m[5])
        due += m[3] <= date.today().isoformat()
out["grammar"] = {"points": sum(levels.values()), "by_level": {str(k): levels[k] for k in range(6)},
                  "level_3_plus": sum(levels[k] for k in (3, 4, 5)), "no_hint_total": nohint, "due_now": due}

# mistakes
types, sections, sec = Counter(), Counter(), None
for line in Path("progress/mistakes.md").read_text().splitlines():
    if line.startswith("## "):
        sec = line[3:].strip()
    m = re.match(r"- \[(\S+)\]", line)
    if m and sec:
        types[m[1]] += 1
        sections[sec] += 1
out["mistakes"] = {"open": sum(types.values()), "by_type": dict(types.most_common()),
                   "by_section": dict(sections)}

# blocks in the plan's schedule (optional Saturday blocks don't count toward planned)
done = planned = 0
in_sched = False
for line in plan.read_text().splitlines():
    if line.startswith("## "):
        in_sched = line.startswith("## Schedule")
    if in_sched and line.startswith("| ") and not line.startswith("| Day"):
        optional = "Optional" in line
        d, p = line.count("☑"), line.count("☑") + line.count("☐")
        done += d
        planned += 0 if optional else p
out["blocks"] = {"done": done, "planned": planned}

# listening: this week's clip folder
for d in sorted(Path("Listening").glob("*/notes.md")):
    try:
        when = date.fromisoformat(d.parent.name[:10])
    except ValueError:
        continue
    if when >= week_start:
        txt = d.read_text()
        m = re.search(r"\*\*Listening:\*\*\s*(.*)", txt)
        p = re.search(r"\*\*Progress:\*\*\s*(.*)", txt)
        out["listening"] = {"clip": d.parent.name, "result": m[1].strip() if m else None,
                            "progress": p[1].strip() if p else None}

# anki
if len(sys.argv) > 2:
    c = sqlite3.connect(sys.argv[2])
    crt = c.execute("select crt from col").fetchone()[0]
    today = int((time.time() - crt) // 86400)
    days = {int((rid / 1000 - crt) // 86400) for (rid,) in c.execute("select id from revlog")}
    start_day = int((datetime.combine(week_start, datetime.min.time()).timestamp() - crt) // 86400)
    week_reviews = c.execute("select count(*) from revlog where id >= ?",
                             ((crt + start_day * 86400) * 1000,)).fetchone()[0]
    streak, d = 0, today if today in days else today - 1
    while d in days:
        streak, d = streak + 1, d - 1
    out["anki"] = {"streak_days": streak, "reviews_this_week": week_reviews,
                   "days_this_week": len([x for x in days if start_day <= x <= today])}

print(json.dumps(out, ensure_ascii=False, indent=1))
