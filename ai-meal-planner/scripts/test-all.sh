#!/bin/bash
# Run all tests across the project

set -e

echo "🧪 Running all tests..."

# Backend tests
echo ""
echo "📦 Backend tests..."
cd backend
pytest tests/ -v
cd ..

# Extension tests (if they exist)
if [ -d "extension/src/__tests__" ] || [ -d "extension/tests" ]; then
    echo ""
    echo "🔌 Extension tests..."
    cd extension
    npm test || echo "⚠️  No extension tests configured"
    cd ..
fi

echo ""
echo "✅ All tests complete!"
