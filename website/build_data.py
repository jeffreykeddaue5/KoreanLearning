#!/usr/bin/env python3
"""Build website/data/study.js from the study files. Run from the repo root: python3 -I website/build_data.py

Reads weeks/ (newest plan), progress/ (grammar, mistakes, log), Grammar/README.md, Listening/, Speaking/log.md
and Anki (through .claude/skills/_shared/anki.py, works with Anki open or closed). Also keeps one snapshot per
week in progress/stats.json, so the site can show trends.
"""
import importlib.util
import json
import re
import time
from datetime import date, datetime
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / "website/data/study.js"
TYPES = {"시제": "tense", "조사": "particles", "어휘": "word choice", "어순": "word order", "문법": "grammar"}


def section(text, name):
    m = re.search(r"^## " + re.escape(name) + r".*?\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def bullets(text):
    return [re.sub(r"^(- |\d+\. )", "", l).strip() for l in text.splitlines() if re.match(r"^(- |\d+\. )", l)]


def md_inline(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return re.sub(r"`(.+?)`", r"\1", s)


# ---------- week plan ----------
def week():
    plans = sorted((ROOT / "weeks").glob("????-??-??.md"))
    if not plans:
        return None
    p = plans[-1]
    t = p.read_text()
    head = t.splitlines()[0]
    lesson = re.search(r"Lesson (\d+)", head)
    wk = re.search(r"week (\d+)", head)
    nxt = re.search(r"\*\*Next lesson:\*\* \w+ (\d{4}-\d\d-\d\d), (\d\d:\d\d)", t)
    new = []
    for b in bullets(section(t, "New grammar")):
        m = re.match(r"#(\d+) (.+?) — (.+?)(?: \((\w+)\))?$", b)
        if m:
            new.append({"n": int(m[1]), "form": m[2], "meaning": m[3], "from": m[4] or ""})
        else:
            new.append({"text": b})
    sched = []
    for line in section(t, "Schedule").splitlines():
        m = re.match(r"\| (\w{3}) (\d\d-\d\d) \| (.*) \|", line)
        if m:
            blocks = []
            for b in m[3].split("·"):
                b = b.strip()
                state = "done" if "☑" in b else "todo" if "☐" in b else "skip" if b.startswith("–") else "note"
                blocks.append({"state": state, "text": re.sub(r"^(Optional: )?[☑☐–]\s*", "", b).replace("Optional: ", "")})
            sched.append({"day": m[1], "date": f"{p.stem[:4]}-{m[2]}", "optional": "Optional" in m[3], "blocks": blocks})
    planned = sum(1 for r in sched if not r["optional"] for b in r["blocks"] if b["state"] in ("done", "todo"))
    done = sum(1 for r in sched for b in r["blocks"] if b["state"] == "done")
    report = section(t, "Weekly report")
    return {
        "start": p.stem, "lesson": int(lesson[1]) if lesson else None, "number": int(wk[1]) if wk else None,
        "light": "**Type:** light" in t,
        "next_lesson": f"{nxt[1]}T{nxt[2]}" if nxt else None,
        "new": new,
        "review": md_inline(section(t, "Review")),
        "words": [md_inline(b) for b in bullets(section(t, "Lesson words"))],
        "questions": bullets(section(t, "Questions for the tutor")),
        "schedule": sched, "blocks": {"done": done, "planned": planned},
        "report": "" if report.startswith("(filled") else md_inline(report),
    }


# ---------- grammar ----------
def grammar():
    files = {}
    for line in (ROOT / "Grammar/README.md").read_text().splitlines():
        m = re.match(r"\| (\d+)\*? \| .*? \| \[([\w-]+)\]", line)
        if m:
            files[int(m[1])] = m[2]
    pts = []
    today = date.today().isoformat()
    for line in (ROOT / "progress/grammar.md").read_text().splitlines():
        m = re.match(r"\| (\d+) \| (.*?) \| (\d) \| (\S+) \| (\S+) \| (\d+) \| (.*) \|", line)
        if m:
            pts.append({"n": int(m[1]), "point": m[2], "level": int(m[3]), "next": m[4],
                        "last": None if m[5] == "—" else m[5], "nohint": int(m[6]), "note": m[7],
                        "due": m[4] <= today, "file": files.get(int(m[1]), "")})
    return pts


# ---------- mistakes ----------
HANGUL = re.compile(r"[가-힣]")


def hangul(s):
    """Trim English words around a Korean phrase: 'X for a habit' -> 'X'."""
    parts = s.split()
    while parts and not HANGUL.search(parts[0]) and parts[0] not in ("…", "..."):
        parts.pop(0)
    while parts and not HANGUL.search(parts[-1]):
        parts.pop()
    return " ".join(parts)

def mistakes():
    items, sec = [], None
    for line in (ROOT / "progress/mistakes.md").read_text().splitlines():
        if line.startswith("## "):
            sec = line[3:].strip().split()[0].lower()
        m = re.match(r"- \[(\S+)\] (.*)", line)
        if m and sec:
            body = m[2]
            pairs = [(w.strip(), r.strip()) for w, r in re.findall(r"([^,;()·:→]+?)\s*→\s*([^,;()·:→]+)", body)]
            pairs = [(hangul(w), hangul(r)) for w, r in pairs if HANGUL.search(w) and HANGUL.search(r)]
            pick = (pairs[-1] if sec == "recurring" else pairs[0]) if pairs else None
            wrong, right = pick if pairs else (body[:60], "")
            label = body.split(":")[0].strip() if ":" in body.split("→")[0] else right
            items.append({
                "type": m[1], "section": sec,
                "label": label[:60],
                "wrong": wrong,
                "right": right,
                "times": max(1, len(set(re.findall(r"\d{4}-\d\d-\d\d", body)))),
                "clean": bool(pairs) and len(HANGUL.findall(wrong)) >= 3 and len(HANGUL.findall(right)) >= 2,
            })
    by_type = {}
    for i in items:
        by_type[i["type"]] = by_type.get(i["type"], 0) + 1
    return items, by_type


# ---------- listening / speaking ----------
def listening(start):
    for n in sorted((ROOT / "Listening").glob("*/notes.md"), reverse=True):
        try:
            if n.parent.name[:10] < start:
                continue
        except ValueError:
            continue
        txt = n.read_text()
        info = n.parent / "info.json"
        meta = json.loads(info.read_text()) if info.exists() else {}
        get = lambda k: (re.search(rf"\*\*{k}:\*\*\s*(.*)", txt) or [None, None])[1]
        return {"folder": n.parent.name, "title": meta.get("title"), "channel": meta.get("channel"),
                "url": meta.get("webpage_url"), "section": meta.get("section"),
                "progress": get("Progress"), "result": get("Listening")}
    return None


def speaking():
    log = ROOT / "Speaking/log.md"
    if not log.exists():
        return []
    return [l[2:] for l in log.read_text().splitlines() if l.startswith("- ")][:5]


# ---------- anki ----------
def anki():
    spec = importlib.util.spec_from_file_location("anki", ROOT / ".claude/skills/_shared/anki.py")
    A = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(A)
    db, crt = A.db(), A.crt()
    t = A.today()
    days = {int((rid / 1000 - crt) // 86400) for (rid,) in db.execute("select id from revlog")}
    streak, d = 0, t if t in days else t - 1
    while d in days:
        streak, d = streak + 1, d - 1
    start = (crt + t * 86400) * 1000
    reviewed = db.execute("select count(*) from revlog where id >= ?", (start,)).fetchone()[0]
    pins = [{k: w[k] for k in ("word", "meaning", "example", "translation")} for w in A.pinned(1)]
    forgot = [{"word": w["word"], "meaning": w["meaning"], "misses": w["again"]} for w in A.missed(20)]
    trouble = [w["word"] for w in A.tagged(A.T1)]
    return {"streak": streak, "reviewed_today": reviewed, "notes": db.execute("select count(*) from notes").fetchone()[0],
            "pinned": {"date": date.today().isoformat(), "words": pins}, "forgotten": forgot, "trouble": trouble,
            "focus": focus(A)}


# ---------- 단어 카드: 오늘 집중할 단어 (최대 FOCUS_N개) ----------
FOCUS_N = 5
FOCUS_FILE = ROOT / "progress/focus-words.txt"   # optional: first line YYYY-MM-DD, then one word per line


def focus(A):
    """Today's focus words. Hand-picked list (if dated today) wins; otherwise today's pins
    ranked by misses today, trouble tag, pin count, all-time misses; with no pins, this week's most missed."""
    def card(w, src):
        cf = re.search(r"cf\)\s*(.+)$", w.get("note", ""))
        return {"word": w["word"], "meaning": w["meaning"], "example": w["example"],
                "translation": w["translation"], "cf": cf.group(1).strip() if cf else "",
                "again": w.get("again", 0), "pins": w.get("pins", 0),
                "trouble": A.T1 in w.get("tags", []), "source": src}

    if FOCUS_FILE.exists():
        lines = [x.strip() for x in FOCUS_FILE.read_text().splitlines() if x.strip() and not x.startswith("#")]
        if lines and lines[0] == date.today().isoformat():
            pins = {w["word"]: w for w in A.pinned(1)}
            out = []
            for word in lines[1:FOCUS_N + 1]:
                w = pins.get(word) or A.find(word)
                if w:
                    out.append(card(w, "picked"))
            if out:
                return {"date": lines[0], "words": out}

    alltime = {w["id"]: w["again"] for w in A.missed(500)}
    pins = A.pinned(1)
    if pins:
        pins.sort(key=lambda w: (-w["again"], A.T1 not in w["tags"], -w["pins"], -alltime.get(w["id"], 0)))
        return {"date": date.today().isoformat(), "words": [card(w, "pinned") for w in pins[:FOCUS_N]]}
    return {"date": date.today().isoformat(), "words": [card(w, "missed") for w in A.missed(FOCUS_N, 7)]}


# ---------- weekly snapshots ----------
def snapshot(wk, pts, by_type):
    f = ROOT / "progress/stats.json"
    hist = json.loads(f.read_text()) if f.exists() else {}
    if wk:
        hist[wk["start"]] = {
            "level_3_plus": sum(1 for p in pts if p["level"] >= 3),
            "no_hint": sum(p["nohint"] for p in pts),
            "points": len(pts),
            "mistakes": by_type,
            "blocks": wk["blocks"],
        }
        f.write_text(json.dumps(hist, ensure_ascii=False, indent=1, sort_keys=True))
    return [{"week": k, **v} for k, v in sorted(hist.items())]


def main():
    wk = week()
    pts = grammar()
    items, by_type = mistakes()
    try:
        ak = anki()
    except Exception as e:  # Anki files missing: keep the rest of the site working
        ak = {"error": str(e)}
    data = {
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "week": wk,
        "grammar": pts,
        "mistakes": {"items": items, "by_type": by_type, "names": TYPES},
        "history": snapshot(wk, pts, by_type),
        "listening": listening(wk["start"]) if wk else None,
        "speaking": speaking(),
        "anki": ak,
        "lessons": len(list((ROOT / "Homework").glob("[0-9][0-9]-*.md"))),
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("// Generated by website/build_data.py — don't edit by hand.\nconst STUDY = "
                   + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    print(f"wrote {OUT.relative_to(ROOT)} · {len(pts)} points · {sum(by_type.values())} open mistakes · "
          f"anki streak {ak.get('streak', '?')}")


if __name__ == "__main__":
    main()
