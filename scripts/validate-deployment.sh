#!/bin/bash

##############################################################################
# Deployment Validation Script
#
# Pre-deployment checks to ensure system is ready for deployment.
# Run this script before deploying to any environment.
#
# Usage: ./scripts/validate-deployment.sh [environment]
#   environment: development|staging|production (default: development)
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-development}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUIRED_NODE_VERSION="18"
REQUIRED_NPM_VERSION="9"

# Validation results
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

##############################################################################
# Helper Functions
##############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  ((VALIDATION_WARNINGS++))
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((VALIDATION_ERRORS++))
}

check_command() {
  if command -v "$1" &> /dev/null; then
    log_success "$1 is installed"
    return 0
  else
    log_error "$1 is not installed"
    return 1
  fi
}

##############################################################################
# Validation Checks
##############################################################################

log_info "Starting deployment validation for environment: $ENVIRONMENT"
log_info "Project root: $PROJECT_ROOT"
echo ""

# Check 1: Node.js version
log_info "Checking Node.js version..."
if check_command node; then
  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
    log_success "Node.js version $NODE_VERSION is compatible (>= $REQUIRED_NODE_VERSION)"
  else
    log_error "Node.js version $NODE_VERSION is too old (required >= $REQUIRED_NODE_VERSION)"
  fi
else
  log_error "Node.js is not installed"
fi
echo ""

# Check 2: npm version
log_info "Checking npm version..."
if check_command npm; then
  NPM_VERSION=$(npm --version | cut -d'.' -f1)
  if [ "$NPM_VERSION" -ge "$REQUIRED_NPM_VERSION" ]; then
    log_success "npm version $NPM_VERSION is compatible (>= $REQUIRED_NPM_VERSION)"
  else
    log_warning "npm version $NPM_VERSION is older than recommended ($REQUIRED_NPM_VERSION)"
  fi
fi
echo ""

# Check 3: Docker availability
log_info "Checking Docker..."
if check_command docker; then
  if docker info &> /dev/null; then
    log_success "Docker daemon is running"
  else
    log_warning "Docker is installed but daemon is not running"
  fi
else
  log_error "Docker is not installed"
fi
echo ""

# Check 4: Required files
log_info "Checking required files..."
REQUIRED_FILES=(
  "package.json"
  "app.js"
  "Dockerfile"
  ".env.example"
  ".github/workflows/ci.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    log_success "Found $file"
  else
    log_error "Missing required file: $file"
  fi
done
echo ""

# Check 5: Environment configuration
log_info "Checking environment configuration..."

# Check .env.example completeness
if [ -f "$PROJECT_ROOT/.env.example" ]; then
  log_success ".env.example exists"

  # Check for required ZeroDB variables
  REQUIRED_ENV_VARS=(
    "ZERODB_API_KEY"
    "ZERODB_BASE_URL"
    "ZERODB_PROJECT_ID"
    "NODE_ENV"
    "PORT"
    "JWT_SECRET"
  )

  for var in "${REQUIRED_ENV_VARS[@]}"; do
    if grep -q "^$var=" "$PROJECT_ROOT/.env.example" || grep -q "^# $var=" "$PROJECT_ROOT/.env.example"; then
      log_success "Environment variable $var is documented"
    else
      log_warning "Environment variable $var is not in .env.example"
    fi
  done
else
  log_error ".env.example file is missing"
fi

# Check for .env file (required for local development)
if [ "$ENVIRONMENT" = "development" ]; then
  if [ -f "$PROJECT_ROOT/.env" ]; then
    log_success ".env file exists for local development"
  else
    log_warning ".env file not found (copy from .env.example for local development)"
  fi
fi
echo ""

# Check 6: Dependencies
log_info "Checking dependencies..."
if [ -d "$PROJECT_ROOT/node_modules" ]; then
  log_success "node_modules directory exists"

  # Check if package-lock.json matches package.json
  if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
    log_success "package-lock.json exists"
  else
    log_warning "package-lock.json is missing (run npm install)"
  fi
else
  log_error "node_modules directory is missing (run npm install)"
fi
echo ""

# Check 7: Test suite
log_info "Checking test suite..."
if [ -d "$PROJECT_ROOT/tests" ]; then
  log_success "tests directory exists"

  # Count test files
  TEST_COUNT=$(find "$PROJECT_ROOT/tests" -name "*.test.js" | wc -l)
  if [ "$TEST_COUNT" -gt 0 ]; then
    log_success "Found $TEST_COUNT test files"
  else
    log_warning "No test files found"
  fi
else
  log_error "tests directory is missing"
fi
echo ""

# Check 8: Docker configuration
log_info "Checking Docker configuration..."

if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
  log_success "Dockerfile exists"

  # Check Dockerfile best practices
  if grep -q "FROM node:" "$PROJECT_ROOT/Dockerfile"; then
    log_success "Dockerfile uses Node.js base image"
  else
    log_error "Dockerfile does not use Node.js base image"
  fi

  if grep -q "USER " "$PROJECT_ROOT/Dockerfile" && ! grep -q "USER root" "$PROJECT_ROOT/Dockerfile"; then
    log_success "Dockerfile runs as non-root user"
  else
    log_warning "Dockerfile should run as non-root user for security"
  fi

  if grep -q "npm cache clean" "$PROJECT_ROOT/Dockerfile" || grep -q "--no-cache" "$PROJECT_ROOT/Dockerfile"; then
    log_success "Dockerfile cleans npm cache"
  else
    log_warning "Dockerfile should clean npm cache to reduce image size"
  fi
else
  log_error "Dockerfile is missing"
fi

if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
  log_success "docker-compose.yml exists"
else
  log_warning "docker-compose.yml is missing (optional for production)"
fi
echo ""

# Check 9: CI/CD configuration
log_info "Checking CI/CD configuration..."

if [ -f "$PROJECT_ROOT/.github/workflows/ci.yml" ]; then
  log_success "GitHub Actions CI workflow exists"

  # Check workflow includes tests
  if grep -q "test" "$PROJECT_ROOT/.github/workflows/ci.yml"; then
    log_success "CI workflow includes tests"
  else
    log_warning "CI workflow should include test execution"
  fi

  # Check workflow builds Docker image
  if grep -q "docker build" "$PROJECT_ROOT/.github/workflows/ci.yml"; then
    log_success "CI workflow builds Docker image"
  else
    log_warning "CI workflow should build Docker image"
  fi
else
  log_error "GitHub Actions CI workflow is missing"
fi
echo ""

# Check 10: ZeroDB configuration
log_info "Checking ZeroDB configuration..."

# Check for ZeroDB initialization script
if [ -f "$PROJECT_ROOT/scripts/initZeroDB.js" ]; then
  log_success "ZeroDB initialization script exists"
else
  log_warning "ZeroDB initialization script is missing"
fi

# Check for ZeroDB service
if [ -f "$PROJECT_ROOT/services/zerodbService.js" ]; then
  log_success "ZeroDB service exists"
else
  log_error "ZeroDB service is missing"
fi

# Check app.js for ZeroDB integration
if [ -f "$PROJECT_ROOT/app.js" ]; then
  if grep -q "zerodbService" "$PROJECT_ROOT/app.js" || grep -q "ZERODB" "$PROJECT_ROOT/app.js"; then
    log_success "app.js includes ZeroDB integration"
  else
    log_warning "app.js should integrate with ZeroDB"
  fi
fi
echo ""

# Check 11: Security checks
log_info "Checking security configuration..."

# Check for .gitignore
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
  log_success ".gitignore exists"

  # Check .gitignore includes sensitive files
  SENSITIVE_FILES=(".env" "node_modules" "*.log")
  for pattern in "${SENSITIVE_FILES[@]}"; do
    if grep -q "$pattern" "$PROJECT_ROOT/.gitignore"; then
      log_success ".gitignore includes $pattern"
    else
      log_warning ".gitignore should include $pattern"
    fi
  done
else
  log_error ".gitignore is missing"
fi

# Check for hardcoded secrets (basic check)
if [ -f "$PROJECT_ROOT/.env.example" ]; then
  if grep -E "(password|secret|key).*=.*[a-zA-Z0-9]{20,}" "$PROJECT_ROOT/.env.example" | grep -v "your_" | grep -v "example"; then
    log_warning ".env.example may contain real secrets (should use placeholders)"
  else
    log_success ".env.example uses placeholder values"
  fi
fi
echo ""

# Check 12: Database monitoring
log_info "Checking database monitoring..."

if [ -f "$PROJECT_ROOT/middleware/databaseMonitor.js" ]; then
  log_success "Database monitoring middleware exists"
else
  log_warning "Database monitoring middleware is recommended"
fi

if [ -f "$PROJECT_ROOT/utils/metricsCollector.js" ]; then
  log_success "Metrics collector utility exists"
else
  log_warning "Metrics collector is recommended for production"
fi
echo ""

# Check 13: Deployment scripts
log_info "Checking deployment scripts..."

DEPLOYMENT_SCRIPTS=(
  "scripts/initZeroDB.js"
  "scripts/createZeroDBTables.js"
  "scripts/validate-deployment.sh"
  "scripts/test-docker-setup.sh"
)

for script in "${DEPLOYMENT_SCRIPTS[@]}"; do
  if [ -f "$PROJECT_ROOT/$script" ]; then
    log_success "Found $script"
  else
    log_warning "Missing deployment script: $script"
  fi
done
echo ""

# Check 14: Environment-specific checks
log_info "Running environment-specific checks for: $ENVIRONMENT"

case "$ENVIRONMENT" in
  development)
    log_info "Development environment checks..."
    if [ -f "$PROJECT_ROOT/.env" ]; then
      log_success ".env file exists for local development"
    else
      log_warning "Create .env file from .env.example for local development"
    fi
    ;;

  staging|production)
    log_info "Production environment checks..."

    # Production should have stricter requirements
    if [ -f "$PROJECT_ROOT/Dockerfile.prod" ]; then
      log_success "Production Dockerfile exists"
    else
      log_warning "Consider creating Dockerfile.prod for production optimizations"
    fi

    # Check for health check endpoints
    if [ -f "$PROJECT_ROOT/app.js" ]; then
      if grep -q "/health" "$PROJECT_ROOT/app.js"; then
        log_success "Health check endpoint exists"
      else
        log_error "Health check endpoint is required for production"
      fi
    fi

    # Production should not use MongoDB (ZeroDB only)
    log_info "Verifying ZeroDB-only deployment..."
    if grep -q "connectToMongoDB" "$PROJECT_ROOT/app.js"; then
      if grep -q "ENABLE_SYNC" "$PROJECT_ROOT/.env.example"; then
        log_success "MongoDB connection is conditional (sync only)"
      else
        log_warning "MongoDB connection should be optional for ZeroDB-only deployment"
      fi
    fi
    ;;

  *)
    log_warning "Unknown environment: $ENVIRONMENT"
    ;;
esac
echo ""

##############################################################################
# Summary
##############################################################################

echo "======================================================================"
echo "                    VALIDATION SUMMARY"
echo "======================================================================"
echo ""

if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
  log_success "All validation checks passed! Ready for deployment."
  echo ""
  exit 0
elif [ $VALIDATION_ERRORS -eq 0 ]; then
  log_warning "Validation completed with $VALIDATION_WARNINGS warning(s)."
  log_warning "Deployment is possible but consider addressing warnings."
  echo ""
  exit 0
else
  log_error "Validation failed with $VALIDATION_ERRORS error(s) and $VALIDATION_WARNINGS warning(s)."
  log_error "Please fix the errors before deploying."
  echo ""
  exit 1
fi
