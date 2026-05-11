#!/usr/bin/env bash
set -e

PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill anything already on the port
fuser -k ${PORT}/tcp 2>/dev/null || true

echo "Serving $DIR on http://localhost:${PORT}"
python3 -m http.server ${PORT} --directory "$DIR" &
SERVER_PID=$!

# Wait for the server to be ready
for i in $(seq 1 10); do
  curl -s "http://localhost:${PORT}" > /dev/null && break
  sleep 0.3
done

xdg-open "http://localhost:${PORT}"

echo "Server running (PID $SERVER_PID). Press Ctrl+C to stop."
wait $SERVER_PID
