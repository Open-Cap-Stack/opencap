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

const TABLE_NAME = 'documents';

/**
 * Create a new document with vector indexing
 */
exports.createDocument = async (req, res) => {
    try {
        const now = new Date().toISOString();
        const documentData = {
            ...req.body,
            uploadedBy: req.user?.userId,
            uploadedAt: now,
            createdAt: now,
            updatedAt: now,
            status: req.body.status || 'active'
        };

        // Insert into ZeroDB
        const result = await zerodbService.insertRow(TABLE_NAME, documentData);
        const savedDocument = result.rows ? result.rows[0] : result;

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
        res.status(400).json({ message: error.message });
    }
};

/**
 * Get all documents with search and filtering
 */
exports.getDocuments = async (req, res) => {
    try {
        const {
            search,
            category,
            tags,
            accessLevel,
            companyId,
            page = 1,
            limit = 10,
            sortBy = 'uploadedAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        let filter = {};

        // Add user's company filter by default (unless admin)
        if (req.user?.role !== 'admin' && req.user?.companyId) {
            filter.companyId = req.user.companyId;
        }

        // Override with specific companyId if provided and user has permission
        if (companyId && req.user?.role === 'admin') {
            filter.companyId = companyId;
        }

        // Apply access level filtering based on user permissions
        if (req.user?.role !== 'admin') {
            filter.$or = [
                { accessLevel: 'public' },
                { uploadedBy: req.user?.userId },
                { sharedWith: { $in: [req.user?.userId] } }
            ];
        }

        // Add category filter
        if (category) {
            filter.category = category;
        }

        // Add tags filter
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',');
            filter.tags = { $in: tagArray };
        }

        // Add access level filter
        if (accessLevel) {
            filter.accessLevel = accessLevel;
        }

        // Add status filter (only show active documents by default)
        filter.status = { $ne: 'deleted' };

        let documents;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        // If search query provided, use vector search
        if (search) {
            try {
                // Get similar documents using vector search
                const searchResults = await vectorService.searchSimilarDocuments(search, {
                    limit: parseInt(limit),
                    threshold: 0.1,
                    namespace: 'documents'
                });

                // Get document IDs from search results
                const documentIds = searchResults.map(result => result.metadata.id);

                if (documentIds.length > 0) {
                    // Apply additional filters to search results
                    filter.id = { $in: documentIds };

                    const result = await zerodbService.queryTable(TABLE_NAME, {
                        filter,
                        skip,
                        limit: parseInt(limit),
                        sort: { [sortBy]: sortDirection }
                    });

                    documents = result.rows || result;

                    // Add relevance scores from vector search
                    documents = documents.map(doc => {
                        const docId = doc.id || doc._id;
                        const searchResult = searchResults.find(r => r.metadata.id === docId);
                        return {
                            ...doc,
                            relevanceScore: searchResult?.score || 0
                        };
                    });

                    // Sort by relevance score if search was performed
                    documents.sort((a, b) => b.relevanceScore - a.relevanceScore);
                } else {
                    documents = [];
                }
            } catch (vectorError) {
                console.warn('Vector search failed, falling back to text search:', vectorError.message);

                // Fallback to traditional text search
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ];

                const result = await zerodbService.queryTable(TABLE_NAME, {
                    filter,
                    skip,
                    limit: parseInt(limit),
                    sort: { [sortBy]: sortDirection }
                });

                documents = result.rows || result;
            }
        } else {
            // No search query, use regular filtering
            const result = await zerodbService.queryTable(TABLE_NAME, {
                filter,
                skip,
                limit: parseInt(limit),
                sort: { [sortBy]: sortDirection }
            });

            documents = result.rows || result;
        }

        // Get total count for pagination
        const total = await zerodbService.countRows(TABLE_NAME, filter);

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
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get a document by ID
 */
exports.getDocumentById = async (req, res) => {
    try {
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        await zerodbService.updateRows(TABLE_NAME,
            { id: req.params.id },
            { $set: updateData }
        );

        // Fetch the updated document
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
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
        res.status(400).json({ message: error.message });
    }
};

/**
 * Delete a document by ID
 */
exports.deleteDocumentById = async (req, res) => {
    try {
        // First get the document to return info about it
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Delete from ZeroDB
        await zerodbService.deleteRows(TABLE_NAME, { id: req.params.id });

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
        res.status(500).json({ message: error.message });
    }
};

/**
 * Semantic search for documents
 */
exports.searchDocuments = async (req, res) => {
    try {
        const { query, limit = 10, threshold = 0.3, namespace = 'documents' } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
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

        // Build access filter
        let accessFilter = { id: { $in: documentIds } };

        // Apply access level filtering based on user permissions
        if (req.user?.role !== 'admin') {
            accessFilter.$or = [
                { accessLevel: 'public' },
                { uploadedBy: req.user?.userId },
                { sharedWith: { $in: [req.user?.userId] } }
            ];
        }

        // Add company filter
        if (req.user?.companyId && req.user?.role !== 'admin') {
            accessFilter.companyId = req.user.companyId;
        }

        const result = await zerodbService.queryTable(TABLE_NAME, { filter: accessFilter });
        const documents = result.rows || result;

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
        console.error('Document search error:', error);
        res.status(500).json({ message: 'Search failed', error: error.message });
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

        const documents = result.rows || result;
        const referenceDoc = documents[0];

        if (!referenceDoc) {
            return res.status(404).json({ message: 'Reference document not found' });
        }

        // Check access permissions
        if (req.user?.role !== 'admin') {
            const hasAccess = referenceDoc.accessLevel === 'public' ||
                             referenceDoc.uploadedBy === req.user?.userId ||
                             (referenceDoc.sharedWith && referenceDoc.sharedWith.includes(req.user?.userId));

            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to reference document' });
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

        // Apply access filtering
        let accessFilter = { id: { $in: documentIds } };

        if (req.user?.role !== 'admin') {
            accessFilter.$or = [
                { accessLevel: 'public' },
                { uploadedBy: req.user?.userId },
                { sharedWith: { $in: [req.user?.userId] } }
            ];
        }

        if (req.user?.companyId && req.user?.role !== 'admin') {
            accessFilter.companyId = req.user.companyId;
        }

        const docsResult = await zerodbService.queryTable(TABLE_NAME, { filter: accessFilter });
        const docsData = docsResult.rows || docsResult;

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
        console.error('Similar documents error:', error);
        res.status(500).json({ message: 'Failed to find similar documents', error: error.message });
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

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check access permissions
        if (req.user?.role !== 'admin') {
            const hasAccess = document.accessLevel === 'public' ||
                             document.uploadedBy === req.user?.userId ||
                             (document.sharedWith && document.sharedWith.includes(req.user?.userId));

            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied' });
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
        console.error('Document analytics error:', error);
        res.status(500).json({ message: 'Failed to get document analytics', error: error.message });
    }
};

/**
 * Bulk index documents for vector search
 */
exports.bulkIndexDocuments = async (req, res) => {
    try {
        // Check admin permissions
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { force = 'false' } = req.query;
        const forceIndex = force === 'true';

        // Get all documents that need indexing
        let filter = { status: { $ne: 'deleted' } };

        if (!forceIndex) {
            // Only index documents that haven't been indexed yet
            filter.vectorIndexed = { $ne: true };
        }

        const result = await zerodbService.queryTable(TABLE_NAME, { filter });
        const documents = result.rows || result;

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
                    await zerodbService.updateRows(TABLE_NAME,
                        { id: doc.id || doc._id },
                        { $set: { vectorIndexed: true } }
                    );
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
        console.error('Bulk indexing error:', error);
        res.status(500).json({ message: 'Bulk indexing failed', error: error.message });
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
 */
exports.downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { attachment = 'true' } = req.query;

        // Get document from ZeroDB
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id },
            limit: 1
        });

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check access permissions
        if (!checkDocumentAccess(document, req.user)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if document has a file attached
        if (!document.fileId) {
            return res.status(404).json({ message: 'No file attached to document' });
        }

        // Download file from storage service
        let fileData;
        try {
            fileData = await fileStorageService.downloadFile(document.fileId, {
                includeMetadata: true
            });
        } catch (fileError) {
            console.error('File download error:', fileError);
            return res.status(500).json({ message: 'Failed to download file' });
        }

        // Set response headers
        const contentType = document.contentType || fileData.contentType || 'application/octet-stream';
        const fileName = document.fileName || 'document';
        const disposition = attachment === 'true' ? 'attachment' : 'inline';

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
        console.error('Document download error:', error);
        res.status(500).json({ message: 'Failed to download document', error: error.message });
    }
};

/**
 * Get document preview metadata
 * Issue #122: Document preview endpoint
 */
exports.getDocumentPreview = async (req, res) => {
    try {
        const { id } = req.params;

        // Get document from ZeroDB
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id },
            limit: 1
        });

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check access permissions
        if (!checkDocumentAccess(document, req.user)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if document has a file attached
        if (!document.fileId) {
            return res.status(404).json({ message: 'No file attached to document' });
        }

        // Get file metadata from storage service
        let fileMetadata;
        try {
            fileMetadata = await fileStorageService.getFileMetadata(document.fileId);
        } catch (metadataError) {
            console.error('File metadata error:', metadataError);
            return res.status(500).json({ message: 'Failed to get preview metadata' });
        }

        const contentType = document.contentType || fileMetadata.contentType;
        const previewInfo = getPreviewInfo(contentType);

        // Build response
        const response = {
            documentId: document.id || document._id,
            fileName: document.fileName || fileMetadata.fileName,
            contentType: contentType,
            fileSize: document.fileSize || fileMetadata.size,
            ...previewInfo
        };

        // Add dimensions for images
        if (previewInfo.previewType === 'image' && fileMetadata.metadata) {
            if (fileMetadata.metadata.width && fileMetadata.metadata.height) {
                response.dimensions = {
                    width: fileMetadata.metadata.width,
                    height: fileMetadata.metadata.height
                };
            }
        }

        // Add page count for PDFs
        if (previewInfo.previewType === 'pdf' && fileMetadata.metadata?.pageCount) {
            response.pageCount = fileMetadata.metadata.pageCount;
        }

        // Add message for unsupported types
        if (!previewInfo.previewAvailable) {
            response.message = 'Preview not available for this file type';
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Document preview error:', error);
        res.status(500).json({ message: 'Failed to get document preview', error: error.message });
    }
};

/**
 * Get document access permissions
 * Issue #122: Document access endpoint
 */
exports.getDocumentAccess = async (req, res) => {
    try {
        const { id } = req.params;

        // Get document from ZeroDB
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id },
            limit: 1
        });

        const documents = result.rows || result;
        const document = documents[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if user has any access to view access info
        // For private documents, only owner, shared users, admins, or same company users can see access info
        const hasBasicAccess = checkDocumentAccess(document, req.user);

        if (!hasBasicAccess) {
            return res.status(403).json({ message: 'Access denied' });
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
        console.error('Document access error:', error);
        res.status(500).json({ message: 'Failed to get document access info' });
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
        console.error('Create folder error:', error);
        res.status(400).json({ message: error.message });
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
        console.error('Get folders error:', error);
        res.status(500).json({ message: error.message });
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
            return res.status(404).json({ message: 'Folder not found' });
        }

        // Get breadcrumbs for navigation
        const breadcrumbs = await DocumentFolder.getBreadcrumbs(folder);

        res.status(200).json({
            ...folder,
            breadcrumbs
        });
    } catch (error) {
        console.error('Get folder error:', error);
        res.status(500).json({ message: error.message });
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
        console.error('Update folder error:', error);
        res.status(400).json({ message: error.message });
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
        console.error('Delete folder error:', error);
        res.status(400).json({ message: error.message });
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
        console.error('Get folder contents error:', error);
        if (error.message === 'Folder not found') {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};
