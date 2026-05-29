/**
 * Google Integration Service
 * Issue #234: Google Drive and Gmail integration for data room reconstruction
 *
 * Provides methods for:
 * - Checking Google OAuth connection status for a user
 * - Searching Google Drive files (when user has connected their Google account)
 * - Searching Gmail attachments (when user has connected their Google account)
 * - Importing files/attachments into data rooms via ZeroDB document storage
 */

const crypto = require('crypto');
const zerodbService = require('./zerodbService');

const DOCUMENTS_TABLE = 'documents';

/**
 * Supported MIME type filters for Google Drive search.
 * Maps friendly type names to Google Drive MIME types.
 */
const MIME_TYPE_MAP = {
  pdf: 'application/pdf',
  doc: 'application/vnd.google-apps.document',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  image: 'image/',
};

/**
 * Check whether a user has a stored Google OAuth token.
 * For MVP this always returns false — the frontend will show a
 * "Connect Google Account" call-to-action.
 *
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{ connected: boolean, email: string|null }>}
 */
async function checkGoogleConnection(userId) {
  if (!userId) {
    return { connected: false, email: null };
  }

  try {
    // Look for a stored Google OAuth token in the integrations table
    const result = await zerodbService.queryTable('user_integrations', {
      filter: { userId, provider: 'google' },
      limit: 1,
    });

    const rows = result.data || result.rows || [];
    const integration = rows[0]?.row_data || rows[0];

    if (integration && integration.accessToken) {
      return {
        connected: true,
        email: integration.email || null,
        scopes: integration.scopes || [],
      };
    }
  } catch (err) {
    // Table may not exist yet — that is fine, treat as not connected
    if (!err.message?.includes('not found') && !err.message?.includes('does not exist')) {
      console.warn('Error checking Google connection:', err.message);
    }
  }

  return { connected: false, email: null };
}

/**
 * Build a Google Drive search query string from user-facing parameters.
 *
 * @param {string} query - Free-text search term
 * @param {string[]} types - Array of file type filter keys (e.g. ['pdf', 'xlsx'])
 * @returns {string} Google Drive API q parameter
 */
function buildDriveQuery(query, types) {
  const parts = [];

  if (query) {
    parts.push(`fullText contains '${query.replace(/'/g, "\\'")}'`);
  }

  if (types && types.length > 0) {
    const mimeFilters = types
      .map((t) => {
        const mime = MIME_TYPE_MAP[t.toLowerCase()];
        if (!mime) return null;
        // image/ is a prefix, others are exact
        if (mime.endsWith('/')) {
          return `mimeType contains '${mime}'`;
        }
        return `mimeType = '${mime}'`;
      })
      .filter(Boolean);

    if (mimeFilters.length > 0) {
      parts.push(`(${mimeFilters.join(' or ')})`);
    }
  }

  // Exclude trashed files
  parts.push('trashed = false');

  return parts.join(' and ');
}

/**
 * Search Google Drive files for a user.
 *
 * When the user has no Google connection this returns { connected: false }.
 * When the user IS connected this would use the googleapis SDK to search.
 * For MVP the actual Drive search is stubbed — real implementation requires
 * the googleapis npm package and a stored OAuth refresh token.
 *
 * @param {string} userId
 * @param {object} options
 * @param {string} options.query - Free-text search term
 * @param {string} options.types - Comma-separated file type filters
 * @param {number} options.limit - Max results
 * @returns {Promise<object>}
 */
async function searchDriveFiles(userId, { query, types, limit = 20 } = {}) {
  const connection = await checkGoogleConnection(userId);

  if (!connection.connected) {
    return {
      connected: false,
      message: 'Connect your Google account to import documents from Google Drive',
      files: [],
    };
  }

  // When connected — future implementation will call Google Drive API here.
  // For now, return the connected status so the frontend knows the link is active.
  // The googleapis SDK call would look like:
  //
  //   const { google } = require('googleapis');
  //   const oauth2Client = new google.auth.OAuth2();
  //   oauth2Client.setCredentials({ access_token: token });
  //   const drive = google.drive({ version: 'v3', auth: oauth2Client });
  //   const typeArray = types ? types.split(',').map(t => t.trim()) : [];
  //   const q = buildDriveQuery(query, typeArray);
  //   const res = await drive.files.list({
  //     q,
  //     pageSize: limit,
  //     fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink)',
  //   });
  //   return { connected: true, files: res.data.files };

  return {
    connected: true,
    message: 'Google Drive search is available. Direct API search will be implemented with googleapis SDK.',
    files: [],
  };
}

/**
 * Search Gmail for messages with attachments.
 *
 * @param {string} userId
 * @param {object} options
 * @param {string} options.query - Gmail search query (e.g. "invoice tax")
 * @param {string} options.newerThan - Gmail newer_than filter (e.g. "1y", "6m")
 * @param {number} options.limit - Max results
 * @returns {Promise<object>}
 */
async function searchGmailAttachments(userId, { query, newerThan, limit = 20 } = {}) {
  const connection = await checkGoogleConnection(userId);

  if (!connection.connected) {
    return {
      connected: false,
      message: 'Connect your Google account to search Gmail attachments',
      attachments: [],
    };
  }

  // When connected — future implementation will call Gmail API here.
  // The googleapis SDK call would look like:
  //
  //   const { google } = require('googleapis');
  //   const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  //   let gmailQuery = `has:attachment ${query || ''}`;
  //   if (newerThan) gmailQuery += ` newer_than:${newerThan}`;
  //   const list = await gmail.users.messages.list({ userId: 'me', q: gmailQuery, maxResults: limit });
  //   // Then fetch each message to extract attachment metadata

  return {
    connected: true,
    message: 'Gmail attachment search is available. Direct API search will be implemented with googleapis SDK.',
    attachments: [],
  };
}

/**
 * Import a file (from Google Drive or Gmail) into a data room.
 *
 * The frontend passes base64-encoded file content and metadata.
 * This creates a document record in ZeroDB and optionally associates
 * it with a data room.
 *
 * @param {object} params
 * @param {string} params.fileName - Name of the file
 * @param {string} params.base64Content - Base64-encoded file content
 * @param {string} params.mimeType - MIME type of the file
 * @param {string} params.dataRoomId - Data room to associate with (optional)
 * @param {string} params.category - Document category (optional)
 * @param {string} params.source - Source identifier (e.g. 'google-drive', 'gmail')
 * @param {object} params.sourceMetadata - Extra metadata from the source (fileId, threadId, etc.)
 * @param {string} params.companyId - Company ID
 * @param {string} params.userId - Uploading user's ID
 * @returns {Promise<object>} The created document record
 */
async function importToDataRoom({
  fileName,
  base64Content,
  mimeType,
  dataRoomId,
  category,
  source,
  sourceMetadata,
  companyId,
  userId,
}) {
  if (!fileName) {
    throw new Error('fileName is required');
  }
  if (!base64Content) {
    throw new Error('base64Content is required');
  }

  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();

  // Decode content to get size
  const contentBuffer = Buffer.from(base64Content, 'base64');

  const documentData = {
    id: documentId,
    _id: documentId,
    title: fileName,
    name: fileName,
    fileName,
    category: category || 'imported',
    contentType: mimeType || 'application/octet-stream',
    mimeType: mimeType || 'application/octet-stream',
    fileContentBase64: base64Content,
    fileSize: contentBuffer.length,
    size: contentBuffer.length,
    source: source || 'external',
    sourceMetadata: sourceMetadata || {},
    companyId: companyId || null,
    uploadedBy: userId || null,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    dataRoomId: dataRoomId || null,
  };

  // Insert into ZeroDB documents table
  const result = await zerodbService.insertRow(DOCUMENTS_TABLE, documentData);

  const insertedRow = result.data?.[0] || result.rows?.[0] || result;
  const savedDocument = {
    ...documentData,
    ...insertedRow.row_data,
    id: documentData.id,
    _id: documentData.id,
    row_id: insertedRow.row_id,
  };

  // If a dataRoomId was specified, add the document to the data room
  if (dataRoomId) {
    try {
      const DataRoom = require('../models/DataRoom');
      await DataRoom.addDocument(dataRoomId, documentId, userId);
    } catch (drErr) {
      // Log but do not fail the import — the document is already saved
      console.warn(`Failed to add document to data room ${dataRoomId}:`, drErr.message);
      savedDocument._dataRoomAssociationError = drErr.message;
    }
  }

  // Strip base64 content from response to keep it lean
  const responseDoc = { ...savedDocument };
  delete responseDoc.fileContentBase64;

  return responseDoc;
}

module.exports = {
  checkGoogleConnection,
  searchDriveFiles,
  searchGmailAttachments,
  importToDataRoom,
  buildDriveQuery,
  MIME_TYPE_MAP,
};
