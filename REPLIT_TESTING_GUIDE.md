# 🧪 Replit Performance Mode Test Suite

A comprehensive testing tool for evaluating all three performance modes (Fast, Balanced, Quality) of your TensorFlow Agent Service deployed on Replit.

## 📋 Features

- **Complete Performance Analysis**: Tests all three modes in sequence
- **Comprehensive Response Display**: Shows full responses, not just summaries
- **Performance Metrics**: Measures response times, lengths, and caching behavior
- **Response Analysis**: Analyzes markdown usage, word counts, and style differences
- **Server Health Check**: Verifies deployment status before testing
- **Beautiful Output**: Color-coded, formatted results with tables and analysis

## 🚀 Quick Start

### Basic Usage

```bash
# Test with default Pokemon query
node test-replit-modes.js https://your-app.your-username.repl.co

# Test with custom query
node test-replit-modes.js https://your-app.your-username.repl.co "Tell me about Charizard's competitive stats"
```

### Using the Demo Script

```bash
# Make the demo executable
chmod +x demo-replit-test.sh

# Run with your Replit URL
./demo-replit-test.sh https://your-app.your-username.repl.co

# Run with custom query
./demo-replit-test.sh https://your-app.your-username.repl.co "What makes Pikachu good for battles?"
```

### Using NPM Script

```bash
# Add to package.json and run
npm run test:replit:modes https://your-app.your-username.repl.co
```

## 📊 What You Get

### Performance Summary Table
```
┌─────────────┬─────────────┬──────────────┬─────────────────┬─────────────┐
│ Mode        │ Status      │ Duration     │ Response Length │ Cached      │
├─────────────┼─────────────┼──────────────┼─────────────────┼─────────────┤
│ fast        │ ✅ Success   │ 9ms          │ 115 chars       │ No          │
│ balanced    │ ✅ Success   │ 8ms          │ 817 chars       │ No          │
│ quality     │ ✅ Success   │ 8ms          │ 3628 chars      │ No          │
└─────────────┴─────────────┴──────────────┴─────────────────┴─────────────┘
```

### Full Response Display
- **Fast Mode**: Concise, data-focused responses
- **Balanced Mode**: Conversational, strategic explanations
- **Quality Mode**: Comprehensive analytical reports with detailed frameworks

### Response Analysis
- Word count comparisons
- Markdown usage detection
- Response style analysis
- Performance rankings

## 🎯 Example Queries

### Pokemon Analysis
```bash
node test-replit-modes.js https://your-repl.co "Tell me about Pikachu"
node test-replit-modes.js https://your-repl.co "What are Charizard's strengths?"
node test-replit-modes.js https://your-repl.co "Show me Bulbasaur's competitive stats"
```

### Strategic Questions
```bash
node test-replit-modes.js https://your-repl.co "What makes Charizard good for competitive play?"
node test-replit-modes.js https://your-repl.co "Tell me about Fire type advantages"
node test-replit-modes.js https://your-repl.co "How do I build a team around Pikachu?"
```

## 📈 Understanding the Results

### Response Length Patterns
- **Fast**: ~100-200 characters (bullet point summaries)
- **Balanced**: ~500-1000 characters (conversational explanations)
- **Quality**: ~2000-5000 characters (comprehensive analysis)

### Performance Mode Characteristics

#### 🏃 Fast Mode
- Concise bullet points
- Key stats and facts
- Minimal formatting
- Optimized for speed

#### ⚖️ Balanced Mode
- Natural conversation style
- Strategic context
- Moderate detail
- Good balance of depth and readability

#### 🎓 Quality Mode
- Comprehensive analysis
- Academic-style formatting
- Multiple sections with headers
- Deep strategic insights
- Advanced terminology

## 🔧 Advanced Usage

### Custom Test Scenarios

```javascript
const ReplitModeTestSuite = require('./test-replit-modes');

const tester = new ReplitModeTestSuite('https://your-repl.co');

// Test specific mode
const result = await tester.testMode('quality', 'Your custom query');

// Test all modes
const results = await tester.testAllModes('Your custom query');

// Run comprehensive test
await tester.runComprehensiveTest('Your custom query');
```

### Batch Testing

```bash
# Test multiple queries
for query in "Tell me about Pikachu" "What about Charizard?" "Show me Bulbasaur"; do
  echo "Testing: $query"
  node test-replit-modes.js https://your-repl.co "$query"
  echo "---"
done
```

## 🛠️ Requirements

- Node.js 14+
- axios package (included in project dependencies)
- Active Replit deployment

## 💡 Tips

1. **First Run**: May be slower due to cold start
2. **Caching**: Subsequent identical queries will be cached
3. **Different URLs**: Each performance mode can be tested independently
4. **Error Handling**: The suite handles network errors and provides detailed error information

## 🚨 Troubleshooting

### Common Issues

**Connection Refused**
```
curl: (7) Failed to connect to localhost port 3000
```
- Ensure your Replit is running and publicly accessible
- Check the URL format (include https://)

**Timeout Errors**
- Increase timeout in the script (default: 30 seconds)
- Check Replit resource limits

**Invalid JSON Response**
- Verify your Replit is serving the correct API endpoints
- Check server logs for errors

### URL Formats

✅ **Correct**:
- `https://your-app.your-username.repl.co`
- `https://12345678-1234-5678-abcd-123456789abc.repl.co`

❌ **Incorrect**:
- `http://your-app.your-username.repl.co` (missing https)
- `your-app.your-username.repl.co` (missing protocol)
- `https://your-app.your-username.repl.co/` (trailing slash is auto-removed)

---

🎉 **Happy Testing!** This suite will show you exactly how your AI agent performs across all modes with real Replit deployment conditions.
