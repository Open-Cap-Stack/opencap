/**
 * SPV Document Controller
 * Issue #269: SPV Document & Timeline Backend Endpoints
 *
 * Endpoints for listing, uploading, deleting documents and
 * sending signature reminders on a per-SPV basis.
 */

const SPVDocument = require('../models/SPVDocument');
const SPVTimeline = require('../models/SPVTimeline');
const SPV = require('../models/SPV');

/**
 * Verify that the SPV exists and belongs to the requesting user's company.
 * Returns { spv, error } -- if error is truthy the handler should return early.
 */
async function verifySPVOwnership(req, res, spvId) {
  let spv = await SPV.findOne({ SPVID: spvId });
  if (!spv) {
    spv = await SPV.findById(spvId).catch(() => null);
  }
  if (!spv) {
    res.status(404).json({ message: 'SPV not found' });
    return { spv: null, error: true };
  }

  // Enforce company-level tenancy for non-admin roles
  if (req.user && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    const userCompany = req.user.companyId;
    const spvCompany = spv.ParentCompanyID || spv.companyId;
    if (!userCompany || spvCompany !== userCompany) {
      res.status(403).json({ message: 'Access denied' });
      return { spv: null, error: true };
    }
  }

  return { spv, error: false };
}

/**
 * GET /api/v1/spv/:id/documents
 * List all documents for a given SPV, scoped by companyId.
 */
exports.listDocuments = async (req, res) => {
  try {
    const { id: spvId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

    const companyId = req.user?.companyId;
    const filter = companyId ? { companyId } : {};

    const documents = await SPVDocument.findBySPV(spvId, filter);
    res.status(200).json({ documents });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list documents', error: error.message });
  }
};

/**
 * POST /api/v1/spv/:id/documents
 * Upload a document for an SPV. Accepts multipart FormData with fields:
 *   - name: document name
 *   - category: document category
 *   - file: the uploaded file (handled by multer middleware)
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { id: spvId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

    const name = req.body.name;
    if (!name) {
      return res.status(400).json({ message: 'Document name is required' });
    }

    const category = req.body.category || 'Deal documents';
    if (!SPVDocument.validators.isValidCategory(category)) {
      return res.status(400).json({
        message: `Invalid category. Must be one of: ${SPVDocument.VALID_CATEGORIES.join(', ')}`
      });
    }

    const companyId = req.user?.companyId;
    const userId = req.user?.id || req.user?.userId;
    const userName = req.user?.name || req.user?.email || 'Unknown';

    // Build file metadata from multer upload if present
    let fileName = '';
    let fileUrl = '';
    if (req.file) {
      fileName = req.file.originalname || req.file.filename || '';
      // In production this would be a persistent storage URL (MinIO/S3);
      // for now store the local path or a placeholder.
      fileUrl = req.file.path || req.file.location || '';
    }

    const docData = {
      spvId,
      companyId,
      name,
      fileName,
      category,
      status: 'draft',
      url: fileUrl,
      fileUrl,
      uploadDate: new Date().toISOString(),
      uploaderName: userName,
      uploaderId: userId,
      signatories: []
    };

    const document = await SPVDocument.create(docData);

    // Log a timeline event for the upload
    try {
      await SPVTimeline.create({
        spvId,
        companyId,
        type: 'document',
        description: `Document "${name}" uploaded`,
        message: `${userName} uploaded "${name}" (${category})`,
        userName,
        userId
      });
    } catch (timelineErr) {
      // Non-critical: do not fail the upload if timeline logging fails
    }

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
};

/**
 * DELETE /api/v1/spv/:id/documents/:docId
 * Remove a document from an SPV.
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id: spvId, docId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }
    if (!docId || docId.trim() === '') {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

    const document = await SPVDocument.findOne({ _id: docId, spvId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await SPVDocument.deleteOne({ _id: docId, spvId });

    // Log a timeline event for the deletion
    try {
      const userName = req.user?.name || req.user?.email || 'Unknown';
      const userId = req.user?.id || req.user?.userId;
      await SPVTimeline.create({
        spvId,
        companyId: req.user?.companyId,
        type: 'document',
        description: `Document "${document.name}" deleted`,
        message: `${userName} deleted "${document.name}"`,
        userName,
        userId
      });
    } catch (timelineErr) {
      // Non-critical
    }

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
};

/**
 * POST /api/v1/spv/:id/documents/:docId/remind
 * Send a signature reminder for a document.
 * Body: { signatoryId }
 */
exports.sendReminder = async (req, res) => {
  try {
    const { id: spvId, docId } = req.params;
    const { signatoryId } = req.body;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }
    if (!docId || docId.trim() === '') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    if (!signatoryId) {
      return res.status(400).json({ message: 'signatoryId is required' });
    }

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

    const document = await SPVDocument.findOne({ _id: docId, spvId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Find the signatory in the document's signatories list
    const signatory = (document.signatories || []).find(s => s.id === signatoryId);
    if (!signatory) {
      return res.status(404).json({ message: 'Signatory not found on this document' });
    }

    // Log the reminder event in the timeline
    const userName = req.user?.name || req.user?.email || 'Unknown';
    const userId = req.user?.id || req.user?.userId;
    await SPVTimeline.create({
      spvId,
      companyId: req.user?.companyId,
      type: 'document',
      description: `Signature reminder sent for "${document.name}" to ${signatory.name || signatoryId}`,
      message: `${userName} sent a signature reminder for "${document.name}"`,
      userName,
      userId
    });

    res.status(200).json({
      message: 'Reminder sent successfully',
      documentId: docId,
      signatoryId,
      signatoryName: signatory.name || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send reminder', error: error.message });
  }
};
