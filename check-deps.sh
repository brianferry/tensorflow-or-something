#!/bin/bash

# Dependency check script for Replit debugging
echo "🔍 TensorFlow.js Agent Service - Dependency Check"
echo "=================================================="

# Initialize Node.js environment (for nvm users)
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm use node > /dev/null 2>&1
fi

# Add common Node.js paths to PATH
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"
export PATH="/usr/local/bin:$PATH"

echo "📋 Node.js Version:"
node --version

echo "📋 NPM Version:"
npm --version

echo "📋 Package.json exists:"
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json missing!"
fi

echo "📋 Node modules directory:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    echo "📦 Installed packages:"
    ls node_modules/ | head -10
    echo "... (showing first 10)"
else
    echo "❌ node_modules missing - running npm install..."
    npm install
fi

echo "📋 Critical dependencies:"
critical_deps=("morgan" "@tensorflow/tfjs-node" "express" "cors" "helmet" "axios")

for dep in "${critical_deps[@]}"; do
    if npm list "$dep" > /dev/null 2>&1; then
        echo "✅ $dep - installed"
    else
        echo "❌ $dep - missing"
    fi
done

echo "📋 Environment:"
echo "PORT: ${PORT:-3000}"
echo "PERFORMANCE_MODE: ${PERFORMANCE_MODE:-balanced}"
echo "NODE_ENV: ${NODE_ENV:-development}"

echo "=================================================="
echo "🎯 Ready to start with: npm start"
