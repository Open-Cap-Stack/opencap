/**
 * Google Integration Controller
 * Issue #234: Google Drive and Gmail integration for data room reconstruction
 *
 * Endpoints:
 * - GET  /google-drive/files      — Search Google Drive files
 * - POST /google-drive/import     — Import a Drive file into a data room
 * - GET  /gmail/attachments       — Search Gmail for attachments
 * - POST /gmail/import            — Import a Gmail attachment into a data room
 * - GET  /status                  — Check integration connection status
 */

const googleIntegrationService = require('../services/googleIntegrationService');
const { errorResponse } = require('../middleware/errorResponse');

/**
 * GET /status
 * Check which Google integrations are available for the authenticated user.
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const connection = await googleIntegrationService.checkGoogleConnection(userId);

    res.status(200).json({
      google: {
        connected: connection.connected,
        email: connection.email || null,
        scopes: connection.scopes || [],
      },
    });
  } catch (error) {
    console.error('Integration status check failed:', error.message);
    errorResponse(res, 500, 'Failed to check integration status', error);
  }
};

/**
 * GET /google-drive/files
 * Search Google Drive for documents.
 *
 * Query params:
 *   query  — free-text search term
 *   types  — comma-separated file type filters (pdf, doc, xlsx, ...)
 *   limit  — max results (default 20)
 */
exports.searchDriveFiles = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { query, types, limit } = req.query;

    const result = await googleIntegrationService.searchDriveFiles(userId, {
      query: query || '',
      types: types || '',
      limit: limit ? parseInt(limit, 10) : 20,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Drive search failed:', error.message);
    errorResponse(res, 500, 'Failed to search Google Drive', error);
  }
};

/**
 * POST /google-drive/import
 * Import a file from Google Drive into a data room.
 *
 * Body:
 *   fileId        — Google Drive file ID (for provenance tracking)
 *   fileName      — display name for the document
 *   base64Content — base64-encoded file content
 *   mimeType      — MIME type of the file
 *   dataRoomId    — target data room ID (optional)
 *   category      — document category (optional)
 */
exports.importDriveFile = async (req, res) => {
  try {
    const { fileId, fileName, base64Content, mimeType, dataRoomId, category } = req.body;

    if (!fileName) {
      return errorResponse(res, 400, 'fileName is required');
    }
    if (!base64Content) {
      return errorResponse(res, 400, 'base64Content is required');
    }

    // Validate base64 content is not excessively large (50 MB limit)
    const estimatedSize = Math.ceil((base64Content.length * 3) / 4);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (estimatedSize > MAX_FILE_SIZE) {
      return errorResponse(res, 413, `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
    }

    const document = await googleIntegrationService.importToDataRoom({
      fileName,
      base64Content,
      mimeType,
      dataRoomId,
      category,
      source: 'google-drive',
      sourceMetadata: { fileId: fileId || null },
      companyId: req.user?.companyId,
      userId: req.user?.userId,
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.error('Drive import failed:', error.message);
    const status = error.message.includes('required') ? 400 : 500;
    errorResponse(res, status, error.message, error);
  }
};

/**
 * GET /gmail/attachments
 * Search Gmail for messages with attachments.
 *
 * Query params:
 *   query      — Gmail search terms
 *   newer_than — age filter (e.g. "1y", "6m", "30d")
 *   limit      — max results (default 20)
 */
exports.searchGmailAttachments = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { query, newer_than: newerThan, limit } = req.query;

    const result = await googleIntegrationService.searchGmailAttachments(userId, {
      query: query || '',
      newerThan: newerThan || '',
      limit: limit ? parseInt(limit, 10) : 20,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Gmail attachment search failed:', error.message);
    errorResponse(res, 500, 'Failed to search Gmail attachments', error);
  }
};

/**
 * POST /gmail/import
 * Import a Gmail attachment into a data room.
 *
 * Body:
 *   attachmentData — base64-encoded attachment content
 *   fileName       — display name for the document
 *   mimeType       — MIME type of the file
 *   dataRoomId     — target data room ID (optional)
 *   category       — document category (optional)
 *   threadId       — Gmail thread ID (for provenance tracking)
 *   messageId      — Gmail message ID (for provenance tracking)
 */
exports.importGmailAttachment = async (req, res) => {
  try {
    const { attachmentData, fileName, mimeType, dataRoomId, category, threadId, messageId } = req.body;

    if (!fileName) {
      return errorResponse(res, 400, 'fileName is required');
    }
    if (!attachmentData) {
      return errorResponse(res, 400, 'attachmentData is required');
    }

    // Validate base64 content is not excessively large (50 MB limit)
    const estimatedSize = Math.ceil((attachmentData.length * 3) / 4);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (estimatedSize > MAX_FILE_SIZE) {
      return errorResponse(res, 413, `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
    }

    const document = await googleIntegrationService.importToDataRoom({
      fileName,
      base64Content: attachmentData,
      mimeType,
      dataRoomId,
      category,
      source: 'gmail',
      sourceMetadata: {
        threadId: threadId || null,
        messageId: messageId || null,
      },
      companyId: req.user?.companyId,
      userId: req.user?.userId,
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.error('Gmail import failed:', error.message);
    const status = error.message.includes('required') ? 400 : 500;
    errorResponse(res, status, error.message, error);
  }
};
