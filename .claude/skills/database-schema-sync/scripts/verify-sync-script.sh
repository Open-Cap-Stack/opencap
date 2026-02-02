#!/bin/bash
# Verify schema sync script exists and is properly configured

SCRIPT_PATH="/Users/aideveloper/core/scripts/sync-production-schema.py"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ ERROR: Schema sync script not found at $SCRIPT_PATH"
    exit 1
fi

if [ ! -x "$SCRIPT_PATH" ]; then
    echo "⚠️  WARNING: Schema sync script not executable, attempting to fix..."
    chmod +x "$SCRIPT_PATH"
fi

# Check for required functions
if ! grep -q "def sync_" "$SCRIPT_PATH"; then
    echo "❌ ERROR: Schema sync script missing sync_ functions"
    exit 1
fi

if ! grep -q "table_exists" "$SCRIPT_PATH"; then
    echo "❌ ERROR: Schema sync script missing table_exists helper"
    exit 1
fi

if ! grep -q "column_exists" "$SCRIPT_PATH"; then
    echo "❌ ERROR: Schema sync script missing column_exists helper"
    exit 1
fi

echo "✅ Schema sync script verified and ready"
exit 0
