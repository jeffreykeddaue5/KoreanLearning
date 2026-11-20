#!/usr/bin/env python3
"""Local GUI server for /korean-mentor (see gui/DESIGN.md).

  python3 -I gui/server.py [--port 8765]

Serves the page in gui/static/, runs today.py for the start screen, and keeps
one live Claude Code session (claude -p with stream-json in and out). The page
gets Claude's output as server-sent events from /api/events.
"""
import hashlib
import json
import signal
import os
import subprocess
import sys
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "gui" / "static"
TODAY = ROOT / ".claude" / "skills" / "korean-mentor" / "today.py"
TTS = Path.home() / ".local/share/korean-tts/bin/edge-tts"   # same voice as speak.sh
TTS_CACHE = ROOT / "gui" / "state" / "tts"
PORT = 8765
TYPES = {".html": "text/html", ".js": "text/javascript", ".css": "text/css",
         ".svg": "image/svg+xml", ".png": "image/png"}


class Session:
    """One claude -p process; every output line becomes an event for the page."""

    def __init__(self):
        self.proc = None
        self.events = []          # list of dicts, the page replays them by index
        self.busy = False
        self.cond = threading.Condition()

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
                               "count": len(SESSION.events)})
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


def main():
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else PORT
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    srv.daemon_threads = True
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))   # so finally: stops claude too
    print(f"korean-mentor GUI on http://localhost:{port}", flush=True)
    try:
        srv.serve_forever()
    finally:
        SESSION.stop()


if __name__ == "__main__":
    main()
