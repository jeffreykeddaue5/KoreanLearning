#!/usr/bin/env bash
# 새 글 만들기: posts/_template.js 를 복사해서 오늘 날짜로 새 글 파일을 만든다.
#
# 사용법:
#   ./new-post.sh              → posts/2026-10-21.js
#   ./new-post.sh cafe-talk    → posts/2026-10-21-cafe-talk.js
#
# 하는 일: 글 파일 생성 (date 채움) · posts/list.js 에 추가 · media/<이름>/ 폴더 생성
set -euo pipefail

cd "$(dirname "$0")"

today=$(date +%F)
slug=${1:-}

if [[ -n "$slug" && ! "$slug" =~ ^[a-z0-9-]+$ ]]; then
  echo "이름은 영어 소문자, 숫자, 하이픈(-)만 쓸 수 있어요: $slug" >&2
  exit 1
fi

name="$today${slug:+-$slug}"
file="posts/$name.js"

if [[ -e "$file" ]]; then
  echo "이미 있는 파일이에요: $file" >&2
  exit 1
fi

# 템플릿 맨 위의 설명 주석은 빼고 복사, 날짜와 media 경로를 채운다
sed -e '1,/^$/d' \
    -e "s/date: \"[0-9-]*\"/date: \"$today\"/" \
    -e "s#media/my-post/#media/$name/#g" \
    posts/_template.js > "$file"

# list.js 맨 위에 추가
sed -i "s/^const POST_FILES = \[/&\n  \"$name\",/" posts/list.js

mkdir -p "media/$name"

echo "만들었어요:"
echo "  글:    $file"
echo "  미디어: media/$name/"
echo "  목록:  posts/list.js 에 \"$name\" 추가됨"
