#!/usr/bin/env python3
"""Record and transcribe Korean speaking practice. Run from the repo root with python3 -I.

  record.py start <file.wav> [max seconds]   start recording from the default mic (returns at once;
                                             stops by itself after max seconds, default 600)
  record.py stop <file.wav>                  stop it; prints length and loudness (warns if too quiet)
  record.py play <audio file> <second> [length]   replay a moment (default: 1s before, 4s long)
  record.py transcribe <audio file>          Korean transcript with uncertain words marked [?],
                                             plus fluency numbers; writes <file>.json next to it.
                                             Takes any audio (phone .m4a too). ~1.3× the audio length.

Transcription is local and free (faster-whisper "small", in ~/.local/share/korean-tools).
"""
import json
import os
import re
import signal
import subprocess
import sys
import time
from pathlib import Path

VENV_PY = Path.home() / ".local/share/korean-tools/bin/python"
# A disfluent prompt nudges Whisper toward a literal transcript (keeps fillers, fewer "fixes").
PROMPT = "음... 그러니까, 어... 제가 어제, 음, 친구를 만났는데요. 어... 그게, 좀 힘들었어요."
CONNECTORS = ["그래서", "그런데", "근데", "그리고", "그러니까", "하지만", "그래도", "그러면", "그럼", "왜냐하면"]
FILLERS = ["음", "어", "아", "그", "저", "뭐"]


def pidfile(f):
    return Path(str(f) + ".pid")


def start(f, maxs=600):
    f = Path(f)
    f.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.Popen(["timeout", "-s", "INT", str(maxs), "pw-record", "--rate", "16000", "--channels", "1", str(f)],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    pidfile(f).write_text(str(p.pid))
    print(f"recording → {f} (stops by itself after {maxs}s)")


def stop(f):
    f = Path(f)
    pf = pidfile(f)
    if pf.exists():
        try:
            os.killpg(int(pf.read_text()), signal.SIGINT)
        except ProcessLookupError:
            pass
        pf.unlink()
        time.sleep(0.8)
    if not f.exists():
        sys.exit("no recording found")
    info = subprocess.run(["ffmpeg", "-i", str(f), "-af", "volumedetect", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
    secs = int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3]) if dur else 0
    mx = re.search(r"max_volume: (-?[\d.]+)", info)
    mean = re.search(r"mean_volume: (-?[\d.]+)", info)
    out = {"file": str(f), "seconds": round(secs, 1), "max_db": float(mx[1]) if mx else None,
           "mean_db": float(mean[1]) if mean else None}
    if out["max_db"] is not None and out["max_db"] < -25:
        out["warning"] = "very quiet: speak closer to the mic or raise the input volume (Settings → Sound → Input)"
    print(json.dumps(out, ensure_ascii=False))


def transcribe(f):
    if Path(sys.prefix).resolve() != VENV_PY.parent.parent.resolve():
        os.execv(str(VENV_PY), [str(VENV_PY), "-I", __file__, "transcribe", f])
    import numpy as np
    from faster_whisper import WhisperModel
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=os.cpu_count())
    segs, _ = model.transcribe(audio, language="ko", beam_size=5, temperature=0, initial_prompt=PROMPT,
                               condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
    words = [w for s in segs for w in s.words]
    text, unsure = [], []
    for w in words:
        t = w.word
        if w.probability < 0.5 and t.strip(" .,…") not in FILLERS:
            unsure.append({"word": t.strip(), "at": round(w.start, 1), "p": round(w.probability, 2)})
            t = t.rstrip() + "[?]"
        text.append(t)
    text = "".join(text).strip()
    total = len(audio) / 16000
    pauses = [round(b.start - a.end, 1) for a, b in zip(words, words[1:]) if b.start - a.end >= 1.5]
    speech = (words[-1].end - words[0].start) if words else 0
    plain = re.sub(r"\[\?\]", "", text)
    eojeol = [e for e in re.split(r"\s+", re.sub(r"[.,!?…]", " ", plain)) if e]
    metrics = {
        "seconds": round(total, 1),
        "words": len(eojeol),
        "words_per_min": round(len(eojeol) / (speech / 60), 1) if speech else 0,
        "long_pauses": len(pauses),
        "english_words": len(re.findall(r"[A-Za-z]{2,}", plain)),
        "fillers": sum(1 for e in eojeol if e.rstrip(".,") in FILLERS),
        "connectors": sum(plain.count(c) for c in CONNECTORS) + len(re.findall(r"[는은]데[요,\s]", plain)),
    }
    out = {"text": text, "unsure": unsure, "metrics": metrics}
    Path(str(f).rsplit(".", 1)[0] + ".json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(out, ensure_ascii=False, indent=1))


def play(f, at, length=4):
    start = max(float(at) - 1, 0)
    subprocess.Popen(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-ss", f"{start:.1f}", "-t", str(length), f],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "start":
        start(a[1], int(a[2]) if len(a) > 2 else 600)
    elif a[0] == "stop":
        stop(a[1])
    elif a[0] == "play":
        play(a[1], a[2], *(a[3:4]))
    elif a[0] == "transcribe":
        transcribe(a[1])
    else:
        sys.exit(__doc__)
