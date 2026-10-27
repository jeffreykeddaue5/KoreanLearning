// ===== 글 템플릿 =====
// 1. 이 파일을 복사해서 이름을 바꾼다     (copy this file and rename it)
//    예: posts/2026-11-01-my-post.js      — 이름은 영어/숫자/하이픈 추천, 주소에 쓰인다
// 2. posts/list.js 에 "2026-11-01-my-post" 를 추가한다
// 3. 사진/영상은 media/ 폴더에 넣는다     (put media files in media/)

post({
  title: "글 제목",
  date: "2026-11-01",
  category: "daily",            // "daily" | "talk" | "mistakes" | "homework"
  tags: ["태그1", "태그2"],
  // summary: "목록에 보일 요약 (없으면 첫 문단이 쓰인다)",
  // cover:   "media/my-post/cover.jpg",   // 목록에 보일 작은 사진 (선택)
  // draft:   true,                        // true 이면 숨김 (초안)

  content: [
    // 그냥 문자열 = 문단. <b>굵게</b>, <i>기울임</i>, <a href="...">링크</a> 도 된다.
    "첫 번째 문단.",
    "두 번째 문단.",

    { heading: "소제목" },
    { quote: "인용문" },

    // 사진 / GIF (gif 파일도 image 로 쓰면 된다)
    { image: "media/my-post/photo.jpg", caption: "사진 설명" },
    { image: "media/my-post/funny.gif" },

    // 사진 여러 장
    { gallery: ["media/my-post/1.jpg", "media/my-post/2.jpg", "media/my-post/3.jpg"] },

    // 동영상 (mp4/webm). gif: true 이면 소리 없이 자동 반복 (GIF처럼)
    { video: "media/my-post/clip.mp4", caption: "영상 설명" },
    { video: "media/my-post/loop.mp4", gif: true },

    // 음성 (mp3)
    { audio: "media/my-post/voice.mp3", caption: "음성 설명" },

    // 유튜브 (주소의 v= 뒤에 있는 ID)
    { youtube: "dQw4w9WgXcQ" },

    // 그 외 아무 HTML
    { html: "<hr>" },
  ],
});
