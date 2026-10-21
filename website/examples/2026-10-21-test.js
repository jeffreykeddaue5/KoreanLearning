post({
  title: "글 제목",
  date: "2026-10-21",
  category: "daily",            // "projects" | "daily" | "media" | "talk"
  tags: ["태그1", "태그2"],
  // summary: "목록에 보일 요약 (없으면 첫 문단이 쓰인다)",
  // cover:   "media/2026-10-21-test/cover.jpg",   // 목록에 보일 작은 사진 (선택)
  // draft:   true,                        // true 이면 숨김 (초안)

  content: [
    // 그냥 문자열 = 문단. <b>굵게</b>, <i>기울임</i>, <a href="...">링크</a> 도 된다.
    "첫 번째 문단.",
    "두 번째 문단.",

    { heading: "소제목" },
    { quote: "인용문" },

    // 사진 / GIF (gif 파일도 image 로 쓰면 된다)
    { image: "media/2026-10-21-test/photo.jpg", caption: "사진 설명" },
    { image: "media/2026-10-21-test/funny.gif" },

    // 사진 여러 장
    { gallery: ["media/2026-10-21-test/1.jpg", "media/2026-10-21-test/2.jpg", "media/2026-10-21-test/3.jpg"] },

    // 동영상 (mp4/webm). gif: true 이면 소리 없이 자동 반복 (GIF처럼)
    { video: "media/2026-10-21-test/clip.mp4", caption: "영상 설명" },
    { video: "media/2026-10-21-test/loop.mp4", gif: true },

    // 유튜브 (주소의 v= 뒤에 있는 ID)
    { youtube: "dQw4w9WgXcQ" },

    // 그 외 아무 HTML
    { html: "<hr>" },
  ],
});
