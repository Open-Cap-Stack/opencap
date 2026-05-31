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
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{ connected: boolean, email: string|null }>}
 */
async function getStoredToken(userId, provider = 'google') {
  try {
    const result = await zerodbService.queryTable('integrations', {
      filter: { userId, provider },
      limit: 1,
    });
    const rows = result.data || result.rows || [];
    const integration = rows[0]?.row_data || rows[0];
    if (integration && integration.accessToken) {
      // Check if token is expired
      if (integration.tokenExpiry && new Date(integration.tokenExpiry) < new Date()) {
        // Try to refresh
        if (integration.refreshToken) {
          try {
            const axios = require('axios');
            const { data: refreshed } = await axios.post('https://oauth2.googleapis.com/token', {
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              refresh_token: integration.refreshToken,
              grant_type: 'refresh_token',
            });
            // Update stored token
            await zerodbService.updateRows('integrations', {
              filter: { userId, provider },
              update: {
                accessToken: refreshed.access_token,
                tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
              },
            });
            return refreshed.access_token;
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr.message);
            return null;
          }
        }
        return null;
      }
      return integration.accessToken;
    }
  } catch (err) {
    // Table may not exist
  }
  return null;
}

async function checkGoogleConnection(userId) {
  if (!userId) {
    return { connected: false, email: null };
  }

  try {
    // Look for a stored Google OAuth token in the integrations table
    // Check both 'google' and 'gmail' providers
    const result = await zerodbService.queryTable('integrations', {
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

  // Get the stored access token
  const token = await getStoredToken(userId, 'google');
  if (!token) {
    return { connected: true, message: 'Token expired — reconnect Google account', files: [] };
  }

  try {
    const typeArray = types ? types.split(',').map(t => t.trim()) : [];
    const q = buildDriveQuery(query, typeArray);
    const axios = require('axios');
    const { data } = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q,
        pageSize: limit,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)',
      },
    });
    return { connected: true, files: data.files || [] };
  } catch (err) {
    console.error('Google Drive API error:', err.response?.data?.error?.message || err.message);
    return { connected: true, error: err.response?.data?.error?.message || err.message, files: [] };
  }
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

  const token = await getStoredToken(userId, 'google') || await getStoredToken(userId, 'gmail');
  if (!token) {
    return { connected: true, message: 'Token expired — reconnect Google account', attachments: [] };
  }

  try {
    const axios = require('axios');
    let gmailQuery = `has:attachment ${query || ''}`.trim();
    if (newerThan) gmailQuery += ` newer_than:${newerThan}`;

    const { data: list } = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: gmailQuery, maxResults: limit },
    });

    const messages = list.messages || [];
    const attachments = [];

    for (const msg of messages.slice(0, 10)) {
      try {
        const { data: msgData } = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] },
        });
        const subject = msgData.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No subject';
        const from = msgData.payload?.headers?.find(h => h.name === 'From')?.value || '';
        const date = msgData.payload?.headers?.find(h => h.name === 'Date')?.value || '';
        const parts = msgData.payload?.parts || [];
        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              messageId: msg.id,
              attachmentId: part.body.attachmentId,
              fileName: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0,
              subject, from, date,
            });
          }
        }
      } catch { /* skip individual message errors */ }
    }

    return { connected: true, attachments };
  } catch (err) {
    console.error('Gmail API error:', err.response?.data?.error?.message || err.message);
    return { connected: true, error: err.response?.data?.error?.message || err.message, attachments: [] };
  }
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
