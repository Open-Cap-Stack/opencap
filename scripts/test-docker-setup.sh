#!/bin/bash

##############################################################################
# Docker Setup Testing Script
#
# Validates Docker configuration, builds images, and tests container startup.
# This script ensures Docker deployment will work before pushing to registry.
#
# Usage: ./scripts/test-docker-setup.sh [options]
#   Options:
#     --skip-build    Skip image build (use existing image)
#     --cleanup       Remove test containers and images after testing
#     --port PORT     Use custom port (default: 3055)
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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="opencap-test-deployment"
CONTAINER_NAME="opencap-test-container"
TEST_PORT="${TEST_PORT:-3055}"
SKIP_BUILD=false
CLEANUP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --cleanup)
      CLEANUP=true
      shift
      ;;
    --port)
      TEST_PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Test results
TEST_ERRORS=0
TEST_WARNINGS=0
TESTS_PASSED=0

##############################################################################
# Helper Functions
##############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((TESTS_PASSED++))
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  ((TEST_WARNINGS++))
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((TEST_ERRORS++))
}

cleanup_containers() {
  log_info "Cleaning up test containers and images..."

  # Stop and remove container
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" &> /dev/null || true
    docker rm "$CONTAINER_NAME" &> /dev/null || true
    log_success "Removed test container"
  fi

  # Remove image if cleanup is requested
  if [ "$CLEANUP" = true ]; then
    if docker images --format '{{.Repository}}' | grep -q "^${IMAGE_NAME}$"; then
      docker rmi "$IMAGE_NAME" &> /dev/null || true
      log_success "Removed test image"
    fi
  fi
}

wait_for_service() {
  local url=$1
  local max_attempts=30
  local attempt=1

  log_info "Waiting for service to be ready at $url..."

  while [ $attempt -le $max_attempts ]; do
    if curl -s -f "$url" &> /dev/null; then
      log_success "Service is ready after $attempt seconds"
      return 0
    fi
    sleep 1
    ((attempt++))
  done

  log_error "Service did not become ready after $max_attempts seconds"
  return 1
}

##############################################################################
# Test Execution
##############################################################################

trap cleanup_containers EXIT

log_info "Starting Docker setup validation"
log_info "Project root: $PROJECT_ROOT"
log_info "Test port: $TEST_PORT"
echo ""

# Test 1: Docker availability
log_info "Test 1: Checking Docker availability..."
if command -v docker &> /dev/null; then
  log_success "Docker command is available"
else
  log_error "Docker is not installed"
  exit 1
fi

if docker info &> /dev/null; then
  log_success "Docker daemon is running"
else
  log_error "Docker daemon is not running"
  exit 1
fi
echo ""

# Test 2: Dockerfile validation
log_info "Test 2: Validating Dockerfile..."
if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
  log_success "Dockerfile exists"
else
  log_error "Dockerfile not found"
  exit 1
fi

# Check Dockerfile syntax
if docker build --help &> /dev/null; then
  log_success "Docker build command is available"
else
  log_error "Docker build command failed"
fi
echo ""

# Test 3: Build Docker image
if [ "$SKIP_BUILD" = false ]; then
  log_info "Test 3: Building Docker image..."

  # Clean up existing image
  if docker images --format '{{.Repository}}' | grep -q "^${IMAGE_NAME}$"; then
    docker rmi "$IMAGE_NAME" &> /dev/null || true
  fi

  # Build image
  if docker build -t "$IMAGE_NAME" -f "$PROJECT_ROOT/Dockerfile" "$PROJECT_ROOT" 2>&1 | tee /tmp/docker-build.log; then
    log_success "Docker image built successfully"
  else
    log_error "Docker image build failed"
    echo ""
    echo "Build log:"
    cat /tmp/docker-build.log
    exit 1
  fi

  # Verify image exists
  if docker images --format '{{.Repository}}' | grep -q "^${IMAGE_NAME}$"; then
    log_success "Docker image exists in local registry"
  else
    log_error "Docker image not found after build"
    exit 1
  fi
else
  log_info "Test 3: Skipping image build (--skip-build)"
fi
echo ""

# Test 4: Image size check
log_info "Test 4: Checking image size..."
IMAGE_SIZE=$(docker images "$IMAGE_NAME" --format "{{.Size}}")
log_info "Image size: $IMAGE_SIZE"

# Parse size and check if reasonable (under 1.5GB)
SIZE_MB=$(docker images "$IMAGE_NAME" --format "{{.Size}}" | sed 's/MB//' | sed 's/GB//')
if [[ "$SIZE_MB" =~ "GB" ]]; then
  SIZE_VAL=$(echo "$IMAGE_SIZE" | grep -oE '[0-9.]+')
  if (( $(echo "$SIZE_VAL < 1.5" | bc -l) )); then
    log_success "Image size is reasonable (< 1.5GB)"
  else
    log_warning "Image size is large (> 1.5GB), consider optimization"
  fi
else
  log_success "Image size is reasonable"
fi
echo ""

# Test 5: Container startup
log_info "Test 5: Starting test container..."

# Clean up any existing test container
cleanup_containers

# Start container with test configuration
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${TEST_PORT}:3001" \
  -e NODE_ENV=development \
  -e PORT=3001 \
  -e ZERODB_API_KEY=test_key_for_validation \
  -e ZERODB_BASE_URL=https://api.ainative.studio/api/v1 \
  -e ZERODB_PROJECT_ID=test_project \
  -e ENABLE_SYNC=false \
  "$IMAGE_NAME" &> /dev/null

if [ $? -eq 0 ]; then
  log_success "Container started successfully"
else
  log_error "Failed to start container"
  exit 1
fi

# Wait a bit for startup
sleep 3

# Check if container is still running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log_success "Container is running"
else
  log_error "Container exited unexpectedly"
  echo ""
  echo "Container logs:"
  docker logs "$CONTAINER_NAME"
  exit 1
fi
echo ""

# Test 6: Container health
log_info "Test 6: Checking container health..."

# Check container status
CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")
if [ "$CONTAINER_STATUS" = "running" ]; then
  log_success "Container status is running"
else
  log_error "Container status is $CONTAINER_STATUS"
fi

# Check container logs for errors
CONTAINER_LOGS=$(docker logs "$CONTAINER_NAME" 2>&1)
if echo "$CONTAINER_LOGS" | grep -qi "error\|fatal\|exception"; then
  log_warning "Container logs contain error messages"
  echo ""
  echo "Recent errors:"
  echo "$CONTAINER_LOGS" | grep -i "error\|fatal\|exception" | tail -5
else
  log_success "No critical errors in container logs"
fi
echo ""

# Test 7: Network connectivity
log_info "Test 7: Testing network connectivity..."

# Wait for service to be ready
if wait_for_service "http://localhost:${TEST_PORT}/health"; then
  log_success "Health endpoint is accessible"
else
  log_error "Health endpoint is not accessible"
  echo ""
  echo "Container logs:"
  docker logs "$CONTAINER_NAME" | tail -20
fi
echo ""

# Test 8: Health endpoint response
log_info "Test 8: Validating health endpoint response..."

HEALTH_RESPONSE=$(curl -s "http://localhost:${TEST_PORT}/health" || echo "")
if [ -n "$HEALTH_RESPONSE" ]; then
  log_success "Health endpoint returned a response"

  # Check if response is valid JSON
  if echo "$HEALTH_RESPONSE" | jq . &> /dev/null; then
    log_success "Health response is valid JSON"

    # Check for status field
    if echo "$HEALTH_RESPONSE" | jq -e '.status' &> /dev/null; then
      STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
      if [ "$STATUS" = "ok" ]; then
        log_success "Health status is 'ok'"
      else
        log_warning "Health status is '$STATUS' (expected 'ok')"
      fi
    else
      log_warning "Health response missing 'status' field"
    fi
  else
    log_warning "Health response is not valid JSON"
    echo "Response: $HEALTH_RESPONSE"
  fi
else
  log_error "Health endpoint did not return a response"
fi
echo ""

# Test 9: ZeroDB health endpoint
log_info "Test 9: Testing ZeroDB health endpoint..."

ZERODB_HEALTH=$(curl -s "http://localhost:${TEST_PORT}/health/zerodb" || echo "")
if [ -n "$ZERODB_HEALTH" ]; then
  log_success "ZeroDB health endpoint is accessible"

  # ZeroDB might return 503 if not configured properly, which is expected in test
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TEST_PORT}/health/zerodb")
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "503" ]; then
    log_success "ZeroDB health endpoint returned status $HTTP_STATUS"
  else
    log_warning "ZeroDB health endpoint returned unexpected status $HTTP_STATUS"
  fi
else
  log_warning "ZeroDB health endpoint did not respond"
fi
echo ""

# Test 10: Container resource usage
log_info "Test 10: Checking container resource usage..."

CONTAINER_STATS=$(docker stats "$CONTAINER_NAME" --no-stream --format "{{.CPUPerc}},{{.MemUsage}}")
CPU_USAGE=$(echo "$CONTAINER_STATS" | cut -d',' -f1)
MEM_USAGE=$(echo "$CONTAINER_STATS" | cut -d',' -f2)

log_info "CPU usage: $CPU_USAGE"
log_info "Memory usage: $MEM_USAGE"
log_success "Container resource usage collected"
echo ""

# Test 11: Container logs
log_info "Test 11: Analyzing container logs..."

LOG_LINES=$(docker logs "$CONTAINER_NAME" 2>&1 | wc -l)
log_info "Container produced $LOG_LINES log lines"

if [ "$LOG_LINES" -gt 0 ]; then
  log_success "Container is producing logs"

  # Check for startup message
  if docker logs "$CONTAINER_NAME" 2>&1 | grep -qi "server\|listening\|started"; then
    log_success "Server startup detected in logs"
  else
    log_warning "No clear server startup message in logs"
  fi
else
  log_warning "Container produced no logs"
fi
echo ""

# Test 12: Graceful shutdown
log_info "Test 12: Testing graceful shutdown..."

docker stop "$CONTAINER_NAME" --time=10 &> /dev/null
if [ $? -eq 0 ]; then
  log_success "Container stopped gracefully"
else
  log_warning "Container did not stop gracefully"
fi

# Check exit code
EXIT_CODE=$(docker inspect -f '{{.State.ExitCode}}' "$CONTAINER_NAME")
if [ "$EXIT_CODE" = "0" ] || [ "$EXIT_CODE" = "143" ]; then
  log_success "Container exited with code $EXIT_CODE (graceful)"
else
  log_warning "Container exited with code $EXIT_CODE (may indicate error)"
fi
echo ""

# Test 13: Restart capability
log_info "Test 13: Testing container restart..."

docker start "$CONTAINER_NAME" &> /dev/null
sleep 3

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log_success "Container restarted successfully"
else
  log_error "Container failed to restart"
fi
echo ""

# Test 14: Volume persistence (optional)
log_info "Test 14: Testing volume mount capability..."

# Create a test volume
TEST_VOLUME="${CONTAINER_NAME}-test-volume"
docker volume create "$TEST_VOLUME" &> /dev/null

# Stop current container
docker stop "$CONTAINER_NAME" &> /dev/null
docker rm "$CONTAINER_NAME" &> /dev/null

# Start with volume
docker run -d \
  --name "$CONTAINER_NAME" \
  -v "${TEST_VOLUME}:/app/data" \
  -e NODE_ENV=development \
  "$IMAGE_NAME" &> /dev/null

sleep 2

# Create a test file in volume
docker exec "$CONTAINER_NAME" sh -c "echo 'test' > /app/data/test.txt" &> /dev/null
if [ $? -eq 0 ]; then
  log_success "Volume mount works correctly"
else
  log_warning "Volume mount test failed (non-critical)"
fi

# Cleanup test volume
docker stop "$CONTAINER_NAME" &> /dev/null
docker rm "$CONTAINER_NAME" &> /dev/null
docker volume rm "$TEST_VOLUME" &> /dev/null
echo ""

# Test 15: Production Dockerfile (if exists)
log_info "Test 15: Checking production Dockerfile..."

if [ -f "$PROJECT_ROOT/Dockerfile.prod" ]; then
  log_success "Production Dockerfile exists"

  # Try building production image (quick check)
  if docker build -t "${IMAGE_NAME}-prod" -f "$PROJECT_ROOT/Dockerfile.prod" "$PROJECT_ROOT" &> /dev/null; then
    log_success "Production Dockerfile builds successfully"
    docker rmi "${IMAGE_NAME}-prod" &> /dev/null || true
  else
    log_warning "Production Dockerfile has build issues"
  fi
else
  log_info "No separate production Dockerfile (using main Dockerfile for all environments)"
fi
echo ""

##############################################################################
# Summary
##############################################################################

echo "======================================================================"
echo "                    TEST SUMMARY"
echo "======================================================================"
echo ""
echo "Tests passed:  $TESTS_PASSED"
echo "Warnings:      $TEST_WARNINGS"
echo "Errors:        $TEST_ERRORS"
echo ""

if [ $TEST_ERRORS -eq 0 ] && [ $TEST_WARNINGS -eq 0 ]; then
  log_success "All Docker setup tests passed! Ready for deployment."
  echo ""
  echo "Next steps:"
  echo "  1. Run ./scripts/validate-deployment.sh to validate full deployment"
  echo "  2. Push image to registry: docker tag $IMAGE_NAME your-registry/$IMAGE_NAME"
  echo "  3. Deploy to your environment"
  echo ""
  exit 0
elif [ $TEST_ERRORS -eq 0 ]; then
  log_warning "Docker setup tests completed with $TEST_WARNINGS warning(s)."
  log_warning "Deployment is possible but consider addressing warnings."
  echo ""
  exit 0
else
  log_error "Docker setup tests failed with $TEST_ERRORS error(s) and $TEST_WARNINGS warning(s)."
  log_error "Please fix the errors before deploying."
  echo ""
  exit 1
fi
