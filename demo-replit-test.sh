#!/bin/bash

# Demo script for testing Replit performance modes
# This shows example usage of the test-replit-modes.js script

echo "🧪 Replit Performance Mode Test Suite Demo"
echo "=========================================="
echo

# Example Replit URLs (replace with your actual Replit URL)
EXAMPLE_URL="https://e9c64456-a303-41e5-8a44-c8b23f405082-00-1r0b2jg340y61.picard.replit.dev/"

echo "📝 Usage Examples:"
echo
echo "1. Basic test with default Pokemon query:"
echo "   node test-replit-modes.js $EXAMPLE_URL"
echo
echo "2. Custom query about Charizard:"
echo "   node test-replit-modes.js $EXAMPLE_URL \"What makes Charizard good for competitive play?\""
echo
echo "3. Type analysis query:"
echo "   node test-replit-modes.js $EXAMPLE_URL \"Tell me about Bulbasaur's type advantages\""
echo
echo "4. Stats query:"
echo "   node test-replit-modes.js $EXAMPLE_URL \"Show me Pikachu's battle stats\""
echo

# Check if URL provided as argument
if [ $# -eq 0 ]; then
    echo "⚠️  No Replit URL provided. Please provide your Replit base URL:"
    echo "   Example: ./demo-replit-test.sh https://your-app.your-username.repl.co"
    exit 1
fi

REPLIT_URL="$1"
QUERY="${2:-Tell me about Pikachu for competitive battling}"

echo "🚀 Running test against: $REPLIT_URL"
echo "🎯 Query: \"$QUERY\""
echo

# Run the test
node test-replit-modes.js "$REPLIT_URL" "$QUERY"
