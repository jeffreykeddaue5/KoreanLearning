"""Add Korean TTS audio to the conversation vocab cards in Anki.

Adds [sound:] tags to Front (word) and Example (sentence) on every Basic note
tagged "conversation" that doesn't have audio yet. Anki must be closed.

Run: ~/.local/share/anki-tts/venv/bin/python -I anki/add_audio.py
"""
import asyncio
import hashlib
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import edge_tts
from anki.collection import Collection

COLLECTION = Path.home() / "snap/anki-desktop/common/User 1/collection.anki2"
VOICE = "ko-KR-SunHiNeural"
FIELDS = ["Front", "Example"]


def plain(html):
    return re.sub(r"<[^>]+>|&nbsp;", " ", html).strip()


def filename(text):
    return "tts_" + hashlib.sha1(f"{VOICE}:{text}".encode()).hexdigest()[:12] + ".mp3"


async def synth(text, sem):
    async with sem:
        out = b""
        async for chunk in edge_tts.Communicate(text, VOICE).stream():
            if chunk["type"] == "audio":
                out += chunk["data"]
        return out


async def main():
    if subprocess.run(["pgrep", "-f", "/snap/anki-desktop/"], capture_output=True).stdout.strip():
        sys.exit("Anki is running. Close it first.")

    backup = COLLECTION.parent / "backups" / f"before-tts-{time.strftime('%Y%m%d-%H%M%S')}.anki2"
    shutil.copy2(COLLECTION, backup)

    col = Collection(str(COLLECTION))
    try:
        notes = [col.get_note(nid) for nid in col.find_notes('note:Basic tag:conversation')]
        todo = [n for n in notes if any(plain(n[f]) and "[sound:" not in n[f] for f in FIELDS)]

        sem = asyncio.Semaphore(4)
        jobs = {}
        for n in todo:
            for f in FIELDS:
                text = plain(n[f])
                if text and "[sound:" not in n[f]:
                    jobs.setdefault(text, synth(text, sem))
        audio = dict(zip(jobs, await asyncio.gather(*jobs.values())))

        for n in todo:
            for f in FIELDS:
                text = plain(n[f])
                if text and "[sound:" not in n[f]:
                    name = col.media.write_data(filename(text), audio[text])
                    n[f] += f" [sound:{name}]"
        col.update_notes(todo)
        print(f"Added audio to {len(todo)} notes ({len(audio)} clips). Backup: {backup}")
    finally:
        col.close()


asyncio.run(main())
