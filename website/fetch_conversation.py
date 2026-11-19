#!/usr/bin/env python3
"""오늘의 회화: Naver 사전 '오늘의 회화' (한국어-영어, 연세대 한국어학당)를 글로 만든다.

    python3 website/fetch_conversation.py            # 오늘
    python3 website/fetch_conversation.py 20261118   # 그 날짜

- posts/YYYY-MM-DD-conversation.js 를 쓰고 posts/list.js 맨 위에 넣는다.
- mp3는 media/conversation/YYYY-MM-DD/ 에 받는다 (.gitignore: 공개 저장소에 다시 올리지 않음).
  글에는 Naver 링크도 같이 넣어서, 로컬 파일이 없는 곳(GitHub Pages)에서는 그걸로 재생한다.
- 이미 있으면 다시 만든다 (같은 내용, 파일만 새로 받음).
"""
import datetime
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
UA = {"User-Agent": "Mozilla/5.0", "Referer": "https://learn.dict.naver.com/conversation"}
API = "https://gateway.dict.naver.com/krdict/ko/koen/today/{date}/conversation.dict"
SIGN = "https://learn.dict.naver.com/dictPronunciation.dict?filePaths="
PAGE = "https://learn.dict.naver.com/conversation#/korean-en/{date}"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()


def signed_urls(paths):
    """Naver 파일 경로 → 재생할 수 있는 (서명된) mp3 주소."""
    out = []
    for i in range(0, len(paths), 20):
        chunk = paths[i:i + 20]
        data = json.loads(get(SIGN + urllib.parse.quote(",".join(chunk), safe="/,")))
        out += data["url"]
    return dict(zip(paths, out))


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().strftime("%Y%m%d")
    d8 = arg.replace("-", "")
    day = f"{d8[:4]}-{d8[4:6]}-{d8[6:]}"

    res = json.loads(get(API.format(date=d8)))
    data = res.get("data")
    if res.get("meta", {}).get("status") != 1 or not data or not data.get("sentences"):
        sys.exit(f"{day}: 오늘의 회화가 아직 없어요 (Naver).")

    sentences = sorted([s for s in data["sentences"] if s.get("open_yn", 1)], key=lambda s: s["disp_seq"])
    entries = sorted(data.get("entrys") or [], key=lambda e: e["disp_seq"])
    studys = sorted(data.get("studys") or [], key=lambda s: s.get("sort_num", 0))

    # 받을 mp3 모으기: Naver 경로 → 로컬 파일 이름
    files = {}
    def want(path, name):
        if path:
            files[path] = name
            return path
    want(data.get("pron_file_all_url"), "all.mp3")
    for n, s in enumerate(sentences, 1):
        want(s.get("sentence_pron_file"), f"line{n:02d}.mp3")
    for n, e in enumerate(entries, 1):
        want(e.get("pron_file_url"), f"word{n:02d}.mp3")
    for n, st in enumerate(studys, 1):
        for m, ex in enumerate(st.get("examples") or [], 1):
            want(ex.get("pron_file_url"), f"study{n}_{m:02d}.mp3")

    signed = signed_urls(list(files))
    media = ROOT / "media" / "conversation" / day
    media.mkdir(parents=True, exist_ok=True)
    for path, name in files.items():
        try:
            (media / name).write_bytes(get(signed[path]))
        except Exception as err:  # 하나 실패해도 글은 만든다 (Naver 링크로 재생)
            print(f"  ! {name}: {err}")

    def src(path):
        if not path or path not in files:
            return None
        return [f"media/conversation/{day}/{files[path]}", signed[path]]

    def line(ko, en, path, who=None):
        item = {"ko": ko, "en": en}
        if who:
            item["who"] = who
        s = src(path)
        if s:
            item["src"] = s
        return item

    title = data["title"]
    content = [
        {"listen": src(data.get("pron_file_all_url")), "caption": "전체 듣기"},
        {"heading": "대화"},
        {"lines": [line(s["sentence"], s.get("trsl_sentence"), s.get("sentence_pron_file"), s.get("speaker"))
                   for s in sentences]},
    ]
    if entries:
        content += [{"heading": "단어"},
                    {"lines": [line(e["entry_name"], e.get("mean"), e.get("pron_file_url")) for e in entries]}]
    notes_file = ROOT / "data" / "conversation_grammar.json"
    notes = json.loads(notes_file.read_text(encoding="utf-8")) if notes_file.exists() else {}
    for st in studys:
        note = notes.get(st["title"])
        if note:  # Claude가 쓴 설명 (Grammar/ 파일과 같은 모양)
            explain = (f'<p><b>Form:</b> {note["form"]}<br><b>Meaning:</b> {note["meaning"]}</p>'
                       + "".join(f"<p>✔ {n}</p>" if not n.startswith("❌") else f"<p>{n}</p>"
                                 for n in note.get("notes", [])))
        else:
            print(f"  NEED NOTE: {st['title']}  → data/conversation_grammar.json 에 쓰고 다시 실행")
            explain = f'<p class="small">{esc(st.get("translation") or st.get("description") or "")}</p>'
        content += [{"heading": f"문법 · {st['title']}"},
                    {"html": explain},
                    {"lines": [line(ex["example"], ex.get("translation"), ex.get("pron_file_url"))
                               for ex in st.get("examples") or []]}]
    try:
        source = json.loads(data.get("source") or "{}").get("en", "")
    except ValueError:
        source = ""
    content += [{"heading": "출처"},
                {"html": f'<a href="{PAGE.format(date=d8)}" target="_blank" rel="noopener">네이버 사전 · 오늘의 회화</a>'
                         + (f" ({esc(source)})" if source else "")}]

    post = {
        "title": title,
        "date": day,
        "category": "conversation",
        "tags": [t for t in [data.get("theme"), "오늘의 회화"] if t],
        "summary": data.get("title_translation") or "",
        "content": content,
    }
    pid = f"{day}-conversation"
    js = ("// fetch_conversation.py 로 만든 글 (손으로 고치지 않기: 다시 만들면 덮어씀)\n"
          f"post({json.dumps(post, ensure_ascii=False, indent=2)});\n")
    (ROOT / "posts" / f"{pid}.js").write_text(js, encoding="utf-8")

    lst = ROOT / "posts" / "list.js"
    text = lst.read_text(encoding="utf-8")
    if f'"{pid}"' not in text:
        text = text.replace("const POST_FILES = [\n", f'const POST_FILES = [\n  "{pid}",\n', 1)
        lst.write_text(text, encoding="utf-8")

    print(f"{day}: {title}  ({len(sentences)}줄, 단어 {len(entries)}, 문법 {len(studys)}, mp3 {len(files)})")


def esc(s):
    return re.sub(r"[&<>\"]", lambda m: {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[m.group()], s)


if __name__ == "__main__":
    main()
