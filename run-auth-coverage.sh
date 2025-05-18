#!/bin/bash

# OCDI-303: Fix User Authentication Test Failures - Test Coverage Enhancement
# This script follows the OpenCap TDD workflow for fixing test coverage issues

echo "==============================================="
echo "OpenCap Authentication Test Coverage Enhancement"
echo "Feature: OCAE-202: User Registration Endpoint"
echo "Bug Fix: OCDI-303: Fix User Authentication Tests"
echo "==============================================="
echo

# Set NODE_ENV to test
export NODE_ENV=test

# Step 1: Run focused auth tests (Red Test phase)
echo "WIP: Red Tests - Running authentication tests..."
npx jest auth/registration.test.js auth/login.test.js --runInBand

# Step 2: Run comprehensive coverage tests (Green Test phase)
echo 
echo "WIP: Green Tests - Running with full coverage report..."
npx jest "auth\/.*\.test\.js" --coverage --runInBand

# Step 3: Final verification with Jest config thresholds
echo 
echo "READY: Refactor Complete - Final verification with thresholds..."
npx jest --testPathPattern="(__tests__/auth|__tests__/controllers/authController)" --coverage --runInBand

# Display threshold requirements
echo 
echo "=================================================="
echo "OpenCap Coverage Requirements:"
echo "- Controllers: 85% statements, 75% branches, 85% lines, 85% functions"
echo "- Models: 90% statements, 80% branches, 90% lines, 90% functions"
echo "=================================================="

# Note status of test run
echo 
echo "If tests passed with coverage thresholds met:"
echo "git commit -m \"OCDI-303: Fix User Authentication Test Failures\""
echo "Otherwise, continue enhancing test coverage"
