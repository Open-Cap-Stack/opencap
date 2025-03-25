/**
 * Share Class Controller
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * Versioned controller for share class management with JWT auth
 */

const ShareClass = require('../../models/ShareClass');
const mongoose = require('mongoose');

/**
 * Create a new share class
 */
const createShareClass = async (req, res) => {
  try {
    // Add user ID from JWT token
    req.body.userId = req.user.id;
    
    // Create new share class
    const newShareClass = new ShareClass(req.body);
    
    // Save to database
    await newShareClass.save();
    
    res.status(201).json(newShareClass);
  } catch (error) {
    console.error('Error creating share class:', error);
    res.status(500).json({ error: `Failed to create share class: ${error.message}` });
  }
};

/**
 * Get all share classes with filtering options
 */
const getAllShareClasses = async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Get share classes matching query
    const shareClasses = await ShareClass.find(query);
    
    res.status(200).json(shareClasses);
  } catch (error) {
    console.error('Error fetching share classes:', error);
    res.status(500).json({ error: `Failed to retrieve share classes: ${error.message}` });
  }
};

/**
 * Get a single share class by ID
 */
const getShareClassById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    // Find share class by ID
    const shareClass = await ShareClass.findById(id);
    
    if (!shareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    
    res.status(200).json(shareClass);
  } catch (error) {
    console.error('Error fetching share class:', error);
    res.status(500).json({ error: `Failed to retrieve share class: ${error.message}` });
  }
};

/**
 * Update an existing share class
 */
const updateShareClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    // Find existing share class
    const existingShareClass = await ShareClass.findById(id);
    if (!existingShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    
    // Add last modified info
    req.body.lastModifiedBy = req.user.id;
    req.body.updatedAt = new Date();
    
    // Update share class
    const updatedShareClass = await ShareClass.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedShareClass);
  } catch (error) {
    console.error('Error updating share class:', error);
    res.status(500).json({ error: `Failed to update share class: ${error.message}` });
  }
};

/**
 * Delete a share class
 */
const deleteShareClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid share class ID format' });
    }
    
    // Find and delete share class
    const deletedShareClass = await ShareClass.findByIdAndDelete(id);
    
    if (!deletedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    
    res.status(200).json({ message: 'Share class deleted successfully', id });
  } catch (error) {
    console.error('Error deleting share class:', error);
    res.status(500).json({ error: `Failed to delete share class: ${error.message}` });
  }
};

/**
 * Search share classes by keyword
 */
const searchShareClasses = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Search in multiple fields
    const shareClasses = await ShareClass.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { type: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    });
    
    res.status(200).json(shareClasses);
  } catch (error) {
    console.error('Error searching share classes:', error);
    res.status(500).json({ error: `Failed to search share classes: ${error.message}` });
  }
};

/**
 * Get share class analytics
 */
const getShareClassAnalytics = async (req, res) => {
  try {
    // Aggregate analytics
    const analytics = await ShareClass.aggregate([
      { $group: {
        _id: null,
        totalShareClasses: { $sum: 1 },
        totalShares: { $sum: '$totalShares' },
        avgPricePerShare: { $avg: '$pricePerShare' }
      }},
      { $project: {
        _id: 0,
        totalShareClasses: 1,
        totalShares: 1,
        avgPricePerShare: { $round: ['$avgPricePerShare', 2] }
      }}
    ]);
    
    // Handle case with no share classes
    if (analytics.length === 0) {
      return res.status(200).json({
        totalShareClasses: 0,
        totalShares: 0,
        avgPricePerShare: 0
      });
    }
    
    res.status(200).json(analytics[0]);
  } catch (error) {
    console.error('Error getting share class analytics:', error);
    res.status(500).json({ error: `Failed to get analytics: ${error.message}` });
  }
};

/**
 * Create multiple share classes in bulk
 */
const bulkCreateShareClasses = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Bulk operation requires an array of share classes' });
    }
    
    // Add user ID to each share class
    const shareClassesWithUser = req.body.map(shareClass => ({
      ...shareClass,
      userId: req.user.id
    }));
    
    // Create all share classes
    const newShareClasses = await ShareClass.insertMany(shareClassesWithUser);
    
    res.status(201).json(newShareClasses);
  } catch (error) {
    console.error('Error creating share classes in bulk:', error);
    res.status(500).json({ error: `Failed to create share classes: ${error.message}` });
  }
};

module.exports = {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClass,
  deleteShareClass,
  searchShareClasses,
  getShareClassAnalytics,
  bulkCreateShareClasses
};
