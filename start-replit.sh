#!/bin/bash

# Replit startup script for TensorFlow.js Agent Service
echo "🚀 Starting TensorFlow.js Agent Service on Replit..."

# Initialize Node.js environment (for nvm users)
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    echo "🔧 Loading Node.js environment..."
    source "$HOME/.nvm/nvm.sh"
    nvm use node
fi

# Add common Node.js paths to PATH
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"
export PATH="/usr/local/bin:$PATH"

# Verify node and npm are available
if ! command -v node > /dev/null 2>&1; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command -v npm > /dev/null 2>&1; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js $(node --version) and npm $(npm --version) ready"

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
