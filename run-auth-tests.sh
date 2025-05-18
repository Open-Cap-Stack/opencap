#!/bin/bash

# OCDI-303: Fix User Authentication Test Failures
# This script runs all auth-related tests and reports on coverage
# Following OpenCap TDD principles and Semantic Seed standards

echo "Running Auth Tests for OpenCap (OCDI-303)"
echo "========================================"
echo

# Set the test environment variables
export NODE_ENV=test

# Ensure MongoDB connection is set correctly for Docker environment
export MONGODB_URI=mongodb://opencap:password123@mongodb:27017/opencap?authSource=admin
export MONGODB_VERSION=7.0.3

# Set higher timeout to prevent timeouts in container environment
TEST_TIMEOUT=120000

# Run the individual test suites with updated parameters for Docker environment
echo "Running registration tests..."
npx jest auth/registration.test.js --testTimeout=$TEST_TIMEOUT --detectOpenHandles --forceExit --runInBand --coverage

echo "Running login tests..."
npx jest auth/login.test.js --testTimeout=$TEST_TIMEOUT --detectOpenHandles --forceExit --runInBand --coverage

echo "Running combined auth tests..."
npx jest "auth\/.*\.test\.js" --testTimeout=$TEST_TIMEOUT --detectOpenHandles --forceExit --runInBand --coverage

echo "Running controller unit tests..."
npx jest __tests__/controllers/authController.test.js --testTimeout=$TEST_TIMEOUT --detectOpenHandles --forceExit --runInBand --coverage

echo
echo "Test run complete!"
echo "=============================="
echo "Review coverage reports above to identify areas needing improvement."
echo "Remember: OpenCap requires these minimum coverage thresholds:"
echo "- Controllers: 85% statements, 75% branches, 85% lines, 85% functions"
echo "- Models: 90% statements, 80% branches, 90% lines, 90% functions"
echo "=============================="
