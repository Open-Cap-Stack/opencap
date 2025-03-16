# OpenCap Dependency Security Remediation Plan

## Overview
This document outlines the security vulnerabilities identified in the OpenCap project dependencies and provides a step-by-step remediation plan to address them while minimizing disruption to the existing codebase.

## Current Vulnerabilities Summary

Based on npm audit, the following vulnerabilities have been identified:

| Severity | Count | Notable Packages |
|----------|-------|-----------------|
| Critical | 6     | mongoose, minimist, growl, lodash |
| High     | 7     | debug, diff, hoek, minimatch |
| Moderate | 1     | ms |

## Verification Steps

Before making any changes, we'll verify the dependency usage in the codebase following our practice of "always verify existing resources before creating new ones":

1. MongoDB connections using Mongoose v5.13.23
2. Code package using Hoek v6.1.3 and v4.3.1 (through dependencies)
3. Express framework dependency on path-to-regexp

## Remediation Plan

### Phase 1: Safe Updates (No Breaking Changes)

```bash
# Update non-breaking dependencies
npm update axios@latest diff@latest lodash@latest minimatch@latest ms@latest
```

This will address:
- High severity vulnerability in axios
- High severity vulnerability in diff
- Critical vulnerabilities in lodash
- High severity vulnerability in minimatch
- Moderate severity vulnerability in ms

### Phase 2: Test-Dependent Updates

```bash
# Remove vulnerable test dependencies
npm uninstall hest jist
npm install --save-dev jest-expect-message
```

This addresses:
- Critical vulnerability in growl
- High severity vulnerabilities in debug
- Dependencies on vulnerable hoek versions

### Phase 3: Careful Major Version Updates

For mongoose, we need to be cautious as it's a core database connector:

1. Create a compatibility test script to validate database operations
2. Test against a non-production database
3. Update mongoose with specific version constraints:

```bash
npm install mongoose@6.13.8 --save
# Using mongoose v6.13.8 as it's the latest in the v6.x branch
# with security fixes but minimizes breaking changes
```

### Phase 4: Final Audit and Validation

After completing phases 1-3:
1. Run full test suite to verify functionality
2. Perform another npm audit to verify remediation
3. Update documentation with dependency changes

## Breaking Change Considerations

The following changes require careful testing:

1. **Mongoose 5.x → 6.x**:
   - Schema validation is stricter
   - Query middleware behavior changes
   - Connection events might need updates

2. **Express Dependencies**:
   - Updates to path-to-regexp may change route matching behavior

## Implementation Timeline

| Phase | Estimated Time | Impact Level | Rollback Plan |
|-------|---------------|-------------|---------------|
| 1     | 1 hour        | Low         | npm install --package-lock-only |
| 2     | 2 hours       | Medium      | Revert to backed-up package.json |
| 3     | 4 hours       | High        | Maintain parallel installations for testing |
| 4     | 2 hours       | Low         | Document any issues for future fixes |

## Integration with Test Coverage Strategy

Our enhanced test coverage analysis plays a critical role in validating dependency security updates. The following measures are now in place to ensure dependency changes don't compromise application security:

### 1. Test Coverage Thresholds for Security-Critical Paths

We've established the following test coverage thresholds in our Jest configuration:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './controllers/': {
    branches: 75,
    functions: 85,
    lines: 85
  },
  './models/': {
    branches: 80,
    functions: 90,
    lines: 90
  }
}
```

These thresholds ensure that security-critical paths like database access and API endpoints maintain high test coverage, making it harder for dependency updates to introduce undetected vulnerabilities.

### 2. CI/CD Pipeline Integration

Every dependency update triggers a comprehensive test coverage analysis in our CI/CD pipeline:

1. **Automated Testing** - All tests run with updated dependencies
2. **Coverage Report** - A detailed report is generated using `npm run coverage:report`
3. **Threshold Validation** - Build fails if coverage drops below thresholds
4. **Artifact Generation** - Test reports are archived for security audits

### 3. Dependency-Specific Test Cases

For critical dependencies like Mongoose, we've added:

- **Migration Tests** - Verify behavior consistency across versions
- **Edge Case Tests** - Ensure schema validation and connections remain secure
- **Performance Tests** - Validate query performance isn't compromised

## Digital Ocean Deployment Security

The dependency update process integrates with our Digital Ocean deployment strategy:

### 1. Container Security Scanning

Our CI/CD pipeline now includes:

```yaml
- name: Scan Docker image for vulnerabilities
  if: github.ref == 'refs/heads/main'
  run: |
    docker scan opencap/api:${{ github.sha }} --severity high,critical
```

This step ensures that container images don't include vulnerable dependencies before deployment.

### 2. Staged Rollout Process

We follow this secure deployment process for dependency updates:

1. **Staging First** - Deploy to staging environment
2. **Automated Tests** - Run integration tests against staging
3. **Security Validation** - Verify no new vulnerabilities are introduced
4. **Gradual Production Rollout** - Use Kubernetes rolling updates

### 3. Dependency Lockfiles

To ensure reproducible builds and prevent supply chain attacks:

- **package-lock.json** - Committed to repository
- **Integrity Hashes** - Verified during CI builds
- **Dependency Auditing** - Automated in the CI pipeline

## Ongoing Security Monitoring

We've established continuous monitoring for dependency security:

1. **Automated Audits** - Weekly npm audit runs
2. **Dependabot Integration** - Automatic PRs for security updates
3. **Coverage Trend Analysis** - Using Codecov to track security coverage over time
4. **Vulnerability Notifications** - Using GitHub's security advisories feature

## Conclusion

By following this phased approach, we can address the security vulnerabilities while minimizing disruption to the development process. Each phase should be committed separately to ensure easy rollback if problems arise. The integration with our test coverage strategy and Digital Ocean deployment process ensures comprehensive security throughout the application lifecycle.
