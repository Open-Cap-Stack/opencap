'use strict';

/**
 * Data Room Extraction Controller
 * Issue #616: POST /api/v1/data-rooms/:id/extract
 *
 * Provides structured extraction from data room PDFs into draft OpenCap records,
 * held in a pending review queue before committing to main tables.
 */

const { v4: uuidv4 } = require('uuid');
const { ainativeChatWithRetry } = require('../services/ainativeAgentService');
const DataRoom = require('../models/DataRoom');
const PendingExtraction = require('../models/PendingExtraction');
const Stakeholder = require('../models/Stakeholder');
const ShareClass = require('../models/ShareClass');
const EquityGrant = require('../models/EquityGrant');
const SAFE = require('../models/SAFE');

// Map record types to their target models
const MODEL_MAP = {
  stakeholder: Stakeholder,
  shareClass: ShareClass,
  equityGrant: EquityGrant,
  safe: SAFE,
};

// System prompt for structured extraction
const EXTRACTION_SYSTEM_PROMPT = `You are a financial document analysis assistant for cap table management.
Extract structured records from the provided document metadata.

Return a JSON object with the following arrays (each may be empty):
{
  "stakeholders": [{ "name": string, "email": string, "role": string, "ownershipPercentage": number, "confidence": number(0-1) }],
  "shareClasses": [{ "name": string, "type": string, "authorizedShares": number, "pricePerShare": number, "confidence": number(0-1) }],
  "equityGrants": [{ "grantee": string, "shares": number, "grantDate": string, "vestingSchedule": string, "grantType": string, "strikePrice": number, "confidence": number(0-1) }],
  "safes": [{ "investor": string, "amount": number, "valuationCap": number, "discount": number, "safeType": string, "confidence": number(0-1) }]
}

Only include records you can identify with reasonable confidence. Set confidence to a value between 0 and 1.
Respond with valid JSON only.`;

/**
 * POST /api/v1/data-rooms/:id/extract
 * Extract structured records from data room documents using AI
 */
exports.extractRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;

    // Load the data room
    const dataRoom = await DataRoom.findByDataRoomId(id);
    if (!dataRoom) {
      return res.status(404).json({ message: 'Data room not found' });
    }

    // Validate data room has documents
    if (!dataRoom.documents || dataRoom.documents.length === 0) {
      return res.status(400).json({ message: 'Data room has no documents to extract from' });
    }

    // Build document summary for AI extraction
    const documentSummary = dataRoom.documents.map((doc) => ({
      documentId: doc.documentId,
      addedAt: doc.addedAt,
    }));

    // Call AI service for extraction
    let extractionResult;
    try {
      const response = await ainativeChatWithRetry(
        [
          {
            role: 'user',
            content: `Extract structured cap table records from the following data room documents.\n\nData room: "${dataRoom.name}"\nCompany: ${companyId || 'unknown'}\nDocuments: ${JSON.stringify(documentSummary)}`,
          },
        ],
        { system: EXTRACTION_SYSTEM_PROMPT, temperature: 0.2 }
      );
      extractionResult = response.parsed;
    } catch (aiErr) {
      console.error('AI extraction failed:', aiErr.message);
      return res.status(500).json({ message: 'Document extraction failed. Please try again.' });
    }

    // Convert extraction results into pending records
    const pendingRecords = [];

    const recordCategories = [
      { key: 'stakeholders', type: 'stakeholder' },
      { key: 'shareClasses', type: 'shareClass' },
      { key: 'equityGrants', type: 'equityGrant' },
      { key: 'safes', type: 'safe' },
    ];

    for (const { key, type } of recordCategories) {
      const items = extractionResult[key] || [];
      for (const item of items) {
        const confidence = typeof item.confidence === 'number' ? item.confidence : 0.5;
        // Remove confidence from extractedData to keep it clean
        const { confidence: _, ...extractedData } = item;

        const pending = await PendingExtraction.create({
          extractionId: `ext_${uuidv4()}`,
          dataRoomId: id,
          companyId: companyId || dataRoom.ownerCompany,
          recordType: type,
          extractedData,
          sourceDocument: documentSummary[0]?.documentId || null,
          confidence,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        pendingRecords.push(pending);
      }
    }

    return res.status(200).json({
      dataRoomId: id,
      totalExtracted: pendingRecords.length,
      extractions: pendingRecords,
    });
  } catch (err) {
    console.error('extractRecords error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/v1/data-rooms/:id/extract/:extractionId/approve
 * Approve a pending extraction and commit the record to its target model
 */
exports.approveExtraction = async (req, res) => {
  try {
    const { extractionId } = req.params;
    const userId = req.user?.userId;

    // Find the pending extraction
    const extraction = await PendingExtraction.findOne({ extractionId });
    if (!extraction) {
      return res.status(404).json({ message: 'Extraction not found' });
    }

    // Guard against double-approval or approving rejected records
    if (extraction.status !== 'pending') {
      return res.status(400).json({
        message: `Extraction has already been ${extraction.status}. Cannot approve.`,
      });
    }

    // Commit the record to the appropriate model
    const committedRecord = await commitRecord(
      extraction.recordType,
      extraction.extractedData,
      extraction.companyId,
      userId
    );

    // Mark extraction as approved
    await PendingExtraction.updateOne(
      { extractionId },
      {
        $set: {
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return res.status(200).json({
      extractionId,
      status: 'approved',
      recordType: extraction.recordType,
      committedRecord,
    });
  } catch (err) {
    console.error('approveExtraction error:', err.message);
    return res.status(500).json({ message: 'Failed to approve extraction' });
  }
};

/**
 * POST /api/v1/data-rooms/:id/extract/:extractionId/reject
 * Reject a pending extraction
 */
exports.rejectExtraction = async (req, res) => {
  try {
    const { extractionId } = req.params;
    const userId = req.user?.userId;
    const { reason } = req.body || {};

    // Find the pending extraction
    const extraction = await PendingExtraction.findOne({ extractionId });
    if (!extraction) {
      return res.status(404).json({ message: 'Extraction not found' });
    }

    // Guard against rejecting already-reviewed records
    if (extraction.status !== 'pending') {
      return res.status(400).json({
        message: `Extraction has already been ${extraction.status}. Cannot reject.`,
      });
    }

    const updateFields = {
      status: 'rejected',
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (reason) {
      updateFields.rejectionReason = reason;
    }

    await PendingExtraction.updateOne(
      { extractionId },
      { $set: updateFields }
    );

    return res.status(200).json({
      extractionId,
      status: 'rejected',
      reason: reason || null,
    });
  } catch (err) {
    console.error('rejectExtraction error:', err.message);
    return res.status(500).json({ message: 'Failed to reject extraction' });
  }
};

/**
 * GET /api/v1/data-rooms/:id/extract
 * List all pending extractions for a data room, optionally filtered by status
 */
exports.listExtractions = async (req, res) => {
  try {
    const { id } = req.params;
    const statusFilter = req.query?.status;

    // Verify data room exists
    const dataRoom = await DataRoom.findByDataRoomId(id);
    if (!dataRoom) {
      return res.status(404).json({ message: 'Data room not found' });
    }

    const query = { dataRoomId: id };
    if (statusFilter) {
      query.status = statusFilter;
    }

    const extractions = await PendingExtraction.find(query);

    return res.status(200).json({
      dataRoomId: id,
      total: extractions.length,
      extractions,
    });
  } catch (err) {
    console.error('listExtractions error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Commit an extracted record to its target model
 * @param {string} recordType - stakeholder | shareClass | equityGrant | safe
 * @param {Object} data - Extracted data
 * @param {string} companyId - Company ID
 * @param {string} userId - User performing the approval
 * @returns {Object} Created record
 */
async function commitRecord(recordType, data, companyId, userId) {
  switch (recordType) {
    case 'stakeholder':
      return Stakeholder.create({
        ...data,
        companyId,
        role: data.role || 'employee',
      });

    case 'shareClass':
      return ShareClass.create({
        ...data,
        companyId,
        classType: data.type || data.classType || 'common',
        description: data.description || `${data.name || 'Share Class'} (extracted)`,
        dilutedShares: data.authorizedShares || 0,
        amountRaised: 0,
        ownershipPercentage: 0,
      });

    case 'equityGrant':
      return EquityGrant.create({
        ...data,
        companyId,
        grantType: data.grantType || 'ISO',
        numberOfShares: data.shares || data.numberOfShares || 0,
        strikePrice: data.strikePrice || 0,
        grantDate: data.grantDate || new Date().toISOString(),
        employeeId: data.grantee || data.employeeId || 'unknown',
      });

    case 'safe':
      return SAFE.create({
        ...data,
        companyId,
        investorName: data.investor || data.investorName || 'Unknown',
        investorId: data.investorId || `investor_${uuidv4()}`,
        investmentAmount: data.amount || data.investmentAmount || 0,
        valuationCap: data.valuationCap || 0,
        discountRate: data.discount || data.discountRate || 0,
        safeType: data.safeType || 'post-money',
        createdBy: userId,
      });

    default:
      throw new Error(`Unknown record type: ${recordType}`);
  }
}
