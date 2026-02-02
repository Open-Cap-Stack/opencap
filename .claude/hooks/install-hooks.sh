#!/bin/bash
# Install git hooks for file placement and commit message enforcement
# Run from project root: bash .ainative/hooks/install-hooks.sh

set -e

echo "🔧 Installing AINative git hooks..."
echo ""

# Determine which folder we're in (.ainative or .claude)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_SOURCE="$SCRIPT_DIR"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository root"
    echo "   Run this script from your project root directory"
    exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
echo "📝 Installing pre-commit hook..."
cp "$HOOKS_SOURCE/pre-commit" .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "✅ pre-commit hook installed"

# Install commit-msg hook
echo "📝 Installing commit-msg hook..."
cp "$HOOKS_SOURCE/commit-msg" .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
echo "✅ commit-msg hook installed"

echo ""
echo "✅ ✅ ✅ All hooks installed successfully! ✅ ✅ ✅"
echo ""
echo "Enforcement active:"
echo "  ✓ File placement validation (pre-commit)"
echo "  ✓ Third-party attribution blocking (commit-msg)"
echo ""
echo "Test with:"
echo "  touch test.md && git add test.md && git commit -m 'test'"
echo "  (Should be blocked)"
echo ""
