/**
 * API Versioning Middleware
 * 
 * [Chore] OCAE-209: Implement API versioning
 * 
 * This middleware handles API versioning for the OpenCap Stack.
 * It supports both legacy routes (/api/*) and versioned routes (/api/v1/*).
 */

// Currently supported API versions
const SUPPORTED_VERSIONS = ['1'];

/**
 * Middleware to add API version headers to responses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const addVersionHeaders = (req, res, next) => {
  // Set default version for all responses
  res.set('X-API-Version', '1.0');
  
  // Add version to request object for future reference
  req.apiVersion = '1.0';
  
  next();
};

/**
 * Creates versioned routes by mounting the same router at multiple paths
 * @param {Object} app - Express app instance
 * @param {Object} routes - Object containing route handlers
 * @param {Object} routeMappings - Object mapping paths to route handler names
 */
const createVersionedRoutes = (app, routes, routeMappings) => {
  // Create versioned routes for each legacy route
  Object.entries(routeMappings).forEach(([path, routeName]) => {
    // Skip if the route handler doesn't exist
    if (!routes[routeName]) return;
    
    // Only create versioned routes for API paths
    if (path.startsWith('/api/')) {
      // Extract the resource path (e.g., '/api/spvs' -> 'spvs')
      const resourcePath = path.replace('/api/', '');
      
      // Mount the same router at the versioned path for each supported version
      SUPPORTED_VERSIONS.forEach(version => {
        const versionedPath = `/api/v${version}/${resourcePath}`;
        app.use(versionedPath, routes[routeName]);
        console.log(`Registered versioned route: ${versionedPath} -> ${routeName}`);
      });
    }
  });
};

/**
 * Validates API version in the URL path
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateApiVersion = (req, res, next) => {
  const urlParts = req.path.split('/');
  
  // Skip validation for non-API routes
  if (urlParts.length < 2 || urlParts[1] !== 'api') {
    return next();
  }
  
  // If there's no version specifier or it's not at the right position, proceed
  if (urlParts.length < 3 || !urlParts[2].startsWith('v')) {
    return next();
  }
  
  // Extract version number
  const version = urlParts[2].substring(1);
  
  // Check if the version is supported
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return res.status(404).json({
      error: `API version not supported: v${version}. Supported versions: ${SUPPORTED_VERSIONS.map(v => `v${v}`).join(', ')}`
    });
  }
  
  next();
};

module.exports = {
  addVersionHeaders,
  createVersionedRoutes,
  validateApiVersion,
  SUPPORTED_VERSIONS
};
