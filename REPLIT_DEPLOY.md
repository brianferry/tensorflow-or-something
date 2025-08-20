# 🔄 Replit Deployment Guide

## Quick Deploy to Replit

### Method 1: One-Click Import
1. Click the Replit badge in the main README
2. Replit automatically configures the environment
3. Click "Run" to start the service

### Method 2: Manual Import
1. Go to [Replit](https://replit.com)
2. Click "Create Repl" → "Import from GitHub"
3. Paste your repository URL
4. Replit detects the Node.js project automatically

## Replit Configuration

### Auto-Configuration Files
- `.replit` - Main configuration file
- `replit.nix` - System dependencies
- `.env.replit` - Environment variables template
- `start-replit.sh` - Optimized startup script

### Performance Optimization for Replit

**Recommended Settings:**
```bash
# For better performance on Replit's free tier
PERFORMANCE_MODE=fast        # Uses less CPU
CACHE_TTL=900               # Reduces memory usage
LOG_LEVEL=warn              # Fewer log messages
LOG_TO_FILE=false           # Saves disk space
```

**For Always-On (Paid Plans):**
```bash
PERFORMANCE_MODE=balanced    # Good balance
CACHE_TTL=1800              # Standard caching
LOG_LEVEL=info              # Full logging
```

## Environment Setup

### Using Replit Secrets (Recommended)
1. Go to your Repl
2. Click "Secrets" tab (lock icon)
3. Add these environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `PORT` | `3000` | Server port |
| `PERFORMANCE_MODE` | `balanced` | AI performance level |
| `CACHE_TTL` | `1800` | Cache duration (seconds) |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `NODE_ENV` | `production` | Node environment |

### Testing Your Deployment

**Health Check:**
```bash
# Click the webview URL, then append /health/
https://your-repl-name.your-username.repl.co/health/
```

**API Test:**
```bash
# Test with curl in the Shell tab
curl -X POST https://your-repl-name.your-username.repl.co/run_task/ \
  -H "Content-Type: application/json" \
  -d '{"task": "Tell me about Pikachu"}'
```

## Replit-Specific Features

### Always-On
- Enable for 24/7 availability
- Recommended for production use
- Requires Replit Core subscription

### Multiplayer
- Share your Repl for collaborative development
- Real-time code editing
- Perfect for team development

### Database Integration
- Use Replit Database for persistent storage
- No additional setup required
- Built-in key-value store

## Troubleshooting

### Common Issues

**"Cannot find module 'morgan'" or other dependencies**
```bash
# Solution 1: Force reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Solution 2: Use the install script
npm run replit:install

# Solution 3: Check dependencies
./check-deps.sh
```

**"Port already in use"**
```bash
# Kill existing processes
pkill node
npm start
```

**"Module not found"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**"Out of memory"**
```bash
# Switch to fast mode
export PERFORMANCE_MODE=fast
npm start
```

### Performance Monitoring
```bash
# Check memory usage
node -e "console.log(process.memoryUsage())"

# Monitor logs
tail -f logs/app.log  # if LOG_TO_FILE=true
```

## Advanced Configuration

### Custom Domain (Replit Core)
1. Go to your Repl settings
2. Enable "Custom Domain"
3. Configure your DNS settings
4. SSL is automatically provided

### Auto-Scaling
```javascript
// Add to src/main.js for auto-scaling
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    for (let i = 0; i < Math.min(numCPUs, 2); i++) {
        cluster.fork();
    }
} else {
    // Your existing server code
}
```

## Support

Need help with Replit deployment?
- [Replit Documentation](https://docs.replit.com)
- [Replit Community](https://replit.com/community)
- [GitHub Issues](https://github.com/your-username/tensorflow-agent-service/issues)
