#!/usr/bin/env bash
# 한국어 문장을 소리로 읽어 준다 (korean-mentor 세션 전용).
#
# 사용법:  speak.sh "오늘 날씨가 어때요?"
#          RATE=-20% speak.sh "..."      (느리게)
set -euo pipefail

text=${1:?usage: speak.sh "한국어 문장"}
voice=${VOICE:-ko-KR-SunHiNeural}
rate=${RATE:-+0%}
tts=~/.local/share/korean-tts/bin/edge-tts

out=$(mktemp --suffix=.mp3)
trap 'rm -f "$out"' EXIT

"$tts" --voice "$voice" --rate="$rate" --text "$text" --write-media "$out" 2>/dev/null
ffplay -nodisp -autoexit -loglevel quiet "$out"
