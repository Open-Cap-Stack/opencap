# OpenCap Test Coverage Strategy

This document outlines the comprehensive test coverage strategy for the OpenCap project, following the Semantic Seed Venture Studio Coding Standards V2.0 for quality-focused, security-first development.

## 1. Testing Framework

OpenCap uses **Jest** as the primary testing framework with the following key testing layers:

| Test Type | Purpose | Location | Command |
|-----------|---------|----------|---------|
| **Unit Tests** | Test individual components in isolation | `__tests__/**/*.unit.test.js` | `npm run test:unit` |
| **Integration Tests** | Test interaction between components | `__tests__/**/*.integration.test.js` | `npm run test:integration` |
| **API Tests** | Test API endpoints and responses | `__tests__/**/*.test.js` | `npm run test` |

## 2. Coverage Requirements

All code must meet or exceed the following coverage thresholds:

- **Statements**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Branches**: 70%

Critical modules have higher requirements:

- **Models**: 90% (all metrics)
- **Controllers**: 85% (all metrics)

## 3. Coverage Enforcement

Coverage thresholds are enforced through:

1. **Local Development**:
   - Pre-commit hooks verify test coverage meets requirements
   - Run `npm run coverage:check` to verify coverage thresholds locally

2. **CI/CD Pipeline**:
   - GitHub Actions automatically fails builds that don't meet coverage thresholds
   - Coverage reports uploaded as build artifacts for review
   - Codecov integration provides trend analysis and PR feedback

## 4. Coverage Reporting

Coverage reports are generated in multiple formats:

- **HTML**: For human-readable browsing (`coverage/lcov-report/index.html`)
- **LCOV**: For integration with code editors and tools
- **JSON**: For integration with CI/CD and badge generation
- **Markdown**: Summary report generated for documentation (`docs/test-coverage-report.md`)

## 5. Integration with Digital Ocean Deployment

Test coverage is a critical component of our deployment strategy:

1. **Staging Deployment**:
   - Only code meeting coverage thresholds is deployed to staging
   - Deployed after verification of coverage report artifacts

2. **Production Deployment**:
   - Requires manual approval of coverage reports
   - Kong API Gateway exposes health endpoints that include test coverage metrics

3. **Monitoring**:
   - Coverage metrics trend is monitored over time
   - Alerts triggered if coverage drops below thresholds

## 6. Test Data Strategy

| Environment | Database | Strategy |
|-------------|----------|----------|
| **Development** | Local Docker containers | Fresh state for each run |
| **CI/CD** | Containerized MongoDB & PostgreSQL | Mock data generated via fixtures |
| **Staging** | DO Managed Databases | Sanitized production-like data |
| **Production** | DO Managed Databases | Real data with strict access controls |

## 7. BDD Approach & Testing Standards

Following Behavior-Driven Development principles:

```javascript
// Example BDD-style test from the codebase
describe('Financial Report API', () => {
  describe('GET /financial/reports/:id', () => {
    it('should return 200 and the report when a valid ID is provided', async () => {
      // Arrange
      const report = await createTestReport();
      
      // Act
      const response = await request(app)
        .get(`/financial/reports/${report._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('_id', report._id.toString());
    });
  });
});
```

## 8. Test Health Dashboard

A real-time test health dashboard is accessible at:
- Development: http://localhost:3000/test-health
- Staging: https://staging.opencap.example.com/test-health
- Production: https://api.opencap.example.com/test-health

## 9. Responsibilities

| Role | Testing Responsibilities |
|------|--------------------------|
| **Developers** | Write tests with new code, maintain >80% coverage |
| **QA** | Review test coverage reports, identify critical gaps |
| **DevOps** | Ensure test infrastructure runs in CI/CD pipeline |
| **Security Team** | Verify security-critical areas have >90% coverage |

## 10. Implementation Timeline

1. **Phase 1**: ✅ Basic test coverage thresholds implemented
2. **Phase 2**: ✅ Coverage integrated into CI/CD pipeline
3. **Phase 3**: ✅ Codecov integration for trend analysis
4. **Phase 4**: ✅ Coverage artifacts and documentation
5. **Phase 5**: ⬜ Test health dashboard implementation
6. **Phase 6**: ⬜ Coverage-based deployment gates

## 11. Next Steps

1. **Immediate (Sprint 1)**:
   - Increase controller test coverage to meet 85% threshold
   - Implement pre-commit hook for coverage checks
   
2. **Short-term (Sprint 2)**:
   - Develop test health dashboard endpoints
   - Integrate coverage metrics into monitoring
   
3. **Long-term (Sprint 3)**:
   - Implement coverage-based deployment gates
   - Add visual regression testing

## 12. Conclusion

This test coverage strategy ensures that OpenCap maintains high code quality while preventing the introduction of new vulnerabilities. By integrating test coverage analysis into our CI/CD pipeline and Digital Ocean deployment process, we maintain a security-first approach to development.
