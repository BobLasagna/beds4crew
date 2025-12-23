#!/bin/bash

# Get the local IP address
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")

echo "=========================================="
echo "🚀 Starting Property Rental Platform"
echo "=========================================="
echo ""
echo "📍 Server IP: $IP"
echo "🌐 Server URL: http://$IP:3001"
echo "💻 Client URL: http://$IP:5173"
echo ""
echo "📱 On other devices, use:"
echo "   http://$IP:5173"
echo ""
echo "=========================================="
echo ""

# Start server in background
cd server
echo "Starting server..."
npm start &
SERVER_PID=$!

# Wait a bit for server to start
sleep 3

# Start client
cd ../client
echo "Starting client..."
npm run dev -- --host

# When client stops, kill server
kill $SERVER_PID
