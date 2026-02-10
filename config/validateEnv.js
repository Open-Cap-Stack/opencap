/**
 * Environment Variable Validation
 * 
 * Validates that critical environment variables are configured correctly
 * at application startup. In production, missing or insecure values will
 * cause the process to throw. In development/test, warnings are logged.
 * 
 * GitHub Issue #355
 */

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const warnings = [];
  const errors = [];

  // JWT_SECRET is always required
  if (!process.env.JWT_SECRET) {
    const msg = 'JWT_SECRET is not set';
    if (isProd) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  // In production, JWT_SECRET must not be the default test value
  if (isProd && process.env.JWT_SECRET === 'test-secret') {
    errors.push('JWT_SECRET must be changed from default value in production');
  }

  // NODE_ENV should be explicitly set
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV is not explicitly set (defaulting to development behavior)');
  }

  // At least one ZeroDB credential must be present
  const hasZeroDBKey = !!process.env.ZERODB_API_KEY;
  const hasAINativeToken = !!process.env.AINATIVE_API_TOKEN;

  if (!hasZeroDBKey && !hasAINativeToken) {
    const msg = 'Neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set';
    if (isProd) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  // Emit warnings for non-production environments
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`WARNING: ${w}`));
  }

  // In production, throw if there are any errors
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n  - ${errors.join('\n  - ')}`
    );
  }

  return { warnings, errors };
}

module.exports = { validateEnvironment };
