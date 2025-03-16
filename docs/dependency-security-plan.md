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

1. ✅ MongoDB connections using Mongoose v5.13.23
2. ✅ Code package using Hoek v6.1.3 and v4.3.1 (through dependencies)
3. ✅ Express framework dependency on path-to-regexp

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
npm install mongoose@6.12.3 --save
# Using mongoose v6.12.3 as it's the latest in the v6.x branch
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

## Conclusion

By following this phased approach, we can address the security vulnerabilities while minimizing disruption to the development process. Each phase should be committed separately to ensure easy rollback if problems arise.
