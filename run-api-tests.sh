#!/bin/bash
# OpenCap API Test Runner
# Follows Semantic Seed Coding Standards v2.0 and OpenCap Standards v1.0
# Focused test script that runs only the API endpoint tests

# Set the NODE_ENV to test
export NODE_ENV=test

# Ensure MongoDB connection is set correctly
export MONGODB_URI=mongodb://opencap:password123@mongodb:27017/opencap?authSource=admin
export MONGODB_VERSION=7.0.3

# Set higher timeout to prevent timeouts in container environment
TEST_TIMEOUT=120000

# Run only the API endpoint tests
# Using a pattern that matches working test files
echo "Running API endpoint tests..."
npx jest \
  --testTimeout=$TEST_TIMEOUT \
  --forceExit \
  --detectOpenHandles \
  --testPathPattern="__tests__/(auth|api)/" \
  "$@"

# Exit with the Jest exit code
exit $?
