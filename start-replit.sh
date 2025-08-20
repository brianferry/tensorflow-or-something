#!/bin/bash

# Replit startup script for TensorFlow.js Agent Service
echo "🚀 Starting TensorFlow.js Agent Service on Replit..."

# Always install/update dependencies to ensure all packages are available
echo "📥 Installing/updating dependencies..."
npm install

# Check if this is first run
if [ ! -f ".replit_setup_complete" ]; then
    echo "📦 First run detected - setting up environment..."
    
    # Copy Replit environment if .env doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.replit .env
        echo "✅ Environment configured for Replit"
    fi
    
    # Mark setup as complete
    touch .replit_setup_complete
    echo "✅ Setup complete!"
fi

# Set Replit-optimized environment
export PORT=${PORT:-3000}
export PERFORMANCE_MODE=${PERFORMANCE_MODE:-balanced}
export LOG_LEVEL=${LOG_LEVEL:-info}
export NODE_ENV=production

echo "🎯 Performance Mode: $PERFORMANCE_MODE"
echo "🔧 Port: $PORT"

# Verify critical dependencies are installed
echo "🔍 Verifying dependencies..."
if ! npm list morgan > /dev/null 2>&1; then
    echo "⚠️  Morgan missing, installing..."
    npm install morgan
fi

if ! npm list @tensorflow/tfjs-node > /dev/null 2>&1; then
    echo "⚠️  TensorFlow.js Node missing, installing..."
    npm install @tensorflow/tfjs-node
fi

# Start the service
echo "🚀 Starting server..."
npm start
