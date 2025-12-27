#!/bin/bash
# Clean build artifacts and caches

set -e

echo "🧹 Cleaning build artifacts..."

# Python
echo "  Removing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name ".coverage" -delete 2>/dev/null || true

# Extension
echo "  Removing extension build..."
rm -rf extension/dist/*

# Node modules (optional - uncomment if needed)
# echo "  Removing node_modules..."
# rm -rf extension/node_modules

echo "✅ Clean complete!"
