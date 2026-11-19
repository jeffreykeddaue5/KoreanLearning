#!/usr/bin/env python3
"""Answer timer for grammar sessions.

  timer.py start   # after a prompt is shown (and read aloud)
  timer.py stop    # first thing when the answer arrives; prints e.g. "⏱ 24s"

The time includes the user's reading, thinking and typing.
"""
import os
import sys
import time
from pathlib import Path

STATE = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp")) / "korean-mentor-timer"


def fmt(sec: float) -> str:
    sec = round(sec)
    return f"{sec}s" if sec < 60 else f"{sec // 60}:{sec % 60:02d}"


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "start":
        STATE.write_text(str(time.time()))
    elif cmd == "stop":
        try:
            started = float(STATE.read_text())
        except (OSError, ValueError):
            print("⏱ –")
            return
        STATE.unlink(missing_ok=True)
        print(f"⏱ {fmt(time.time() - started)}")
    else:
        sys.exit("usage: timer.py start|stop")


if __name__ == "__main__":
    main()
