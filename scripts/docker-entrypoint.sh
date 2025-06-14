#!/bin/sh

# Docker entrypoint script for Mastra Meme Generator
# Starts both the main application and webhook server

echo "🚀 Starting Mastra Meme Generator..."
echo "📍 Main app will run on port 4111"
echo "📍 Webhook server will run on port 3001"

# Ensure we're in the correct working directory
cd /app

# Function to handle graceful shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill -TERM "$main_pid" "$webhook_pid" 2>/dev/null
    wait "$main_pid" "$webhook_pid"
    echo "✅ Services stopped gracefully"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start the main Mastra application in the background
echo "🎯 Starting main application..."
node /app/.mastra/output/index.mjs &
main_pid=$!

# Start the webhook server in the background
echo "💬 Starting webhook server..."
cd /app && npm run webhook &
webhook_pid=$!

echo "✅ Both services started!"
echo "🔍 Main app: http://localhost:4111"
echo "🔍 Webhook: http://localhost:3001/webhook"
echo "🔍 Health checks:"
echo "   - Main: http://localhost:4111/health"
echo "   - Webhook: http://localhost:3001/health"

# Wait for any process to exit
wait 