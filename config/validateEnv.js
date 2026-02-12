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
  } else if (process.env.JWT_SECRET.trim() === '') {
    const msg = 'JWT_SECRET is set but empty';
    if (isProd) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  } else {
    // In production, JWT_SECRET must not be the default test value or common placeholders
    const insecureDefaults = [
      'test-secret',
      'your-secret-key',
      'your_jwt_secret_here',
      'your_jwt_secret_here_minimum_32_chars',
      'secret',
      'changeme',
      'password',
    ];
    if (isProd && insecureDefaults.includes(process.env.JWT_SECRET.toLowerCase())) {
      errors.push('JWT_SECRET must be changed from default/placeholder value in production');
    }

    // JWT_SECRET must be at least 32 characters (Issue #379)
    const MIN_JWT_SECRET_LENGTH = 32;
    if (process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
      const msg = `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (current length: ${process.env.JWT_SECRET.length}). Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`;
      if (isProd) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
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

  // Stripe configuration validation
  if (process.env.STRIPE_SECRET_KEY) {
    if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_') && !process.env.STRIPE_SECRET_KEY.startsWith('rk_')) {
      const msg = 'STRIPE_SECRET_KEY does not have the expected Stripe key format (sk_* or rk_*)';
      if (isProd) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  } else {
    warnings.push('STRIPE_SECRET_KEY is not set - Stripe billing features will be disabled');
  }

  if (isProd && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required in production when Stripe is enabled');
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
