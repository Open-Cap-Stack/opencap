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

  // OAuth configuration validation (Issue #381)
  // If GOOGLE_CLIENT_ID is set, validate it's properly configured
  if (process.env.GOOGLE_CLIENT_ID) {
    // Ensure it's not a placeholder value
    if (process.env.GOOGLE_CLIENT_ID === 'your-google-client-id' ||
        process.env.GOOGLE_CLIENT_ID === 'placeholder' ||
        process.env.GOOGLE_CLIENT_ID.length < 20) {
      const msg = 'GOOGLE_CLIENT_ID appears to be a placeholder or invalid';
      if (isProd) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    // Validate it has the correct format (ends with .apps.googleusercontent.com)
    if (!process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
      const msg = 'GOOGLE_CLIENT_ID does not have the expected Google OAuth format';
      if (isProd) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  // If OAuth is enabled in production, require proper configuration
  if (isProd && process.env.ENABLE_OAUTH === 'true') {
    if (!process.env.GOOGLE_CLIENT_ID) {
      errors.push('GOOGLE_CLIENT_ID is required when OAuth is enabled in production');
    }
    if (!process.env.FRONTEND_URL) {
      errors.push('FRONTEND_URL is required when OAuth is enabled in production');
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
