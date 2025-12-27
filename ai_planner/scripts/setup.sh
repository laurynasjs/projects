#!/bin/bash
# Setup script for AI Meal Planner development environment

set -e

echo "🚀 Setting up AI Meal Planner development environment..."

# Check Python version
echo "📍 Checking Python version..."
python3 --version

# Install Python dependencies
echo "📦 Installing Python dependencies..."
uv sync

# Install extension dependencies
echo "📦 Installing extension dependencies..."
cd extension
npm install
cd ..

# Build extension
echo "🔨 Building extension..."
cd extension
npm run build
cd ..

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API keys"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your Gemini API key"
echo "2. Run 'make backend-run' to start the backend"
echo "3. Load extension from extension/dist in Chrome"
echo "4. Visit http://localhost:8008"
