#!/bin/bash
# Grace Flow — 1-Click Mac Launcher
cd "$(dirname "$0")"

echo "========================================================"
echo "  🕊️  Starting Grace Flow Church Countdown & Service Deck..."
echo "========================================================"

# Launch the server in background and open default browser
node server.js &
SERVER_PID=$!

sleep 1.2
open "http://localhost:3000"

echo ""
echo "Grace Flow is now running! (PID: $SERVER_PID)"
echo "Press Ctrl+C in this Terminal window to stop Grace Flow."
echo ""

wait $SERVER_PID
