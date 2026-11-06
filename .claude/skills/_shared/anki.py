#!/usr/bin/env python3
"""Anki helper for the Korean skills. Run from the repo root with python3 -I.

Uses AnkiConnect (add-on 2055492159) when Anki is open. Otherwise it reads a fresh copy of the
collection, and changes wait in anki/pending.json until the next run with Anki open.

  anki.py status                 JSON: open, reviewed today, due left, pinned today, queued changes
  anki.py pinned [days]          pinned words in the last N days (default 1), ranked, JSON lines
  anki.py trouble                words tagged use_trouble (trouble words), JSON lines
  anki.py missed [n] [days]      most "Again" presses (all time, or last N days), JSON lines
  anki.py recent [days]          notes added in the last N days (default 14), JSON lines
  anki.py words                  every word (Front field), one per line
  anki.py tag <word> trouble     mark as a trouble word (use_trouble, count reset)
  anki.py tag <word> right       used right without a hint: first time → use_trouble_1,
                                 second time → both tags removed ("graduated")
  anki.py tag <word> off         remove both tags
  anki.py add "<front>" "<back>" ["<example>" "<translation>" "<note>"] [--audio file.mp3] [--tags a,b]
  anki.py flush                  send queued changes if Anki is open
"""
import json
import re
import shutil
import sqlite3
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

COLLECTION = Path.home() / "snap/anki-desktop/common/User 1/collection.anki2"
REPO = Path(__file__).resolve().parents[3]
PENDING = REPO / "anki/pending.json"
DECK, MODEL = "Conversation", "Basic"
FIELDS = ("Front", "Back", "Example", "Translation", "Note")
T1, T2 = "use_trouble", "use_trouble_1"


# ---------- AnkiConnect ----------
def call(action, **params):
    req = urllib.request.Request("http://127.0.0.1:8765", json.dumps(
        {"action": action, "version": 6, "params": params}).encode())
    with urllib.request.urlopen(req, timeout=5) as r:
        res = json.load(r)
    if res.get("error"):
        raise RuntimeError(res["error"])
    return res["result"]


def is_open():
    try:
        call("version")
        return True
    except Exception:
        return False


# ---------- read a copy ----------
_db = None


def db():
    global _db
    if _db is None:
        tmp = Path(tempfile.mkdtemp()) / "collection.anki2"
        shutil.copy(COLLECTION, tmp)
        for ext in ("-wal",):
            if Path(str(COLLECTION) + ext).exists():
                shutil.copy(str(COLLECTION) + ext, str(tmp) + ext)
        _db = sqlite3.connect(tmp)
    return _db


def crt():
    return db().execute("select crt from col").fetchone()[0]


def today():
    return int((time.time() - crt()) // 86400)


def clean(s):
    return re.sub(r"\[sound:[^]]*\]|<[^>]+>|&nbsp;", " ", s).strip()


def note_dict(nid, flds, tags):
    f = [clean(x) for x in flds.split("\x1f")] + [""] * 5
    d = dict(zip(("word", "meaning", "example", "translation", "note"), f))
    d.update(id=nid, tags=tags.split())
    return d


def find(word):
    for nid, flds, tags in db().execute("select id, flds, tags from notes"):
        if clean(flds.split("\x1f")[0]) == word:
            return note_dict(nid, flds, tags)
    return None


# ---------- queue ----------
def queue(action, **params):
    q = json.loads(PENDING.read_text()) if PENDING.exists() else []
    q.append({"action": action, "params": params})
    PENDING.parent.mkdir(exist_ok=True)
    PENDING.write_text(json.dumps(q, ensure_ascii=False, indent=1))
    flush(quiet=True)


def flush(quiet=False):
    if not PENDING.exists():
        if not quiet:
            print("nothing queued")
        return
    q = json.loads(PENDING.read_text())
    if not is_open():
        print(f"Anki isn't open: {len(q)} change(s) queued in anki/pending.json")
        return
    left = []
    for item in q:
        try:
            call(item["action"], **item["params"])
            print("done:", item["action"], label(item))
        except Exception as e:
            if "duplicate" in str(e):
                print("already in Anki:", label(item))
            else:
                print("failed:", item["action"], label(item), e)
                left.append(item)
    if left:
        PENDING.write_text(json.dumps(left, ensure_ascii=False, indent=1))
    else:
        PENDING.unlink()


def label(item):
    p = item["params"]
    if "note" in p:
        return p["note"]["fields"]["Front"]
    return p.get("label", "")


# ---------- commands ----------
def status():
    out = {"open": is_open(), "pending": len(json.loads(PENDING.read_text())) if PENDING.exists() else 0}
    t, c0 = today(), crt()
    start = (c0 + t * 86400) * 1000
    if out["open"]:
        out["reviewed_today"] = call("getNumCardsReviewedToday")
        out["due_left"] = len(call("findCards", query="is:due"))
    else:
        out["reviewed_today"] = db().execute("select count(*) from revlog where id >= ?", (start,)).fetchone()[0]
        now = int(time.time())
        out["due_left"] = db().execute(
            "select count(*) from cards where queue >= 0 and ((queue in (2,3) and due <= ?) or (queue = 1 and due <= ?))",
            (t, now)).fetchone()[0]
        out["note"] = "Anki closed: read from a copy; due count is approximate"
    out["pinned_today"] = [w["word"] for w in pinned(1)]
    print(json.dumps(out, ensure_ascii=False))


def pinned(days=1):
    t = today()
    first = t - days + 1
    cut = (crt() + first * 86400) * 1000
    words = []
    for nid, tags, flds in db().execute(
            "select id, tags, flds from notes where tags like '%review_pinned_day_%'").fetchall():
        pins = {int(d) for d in re.findall(r"review_pinned_day_(\d+)", tags) if int(d) >= first}
        if not pins:
            continue
        again = db().execute("select count(*) from revlog r join cards k on k.id = r.cid "
                             "where k.nid = ? and r.ease = 1 and r.id >= ?", (nid, cut)).fetchone()[0]
        w = note_dict(nid, flds, tags)
        w.update(pins=len(pins), again=again, day=max(pins),
                 pinned=time.strftime("%F", time.localtime(crt() + max(pins) * 86400)))
        words.append(w)
    words.sort(key=lambda w: (-w["pins"], -w["again"], -w["day"]))
    return words


def tagged(tag):
    return [note_dict(*r) for r in db().execute(
        "select id, flds, tags from notes where ' ' || tags || ' ' like ?", (f"% {tag} %",))]


def missed(n=20, days=None):
    q = ("select n.id, n.flds, n.tags, sum(r.ease = 1) a from revlog r join cards c on c.id = r.cid "
         "join notes n on n.id = c.nid {} group by n.id having a > 0 order by a desc limit ?")
    if days:
        cut = (crt() + (today() - days + 1) * 86400) * 1000
        rows = db().execute(q.format("where r.id >= ?"), (cut, n))
    else:
        rows = db().execute(q.format(""), (n,))
    for nid, flds, tags, a in rows:
        d = note_dict(nid, flds, tags)
        d["again"] = a
        yield d


def recent(days=14):
    cut = int((time.time() - days * 86400) * 1000)
    for r in db().execute("select id, flds, tags from notes where id >= ? order by id desc", (cut,)):
        yield note_dict(*r)


def tag(word, how):
    n = find(word)
    if not n:
        sys.exit(f"{word}: not in Anki. Add it first (anki.py add).")
    tags = set(n["tags"])
    if how == "trouble":
        add, rem, msg = [T1], [T2], "marked as a trouble word"
    elif how == "right":
        if T1 not in tags:
            return print(f"{word}: not a trouble word, nothing to do")
        if T2 in tags:
            add, rem, msg = [], [T1, T2], "graduated (right twice without a hint)"
        else:
            add, rem, msg = [T2], [], "right once (1/2)"
    elif how == "off":
        add, rem, msg = [], [T1, T2], "trouble tags removed"
    else:
        sys.exit("tag how: trouble | right | off")
    if add:
        queue("addTags", notes=[n["id"]], tags=" ".join(add), label=word)
    if rem:
        queue("removeTags", notes=[n["id"]], tags=" ".join(rem), label=word)
    print(f"{word}: {msg}")


def add(args):
    audio, tags = None, ["conversation"]
    if "--audio" in args:
        i = args.index("--audio"); audio = args[i + 1]; del args[i:i + 2]
    if "--tags" in args:
        i = args.index("--tags"); tags += args[i + 1].split(","); del args[i:i + 2]
    vals = (args + [""] * 5)[:5]
    note = {"deckName": DECK, "modelName": MODEL, "fields": dict(zip(FIELDS, vals)),
            "tags": tags, "options": {"allowDuplicate": False}}
    if audio:
        p = Path(audio).resolve()
        note["audio"] = [{"path": str(p), "filename": p.name, "fields": ["Front"]}]
    queue("addNote", note=note)


def jl(items):
    for i in items:
        print(json.dumps(i, ensure_ascii=False))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    cmd, rest = a[0], a[1:]
    if cmd == "status":
        status()
    elif cmd == "pinned":
        jl(pinned(int(rest[0]) if rest else 1))
    elif cmd == "trouble":
        jl(tagged(T1))
    elif cmd == "missed":
        jl(missed(int(rest[0]) if rest else 20, int(rest[1]) if len(rest) > 1 else None))
    elif cmd == "recent":
        jl(recent(int(rest[0]) if rest else 14))
    elif cmd == "words":
        for (flds,) in db().execute("select flds from notes"):
            w = clean(flds.split("\x1f")[0])
            if w:
                print(w)
    elif cmd == "tag":
        tag(rest[0], rest[1])
    elif cmd == "add":
        add(rest)
    elif cmd == "flush":
        flush()
    else:
        sys.exit(__doc__)
