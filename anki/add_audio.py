"""Add Korean TTS audio to the conversation vocab cards in Anki.

Adds [sound:] tags to Front (word) and Example (sentence) on every Basic note
tagged "conversation" that doesn't have audio yet. If Anki is open, it goes
through AnkiConnect (no restart needed); if Anki is closed, it edits the
collection file directly (after a backup).

Run: ~/.local/share/anki-tts/venv/bin/python -I anki/add_audio.py
"""
import asyncio
import base64
import json
import urllib.request
import hashlib
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import edge_tts

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


def connect(action, **params):
    req = urllib.request.Request("http://127.0.0.1:8765", json.dumps(
        {"action": action, "version": 6, "params": params}).encode())
    res = json.load(urllib.request.urlopen(req, timeout=30))
    if res.get("error"):
        raise RuntimeError(f"AnkiConnect {action}: {res['error']}")
    return res["result"]


async def via_connect():
    ids = connect("findNotes", query="note:Basic tag:conversation")
    notes = connect("notesInfo", notes=ids)
    todo = []
    for n in notes:
        missing = {f: plain(n["fields"][f]["value"]) for f in FIELDS
                   if plain(n["fields"][f]["value"]) and "[sound:" not in n["fields"][f]["value"]}
        if missing:
            todo.append((n, missing))
    if not todo:
        print("All conversation notes already have audio.")
        return
    sem = asyncio.Semaphore(4)
    jobs = {}
    for _, missing in todo:
        for text in missing.values():
            jobs.setdefault(text, synth(text, sem))
    audio = dict(zip(jobs, await asyncio.gather(*jobs.values())))
    for n, missing in todo:
        fields = {}
        for f, text in missing.items():
            name = connect("storeMediaFile", filename=filename(text),
                           data=base64.b64encode(audio[text]).decode())
            fields[f] = n["fields"][f]["value"] + f" [sound:{name}]"
        connect("updateNoteFields", note={"id": n["noteId"], "fields": fields})
    print(f"Added audio to {len(todo)} notes ({len(audio)} clips) via AnkiConnect.")


async def main():
    if subprocess.run(["pgrep", "-f", "/snap/anki-desktop/"], capture_output=True).stdout.strip():
        try:
            connect("version")
        except OSError:
            sys.exit("Anki is running but AnkiConnect isn't answering. Close Anki and run again.")
        return await via_connect()

    from anki.collection import Collection

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
