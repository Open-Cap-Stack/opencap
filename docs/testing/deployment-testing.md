# Deployment Testing Guide

## Overview

This guide covers the comprehensive deployment testing strategy for OpenCap Stack, with a focus on Docker deployment and ZeroDB-only configuration (Issue #33).

## Table of Contents

1. [Test Categories](#test-categories)
2. [Running Tests](#running-tests)
3. [Pre-Deployment Validation](#pre-deployment-validation)
4. [Docker Testing](#docker-testing)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)
7. [CI/CD Integration](#cicd-integration)

## Test Categories

### 1. Docker Deployment Tests (`tests/deployment/docker.test.js`)

Validates Docker configuration and container behavior:

- **Dockerfile Validation**: Checks Dockerfile syntax, security, and best practices
- **Image Build Tests**: Ensures images build successfully and are optimized
- **Container Startup Tests**: Validates containers start correctly without MongoDB
- **Health Check Tests**: Verifies health endpoints respond correctly
- **Volume Mount Tests**: Ensures data persistence works
- **Networking Tests**: Validates port exposure and connectivity
- **Security Tests**: Checks for security best practices (non-root user, no secrets)
- **Resource Management**: Tests memory and CPU limits

**Key Features:**
- No MongoDB dependency requirement
- ZeroDB-only deployment support
- Automated cleanup after tests
- Comprehensive error reporting

### 2. Environment Configuration Tests (`tests/deployment/environment.test.js`)

Validates environment variable configuration:

- **.env.example Completeness**: Ensures all required variables are documented
- **Variable Validation**: Checks format and values of environment variables
- **Missing Variable Handling**: Tests graceful degradation
- **Configuration Precedence**: Validates priority (CLI > ENV > .env > defaults)
- **ZeroDB Configuration**: Ensures proper ZeroDB setup
- **Security Checks**: Prevents real secrets in .env.example

**Required Environment Variables:**
```bash
NODE_ENV=production|development|test
PORT=3001
JWT_SECRET=<secure-secret-min-32-chars>
ZERODB_API_KEY=<your-zerodb-api-key>
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
ZERODB_PROJECT_ID=<your-project-id>
```

### 3. CI/CD Pipeline Tests (`tests/deployment/ci-cd.test.js`)

Validates GitHub Actions workflows and deployment automation:

- **Workflow Validation**: Checks YAML syntax and structure
- **Build Pipeline**: Ensures tests run before deployment
- **Deployment Pipeline**: Validates deployment only on main branch
- **Security**: Checks for secrets usage and pinned action versions
- **Rollback Support**: Validates version tagging for rollback capability
- **Zero-Downtime**: Checks for graceful shutdown handlers

### 4. Integration Tests (`tests/deployment/integration.test.js`)

End-to-end tests for ZeroDB-only deployment:

- **Application Startup**: Validates startup without MongoDB
- **Health Endpoints**: Tests all health check endpoints
- **API Availability**: Ensures APIs are accessible
- **Graceful Shutdown**: Tests SIGTERM and SIGINT handling
- **Migration Support**: Validates transitional configurations
- **Performance**: Checks response times and concurrency

### 5. Smoke Tests (`tests/deployment/smoke.test.js`)

Quick validation after deployment:

- **Critical Health Checks**: Verifies application is responding
- **Database Connectivity**: Checks ZeroDB connection
- **API Availability**: Validates key endpoints
- **Performance**: Ensures acceptable response times
- **Security Headers**: Checks security configuration
- **Zero-Downtime**: Maintains uptime during verification

## Running Tests

### Run All Deployment Tests

```bash
# Run all deployment tests
npm test -- tests/deployment/

# Run with coverage
npm run test:coverage -- tests/deployment/
```

### Run Individual Test Suites

```bash
# Docker tests (requires Docker to be running)
npm test -- tests/deployment/docker.test.js

# Environment tests
npm test -- tests/deployment/environment.test.js

# CI/CD tests
npm test -- tests/deployment/ci-cd.test.js

# Integration tests
npm test -- tests/deployment/integration.test.js

# Smoke tests (requires running server)
npm test -- tests/deployment/smoke.test.js
```

### Run Tests in Watch Mode

```bash
npm run test:watch -- tests/deployment/
```

## Pre-Deployment Validation

Before deploying, run the validation script:

```bash
./scripts/validate-deployment.sh [environment]
```

**Environments:**
- `development` - Local development checks
- `staging` - Pre-production validation
- `production` - Full production readiness

**What it checks:**
- Node.js and npm versions
- Docker availability
- Required files presence
- Environment configuration
- Dependencies installation
- Test suite completeness
- Docker configuration
- CI/CD setup
- ZeroDB configuration
- Security settings

**Example output:**
```
[INFO] Starting deployment validation for environment: production
[PASS] Node.js version 20 is compatible (>= 18)
[PASS] Docker daemon is running
[PASS] ZeroDB initialization script exists
[WARN] Consider creating Dockerfile.prod for production optimizations

======================================================================
                    VALIDATION SUMMARY
======================================================================

All validation checks passed! Ready for deployment.
```

## Docker Testing

### Test Docker Setup

Run comprehensive Docker validation:

```bash
./scripts/test-docker-setup.sh [options]
```

**Options:**
- `--skip-build` - Skip image build (use existing image)
- `--cleanup` - Remove test containers and images after testing
- `--port PORT` - Use custom port (default: 3055)

**Example:**
```bash
# Full Docker test with cleanup
./scripts/test-docker-setup.sh --cleanup

# Quick test with existing image
./scripts/test-docker-setup.sh --skip-build --port 3100
```

**What it tests:**
1. Docker availability
2. Dockerfile validation
3. Image build success
4. Image size optimization
5. Container startup
6. Container health
7. Network connectivity
8. Health endpoint response
9. ZeroDB health endpoint
10. Resource usage
11. Container logs
12. Graceful shutdown
13. Restart capability
14. Volume persistence
15. Production Dockerfile

### Manual Docker Testing

```bash
# Build image
docker build -t opencap:test .

# Run with ZeroDB configuration
docker run -d \
  --name opencap-test \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e ZERODB_API_KEY=your_key \
  -e ZERODB_BASE_URL=https://api.ainative.studio/api/v1 \
  -e ZERODB_PROJECT_ID=your_project \
  -e ENABLE_SYNC=false \
  opencap:test

# Check health
curl http://localhost:3001/health

# Check ZeroDB health
curl http://localhost:3001/health/zerodb

# View logs
docker logs opencap-test

# Stop container
docker stop opencap-test

# Remove container
docker rm opencap-test
```

## Post-Deployment Verification

### Automated Smoke Tests

Run smoke tests against deployed environment:

```bash
# Set deployment URL
export SMOKE_TEST_URL=https://your-deployment-url.com

# Run smoke tests
npm test -- tests/deployment/smoke.test.js
```

### Manual Verification Checklist

After deployment, verify:

- [ ] Health endpoint responds: `GET /health`
- [ ] ZeroDB health responds: `GET /health/zerodb`
- [ ] API documentation accessible: `GET /api-docs`
- [ ] No 500 errors in logs
- [ ] Response times < 1 second
- [ ] Security headers present
- [ ] No sensitive information exposed
- [ ] Graceful shutdown works (if applicable)
- [ ] Metrics being collected
- [ ] No memory leaks (monitor over time)

### Health Check Examples

```bash
# Basic health check
curl -i https://your-app.com/health

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"status":"ok","message":"Server is running"}

# ZeroDB health check
curl -i https://your-app.com/health/zerodb

# Expected response (if configured):
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"status":"ok","projectId":"your_project","zerodb":{...}}

# Sync health check (if enabled)
curl -i https://your-app.com/health/sync

# Expected response:
# HTTP/1.1 200 OK or 503 Service Unavailable
# Content-Type: application/json
# {"status":"ok","sync":{...}}
```

## Troubleshooting

### Docker Build Failures

**Problem:** Docker build fails with "no space left on device"

**Solution:**
```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Check disk space
df -h
```

**Problem:** Docker build fails to copy files

**Solution:**
- Check `.dockerignore` file
- Ensure files exist in project
- Verify file permissions

### Container Startup Failures

**Problem:** Container exits immediately

**Solution:**
```bash
# Check logs
docker logs container-name

# Common issues:
# - Missing required environment variables
# - Port already in use
# - Insufficient permissions
```

**Problem:** Health check returns 503

**Solution:**
- Check ZeroDB configuration
- Verify API keys are correct
- Check network connectivity
- Review application logs

### Test Failures

**Problem:** Docker tests fail with "Docker daemon not running"

**Solution:**
```bash
# Start Docker Desktop (macOS/Windows)
# or
sudo systemctl start docker  # Linux
```

**Problem:** Integration tests timeout

**Solution:**
- Increase test timeout
- Check if port is already in use
- Verify application starts correctly
- Check for resource constraints

**Problem:** Environment tests fail

**Solution:**
- Ensure `.env.example` is up to date
- Add missing environment variables
- Check variable format/validation

### Deployment Issues

**Problem:** Application won't start in production

**Solution:**
1. Check environment variables are set
2. Verify ZeroDB credentials
3. Check logs for errors
4. Ensure port is not in use
5. Verify network connectivity

**Problem:** High response times

**Solution:**
- Check database connection pool
- Monitor resource usage
- Review application logs
- Check network latency
- Enable performance profiling

**Problem:** Memory leaks

**Solution:**
- Use smoke tests to detect
- Monitor heap usage over time
- Check for unclosed connections
- Review event listeners
- Profile with Node.js inspector

## CI/CD Integration

### GitHub Actions Workflow

The CI/CD pipeline automatically runs deployment tests:

```yaml
# .github/workflows/ci.yml

- name: Run deployment tests
  run: npm test -- tests/deployment/

- name: Validate deployment configuration
  run: ./scripts/validate-deployment.sh production

- name: Build and test Docker image
  run: |
    docker build -t opencap:${{ github.sha }} .
    ./scripts/test-docker-setup.sh --cleanup
```

### Pre-Deployment Checks

Add to your CI/CD pipeline:

```yaml
- name: Pre-deployment validation
  run: |
    ./scripts/validate-deployment.sh $ENVIRONMENT
    if [ $? -ne 0 ]; then
      echo "Deployment validation failed"
      exit 1
    fi
```

### Post-Deployment Verification

Add smoke tests to deployment:

```yaml
- name: Deploy to production
  run: ./deploy.sh production

- name: Run smoke tests
  env:
    SMOKE_TEST_URL: ${{ secrets.PRODUCTION_URL }}
  run: |
    sleep 30  # Wait for deployment
    npm test -- tests/deployment/smoke.test.js
```

## Best Practices

### Before Deployment

1. **Run all tests locally:**
   ```bash
   npm test
   npm run test:coverage
   ```

2. **Validate configuration:**
   ```bash
   ./scripts/validate-deployment.sh production
   ```

3. **Test Docker setup:**
   ```bash
   ./scripts/test-docker-setup.sh --cleanup
   ```

4. **Review changes:**
   - Check git diff
   - Review environment variables
   - Verify Docker configuration

### During Deployment

1. **Monitor logs** for errors
2. **Check health endpoints** immediately
3. **Run smoke tests** after deployment
4. **Monitor metrics** (CPU, memory, requests)
5. **Have rollback plan** ready

### After Deployment

1. **Run full smoke test suite**
2. **Monitor for 1-2 hours**
3. **Check error rates**
4. **Verify performance metrics**
5. **Review logs** for warnings
6. **Document any issues**

## Zero-Downtime Deployment

### Requirements

- Load balancer
- Health check endpoints
- Graceful shutdown handling
- Rolling update strategy

### Verification

The deployment tests verify:
- Graceful shutdown on SIGTERM/SIGINT
- Health checks respond correctly
- No dropped connections
- Quick startup time

### Example Kubernetes Rolling Update

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opencap
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
      - name: opencap
        image: opencap:latest
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 15
          periodSeconds: 20
```

## Test Coverage Goals

Target coverage for deployment tests:

- **Overall**: 85%+
- **Docker tests**: 90%+
- **Environment tests**: 95%+
- **Integration tests**: 85%+
- **Smoke tests**: 100% (all critical paths)

Check coverage:
```bash
npm run test:coverage -- tests/deployment/
```

## Continuous Improvement

### Adding New Tests

1. Identify deployment risks
2. Write test first (TDD)
3. Ensure test is deterministic
4. Add to appropriate test suite
5. Update documentation

### Monitoring Test Health

- Review test failures regularly
- Update tests when features change
- Remove obsolete tests
- Keep tests fast and reliable
- Monitor test execution time

## Support

For issues or questions:

1. Check [troubleshooting section](#troubleshooting)
2. Review test output and logs
3. Check GitHub Issues (especially Issue #33)
4. Consult team documentation
5. Contact DevOps team

## Related Documentation

- [Docker Setup Guide](../deployment/docker-setup.md)
- [Environment Configuration](../deployment/environment-config.md)
- [ZeroDB Integration](../database/zerodb-integration.md)
- [CI/CD Pipeline](../deployment/cicd-pipeline.md)
- [Monitoring Guide](../operations/monitoring.md)
