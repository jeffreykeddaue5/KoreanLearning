#!/usr/bin/env python3
"""Local GUI server for /korean-mentor (see gui/DESIGN.md).

  python3 -I gui/server.py [--port 8766]

Serves the page in gui/static/, runs today.py for the start screen, and keeps
one live Claude Code session (claude -p with stream-json in and out). The page
gets Claude's output as server-sent events from /api/events.
"""
import hashlib
import json
import random
import re
from datetime import date, datetime
import signal
import os
import subprocess
import sys
import threading
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "gui" / "static"
TODAY = ROOT / ".claude" / "skills" / "korean-mentor" / "today.py"
TTS = Path.home() / ".local/share/korean-tts/bin/edge-tts"   # same voice as speak.sh
TTS_CACHE = ROOT / "gui" / "state" / "tts"
DAILY = ROOT / "progress" / "daily"
MISTAKES = ROOT / "progress" / "mistakes.md"
STATE = ROOT / "gui" / "state"
BUILD_DATA = ROOT / "website" / "build_data.py"
STUDY_JS = ROOT / "website" / "data" / "study.js"
REC = STATE / "rec"                 # spoken answers, one folder per session (not committed)
SERVER_FILE = Path(__file__).resolve()
SERVER_MTIME = SERVER_FILE.stat().st_mtime
IDLE_STOP_S = 45                    # no page connected this long → send 그만, then stop
PORT = 8766
TYPES = {".html": "text/html", ".js": "text/javascript", ".css": "text/css",
         ".svg": "image/svg+xml", ".png": "image/png", ".webm": "audio/webm", ".ogg": "audio/ogg"}


class Session:
    """One claude -p process; every output line becomes an event for the page."""

    def __init__(self):
        self.proc = None
        self.events = []          # list of dicts, the page replays them by index
        self.busy = False
        self.cond = threading.Condition()
        self.sid = ""             # session id: names the recordings folder
        self.clients = 0          # open /api/events streams
        self.last_seen = 0.0      # when the last page disconnected or connected
        self.ended = False        # 그만 already sent
        self.auto_t = 0.0         # when the idle watcher sent 그만

    def alive(self):
        return self.proc is not None and self.proc.poll() is None

    def emit(self, ev):
        with self.cond:
            self.events.append(ev)
            self.cond.notify_all()

    def start(self, args):
        self.stop()
        with self.cond:
            self.events = []
        self.sid = datetime.now().strftime("%Y-%m-%d-%H%M%S")
        self.ended, self.auto_t, self.last_seen = False, 0.0, time.time()
        self.proc = subprocess.Popen(
            ["claude", "-p", "--input-format", "stream-json",
             "--output-format", "stream-json", "--verbose",
             "--permission-mode", "auto"],
            cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, bufsize=1)
        threading.Thread(target=self._read, args=(self.proc,), daemon=True).start()
        threading.Thread(target=self._read_err, args=(self.proc,), daemon=True).start()
        self.send(f"/korean-mentor gui-session {args}".strip(), show=False)

    def send(self, text, show=True):
        if not self.alive():
            raise RuntimeError("no session")
        if text.strip() == "그만":
            self.ended = True
        if show:
            self.emit({"kind": "user", "text": text})
        msg = {"type": "user", "message": {"role": "user", "content": text}}
        self.busy = True
        self.emit({"kind": "busy", "on": True})
        self.proc.stdin.write(json.dumps(msg, ensure_ascii=False) + "\n")
        self.proc.stdin.flush()

    def stop(self):
        if self.alive():
            self.proc.terminate()
            try:
                self.proc.wait(5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        self.proc = None
        self.busy = False

    def _read(self, proc):
        for line in proc.stdout:
            try:
                d = json.loads(line)
            except ValueError:
                continue
            t = d.get("type")
            if t == "assistant":
                for block in d["message"].get("content", []):
                    if block.get("type") == "text" and block["text"].strip():
                        self.emit({"kind": "text", "text": block["text"]})
                    elif block.get("type") == "tool_use":
                        self.emit({"kind": "tool", "text": tool_label(block)})
            elif t == "result":
                threading.Thread(target=rebuild_site_if_stale, daemon=True).start()
                self.busy = False
                self.emit({"kind": "busy", "on": False})
                if d.get("is_error"):
                    self.emit({"kind": "error", "text": str(d.get("result", "error"))})
        if self.proc is proc:
            self.busy = False
            self.emit({"kind": "exit"})

    def _read_err(self, proc):
        for line in proc.stderr:
            if line.strip():
                self.emit({"kind": "error", "text": line.strip()})


def _md(x):
    return str(x).replace("|", "/").replace("\n", " ").strip()


def save_session_notes(n):
    """The GUI final page → '## 📝 세션 노트' in progress/daily/<today>.md (website 오늘의 실수, folded).
    One '### <title>' per session; saving the same session again replaces its block."""
    day = date.today().isoformat()
    title = _md(n.get("title") or "GUI session")
    lines = [f"### {title}"]
    lines += [f"- {_md(k)}: {_md(v)}" for k, v in (n.get("stats") or [])]
    rows = n.get("rows") or []
    if rows:
        lines += ["| Item | Then | Now | Help |", "|---|---|---|---|"]
        lines += ["| " + " | ".join(_md(c) for c in (r + ["", "", "", ""])[:4]) + " |" for r in rows]
    lines += [f"- Keep: {_md(k)}" for k in (n.get("keep") or [])]
    if n.get("next"):
        lines.append(f"- Next: {_md(n['next'])}")
    block = "\n".join(lines) + "\n"
    DAILY.mkdir(parents=True, exist_ok=True)
    f = DAILY / f"{day}.md"
    txt = f.read_text() if f.is_file() else f"# {day}\n"
    head = "## 📝 세션 노트"
    if head not in txt:
        txt = txt.rstrip("\n") + f"\n\n{head}\n"
    # replace this session's old block, if any (same title)
    txt = re.sub(rf"^### {re.escape(title)}\n(?:(?!^###|^## ).*\n?)*", "", txt, flags=re.M)
    m = re.search(rf"^{re.escape(head)}[^\n]*\n(.*?)(?=^## |\Z)", txt, re.M | re.S)
    end = m.end()
    txt = txt[:end].rstrip("\n") + "\n\n" + block + ("\n" + txt[end:] if txt[end:] else "")
    f.write_text(txt)


_build_lock = threading.Lock()


def rebuild_site_if_stale():
    """Website gold rule (2026-11-24): after every Claude turn, if anything in
    progress/ is newer than website/data/study.js, rebuild it. A safety net so the
    final summary screen always leaves the website up to date."""
    with _build_lock:
        try:
            built = STUDY_JS.stat().st_mtime if STUDY_JS.exists() else 0
            newest = max((f.stat().st_mtime for f in (ROOT / "progress").rglob("*") if f.is_file()), default=0)
            if newest <= built:
                return
            subprocess.run([sys.executable, "-I", str(BUILD_DATA)], cwd=ROOT,
                           capture_output=True, text=True, timeout=120)
        except Exception as e:  # never break the session over the website
            print(f"website rebuild failed: {e}", file=sys.stderr)


def tool_label(block):
    inp = block.get("input", {})
    name = block.get("name", "tool")
    if name == "Bash":
        return inp.get("description") or "running a command"
    if name in ("Read", "Edit", "Write"):
        return f"{name} {Path(inp.get('file_path', '')).name}"
    if name == "Skill":
        return f"skill {inp.get('skill', '')}"
    return name


SESSION = Session()


def idle_watcher():
    """Closing the tab = 그만: with no page connected for IDLE_STOP_S, send 그만 so
    Claude saves the pause point, then stop the session once it's done.
    A page reload reconnects within a second, so it never triggers this."""
    while True:
        time.sleep(5)
        s = SESSION
        if not s.alive():
            continue
        if s.clients > 0:
            s.auto_t = 0.0
            continue
        idle = time.time() - s.last_seen
        if idle < IDLE_STOP_S:
            continue
        try:
            if not s.ended:
                s.send("그만")
                s.auto_t = time.time()
            elif not s.busy and time.time() - (s.auto_t or s.last_seen) > 5:
                s.stop()
        except (RuntimeError, BrokenPipeError, OSError):
            s.stop()


def restart_server():
    """Re-exec this file so code changes take effect (only with no session running)."""
    time.sleep(0.3)               # let the HTTP reply go out first
    os.execv(sys.executable, [sys.executable, "-I", str(SERVER_FILE)] + sys.argv[1:])


def rec_path(sid, name):
    if not re.fullmatch(r"[\d-]+", sid or "") or not re.fullmatch(r"\d+(-r\d+)?", name or ""):
        raise KeyError("bad recording name")
    return REC / sid / f"{name}.webm"


def tts(text, rate="+0%"):
    """mp3 bytes for a Korean line, cached so repeats are instant."""
    TTS_CACHE.mkdir(parents=True, exist_ok=True)
    f = TTS_CACHE / (hashlib.sha1(f"{rate}|{text}".encode()).hexdigest() + ".mp3")
    if not f.exists():
        tmp = f.with_suffix(".part")
        subprocess.run([str(TTS), "--voice", os.environ.get("VOICE", "ko-KR-SunHiNeural"),
                        f"--rate={rate}", "--text", text, "--write-media", str(tmp)],
                       check=True, capture_output=True, timeout=30)
        tmp.rename(f)
    return f.read_bytes()


def run_today():
    try:
        out = subprocess.run([sys.executable, "-I", str(TODAY)], cwd=ROOT,
                             capture_output=True, text=True, timeout=60).stdout
        return json.loads(out)
    except (subprocess.SubprocessError, ValueError) as e:
        return {"error": f"today.py failed: {e}"}


# ---------- review game: yesterday's mistakes (no Claude call) ----------

def _cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def review_date(today=None):
    """The newest progress/daily file before today (normally yesterday)."""
    today = today or date.today().isoformat()
    days = sorted(f.stem for f in DAILY.glob("????-??-??.md") if f.stem < today)
    return days[-1] if days else None


def review_items(day):
    """Parse progress/daily/<day>.md into game items.

    ✏️ rows: Block | Type | You said | Better | Why (some old rows lack Type).
    💡 rows: Block | You said | More natural | Why.
    """
    f = DAILY / f"{day}.md"
    if not f.is_file():
        return []
    recurring = ""
    if MISTAKES.is_file():
        m = re.search(r"^##[^\n]*Recurring[^\n]*\n(.*?)(?=^## |\Z)", MISTAKES.read_text(), re.S | re.M)
        recurring = m.group(1) if m else ""
    items, section = [], None
    for line in f.read_text().splitlines():
        if line.startswith("## "):
            section = "fix" if "✏️" in line else "natural" if "💡" in line else None
            continue
        if not section or not line.lstrip().startswith("|") or re.match(r"^\s*\|[\s:|-]+\|\s*$", line):
            continue
        c = _cells(line)
        if c[0] == "Block":
            continue
        if section == "fix":
            if len(c) >= 5:   # | Block | Type | You said | Better | Why | Example? |
                block, typ, said, better, why = c[0], c[1], c[2], c[3], c[4]
            elif len(c) == 4:
                block, typ, said, better, why = c[0], "", c[1], c[2], c[3]
            else:
                continue
        else:
            if len(c) < 4:
                continue
            block, typ, said, better, why = c[0], "💡", c[1], c[2], c[3]   # then Kind?, Example?
        alts = [a.strip() for a in better.split(" / ") if a.strip()]
        slip = "small slip" in why or typ == "맞춤법" or "typo" in why
        key = re.sub(r"\(.*?\)|\[.*?\]", "", alts[0]).strip() if alts else ""
        rec = "same as" in why or (len(key) >= 4 and key in recurring)
        # A ✏️ row with no Type was a rewrite, not an error (it belonged in 💡): round 1 only.
        natural = section == "natural" or not typ
        items.append({"block": block, "type": typ or "💡", "said": said, "better": better,
                      "alts": alts, "why": why, "slip": slip, "natural": natural,
                      "recurring": rec})
    return items


def review_game(day):
    """One round (asked 2026-11-25): type the fix. Real errors first (recurring first), then
    💡 lines; typo/spacing slips are left out. Max 10. round1 stays empty for old clients."""
    items = review_items(day)
    for i, it in enumerate(items):
        it["id"] = i
    mains = [it for it in items if not it["slip"] and not it["natural"]]
    random.shuffle(mains)
    mains.sort(key=lambda it: not it["recurring"])
    natural = [it for it in items if it["natural"] and not it["slip"] and not it["said"].startswith("(")]  # "(didn't answer …)" isn't a sentence to fix
    random.shuffle(natural)
    fix = (mains + natural)[:10]
    return {"date": day, "total": len(fix), "round1": [], "round2": fix}


# ---------- review game: Claude judges each typed fix (asked 2026-11-26: no string check) ----------
JUDGE_PROMPT = """You check one answer in a Korean "fix yesterday's mistake" game. The learner is intermediate (TOPIK 3–4).

Original sentence (had a mistake): {said}
Tutor's fix (alternatives split by " / "): {better}
Why it was wrong: {why}
The learner now typed: {answer}

Is the typed sentence correct, natural spoken Korean that fixes that mistake and keeps the meaning? Any correct, natural fix counts, not only the tutor's wording. Ignore spacing and punctuation. A one-letter typo in an otherwise right answer = "close". Still has the original mistake, a new grammar error, or changes the meaning = "wrong".

Reply with JSON only, no code fence:
{{"verdict": "right" | "close" | "wrong", "note": "one short English line (max 20 words): why it's right, or exactly what to change", "fixed": "the learner's sentence corrected with the smallest change, or \"\" if right"}}"""


def judge_fix(item):
    prompt = JUDGE_PROMPT.format(**{k: str(item.get(k, ""))[:400] for k in ("said", "better", "why", "answer")})
    STATE.mkdir(parents=True, exist_ok=True)
    out = subprocess.run(
        ["claude", "-p", prompt, "--model", os.environ.get("JUDGE_MODEL", "opus"),
         "--output-format", "json", "--disallowedTools", "Bash", "Edit", "Write", "Read",
         "Glob", "Grep", "WebFetch", "WebSearch", "Agent", "Skill"],
        cwd=STATE, capture_output=True, text=True, timeout=90)   # gui/state: no project context, faster
    text = json.loads(out.stdout).get("result", "")
    m = re.search(r"\{.*\}", text, re.S)
    res = json.loads(m.group(0)) if m else {}
    if res.get("verdict") not in ("right", "close", "wrong"):
        raise RuntimeError("judge gave no verdict")
    return {"verdict": res["verdict"], "note": str(res.get("note", "")), "fixed": str(res.get("fixed", ""))}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/today":
            return self._json(run_today())
        if url.path == "/api/state":
            return self._json({"alive": SESSION.alive(), "busy": SESSION.busy,
                               "count": len(SESSION.events), "sid": SESSION.sid,
                               "stale": SERVER_FILE.stat().st_mtime > SERVER_MTIME})
        if url.path == "/api/daily":
            day = parse_qs(url.query).get("date", [date.today().isoformat()])[0]
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
                return self._json({"error": "bad date"}, 400)
            return self._json({"date": day, "items": review_items(day)})
        if url.path == "/api/rec/list":
            sid = parse_qs(url.query).get("sid", [""])[0]
            d = REC / sid if re.fullmatch(r"[\d-]+", sid) else None
            return self._json(sorted(f.stem for f in d.glob("*.webm")) if d and d.is_dir() else [])
        if url.path == "/api/rec":
            q = parse_qs(url.query)
            try:
                f = rec_path(q.get("sid", [""])[0], q.get("name", [""])[0])
            except KeyError as e:
                return self._json({"error": str(e)}, 400)
            if not f.is_file():
                return self._json({"error": "not found"}, 404)
            body = f.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/webm")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if url.path == "/api/tts":
            q = parse_qs(url.query)
            try:
                body = tts(q["text"][0][:500], q.get("rate", ["+0%"])[0])
            except (KeyError, subprocess.SubprocessError, OSError) as e:
                return self._json({"error": f"tts failed: {e}"}, 500)
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if url.path == "/api/review":
            q = parse_qs(url.query)
            day = q.get("date", [None])[0] or review_date()
            if not day or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
                return self._json({"date": None, "total": 0, "round1": [], "round2": []})
            if "count" in q:
                return self._json({"date": day, "total": review_game(day)["total"],
                                   "played": (STATE / f"review-{day}.json").is_file()})
            return self._json(review_game(day))
        if url.path == "/api/events":
            return self._events(int(parse_qs(url.query).get("since", ["0"])[0]))
        name = "index.html" if url.path == "/" else url.path.lstrip("/")
        f = (STATIC / name).resolve()
        if STATIC not in f.parents or not f.is_file():
            return self._json({"error": "not found"}, 404)
        body = f.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", TYPES.get(f.suffix, "application/octet-stream") + "; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/start":
                SESSION.start(self._body().get("args", ""))
            elif path == "/api/send":
                SESSION.send(self._body()["text"])
            elif path == "/api/notes":
                save_session_notes(self._body())
                threading.Thread(target=rebuild_site_if_stale, daemon=True).start()
            elif path == "/api/review/result":
                res = self._body()
                day = str(res.get("date", ""))
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
                    raise KeyError("date")
                res["played_at"] = datetime.now().isoformat(timespec="minutes")
                STATE.mkdir(parents=True, exist_ok=True)
                (STATE / f"review-{day}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
            elif path == "/api/review/judge":
                try:
                    return self._json(judge_fix(self._body()))
                except (subprocess.SubprocessError, ValueError, OSError, RuntimeError) as e:
                    return self._json({"error": f"couldn't check: {e}"}, 502)
            elif path == "/api/rec":
                q = parse_qs(urlparse(self.path).query)
                f = rec_path(q.get("sid", [""])[0], q.get("name", [""])[0])
                n = int(self.headers.get("Content-Length") or 0)
                if n > 20_000_000:
                    raise KeyError("recording too big")
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(self.rfile.read(n))
            elif path == "/api/restart":
                if SESSION.alive():
                    raise RuntimeError("a session is running")
                threading.Thread(target=restart_server, daemon=True).start()
            elif path == "/api/close":
                SESSION.stop()
            else:
                return self._json({"error": "not found"}, 404)
        except (RuntimeError, KeyError, BrokenPipeError) as e:
            return self._json({"error": str(e)}, 409)
        self._json({"ok": True})

    def _events(self, i):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with SESSION.cond:
            SESSION.clients += 1
            SESSION.last_seen = time.time()
        try:
            while True:
                with SESSION.cond:
                    SESSION.cond.wait_for(lambda: len(SESSION.events) != i, timeout=15)
                    if len(SESSION.events) < i:   # a new session started
                        i = 0
                    new = SESSION.events[i:]
                for ev in new:
                    i += 1
                    self.wfile.write(f"id: {i}\ndata: {json.dumps(ev, ensure_ascii=False)}\n\n".encode())
                if not new:
                    self.wfile.write(b": ping\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            with SESSION.cond:
                SESSION.clients -= 1
                SESSION.last_seen = time.time()


def main():
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else PORT
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    srv.daemon_threads = True
    threading.Thread(target=idle_watcher, daemon=True).start()
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))   # so finally: stops claude too
    print(f"korean-mentor GUI on http://localhost:{port}", flush=True)
    try:
        srv.serve_forever()
    finally:
        SESSION.stop()


if __name__ == "__main__":
    main()
