/**
 * ShareClass Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');
const { errorResponse } = require('../middleware/errorResponse');

const MODEL_NAME = 'ShareClass';

const createShareClass = async (req, res) => {
  // Accept `type` as an alias for `classType` (frontend sends `type`)
  const body = { ...req.body };
  if (body.type && !body.classType) body.classType = body.type;

  const { name, description, shareClassId, amountRaised, ownershipPercentage, dilutedShares, authorizedShares, conversionRate, classType, parValue, pricePerShare, liquidationPreference, votingRights, antiDilutionRights, conversionRatio } = body;

  if (!name) {
    return errorResponse(res, 400, 'Name is required');
  }

  const companyId = body.companyId || req.user?.companyId || null;

  try {
    const shareClass = await databaseAdapter.create(MODEL_NAME, {
      name, description, shareClassId, amountRaised, ownershipPercentage, dilutedShares,
      authorizedShares, conversionRate, classType, parValue, pricePerShare,
      liquidationPreference, votingRights, antiDilutionRights, conversionRatio,
      // Also store `type` for frontend compatibility
      type: classType || body.type,
      ...(companyId ? { companyId } : {})
    });
    res.status(201).json({ shareClass });
  } catch (error) {
    errorResponse(res, 500, 'Error creating share class', error);
  }
};

const getAllShareClasses = async (req, res) => {
  try {
    const query = {};
    // Scope by companyId: prefer explicit query param, fall back to the
    // authenticated user's companyId so users only see their own data.
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;
    const shareClasses = await databaseAdapter.find(MODEL_NAME, query);
    res.status(200).json({ shareClasses });
  } catch (error) {
    errorResponse(res, 500, 'Error fetching share classes', error);
  }
};

const getShareClassById = async (req, res) => {
  try {
    // Look up by shareClassId first, fall back to _id
    const results = await databaseAdapter.find(MODEL_NAME, { shareClassId: req.params.id });
    const shareClass = results && results.length > 0 ? results[0]
      : await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!shareClass) {
      return errorResponse(res, 404, 'Share class not found');
    }
    res.status(200).json({ shareClass });
  } catch (error) {
    errorResponse(res, 500, 'Error fetching share class', error);
  }
};

const updateShareClassById = async (req, res) => {
  try {
    // Normalize type/classType alias
    const updateBody = { ...req.body };
    if (updateBody.type && !updateBody.classType) updateBody.classType = updateBody.type;
    if (updateBody.classType) updateBody.type = updateBody.classType;

    // Find by shareClassId first to get the internal _id
    const results = await databaseAdapter.find(MODEL_NAME, { shareClassId: req.params.id });
    const existing = results && results.length > 0 ? results[0] : null;
    const lookupId = existing ? existing._id : req.params.id;
    const updatedShareClass = await databaseAdapter.findByIdAndUpdate(MODEL_NAME, lookupId, updateBody, { new: true });
    if (!updatedShareClass) {
      return errorResponse(res, 404, 'Share class not found');
    }
    res.status(200).json({ shareClass: updatedShareClass });
  } catch (error) {
    errorResponse(res, 500, 'Error updating share class', error);
  }
};

const deleteShareClassById = async (req, res) => {
  try {
    // Find by shareClassId first to get the internal _id
    const results = await databaseAdapter.find(MODEL_NAME, { shareClassId: req.params.id });
    const existing = results && results.length > 0 ? results[0] : null;
    const lookupId = existing ? existing._id : req.params.id;
    const deletedShareClass = await databaseAdapter.findByIdAndDelete(MODEL_NAME, lookupId);
    if (!deletedShareClass) {
      return errorResponse(res, 404, 'Share class not found');
    }
    res.status(200).json({ message: 'Share class deleted' });
  } catch (error) {
    errorResponse(res, 500, 'Error deleting share class', error);
  }
};

module.exports = {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById,
};
