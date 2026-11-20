#!/usr/bin/env bash
# 한국어 문장을 소리로 읽어 준다 (korean-mentor 세션 전용).
#
# 사용법:  speak.sh "오늘 날씨가 어때요?"
#          RATE=-20% speak.sh "..."      (느리게)
#          DELAY=0 speak.sh "..."        (바로 재생)
#
# 소리는 화면에 문장이 뜬 다음에 나와야 한다. 그래서 기본으로 DELAY초(1.5) 기다렸다가
# 재생한다: speak.sh 호출 → 프롬프트 텍스트가 출력됨 → 그 다음에 소리.
set -euo pipefail

text=${1:?usage: speak.sh "한국어 문장"}
voice=${VOICE:-ko-KR-SunHiNeural}
rate=${RATE:-+0%}
delay=${DELAY:-1.5}
tts=~/.local/share/korean-tts/bin/edge-tts

out=$(mktemp --suffix=.mp3)
trap 'rm -f "$out"' EXIT

"$tts" --voice "$voice" --rate="$rate" --text "$text" --write-media "$out" 2>/dev/null

# 재생은 분리해서 돌리고 바로 끝낸다 (완료 알림이 뜨지 않게).
trap - EXIT
nohup sh -c 'sleep "$2"; ffplay -nodisp -autoexit -loglevel quiet "$1"; rm -f "$1"' _ "$out" "$delay" >/dev/null 2>&1 &
