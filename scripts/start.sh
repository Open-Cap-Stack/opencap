#!/bin/bash
set -e

NEXT_PORT="${NEXT_PORT:-5173}"

if [ -d "/app/client" ] && [ -f "/app/client/node_modules/.bin/next" ]; then
  echo "[start] Launching Next.js on port $NEXT_PORT..."
  cd /app/client && node_modules/.bin/next start -p "$NEXT_PORT" &
  NEXT_PID=$!
  cd /app
else
  echo "[start] No client/ directory found, running backend only..."
  NEXT_PID=""
fi

echo "[start] Launching Express backend..."
node /app/app.js &
API_PID=$!

trap "kill $NEXT_PID $API_PID 2>/dev/null; wait 2>/dev/null; exit 0" TERM INT

if [ -n "$NEXT_PID" ]; then
  wait -n $NEXT_PID $API_PID 2>/dev/null
else
  wait $API_PID
fi

EXIT_CODE=$?
echo "[start] Process exited (code $EXIT_CODE). Stopping..."
kill $NEXT_PID $API_PID 2>/dev/null
wait 2>/dev/null
exit $EXIT_CODE
