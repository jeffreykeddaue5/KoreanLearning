# 일지 — Notes

## 1. Files at a glance

| File | What it's for |
|---|---|
| `index.html` | Page layout, side panels, menu |
| `style.css` | All styling (phone layout below 860px) |
| `script.js` | Clock, ticker, side panels (D-n, 진도, Anki, 까먹는 단어, 틀리는 문법, 실수 종류) |
| `blog.js` | Blog engine: posts, routing, the 오늘 page `#/today` (with live weather) and its one-line box on 홈, and the 홈 / 이번 주 / 문법 / 단어 카드 pages. Categories at the top (`CATEGORIES`) |
| `data/study.js` | **Generated** by `build_data.py` from `weeks/`, `progress/`, `Grammar/`, `Listening/` and Anki. Don't edit |
| `data/today.js` | The 오늘 panel: a week of mood + 써먹을 표현 (with grammar point) by date, and weather phrases. Filled weekly by `/lesson-intake` → `/website-update`. Weather itself is fetched live |
| `build_data.py` | `python3 -I website/build_data.py` from the repo root rebuilds `data/study.js` |
| `posts/list.js` | **Which posts are live** |
| `posts/*.js` | One file per post |
| `posts/_template.js` | Copy this to start a new post |
| `media/` | Images, GIFs, videos, audio (one folder per post) |

To preview locally, just open `index.html` in a browser. No server needed.

**Who updates what:** daily → `/daily-update` (rebuild only; the 오늘 panel runs itself from the weekly list) · Wed → `/lesson-intake` (수업 post, 이번 주) · Tue → `/weekly-check` (주간 정리 post, levels) · 일상 posts → you.

---

## 2. Writing posts

### New post (quick way)
```bash
./new-post.sh cafe-talk     # → posts/<today>-cafe-talk.js
./new-post.sh               # → posts/<today>.js
```
This creates the post file with today's date filled in, adds it to `posts/list.js`, and makes `media/<name>/`. Then edit the title, category, tags and content, and delete the example blocks you don't need.

### New post (manual way)
1. Copy `posts/_template.js` and rename it, e.g. `posts/2026-11-01-my-post.js`
   - Use English letters, numbers and hyphens. The file name becomes the post's URL (`#/post/2026-11-01-my-post`).
2. Add the name (without `.js`) to `posts/list.js`:
   ```js
   const POST_FILES = [
     "2026-11-01-my-post",
     ...
   ];
   ```
3. Put media in `media/2026-11-01-my-post/`.

Order in `list.js` doesn't matter. Posts are sorted by `date`.

### Delete / hide a post
- **Delete:** remove its line from `list.js`. You can delete the file too, but you don't have to.
- **Hide (draft):** add `draft: true` to the post.

### Post format
```js
post({
  title: "글 제목",
  date: "2026-11-01",
  category: "daily",            // "daily" | "lesson" | "weekly"
  tags: ["한국어", "생각"],
  summary: "목록에 보일 요약",     // optional, otherwise the first paragraph is used
  cover: "media/my-post/cover.jpg", // optional thumbnail in lists
  draft: true,                  // optional, hides the post

  content: [
    "문단 하나. <b>굵게</b>, <i>기울임</i>, <a href='...'>링크</a> OK.",
    { heading: "소제목" },
    { quote: "인용문" },
    { image: "media/my-post/photo.jpg", caption: "설명" },  // GIFs too
    { gallery: ["media/my-post/1.jpg", "media/my-post/2.jpg"], caption: "설명" },
    { video: "media/my-post/clip.mp4", caption: "설명" },   // with controls
    { video: "media/my-post/loop.mp4", gif: true },        // silent autoplay loop
    { audio: "media/my-post/voice.mp3", caption: "설명" },  // mp3 with controls
    { youtube: "VIDEO_ID" },                               // the part after v= in the URL
    { html: "<hr>" },                                      // anything else
  ],
});
```

### Common mistakes
- Missing comma between blocks → the whole post won't show. Check the browser console (F12).
- A `"` inside a `"..."` string breaks it. Use `'` inside, or write the string with backticks `` `...` ``.
- Post not showing up? Check that the name in `list.js` exactly matches the file name.
- YouTube won't play when opening the file locally. That's normal; it works once the site is online.

### Other things to update
- **까먹는 단어 / 틀리는 문법 / 단어 카드 / D-n / 진도 / 문법 레벨:** all come from `data/study.js`. Change the source (Anki, `progress/`, `weeks/`) and rerun `build_data.py`.
- **단어 카드** shows up to 5 focus words: today's pins ranked by misses today → trouble → pin count (no pins → this week's most missed). To hand-pick them, write `progress/focus-words.txt` (first line today's date, then one word per line). The page has 한→영 / 영→한 (typed check), 🔊 (browser TTS), cf) pairs, Space/1/2 keys, and remembers "알아요" for the day in this browser.
- **기분 / 날씨 / 써먹을 표현:** `data/today.js`, one entry per date in `days`. Every Korean line needs an `_en` line: it stays blurred until hover (or tap on a phone), or 영어 모두 보기.
- **오늘 써 봤어요:** saved only in your browser (localStorage). Use 기록 복사 on the 오늘 page to paste it into the weekly check.
- **New category:** add it to `CATEGORIES` in `blog.js` and add a menu link in `index.html` (`#/category/키`).

---

## 3. GitHub Pages

### One-time setup
1. Create a new **public** repo on GitHub (e.g. `wired-diary`). Don't add a README.
2. In the `website` folder:
   ```bash
   cd ~/Documents/GrammarStudy/website
   git init
   git add .
   git commit -m "첫 커밋"
   git branch -M main
   git remote add origin https://github.com/<username>/wired-diary.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
4. After about a minute the site is live at `https://<username>.github.io/wired-diary/`.

> Tip: if you name the repo `<username>.github.io`, the site lives at `https://<username>.github.io/` with no subfolder.

### Updating the site
```bash
git add .
git commit -m "새 글: 비 오는 날"
git push
```
The site updates about 1 minute after the push. Hard-refresh (Ctrl+Shift+R) if you still see the old version.

### Useful git commands
```bash
git status                 # what changed
git log --oneline          # history
git restore <file>         # discard uncommitted changes to a file
git revert <commit-id>     # undo a commit that's already pushed
```

### Limits & things to know
- About 1 GB total site size, 100 MB max per file (GitHub warns above 50 MB).
- **Everything in the repo is public**, including drafts (`draft: true` only hides a post from the page, not from GitHub) and this notes file.
- Custom domain: Settings → Pages → Custom domain.

---

## 4. Images & media

### Size guide (for 1 GB)
| Type | Typical size | Fits in 1 GB |
|---|---|---|
| Phone photo, unedited | 3–5 MB | ~250 |
| 1600px JPEG | ~300 KB | ~3,000 |
| **1200px JPEG (recommended)** | ~150 KB | ~6,500 |
| 1200px WebP | ~80–100 KB | ~10,000 |
| GIF | 1–10 MB | ~100–1,000 |

The post column is about 530px wide, so **1200px is plenty**, even on high-resolution screens.

### Resize before adding (ImageMagick)
Install: `sudo dnf install ImageMagick` (Fedora/RHEL) or `sudo apt install imagemagick` (Ubuntu).

```bash
# Resize every JPG in a folder to max 1200px, quality 80, strip metadata
# (overwrites files, so run on copies)
mogrify -resize '1200x1200>' -quality 80 -strip media/my-post/*.jpg

# Same for PNGs
mogrify -resize '1200x1200>' -strip media/my-post/*.png

# Convert to WebP (smaller) — writes new .webp files, keeps originals
mogrify -format webp -resize '1200x1200>' -quality 80 -strip media/my-post/*.jpg
```
- `'1200x1200>'` means only shrink, never enlarge.
- `-strip` removes metadata, **including GPS location** from phone photos. Always do this before posting.

### GIFs → MP4 (about 10× smaller)
Install: `sudo dnf install ffmpeg` (may need the RPM Fusion repo) or `sudo apt install ffmpeg`.

```bash
ffmpeg -i funny.gif -movflags faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" funny.mp4
```
Then use it like a GIF:
```js
{ video: "media/my-post/funny.mp4", gif: true }
```

### Videos
- Short clips (under ~20 MB): compress and use `{ video: ... }`
  ```bash
  ffmpeg -i input.mov -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset slow \
    -c:a aac -b:a 96k -movflags faststart clip.mp4
  ```
- Long videos: upload to YouTube and use `{ youtube: "VIDEO_ID" }`.

### Checklist before each post
- [ ] Images resized to 1200px and stripped (`-strip`)
- [ ] GIFs converted to MP4
- [ ] Name added to `posts/list.js`
- [ ] Checked locally in the browser
- [ ] `git add . && git commit -m "..." && git push`
