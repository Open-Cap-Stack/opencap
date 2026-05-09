#!/bin/bash
# Start both Express backend and Next.js frontend in the same container.
# Railway exposes a single port (PORT env var, default 3000).
# Express listens on PORT; Next.js listens on NEXT_PORT (default 5173).
# Express proxies all non-API GET requests to Next.js on NEXT_PORT.
#
# NOTE: requires bash (not busybox ash) for 'wait -n'. The Dockerfile installs
# bash via: apk add --no-cache bash

set -e

NEXT_PORT="${NEXT_PORT:-5173}"

echo "[start] Launching Next.js on port $NEXT_PORT..."
cd /app/client && node_modules/.bin/next start -p "$NEXT_PORT" &
NEXT_PID=$!

echo "[start] Launching Express backend..."
cd /app && node app.js &
API_PID=$!

# Forward signals to both children
trap "kill $NEXT_PID $API_PID 2>/dev/null; wait $NEXT_PID $API_PID 2>/dev/null; exit 0" TERM INT

# Wait for either process to exit; if one exits, kill the other and terminate.
# 'wait -n' requires bash 4.3+ — available on Alpine when bash is installed.
wait -n $NEXT_PID $API_PID 2>/dev/null
EXIT_CODE=$?

echo "[start] A child process exited (code $EXIT_CODE). Stopping all processes..."
kill $NEXT_PID $API_PID 2>/dev/null
wait $NEXT_PID $API_PID 2>/dev/null
exit $EXIT_CODE
