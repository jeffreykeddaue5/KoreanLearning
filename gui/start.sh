#!/usr/bin/env bash
# Opens the korean-mentor GUI in the browser, starting the server if needed.
#
#   gui/start.sh            # start screen
#   gui/start.sh review     # start a session right away with these arguments
set -euo pipefail

cd "$(dirname "$0")/.."
port=${PORT:-8766}  # 8765 is AnkiConnect (Anki open)
url="http://localhost:$port/"

# Server code changed and no session running → restart it so the change takes effect.
state=$(curl -s "${url}api/state" || true)
if [ -n "$state" ] && python3 -c 'import json,sys; d=json.loads(sys.argv[1]); sys.exit(0 if d.get("stale") and not d.get("alive") else 1)' "$state" 2>/dev/null; then
  curl -s -X POST "${url}api/restart" >/dev/null
  sleep 0.5
  for _ in $(seq 50); do
    curl -s -o /dev/null "$url" && break
    sleep 0.1
  done
fi

if ! curl -s -o /dev/null "$url"; then
  mkdir -p gui/state
  nohup python3 -I gui/server.py --port "$port" >gui/state/server.log 2>&1 &
  for _ in $(seq 50); do
    curl -s -o /dev/null "$url" && break
    sleep 0.1
  done
fi

if [ $# -gt 0 ]; then
  url="$url?start=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(" ".join(sys.argv[1:])))' "$@")"
fi
xdg-open "$url" >/dev/null 2>&1 &
echo "$url"
