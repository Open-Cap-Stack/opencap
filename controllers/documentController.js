/**
 * Document Controller - ZeroDB Migration
 *
 * Migrated from MongoDB/Mongoose to ZeroDB for Issue #19
 * Provides CRUD operations for documents with vector search capabilities
 */

const zerodbService = require('../services/zerodbService');
const vectorService = require('../services/vectorService');
const websocketService = require('../services/websocketService');
const fileStorageService = require('../services/fileStorageService');
const eventStreamingService = require('../services/eventStreamingService');
const DocumentFolder = require('../models/DocumentFolder');
const { errorResponse } = require('../middleware/errorResponse');

const crypto = require('crypto');

const TABLE_NAME = 'documents';

/**
 * Helper to unwrap ZeroDB response data
 * ZeroDB returns { data: [{ row_data: {...}, row_id: ... }] }
 * This function extracts row_data and adds row_id as id/_id
 */
function unwrapZeroDBResponse(result) {
    const rawData = result.data || result.rows || result || [];
    if (Array.isArray(rawData)) {
        return rawData.map(item => {
            if (item.row_data) {
                // ZeroDB format: merge row_data with row_id as id
                return {
                    ...item.row_data,
                    id: item.row_id || item.row_data.id,
                    _id: item.row_id || item.row_data._id || item.row_data.id,
                    row_id: item.row_id
                };
            }
            return item;
        });
    }
    return rawData;
}

/**
 * Generate a UUID v4
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Create a new document with vector indexing
 */
exports.createDocument = async (req, res) => {
    try {
        const now = new Date().toISOString();
        // Generate ID upfront so it's stored in row_data and can be queried
        const documentId = generateUUID();

        // Validate folder exists if folderId is provided
        if (req.body.folderId) {
            const folder = await DocumentFolder.findByFolderId(req.body.folderId);
            if (!folder) {
                return errorResponse(res, 400, 'Folder not found');
            }
            console.log('Document will be saved to folder:', { folderId: folder.folderId, folderName: folder.name });
        }

        // Extract file metadata from multer upload (req.file)
        const file = req.file;
        let fileMetadata = {};
        let persistentFileId = null;

        if (file) {
            fileMetadata = {
                fileName: file.originalname,
                name: file.originalname,
                title: req.body.name || req.body.title || file.originalname,
                originalFilename: file.originalname,
                size: file.size,
                fileSize: file.size,
                contentType: file.mimetype,
                mimeType: file.mimetype,
                storagePath: file.path,
                filePath: file.path
            };
            console.log('File uploaded locally:', { name: file.originalname, size: file.size, type: file.mimetype });

            // Upload file to persistent storage (ZeroDB file storage)
            // CRITICAL: On Railway (ephemeral storage), this MUST succeed or the file will be lost
            const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
            try {
                const uploadResult = await fileStorageService.uploadFileFromPath(file.path, {
                    companyId: req.user?.companyId,
                    uploadedBy: req.user?.userId,
                    category: req.body.category,
                    metadata: {
                        documentId: documentId,
                        originalName: file.originalname
                    }
                });
                persistentFileId = uploadResult.id || uploadResult.fileKey;
                fileMetadata.fileId = persistentFileId;
                console.log('File uploaded to persistent storage:', { fileId: persistentFileId });

                // Clean up local temp file after successful upload
                const fs = require('fs');
                fs.unlink(file.path, (err) => {
                    if (err) console.warn('Failed to clean up temp file:', err.message);
                });
                // Clear local paths since file is now in persistent storage
                delete fileMetadata.storagePath;
                delete fileMetadata.filePath;
            } catch (uploadError) {
                console.error('Failed to upload to persistent storage:', uploadError.message);
                // On Railway, fail the request - local files won't persist
                if (isRailway) {
                    // Clean up the temp file
                    const fs = require('fs');
                    fs.unlink(file.path, () => {});
                    return errorResponse(res, 500, 'Failed to upload file to storage. Please try again.', uploadError);
                }
                // On local dev, keep local file as fallback
                console.warn('Keeping local file as fallback (development only)');
            }
        }

        const documentData = {
            ...req.body,
            ...fileMetadata,
            id: documentId,
            _id: documentId,
            fileId: persistentFileId,
            companyId: req.body.companyId || req.user?.companyId || null,
            uploadedBy: req.user?.userId,
            uploadedAt: now,
            createdAt: now,
            updatedAt: now,
            status: req.body.status || 'active',
            folderId: req.body.folderId || null
        };

        // Insert into ZeroDB
        const result = await zerodbService.insertRow(TABLE_NAME, documentData);

        // Extract the saved document from ZeroDB response
        // ZeroDB returns { data: [{ row_id, row_data, ... }] }
        const insertedRow = result.data?.[0] || result.rows?.[0] || result;
        const savedDocument = {
            ...documentData,
            ...insertedRow.row_data,
            id: documentData.id,
            _id: documentData.id,
            row_id: insertedRow.row_id
        };

        // Index document for vector search if content is provided
        if (savedDocument.content || savedDocument.description) {
            try {
                await vectorService.indexDocument({
                    id: savedDocument.id || savedDocument._id,
                    title: savedDocument.title,
                    content: savedDocument.content || savedDocument.description,
                    category: savedDocument.category,
                    tags: savedDocument.tags || [],
                    metadata: {
                        uploadedBy: savedDocument.uploadedBy,
                        companyId: savedDocument.companyId,
                        accessLevel: savedDocument.accessLevel
                    }
                });
            } catch (vectorError) {
                console.warn('Vector indexing failed:', vectorError.message);
                // Don't fail document creation if vector indexing fails
            }
        }

        // Broadcast document creation event
        websocketService.broadcastDocumentEvent('created', savedDocument);

        // Send notification to relevant users
        websocketService.broadcastNotification({
            type: 'document_created',
            title: 'New Document Created',
            message: `${savedDocument.title} has been created`,
            data: { documentId: savedDocument.id || savedDocument._id }
        });

        res.status(201).json(savedDocument);
    } catch (error) {
        errorResponse(res, 400, error.message, error);
    }
};

/**
 * Get all documents with search and filtering
 * Simplified for ZeroDB compatibility (no MongoDB operators)
 */
exports.getDocuments = async (req, res) => {
    try {
        const {
            search,
            category,
            tags,
            accessLevel,
            companyId,
            folderId,
            page = 1,
            limit = 10,
            sortBy = 'uploadedAt',
            sortOrder = 'desc'
        } = req.query;

        // Build simple filter object (ZeroDB only supports basic equality)
        let filter = {};

        // Multi-tenant: scope to company
        const effectiveCompanyId = companyId || req.user?.companyId;
        if (effectiveCompanyId) {
            filter.companyId = effectiveCompanyId;
        }

        // Add category filter
        if (category) {
            filter.category = category;
        }

        // Add access level filter
        if (accessLevel) {
            filter.accessLevel = accessLevel;
        }

        // Get all documents with basic filter
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter,
            limit: 1000 // Get more documents for JS filtering
        });

        let documents = unwrapZeroDBResponse(result);

        // Filter out deleted documents in JS
        documents = documents.filter(doc => doc.status !== 'deleted');

        // Apply folder filter if provided
        if (folderId !== undefined) {
            if (folderId === '' || folderId === 'null' || folderId === 'root') {
                // Get documents in root (no folder)
                documents = documents.filter(doc => !doc.folderId);
            } else {
                // Get documents in specific folder
                documents = documents.filter(doc => doc.folderId === folderId);
            }
        }

        // CRITICAL: Apply user-level access control filtering
        // Users should only see documents they have access to
        if (req.user?.role !== 'admin') {
            documents = documents.filter(doc => {
                // Public documents are visible to everyone
                if (doc.accessLevel === 'public') return true;
                // Document owner has access
                if (doc.uploadedBy === req.user?.userId) return true;
                // Users in sharedWith array have access
                if (doc.sharedWith && doc.sharedWith.includes(req.user?.userId)) return true;
                // Company-level documents are accessible to users in same company
                if (doc.accessLevel === 'company' && doc.companyId === req.user?.companyId) return true;
                // Default: no access
                return false;
            });
        }

        // Apply search filter in JS if provided
        if (search) {
            const searchLower = search.toLowerCase();
            documents = documents.filter(doc =>
                (doc.name && doc.name.toLowerCase().includes(searchLower)) ||
                (doc.title && doc.title.toLowerCase().includes(searchLower)) ||
                (doc.description && doc.description.toLowerCase().includes(searchLower)) ||
                (doc.category && doc.category.toLowerCase().includes(searchLower)) ||
                (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        // Apply tags filter in JS
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',');
            documents = documents.filter(doc =>
                doc.tags && doc.tags.some(tag => tagArray.includes(tag))
            );
        }

        // Sort documents
        const sortMultiplier = sortOrder === 'desc' ? -1 : 1;
        documents.sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            if (aVal < bVal) return -1 * sortMultiplier;
            if (aVal > bVal) return 1 * sortMultiplier;
            return 0;
        });

        // Apply pagination
        const total = documents.length;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        documents = documents.slice(skip, skip + parseInt(limit));

        res.status(200).json({
            documents,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            },
            searchPerformed: !!search
        });
    } catch (error) {
        console.error('Error getting documents:', error.message);
        errorResponse(res, 500, error.message, error);
    }
};

/**
 * Helper to find document by ID (handles both stored id and row_id)
 */
async function findDocumentById(documentId) {
    // First try to find by stored id field
    let result = await zerodbService.queryTable(TABLE_NAME, {
        filter: { id: documentId },
        limit: 1
    });

    let documents = unwrapZeroDBResponse(result);
    if (documents.length > 0) {
        return documents[0];
    }

    // If not found, search all documents and match by row_id
    const allResult = await zerodbService.queryTable(TABLE_NAME, { limit: 1000 });
    const rawData = allResult.data || allResult.rows || allResult || [];

    const matchingRow = rawData.find(item => item.row_id === documentId);
    if (matchingRow) {
        return {
            ...matchingRow.row_data,
            id: matchingRow.row_id,
            _id: matchingRow.row_id,
            row_id: matchingRow.row_id
        };
    }

    return null;
}

/**
 * Get a document by ID
 */
exports.getDocumentById = async (req, res) => {
    try {
        const document = await findDocumentById(req.params.id);

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        res.status(200).json(document);
    } catch (error) {
        errorResponse(res, 500, error.message, error);
    }
};

/**
 * Update a document by ID with vector re-indexing
 */
exports.updateDocumentById = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        // Update in ZeroDB
        await zerodbService.updateRows(TABLE_NAME, {
            filter: { id: req.params.id },
            update: updateData
        });

        // Fetch the updated document
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const documents = unwrapZeroDBResponse(result);
        const document = documents[0];

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        // Re-index document for vector search if content changed
        if (req.body.content || req.body.description || req.body.title) {
            try {
                await vectorService.indexDocument({
                    id: document.id || document._id,
                    title: document.title,
                    content: document.content || document.description,
                    category: document.category,
                    tags: document.tags || [],
                    metadata: {
                        uploadedBy: document.uploadedBy,
                        companyId: document.companyId,
                        accessLevel: document.accessLevel
                    }
                });
            } catch (vectorError) {
                console.warn('Vector re-indexing failed:', vectorError.message);
            }
        }

        // Broadcast document update event
        websocketService.broadcastDocumentEvent('updated', document);

        // Send notification to relevant users
        websocketService.broadcastNotification({
            type: 'document_updated',
            title: 'Document Updated',
            message: `${document.title} has been updated`,
            data: { documentId: document.id || document._id }
        });

        res.status(200).json(document);
    } catch (error) {
        errorResponse(res, 400, error.message, error);
    }
};

/**
 * Delete a document by ID
 */
exports.deleteDocumentById = async (req, res) => {
    try {
        // Find the document first
        const document = await findDocumentById(req.params.id);

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        // Delete from ZeroDB - use row_id if available for direct deletion
        if (document.row_id) {
            // Direct delete by row_id (most reliable)
            await zerodbService.deleteRowById(TABLE_NAME, document.row_id);
        } else {
            // Fallback to filter-based delete
            await zerodbService.deleteRows(TABLE_NAME, { filter: { id: req.params.id } });
        }

        // Remove from vector index
        try {
            await vectorService.deleteDocument(req.params.id);
        } catch (vectorError) {
            console.warn('Vector deletion failed:', vectorError.message);
        }

        // Broadcast document deletion event
        websocketService.broadcastDocumentEvent('deleted', document);

        // Send notification to relevant users
        websocketService.broadcastNotification({
            type: 'document_deleted',
            title: 'Document Deleted',
            message: `${document.title} has been deleted`,
            data: { documentId: document.id || document._id }
        });

        res.status(200).json({ message: 'Document deleted' });
    } catch (error) {
        errorResponse(res, 500, error.message, error);
    }
};

/**
 * Semantic search for documents
 */
exports.searchDocuments = async (req, res) => {
    try {
        const { query, limit = 10, threshold = 0.3, namespace = 'documents' } = req.body;

        if (!query) {
            return errorResponse(res, 400, 'Search query is required');
        }

        // Perform vector search
        const searchResults = await vectorService.searchSimilarDocuments(query, {
            limit: parseInt(limit),
            threshold: parseFloat(threshold),
            namespace
        });

        // Get full document details for results
        const documentIds = searchResults.map(result => result.metadata.id);

        if (documentIds.length === 0) {
            return res.status(200).json({
                results: [],
                count: 0,
                query
            });
        }

        // Get all documents from ZeroDB (no complex filters)
        const result = await zerodbService.queryTable(TABLE_NAME, { filter: {}, limit: 1000 });
        let documents = unwrapZeroDBResponse(result);

        // Filter to only include documents from search results
        documents = documents.filter(doc => {
            const docId = doc.id || doc._id;
            return documentIds.includes(docId);
        });

        // Apply access level filtering in JavaScript
        if (req.user?.role !== 'admin') {
            documents = documents.filter(doc => {
                // Public documents
                if (doc.accessLevel === 'public') return true;
                // Owner access
                if (doc.uploadedBy === req.user?.userId) return true;
                // Shared with user
                if (doc.sharedWith && doc.sharedWith.includes(req.user?.userId)) return true;
                return false;
            });
        }

        // Add company filter
        if (req.user?.companyId && req.user?.role !== 'admin') {
            const userCompanyId = req.user.companyId;
            documents = documents.filter(doc => doc.companyId === userCompanyId);
        }

        // Combine documents with relevance scores
        const results = documents.map(doc => {
            const docId = doc.id || doc._id;
            const searchResult = searchResults.find(r => r.metadata.id === docId);
            return {
                document: doc,
                relevanceScore: searchResult?.score || 0,
                matchedContent: searchResult?.metadata?.excerpt || ''
            };
        });

        // Sort by relevance score
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        res.status(200).json({
            results,
            count: results.length,
            query,
            searchPerformed: true
        });
    } catch (error) {
        console.error('Document search error:', error.message);
        errorResponse(res, 500, 'Search failed', error);
    }
};

/**
 * Find similar documents to a given document
 */
exports.findSimilarDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 5, threshold = 0.5 } = req.query;

        // Get the reference document from ZeroDB
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id },
            limit: 1
        });

        const documents = unwrapZeroDBResponse(result);
        const referenceDoc = documents[0];

        if (!referenceDoc) {
            return errorResponse(res, 404, 'Reference document not found');
        }

        // Check access permissions
        if (req.user?.role !== 'admin') {
            const hasAccess = referenceDoc.accessLevel === 'public' ||
                             referenceDoc.uploadedBy === req.user?.userId ||
                             (referenceDoc.sharedWith && referenceDoc.sharedWith.includes(req.user?.userId));

            if (!hasAccess) {
                return errorResponse(res, 403, 'Access denied to reference document');
            }
        }

        const similarDocs = await vectorService.findSimilarDocuments(id, {
            limit: parseInt(limit),
            threshold: parseFloat(threshold),
            excludeIds: [id]
        });

        // Get full document details
        const documentIds = similarDocs.map(result => result.metadata.id);

        if (documentIds.length === 0) {
            return res.status(200).json({
                referenceDocument: referenceDoc,
                similarDocuments: [],
                count: 0
            });
        }

        // Get all documents from ZeroDB (no complex filters)
        const docsResult = await zerodbService.queryTable(TABLE_NAME, { filter: {}, limit: 1000 });
        let docsData = unwrapZeroDBResponse(docsResult);

        // Filter to only include documents from similar results
        docsData = docsData.filter(doc => {
            const docId = doc.id || doc._id;
            return documentIds.includes(docId);
        });

        // Apply access filtering in JavaScript
        if (req.user?.role !== 'admin') {
            docsData = docsData.filter(doc => {
                if (doc.accessLevel === 'public') return true;
                if (doc.uploadedBy === req.user?.userId) return true;
                if (doc.sharedWith && doc.sharedWith.includes(req.user?.userId)) return true;
                return false;
            });
        }

        if (req.user?.companyId && req.user?.role !== 'admin') {
            const userCompanyId = req.user.companyId;
            docsData = docsData.filter(doc => doc.companyId === userCompanyId);
        }

        // Combine with similarity scores
        const results = docsData.map(doc => {
            const docId = doc.id || doc._id;
            const simResult = similarDocs.find(r => r.metadata.id === docId);
            return {
                document: doc,
                similarityScore: simResult?.score || 0
            };
        });

        results.sort((a, b) => b.similarityScore - a.similarityScore);

        res.status(200).json({
            referenceDocument: referenceDoc,
            similarDocuments: results,
            count: results.length
        });
    } catch (error) {
        console.error('Similar documents error:', error.message);
        errorResponse(res, 500, 'Failed to find similar documents', error);
    }
};

/**
 * Get document analytics and insights
 */
exports.getDocumentAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        // Get document from ZeroDB
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id },
            limit: 1
        });

        const documents = unwrapZeroDBResponse(result);
        const document = documents[0];

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        // Check access permissions
        if (req.user?.role !== 'admin') {
            const hasAccess = document.accessLevel === 'public' ||
                             document.uploadedBy === req.user?.userId ||
                             (document.sharedWith && document.sharedWith.includes(req.user?.userId));

            if (!hasAccess) {
                return errorResponse(res, 403, 'Access denied');
            }
        }

        // Get analytics from vector service
        const analytics = await vectorService.getDocumentAnalytics(id);

        res.status(200).json({
            document: {
                id: document.id || document._id,
                title: document.title,
                category: document.category
            },
            analytics
        });
    } catch (error) {
        console.error('Document analytics error:', error.message);
        errorResponse(res, 500, 'Failed to get document analytics', error);
    }
};

/**
 * Get general document analytics (not specific to a document)
 */
exports.getGeneralAnalytics = async (req, res) => {
    try {
        const { companyId } = req.query;

        // Build simple filter (ZeroDB only supports basic equality)
        const filter = {};
        if (companyId) {
            filter.ownerCompany = companyId;
        }

        // Get all documents
        const result = await zerodbService.queryTable(TABLE_NAME, { filter, limit: 1000 });
        let docs = unwrapZeroDBResponse(result);

        // Filter out deleted documents in JavaScript
        docs = docs.filter(d => d.status !== 'deleted');

        // Apply user-level access control filtering for non-admin users
        if (req.user?.role !== 'admin') {
            docs = docs.filter(doc => {
                if (doc.accessLevel === 'public') return true;
                if (doc.uploadedBy === req.user?.userId) return true;
                if (doc.sharedWith && doc.sharedWith.includes(req.user?.userId)) return true;
                if (doc.accessLevel === 'company' && doc.companyId === req.user?.companyId) return true;
                return false;
            });
        }

        // Calculate analytics
        const totalDocuments = docs.length;
        const pendingSignatures = docs.filter(d => d.status === 'pending_signature').length;
        const sharedDocuments = docs.filter(d => d.accessControl?.isPublic || d.accessLevel === 'public').length;

        // Calculate total storage (sum of file sizes)
        const totalStorageBytes = docs.reduce((sum, d) => sum + (d.size || 0), 0);
        const totalStorageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(1);

        // Document types breakdown
        const documentTypes = {};
        docs.forEach(d => {
            const type = d.category || d.documentType || 'Other';
            documentTypes[type] = (documentTypes[type] || 0) + 1;
        });

        res.status(200).json({
            total_documents: totalDocuments,
            pending_signatures: pendingSignatures,
            shared_documents: sharedDocuments,
            total_storage_gb: parseFloat(totalStorageGB),
            document_types: documentTypes
        });
    } catch (error) {
        console.error('General analytics error:', error.message);
        errorResponse(res, 500, 'Failed to get document analytics', error);
    }
};

/**
 * Bulk index documents for vector search
 */
exports.bulkIndexDocuments = async (req, res) => {
    try {
        // Check admin permissions
        if (req.user?.role !== 'admin') {
            return errorResponse(res, 403, 'Admin access required');
        }

        const { force = 'false' } = req.query;
        const forceIndex = force === 'true';

        // Get all documents (ZeroDB only supports basic equality filters)
        const result = await zerodbService.queryTable(TABLE_NAME, { filter: {}, limit: 1000 });
        let documents = unwrapZeroDBResponse(result);

        // Filter out deleted documents in JavaScript
        documents = documents.filter(doc => doc.status !== 'deleted');

        // If not forcing, only index documents that haven't been indexed yet
        if (!forceIndex) {
            documents = documents.filter(doc => doc.vectorIndexed !== true);
        }

        let indexed = 0;
        let failed = 0;
        const errors = [];

        for (const doc of documents) {
            try {
                if (doc.content || doc.description) {
                    await vectorService.indexDocument({
                        id: doc.id || doc._id,
                        title: doc.title,
                        content: doc.content || doc.description,
                        category: doc.category,
                        tags: doc.tags || [],
                        metadata: {
                            uploadedBy: doc.uploadedBy,
                            companyId: doc.companyId,
                            accessLevel: doc.accessLevel
                        }
                    });

                    // Mark as indexed
                    await zerodbService.updateRows(TABLE_NAME, {
                        filter: { id: doc.id || doc._id },
                        update: { vectorIndexed: true }
                    });
                    indexed++;
                }
            } catch (error) {
                failed++;
                errors.push({
                    documentId: doc.id || doc._id,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            message: 'Bulk indexing completed',
            summary: {
                total: documents.length,
                indexed,
                failed,
                errors: errors.slice(0, 10) // Limit error details
            }
        });
    } catch (error) {
        console.error('Bulk indexing error:', error.message);
        errorResponse(res, 500, 'Bulk indexing failed', error);
    }
};

/**
 * Helper function to check document access permissions
 * @param {Object} document - The document to check access for
 * @param {Object} user - The requesting user
 * @returns {boolean} - Whether the user has access
 */
const checkDocumentAccess = (document, user) => {
    // Admin users have access to all documents
    if (user?.role === 'admin') {
        return true;
    }

    // Public documents are accessible to everyone
    if (document.accessLevel === 'public') {
        return true;
    }

    // Document owner has access
    if (document.uploadedBy === user?.userId) {
        return true;
    }

    // Users in sharedWith array have access
    if (document.sharedWith && document.sharedWith.includes(user?.userId)) {
        return true;
    }

    // Company-level documents are accessible to users in the same company
    if (document.accessLevel === 'company' && document.companyId === user?.companyId) {
        return true;
    }

    return false;
};

/**
 * Get preview type based on content type
 * @param {string} contentType - MIME type of the file
 * @returns {Object} - Preview info with type and availability
 */
const getPreviewInfo = (contentType) => {
    // PDF files
    if (contentType === 'application/pdf') {
        return { previewAvailable: true, previewType: 'pdf' };
    }

    // Image files
    if (contentType && contentType.startsWith('image/')) {
        return { previewAvailable: true, previewType: 'image' };
    }

    // Word documents
    if (contentType === 'application/msword' ||
        contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return { previewAvailable: true, previewType: 'document' };
    }

    // Excel spreadsheets
    if (contentType === 'application/vnd.ms-excel' ||
        contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return { previewAvailable: true, previewType: 'spreadsheet' };
    }

    // Text files
    if (contentType === 'text/plain' || contentType === 'text/csv') {
        return { previewAvailable: true, previewType: 'text' };
    }

    // Unsupported types
    return { previewAvailable: false, previewType: null };
};

/**
 * Download a document file
 * Issue #122: Document download endpoint
 * Issue #235: Fixed ephemeral storage issue on Railway
 */
exports.downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { attachment = 'true' } = req.query;

        // Get document from ZeroDB using findDocumentById helper
        const document = await findDocumentById(id);

        if (!document) {
            console.warn(`Document not found: ${id}`);
            return errorResponse(res, 404, 'Document not found');
        }

        // Check access permissions
        if (!checkDocumentAccess(document, req.user)) {
            return errorResponse(res, 403, 'Access denied');
        }

        // Check if document has a file attached (local path or fileId)
        const localFilePath = document.storagePath || document.filePath;
        const hasLocalFile = localFilePath && require('fs').existsSync(localFilePath);
        const hasRemoteFile = document.fileId;

        // Log file location details for debugging
        console.log(`Download request for document ${id}:`, {
            hasLocalFile,
            localFilePath: localFilePath || 'none',
            hasRemoteFile: !!hasRemoteFile,
            fileId: document.fileId || 'none'
        });

        if (!hasLocalFile && !hasRemoteFile) {
            console.error(`No file attached to document ${id}. Local path: ${localFilePath}, FileId: ${document.fileId}`);
            return errorResponse(res, 404, 'File not available. The file may have been deleted or failed to upload.');
        }

        const contentType = document.contentType || document.mimeType || 'application/octet-stream';
        const fileName = document.fileName || document.originalFilename || document.name || 'document';
        const disposition = attachment === 'true' ? 'attachment' : 'inline';

        // If file is stored locally (via multer), serve it directly
        if (hasLocalFile) {
            const fs = require('fs');
            const stat = fs.statSync(localFilePath);

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
            res.setHeader('Content-Length', stat.size);

            // Log download in audit trail
            try {
                await eventStreamingService.publishEvent({
                    topic: 'document.downloaded',
                    payload: {
                        documentId: document.id || document._id,
                        fileName: fileName,
                        userId: req.user?.userId,
                        timestamp: new Date().toISOString()
                    },
                    metadata: {
                        actorId: req.user?.userId,
                        action: 'download'
                    }
                });
            } catch (auditError) {
                console.warn('Audit logging failed:', auditError.message);
            }

            const fileStream = fs.createReadStream(localFilePath);
            return fileStream.pipe(res);
        }

        // Download file from persistent storage service (ZeroDB)
        let fileData;
        try {
            console.log(`Downloading file from storage: ${document.fileId}`);
            fileData = await fileStorageService.downloadFile(document.fileId, {
                includeMetadata: true
            });
        } catch (fileError) {
            console.error(`File download error for fileId ${document.fileId}:`, fileError.message);
            // Check if it's a "not found" error
            if (fileError.message.includes('not found') || fileError.message.includes('404')) {
                return errorResponse(res, 404, 'File not found in storage. It may have been deleted.');
            }
            return errorResponse(res, 500, 'Failed to download file from storage', fileError);
        }

        // Set response headers

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);

        if (fileData.size) {
            res.setHeader('Content-Length', fileData.size);
        }

        // Log download in audit trail
        try {
            await eventStreamingService.publishEvent({
                topic: 'document.downloaded',
                payload: {
                    documentId: document.id || document._id,
                    fileName: document.fileName,
                    userId: req.user?.userId,
                    timestamp: new Date().toISOString()
                },
                metadata: {
                    actorId: req.user?.userId,
                    action: 'download'
                }
            });
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
            // Don't fail the download if audit logging fails
        }

        // Send the file data
        res.status(200).send(fileData.data);
    } catch (error) {
        console.error('Document download error:', error.message);
        errorResponse(res, 500, 'Failed to download document', error);
    }
};

/**
 * Get document preview metadata
 * Issue #122: Document preview endpoint
 */
exports.getDocumentPreview = async (req, res) => {
    try {
        const { id } = req.params;

        // Get document from ZeroDB using findDocumentById helper
        const document = await findDocumentById(id);

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        // Check access permissions
        if (!checkDocumentAccess(document, req.user)) {
            return errorResponse(res, 403, 'Access denied');
        }

        // Check if document has a file attached (local path or fileId)
        const localFilePath = document.storagePath || document.filePath;
        const hasLocalFile = localFilePath && require('fs').existsSync(localFilePath);
        const hasRemoteFile = document.fileId;

        if (!hasLocalFile && !hasRemoteFile) {
            return errorResponse(res, 404, 'No file attached to document');
        }

        let contentType = document.contentType || document.mimeType;
        let fileSize = document.fileSize || document.size;
        let fileName = document.fileName || document.originalFilename || document.name;

        // If file is stored locally, get metadata from the file
        if (hasLocalFile) {
            const fs = require('fs');
            const stat = fs.statSync(localFilePath);
            fileSize = fileSize || stat.size;
        } else if (hasRemoteFile) {
            // Get file metadata from storage service
            try {
                const fileMetadata = await fileStorageService.getFileMetadata(document.fileId);
                contentType = contentType || fileMetadata.contentType;
                fileSize = fileSize || fileMetadata.size;
                fileName = fileName || fileMetadata.fileName;
            } catch (metadataError) {
                console.error('File metadata error:', metadataError.message);
                // Continue with document metadata only
            }
        }

        const previewInfo = getPreviewInfo(contentType);

        // Build response
        const response = {
            documentId: document.id || document._id,
            fileName: fileName || 'document',
            contentType: contentType || 'application/octet-stream',
            fileSize: fileSize || 0,
            ...previewInfo
        };

        // Add message for unsupported types
        if (!previewInfo.previewAvailable) {
            response.message = 'Preview not available for this file type';
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Document preview error:', error.message);
        errorResponse(res, 500, 'Failed to get document preview', error);
    }
};

/**
 * Get document access permissions
 * Issue #122: Document access endpoint
 */
exports.getDocumentAccess = async (req, res) => {
    try {
        const { id } = req.params;

        // Get document from ZeroDB using findDocumentById helper
        const document = await findDocumentById(id);

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        // Check if user has any access to view access info
        // For private documents, only owner, shared users, admins, or same company users can see access info
        const hasBasicAccess = checkDocumentAccess(document, req.user);

        if (!hasBasicAccess) {
            return errorResponse(res, 403, 'Access denied');
        }

        // Determine current user's permissions
        const isAdmin = req.user?.role === 'admin';
        const isOwner = document.uploadedBy === req.user?.userId;

        // Calculate permissions
        const currentUserPermissions = {
            canView: true, // If they got this far, they can view
            canDownload: true, // View implies download for most cases
            canEdit: isAdmin || isOwner,
            canDelete: isAdmin || isOwner,
            canShare: isAdmin || isOwner
        };

        // Build response
        const response = {
            documentId: document.id || document._id,
            accessLevel: document.accessLevel,
            owner: document.uploadedBy,
            sharedWith: document.sharedWith || [],
            currentUserPermissions
        };

        // Add permissions object if it exists on the document
        if (document.permissions) {
            response.permissions = document.permissions;
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Document access error:', error.message);
        errorResponse(res, 500, 'Failed to get document access info', error);
    }
};

/**
 * Log document access (view, download, edit)
 * Issue #122: Document access logging endpoint
 */
exports.logDocumentAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { accessType, accessedAt } = req.body;

        // Validate access type
        const validAccessTypes = ['view', 'download', 'edit'];
        if (!accessType || !validAccessTypes.includes(accessType)) {
            return errorResponse(res, 400, 'Invalid access type. Must be one of: view, download, edit');
        }

        // Get document from ZeroDB using findDocumentById helper
        const document = await findDocumentById(id);

        if (!document) {
            return errorResponse(res, 404, 'Document not found');
        }

        // Check if user has access to the document
        if (!checkDocumentAccess(document, req.user)) {
            return errorResponse(res, 403, 'Access denied');
        }

        // Create access log entry
        const accessLogId = generateUUID();
        const accessLog = {
            id: accessLogId,
            _id: accessLogId,
            documentId: document.id || document._id,
            userId: req.user?.userId,
            accessType: accessType,
            accessedAt: accessedAt || new Date().toISOString(),
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent')
        };

        // Store access log in a separate table (or append to document)
        try {
            await zerodbService.insertRow('document_access_logs', accessLog);
        } catch (logError) {
            console.warn('Failed to store access log:', logError.message);
            // Don't fail the request if logging fails
        }

        // Publish access event
        try {
            await eventStreamingService.publishEvent({
                topic: `document.${accessType}`,
                payload: {
                    documentId: document.id || document._id,
                    fileName: document.fileName || document.name,
                    userId: req.user?.userId,
                    accessType: accessType,
                    timestamp: accessLog.accessedAt
                },
                metadata: {
                    actorId: req.user?.userId,
                    action: accessType
                }
            });
        } catch (eventError) {
            console.warn('Failed to publish access event:', eventError.message);
        }

        res.status(201).json(accessLog);
    } catch (error) {
        console.error('Log document access error:', error.message);
        errorResponse(res, 500, 'Failed to log document access', error);
    }
};

/**
 * Folder Management Endpoints
 * Issue #188: Add Document Folder Management Endpoints
 */

/**
 * Create a new folder
 */
exports.createFolder = async (req, res) => {
    try {
        const folderData = {
            name: req.body.name,
            parentId: req.body.parentId || null,
            description: req.body.description || '',
            metadata: req.body.metadata || {},
            ownerCompany: req.user?.companyId,
            createdBy: req.user?.userId
        };

        const folder = await DocumentFolder.create(folderData);

        res.status(201).json(folder);
    } catch (error) {
        console.error('Create folder error:', error.message);
        errorResponse(res, 400, error.message, error);
    }
};

/**
 * Get all folders for company (optionally filtered by parent)
 */
exports.getFolders = async (req, res) => {
    try {
        const { parentId } = req.query;

        let folders;
        if (parentId) {
            // Get child folders of specific parent
            folders = await DocumentFolder.findByParentId(parentId);
        } else {
            // Get root folders for company
            folders = await DocumentFolder.findRootFolders(req.user?.companyId);
        }

        res.status(200).json({ folders });
    } catch (error) {
        console.error('Get folders error:', error.message);
        errorResponse(res, 500, error.message, error);
    }
};

/**
 * Get folder by ID with breadcrumbs
 */
exports.getFolderById = async (req, res) => {
    try {
        const { id } = req.params;

        const folder = await DocumentFolder.findByFolderId(id);

        if (!folder) {
            return errorResponse(res, 404, 'Folder not found');
        }

        // Get breadcrumbs for navigation
        const breadcrumbs = await DocumentFolder.getBreadcrumbs(folder);

        res.status(200).json({
            ...folder,
            breadcrumbs
        });
    } catch (error) {
        console.error('Get folder error:', error.message);
        errorResponse(res, 500, error.message, error);
    }
};

/**
 * Update folder by ID
 */
exports.updateFolderById = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            name: req.body.name,
            parentId: req.body.parentId,
            description: req.body.description,
            metadata: req.body.metadata
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedFolder = await DocumentFolder.update(id, updateData);

        res.status(200).json(updatedFolder);
    } catch (error) {
        console.error('Update folder error:', error.message);
        errorResponse(res, 400, error.message, error);
    }
};

/**
 * Delete folder by ID
 */
exports.deleteFolderById = async (req, res) => {
    try {
        const { id } = req.params;

        await DocumentFolder.delete(id);

        res.status(200).json({ message: 'Folder deleted successfully' });
    } catch (error) {
        console.error('Delete folder error:', error.message);
        errorResponse(res, 400, error.message, error);
    }
};

/**
 * Get folder contents (child folders and documents)
 */
exports.getFolderContents = async (req, res) => {
    try {
        const { id } = req.params;

        const contents = await DocumentFolder.getContents(id);

        res.status(200).json(contents);
    } catch (error) {
        console.error('Get folder contents error:', error.message);
        if (error.message === 'Folder not found') {
            errorResponse(res, 404, error.message);
        } else {
            errorResponse(res, 500, error.message, error);
        }
    }
};
