#!/bin/bash

# Correct API Usage for Quality Mode
# 
# This script demonstrates the proper sequence to use quality mode
# and avoid cached responses.

BASE_URL="https://tensorflow-agent-service-h32356f5d-brianferrys-projects.vercel.app/api"
JWT_COOKIE="_vercel_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJnQ2JkaElrVEZodTVIakprODdZSFJxTzgiLCJpYXQiOjE3NTU2OTQ4NTYsIm93bmVySWQiOiJ0ZWFtX21wU2F0Z1NEdWJKRkFhZnpldUN5MUtGeSIsImF1ZCI6InRlbnNvcmZsb3ctYWdlbnQtc2VydmljZS1oMzIzNTZmNWQtYnJpYW5mZXJyeXMtcHJvamVjdHMudmVyY2VsLmFwcCIsInVzZXJuYW1lIjoiYnJpYW5mZXJyeSIsInN1YiI6InNzby1wcm90ZWN0aW9uIn0.NYB7qB4OY8NzglaTcKjsH9alkBsKPf3YXQuBAiPzkWE"

echo "🚀 Setting up Quality Mode for Fresh AI Responses"
echo "=================================================="

echo ""
echo "Step 1: Setting performance mode to 'quality'..."
MODE_RESPONSE=$(curl -s \
  -X POST \
  "$BASE_URL/set_performance_mode/" \
  -H "Content-Type: application/json" \
  -H "Cookie: $JWT_COOKIE" \
  --data-raw '{"mode":"quality"}')

echo "Mode setting response: $MODE_RESPONSE"

echo ""
echo "Step 2: Making task request in quality mode..."
TASK_RESPONSE=$(curl -s \
  -X POST \
  "$BASE_URL/run_task/" \
  -H "Content-Type: application/json" \
  -H "Cookie: $JWT_COOKIE" \
  --data-raw '{"task":"Info on Eevee evolutions"}')

echo "Task response:"
echo "$TASK_RESPONSE" | jq .

echo ""
echo "Step 3: Making the same request again to verify no caching..."
TASK_RESPONSE_2=$(curl -s \
  -X POST \
  "$BASE_URL/run_task/" \
  -H "Content-Type: application/json" \
  -H "Cookie: $JWT_COOKIE" \
  --data-raw '{"task":"Info on Eevee evolutions"}')

echo "Second task response:"
echo "$TASK_RESPONSE_2" | jq .

echo ""
echo "✅ Quality mode should now provide fresh, non-cached responses"
echo "🔍 Look for 'cached: false' in the responses above"
