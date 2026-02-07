/**
 * V1 ShareClass Controller
 *
 * [Feature] OCAE-208: Implement share class management endpoints
 * Enhanced controller with authentication, validation, filtering, and analytics
 * Updated: ZeroDB Migration - Removed Mongoose dependencies
 */

const ShareClass = require('../../models/ShareClass');

/**
 * Helper function to validate ID format (UUID or row_id)
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if the ID is valid, false otherwise
 */
const isValidId = (id) => {
  if (!id || typeof id !== 'string') return false;
  // UUID format, MongoDB ObjectId format, or alphanumeric with dashes/underscores
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return uuidRegex.test(id) || objectIdRegex.test(id) || /^\d+$/.test(id) || /^[A-Za-z0-9\-_]+$/.test(id);
};

// Helper function to validate request body
const validateShareClass = (data) => {
  const errors = [];
  
  // Check required fields
  const requiredFields = ['name', 'description', 'amountRaised', 
                          'ownershipPercentage', 'dilutedShares', 
                          'authorizedShares', 'shareClassId'];
  
  requiredFields.forEach(field => {
    if (!data[field]) errors.push(`${field} is required`);
  });
  
  // Validate numeric fields
  if (data.ownershipPercentage !== undefined) {
    if (data.ownershipPercentage < 0 || data.ownershipPercentage > 100) {
      errors.push('Ownership percentage must be between 0 and 100');
    }
  }
  
  if (data.amountRaised !== undefined && data.amountRaised < 0) {
    errors.push('Amount raised cannot be negative');
  }
  
  if (data.dilutedShares !== undefined && data.dilutedShares < 0) {
    errors.push('Diluted shares cannot be negative');
  }
  
  if (data.authorizedShares !== undefined && data.authorizedShares < 0) {
    errors.push('Authorized shares cannot be negative');
  }
  
  // Validate diluted vs authorized shares
  if (data.dilutedShares && data.authorizedShares && 
      data.dilutedShares > data.authorizedShares) {
    errors.push('Diluted shares cannot exceed authorized shares');
  }
  
  return errors;
};

/**
 * Create a new share class
 * @route POST /api/v1/shareClasses
 */
exports.createShareClass = async (req, res) => {
  try {
    // Validate request body
    const errors = validateShareClass(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    // Check if shareClassId already exists
    const existing = await ShareClass.findOne({ shareClassId: req.body.shareClassId });
    if (existing) {
      return res.status(400).json({ 
        errors: [`Share class with ID ${req.body.shareClassId} already exists`] 
      });
    }
    
    // Create new share class using ZeroDB-compatible create method
    const newShareClass = await ShareClass.create(req.body);

    res.status(201).json(newShareClass);
  } catch (error) {
    console.error('Error creating share class:', error);
    res.status(500).json({ 
      error: 'Error creating share class',
      message: error.message 
    });
  }
};

/**
 * Get all share classes with optional filtering
 * @route GET /api/v1/shareClasses
 */
exports.getAllShareClasses = async (req, res) => {
  try {
    // Build filter object from query params
    const filter = {};
    
    // Name filter (exact match)
    if (req.query.name) {
      filter.name = req.query.name;
    }
    
    // Ownership percentage filters (range)
    if (req.query.minOwnership) {
      filter.ownershipPercentage = { 
        ...filter.ownershipPercentage,
        $gte: parseFloat(req.query.minOwnership) 
      };
    }
    
    if (req.query.maxOwnership) {
      filter.ownershipPercentage = { 
        ...filter.ownershipPercentage,
        $lte: parseFloat(req.query.maxOwnership) 
      };
    }
    
    // Share class ID filter
    if (req.query.shareClassId) {
      filter.shareClassId = req.query.shareClassId;
    }
    
    // Execute query
    const shareClasses = await ShareClass.find(filter);
    
    res.status(200).json(shareClasses);
  } catch (error) {
    console.error('Error fetching share classes:', error);
    res.status(500).json({ 
      error: 'Error fetching share classes',
      message: error.message 
    });
  }
};

/**
 * Search share classes by keyword
 * @route GET /api/v1/shareClasses/search
 */
exports.searchShareClasses = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    // Use the model's search method for ZeroDB compatibility
    const shareClasses = await ShareClass.search(q);

    res.status(200).json(shareClasses);
  } catch (error) {
    console.error('Error searching share classes:', error);
    res.status(500).json({
      error: 'Error searching share classes',
      message: error.message
    });
  }
};

/**
 * Get share class by ID
 * @route GET /api/v1/shareClasses/:id
 */
exports.getShareClassById = async (req, res) => {
  try {
    // Validate ID format
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }

    const shareClass = await ShareClass.findById(req.params.id);
    
    if (!shareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    
    res.status(200).json(shareClass);
  } catch (error) {
    console.error('Error fetching share class:', error);
    res.status(500).json({ 
      error: 'Error fetching share class',
      message: error.message 
    });
  }
};

/**
 * Update share class by ID
 * @route PUT /api/v1/shareClasses/:id
 */
exports.updateShareClass = async (req, res) => {
  try {
    // Validate ID format
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    // If shareClassId is being updated, check it doesn't conflict
    if (req.body.shareClassId) {
      const existingWithId = await ShareClass.findOne({
        shareClassId: req.body.shareClassId
      });

      if (existingWithId && existingWithId._id !== req.params.id) {
        return res.status(400).json({
          errors: [`Share class with ID ${req.body.shareClassId} already exists`]
        });
      }
    }

    // Validate request body if any fields are being updated
    if (Object.keys(req.body).length > 0) {
      const currentShareClass = await ShareClass.findById(req.params.id);
      if (!currentShareClass) {
        return res.status(404).json({ error: 'Share class not found' });
      }

      const errors = validateShareClass({
        ...currentShareClass,
        ...req.body
      });

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
    }

    // Update the share class
    const updatedShareClass = await ShareClass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    
    res.status(200).json(updatedShareClass);
  } catch (error) {
    console.error('Error updating share class:', error);
    res.status(500).json({ 
      error: 'Error updating share class',
      message: error.message 
    });
  }
};

/**
 * Delete share class by ID
 * @route DELETE /api/v1/shareClasses/:id
 */
exports.deleteShareClass = async (req, res) => {
  try {
    // Validate ID format
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    const deletedShareClass = await ShareClass.findByIdAndDelete(req.params.id);
    
    if (!deletedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    
    res.status(200).json({ 
      message: 'Share class deleted',
      deletedShareClass
    });
  } catch (error) {
    console.error('Error deleting share class:', error);
    res.status(500).json({ 
      error: 'Error deleting share class',
      message: error.message 
    });
  }
};

/**
 * Bulk create share classes
 * @route POST /api/v1/shareClasses/bulk
 */
exports.bulkCreateShareClasses = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ 
        error: 'Request body must be an array of share classes'
      });
    }
    
    // Validate each share class in the array
    const errors = [];
    req.body.forEach((item, index) => {
      const itemErrors = validateShareClass(item);
      if (itemErrors.length > 0) {
        errors.push({ index, errors: itemErrors });
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    // Check for duplicate shareClassIds
    const shareClassIds = req.body.map(item => item.shareClassId);
    const uniqueIds = new Set(shareClassIds);
    
    if (uniqueIds.size !== shareClassIds.length) {
      return res.status(400).json({ 
        error: 'Duplicate shareClassIds in request'
      });
    }
    
    // Check for existing shareClassIds in database
    const allShareClasses = await ShareClass.find({});
    const existingIds = allShareClasses.filter(sc =>
      shareClassIds.includes(sc.shareClassId)
    );
    
    if (existingIds.length > 0) {
      return res.status(400).json({ 
        error: `Share classes with the following IDs already exist: ${existingIds.map(id => id.shareClassId).join(', ')}`
      });
    }
    
    // Create all share classes
    const createdShareClasses = await ShareClass.insertMany(req.body);
    
    res.status(201).json(createdShareClasses);
  } catch (error) {
    console.error('Error bulk creating share classes:', error);
    res.status(500).json({ 
      error: 'Error bulk creating share classes',
      message: error.message 
    });
  }
};

/**
 * Get share class analytics
 * @route GET /api/v1/shareClasses/analytics
 */
exports.getShareClassAnalytics = async (req, res) => {
  try {
    // Fetch all share classes for analytics calculation
    const shareClasses = await ShareClass.find({});

    if (shareClasses.length === 0) {
      return res.status(200).json({
        totalShareClasses: 0,
        totalAmountRaised: 0,
        totalDilutedShares: 0,
        totalAuthorizedShares: 0,
        averageOwnershipPercentage: 0,
        ownershipRange: { min: 0, max: 0 },
        ownershipDistribution: []
      });
    }

    // Calculate basic statistics
    const totalShareClasses = shareClasses.length;
    const totalAmountRaised = shareClasses.reduce((sum, sc) => sum + (sc.amountRaised || 0), 0);
    const totalDilutedShares = shareClasses.reduce((sum, sc) => sum + (sc.dilutedShares || 0), 0);
    const totalAuthorizedShares = shareClasses.reduce((sum, sc) => sum + (sc.authorizedShares || 0), 0);

    const ownershipPercentages = shareClasses.map(sc => sc.ownershipPercentage || 0);
    const avgOwnershipPercentage = ownershipPercentages.reduce((sum, p) => sum + p, 0) / totalShareClasses;
    const minOwnershipPercentage = Math.min(...ownershipPercentages);
    const maxOwnershipPercentage = Math.max(...ownershipPercentages);

    // Calculate ownership distribution
    const distributionBuckets = {
      '0-10%': { count: 0, totalShares: 0 },
      '11-25%': { count: 0, totalShares: 0 },
      '26-50%': { count: 0, totalShares: 0 },
      '51-75%': { count: 0, totalShares: 0 },
      '76-100%': { count: 0, totalShares: 0 }
    };

    shareClasses.forEach(sc => {
      const ownership = sc.ownershipPercentage || 0;
      const shares = sc.dilutedShares || 0;
      let bucket;

      if (ownership <= 10) bucket = '0-10%';
      else if (ownership <= 25) bucket = '11-25%';
      else if (ownership <= 50) bucket = '26-50%';
      else if (ownership <= 75) bucket = '51-75%';
      else bucket = '76-100%';

      distributionBuckets[bucket].count++;
      distributionBuckets[bucket].totalShares += shares;
    });

    const ownershipDistribution = Object.entries(distributionBuckets)
      .filter(([, data]) => data.count > 0)
      .map(([range, data]) => ({
        range,
        count: data.count,
        totalShares: data.totalShares
      }));

    const analytics = {
      totalShareClasses,
      totalAmountRaised,
      totalDilutedShares,
      totalAuthorizedShares,
      averageOwnershipPercentage: Math.round(avgOwnershipPercentage * 100) / 100,
      ownershipRange: {
        min: minOwnershipPercentage,
        max: maxOwnershipPercentage
      },
      ownershipDistribution
    };

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({
      error: 'Error generating analytics',
      message: error.message
    });
  }
};
