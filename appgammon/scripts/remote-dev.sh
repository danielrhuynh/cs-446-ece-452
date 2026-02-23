#!/bin/bash
# remote-dev.sh — Spins up ngrok + server + Expo tunnel for remote development

MOBILE_ENV="apps/mobile/.env"
SERVER_PORT="${PORT:-3000}"
PIDS=()

cleanup() {
  # Prevent re-entry
  trap - SIGINT SIGTERM
  echo ""
  echo "Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
    wait "$pid" 2>/dev/null
  done
  # Restore original .env
  if [ -f "$MOBILE_ENV.bak" ]; then
    mv "$MOBILE_ENV.bak" "$MOBILE_ENV"
    echo "Restored original .env"
  fi
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Check ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "Error: ngrok is not installed. Install it from https://ngrok.com/download"
  exit 1
fi

# Back up the current .env
if [ -f "$MOBILE_ENV" ]; then
  cp "$MOBILE_ENV" "$MOBILE_ENV.bak"
fi

# Start ngrok in the background
echo "Starting ngrok on port $SERVER_PORT..."
ngrok http "$SERVER_PORT" --log=stdout --log-format=json > /tmp/ngrok.log 2>&1 &
PIDS+=($!)

# Wait for ngrok to be ready and grab the URL
echo "Waiting for ngrok tunnel..."
NGROK_URL=""
for i in $(seq 1 30); do
  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    tunnels = json.load(sys.stdin)['tunnels']
    for t in tunnels:
        if t['public_url'].startswith('https://'):
            print(t['public_url'])
            break
except: pass
" 2>/dev/null)
  if [ -n "$NGROK_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$NGROK_URL" ]; then
  echo "Error: Failed to get ngrok URL. Is ngrok already running?"
  cleanup
fi

echo ""
echo "ngrok tunnel: $NGROK_URL"

# Write the ngrok URL into mobile .env
if [ -f "$MOBILE_ENV" ]; then
  sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$NGROK_URL|" "$MOBILE_ENV"
else
  echo "EXPO_PUBLIC_API_URL=$NGROK_URL" > "$MOBILE_ENV"
fi

echo "Updated $MOBILE_ENV"
echo ""
echo "Starting server + Expo (tunnel mode)..."
echo "========================================="

# Start backend server
pnpm --filter server run dev &
PIDS+=($!)

# Start Expo with tunnel
pnpm --filter mobile exec expo start --tunnel &
PIDS+=($!)

# Wait for all background jobs — loop so signals don't break out early
while true; do
  wait && break
done
