/**
 * V1 ShareClass Controller
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * Enhanced controller with authentication, validation, filtering, and analytics
 */

const ShareClass = require('../../models/ShareClass');
const mongoose = require('mongoose');

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
    const existing = await ShareClass.findOne({ shareClassId: req.body.shareClassId }).exec();
    if (existing) {
      return res.status(400).json({ 
        errors: [`Share class with ID ${req.body.shareClassId} already exists`] 
      });
    }
    
    // Create new share class
    const newShareClass = new ShareClass(req.body);
    await newShareClass.save();
    
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
    const shareClasses = await ShareClass.find(filter).exec();
    
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
    
    // Use text index for search
    const shareClasses = await ShareClass.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .exec();
    
    // If text search returns no results, try partial matching
    if (shareClasses.length === 0) {
      const regex = new RegExp(q, 'i');
      const results = await ShareClass.find({
        $or: [
          { name: regex },
          { description: regex },
          { shareClassId: regex }
        ]
      }).exec();
      
      return res.status(200).json(results);
    }
    
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    const shareClass = await ShareClass.findById(req.params.id).exec();
    
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    // If shareClassId is being updated, check it doesn't conflict
    if (req.body.shareClassId) {
      const existing = await ShareClass.findOne({ 
        shareClassId: req.body.shareClassId,
        _id: { $ne: req.params.id }
      }).exec();
      
      if (existing) {
        return res.status(400).json({ 
          errors: [`Share class with ID ${req.body.shareClassId} already exists`] 
        });
      }
    }
    
    // Validate request body if any fields are being updated
    if (Object.keys(req.body).length > 0) {
      const errors = validateShareClass({
        ...await ShareClass.findById(req.params.id).lean().exec(),
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
      { new: true, runValidators: true }
    ).exec();
    
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    const deletedShareClass = await ShareClass.findByIdAndDelete(req.params.id).exec();
    
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
    const existingIds = await ShareClass.find({
      shareClassId: { $in: shareClassIds }
    }).select('shareClassId').exec();
    
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
    // Get basic statistics with aggregation pipeline
    const analyticsResults = await ShareClass.aggregate([
      {
        $group: {
          _id: null,
          totalShareClasses: { $sum: 1 },
          totalAmountRaised: { $sum: '$amountRaised' },
          totalDilutedShares: { $sum: '$dilutedShares' },
          totalAuthorizedShares: { $sum: '$authorizedShares' },
          avgOwnershipPercentage: { $avg: '$ownershipPercentage' },
          minOwnershipPercentage: { $min: '$ownershipPercentage' },
          maxOwnershipPercentage: { $max: '$ownershipPercentage' }
        }
      },
      {
        $project: {
          _id: 0,
          totalShareClasses: 1,
          totalAmountRaised: 1,
          totalDilutedShares: 1,
          totalAuthorizedShares: 1,
          averageOwnershipPercentage: { $round: ['$avgOwnershipPercentage', 2] },
          ownershipRange: {
            min: '$minOwnershipPercentage',
            max: '$maxOwnershipPercentage'
          }
        }
      }
    ]).exec();
    
    // Get distribution of share classes by ownership percentage range
    const ownershipDistribution = await ShareClass.aggregate([
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ['$ownershipPercentage', 10] }, then: '0-10%' },
                { case: { $lte: ['$ownershipPercentage', 25] }, then: '11-25%' },
                { case: { $lte: ['$ownershipPercentage', 50] }, then: '26-50%' },
                { case: { $lte: ['$ownershipPercentage', 75] }, then: '51-75%' }
              ],
              default: '76-100%'
            }
          },
          count: { $sum: 1 },
          totalShares: { $sum: '$dilutedShares' }
        }
      },
      { $sort: { _id: 1 } }
    ]).exec();
    
    const analytics = {
      ...(analyticsResults[0] || { 
        totalShareClasses: 0,
        totalAmountRaised: 0,
        averageOwnershipPercentage: 0,
        ownershipRange: { min: 0, max: 0 }
      }),
      ownershipDistribution: ownershipDistribution.map(item => ({
        range: item._id,
        count: item.count,
        totalShares: item.totalShares
      }))
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
