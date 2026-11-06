#!/usr/bin/env python3
"""Helper for the listening skill: find clips, fetch Korean subtitles + audio, play and cut lines.

Usage (run with python3 -I):
  listen.py search "<query>" [n]           candidates: id | minutes | subs | channel | title
  listen.py channel <@handle or url> [n]   latest uploads of a channel, same columns
  listen.py fetch <video id/url> <dir> [start-end]
        writes <dir>/lines.tsv (n, start, end, text), <dir>/info.json and <dir>/audio/clip.mp3
        start-end like 2:10-9:40 limits the clip (lines are re-timed to the clip)
  listen.py play <dir> <from line> [to line] [speed]   play lines (speed 0.8 = slower), returns at once
  listen.py cut <dir> <from line> [to line] <out.mp3>  cut lines to an mp3 (for Anki cards)
  listen.py subs <video id/url> <dir>      subtitles only, whole video: <dir>/lines.tsv with real timestamps
  listen.py words <collection copy>        words already in Anki (Front field), one per line
  listen.py card <dir> <from> <to> "<Korean>" "<English>" "<note>"
        adds a sentence card (audio = those lines) to Anki deck Conversation via AnkiConnect,
        or queues it in anki/pending.json if Anki isn't open
  listen.py flush                          send queued cards once Anki is open
"""
import html
import json
import sqlite3
import urllib.request
import re
import subprocess
import sys
from pathlib import Path

YTDLP = str(Path.home() / ".local/share/korean-tools/bin/yt-dlp")
BASE = [YTDLP, "--js-runtimes", "node", "--no-warnings"]
PAD = 0.25  # seconds of audio kept around each line


def run(args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def secs(t):
    parts = [float(p) for p in t.replace(",", ".").split(":")]
    s = 0.0
    for p in parts:
        s = s * 60 + p
    return s


def candidates(target, n):
    fmt = "%(id)s\t%(duration)s\t%(channel)s\t%(title)s"
    out = run(BASE + ["--flat-playlist", "--playlist-end", str(n), "--print", fmt, target]).stdout
    for line in out.splitlines():
        vid, dur, ch, title = (line.split("\t") + ["", "", "", ""])[:4]
        mins = f"{float(dur) / 60:.0f}" if dur not in ("", "NA", "None") else "?"
        print(f"{vid} | {mins} min | {subs_kind(vid)} | {ch} | {title}")


def subs_kind(vid):
    out = run(BASE + ["--list-subs", "--skip-download", f"https://www.youtube.com/watch?v={vid}"]).stdout
    manual = out.split("Available subtitles", 1)[1] if "Available subtitles" in out else ""
    if re.search(r"^ko\s", manual, re.M):
        return "ko subs"
    if re.search(r"^ko-orig\s", out, re.M):
        return "auto"
    return "none"


def parse_vtt(text):
    """Return [(start, end, text)] from a manual or an auto-generated (rolling) VTT."""
    cues = re.split(r"\n\s*\n", text.replace("\r", ""))
    auto = "<c>" in text
    out = []
    for cue in cues:
        m = re.search(r"([\d:.]+) --> ([\d:.]+)", cue)
        if not m:
            continue
        body = cue[m.end():].split("\n")[1:]
        if auto:
            body = [b for b in body if "<c>" in b]  # the new words in each rolling cue
            if not body:
                continue
        words = html.unescape(re.sub(r"<[^>]+>", "", " ".join(body))).strip()
        words = re.sub(r"\s+", " ", re.sub(r"^(>>\s*|-\s+)", "", words))
        if words and (not out or out[-1][2] != words):
            out.append([secs(m[1]), secs(m[2]), words])
    return out


def write_lines(d, lines):
    with open(Path(d) / "lines.tsv", "w") as f:
        for i, (s, e, t) in enumerate(lines, 1):
            f.write(f"{i}\t{max(s, 0):.2f}\t{e:.2f}\t{t}\n")


def get_subs(url, d):
    d = Path(d)
    run(BASE + ["--ignore-no-formats-error", "--skip-download", "--write-subs", "--write-auto-subs",
                "--sub-langs", "ko,ko-orig", "--sub-format", "vtt", "-o", str(d / "subs"), url])
    manual, auto = d / "subs.ko.vtt", d / "subs.ko-orig.vtt"
    src = manual if manual.exists() else auto
    if not src.exists():
        sys.exit("No Korean subtitles for this video.")
    lines = parse_vtt(src.read_text())
    kind = "ko subs" if src == manual else "auto"
    for p in (manual, auto):
        p.unlink(missing_ok=True)
    return lines, kind


def subs_only(target, d):
    Path(d).mkdir(parents=True, exist_ok=True)
    url = target if target.startswith("http") else f"https://www.youtube.com/watch?v={target}"
    lines, kind = get_subs(url, d)
    write_lines(d, lines)
    print(f"{len(lines)} lines ({kind}) → {Path(d) / 'lines.tsv'}")


def fetch(target, d, section=None):
    d = Path(d)
    (d / "audio").mkdir(parents=True, exist_ok=True)
    info = json.loads(run(BASE + ["-J", "--skip-download", target]).stdout)
    url = info["webpage_url"]
    lines, kind = get_subs(url, d)
    start, end = 0.0, info.get("duration") or 1e9
    args = BASE + ["-f", "bestaudio", "-x", "--audio-format", "mp3", "-o", str(d / "audio/clip.%(ext)s")]
    if section:
        a, b = section.split("-")
        start, end = secs(a), secs(b)
        args += ["--download-sections", f"*{a}-{b}", "--force-keyframes-at-cuts"]
    r = run(args + [url])
    if not (d / "audio/clip.mp3").exists():
        sys.exit("Audio download failed:\n" + r.stderr[-800:])
    kept = [(s - start, e - start, t) for s, e, t in lines if s >= start - 0.5 and s < end]
    write_lines(d, kept)
    meta = {k: info.get(k) for k in ("id", "title", "channel", "duration", "upload_date", "webpage_url")}
    meta.update(section=section, subs=kind, lines=len(kept))
    (d / "info.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(json.dumps(meta, ensure_ascii=False))


def span(d, a, b):
    rows = [l.split("\t") for l in (Path(d) / "lines.tsv").read_text().splitlines()]
    a, b = int(a), int(b)
    return max(float(rows[a - 1][1]) - PAD, 0), float(rows[b - 1][2]) + PAD


def play(d, a, b=None, speed="1"):
    s, e = span(d, a, b or a)
    filt = [] if float(speed) == 1 else ["-af", f"atempo={speed}"]
    cmd = ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-ss", f"{s:.2f}", "-t", f"{e - s:.2f}",
           *filt, str(Path(d) / "audio/clip.mp3")]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


def cut(d, a, b, out):
    s, e = span(d, a, b)
    r = run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s:.2f}", "-t", f"{e - s:.2f}",
             "-i", str(Path(d) / "audio/clip.mp3"), "-q:a", "4", out])
    print(out if r.returncode == 0 else r.stderr)


REPO = Path(__file__).resolve().parents[3]
PENDING = REPO / "anki/pending.json"


def anki(action, **params):
    req = urllib.request.Request("http://127.0.0.1:8765", json.dumps(
        {"action": action, "version": 6, "params": params}).encode())
    with urllib.request.urlopen(req, timeout=5) as r:
        res = json.load(r)
    if res.get("error"):
        raise RuntimeError(res["error"])
    return res["result"]


def anki_open():
    try:
        anki("version")
        return True
    except Exception:
        return False


def words(col):
    c = sqlite3.connect(col)
    for (flds,) in c.execute("select flds from notes"):
        w = re.sub(r"\[sound:[^]]*\]|<[^>]+>|&nbsp;", " ", flds.split("\x1f")[0]).strip()
        if w:
            print(w)


def card(d, a, b, ko, en, note):
    d = Path(d).resolve()
    vid = json.loads((d / "info.json").read_text())["id"]
    out = d / "audio" / f"card_{vid}_{a}-{b}.mp3"
    cut(d, a, b, str(out))
    n = {"deckName": "Conversation", "modelName": "Basic",
         "fields": {"Front": ko, "Back": en, "Example": "", "Translation": "", "Note": note},
         "tags": ["listening", "conversation"],
         "options": {"allowDuplicate": False},
         "audio": [{"path": str(out), "filename": out.name, "fields": ["Front"]}]}
    queue = json.loads(PENDING.read_text()) if PENDING.exists() else []
    queue.append(n)
    PENDING.write_text(json.dumps(queue, ensure_ascii=False, indent=1))
    flush()


def flush():
    if not PENDING.exists():
        return print("nothing queued")
    queue = json.loads(PENDING.read_text())
    if not anki_open():
        return print(f"Anki isn't open: {len(queue)} card(s) queued in anki/pending.json")
    left = []
    for n in queue:
        try:
            anki("addNote", note=n)
            print("added:", n["fields"]["Front"])
        except Exception as e:
            if "duplicate" in str(e):
                print("already in Anki:", n["fields"]["Front"])
            else:
                print("failed:", n["fields"]["Front"], e)
                left.append(n)
    if left:
        PENDING.write_text(json.dumps(left, ensure_ascii=False, indent=1))
    else:
        PENDING.unlink()


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    cmd = a[0]
    if cmd == "search":
        candidates(f"ytsearch{a[2] if len(a) > 2 else 8}:{a[1]}", 99)
    elif cmd == "channel":
        url = a[1] if a[1].startswith("http") else f"https://www.youtube.com/{a[1]}/videos"
        candidates(url, int(a[2]) if len(a) > 2 else 10)
    elif cmd == "fetch":
        fetch(a[1], a[2], a[3] if len(a) > 3 else None)
    elif cmd == "play":
        play(a[1], a[2], *(a[3:5]))
    elif cmd == "subs":
        subs_only(a[1], a[2])
    elif cmd == "words":
        words(a[1])
    elif cmd == "card":
        card(*a[1:7])
    elif cmd == "flush":
        flush()
    elif cmd == "cut":
        cut(a[1], a[2], a[3] if len(a) > 4 else a[2], a[-1])
    else:
        sys.exit(__doc__)
