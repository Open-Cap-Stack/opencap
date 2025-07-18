const Document = require('../models/documentModel');
const vectorService = require('../services/vectorService');
const websocketService = require('../services/websocketService');

// Create a new document with vector indexing
exports.createDocument = async (req, res) => {
    try {
        const document = new Document({
            ...req.body,
            uploadedBy: req.user?.userId,
            uploadedAt: new Date()
        });
        
        const savedDocument = await document.save();

        // Index document for vector search if content is provided
        if (savedDocument.content || savedDocument.description) {
            try {
                await vectorService.indexDocument({
                    id: savedDocument._id.toString(),
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
            data: { documentId: savedDocument._id }
        });

        res.status(201).json(savedDocument);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all documents with search and filtering
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
                { uploadedBy: req.user.userId },
                { sharedWith: { $in: [req.user.userId] } }
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

        // If search query provided, use vector search
        if (search) {
            try {
                // Get similar documents using vector search
                const searchResults = await vectorService.searchSimilarDocuments(search, {
                    limit: parseInt(limit),
                    threshold: 0.1, // Lower threshold for broader search
                    namespace: 'documents'
                });

                // Get document IDs from search results
                const documentIds = searchResults.map(result => result.metadata.id);
                
                if (documentIds.length > 0) {
                    // Apply additional filters to search results
                    filter._id = { $in: documentIds };
                    documents = await Document.find(filter)
                        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                        .limit(parseInt(limit))
                        .skip((parseInt(page) - 1) * parseInt(limit));

                    // Add relevance scores from vector search
                    documents = documents.map(doc => {
                        const searchResult = searchResults.find(r => r.metadata.id === doc._id.toString());
                        return {
                            ...doc.toObject(),
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

                documents = await Document.find(filter)
                    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                    .limit(parseInt(limit))
                    .skip((parseInt(page) - 1) * parseInt(limit));
            }
        } else {
            // No search query, use regular filtering
            documents = await Document.find(filter)
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));
        }

        // Get total count for pagination
        const total = await Document.countDocuments(filter);

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

// Get a document by ID
exports.getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        res.status(200).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a document by ID with vector re-indexing
exports.updateDocumentById = async (req, res) => {
    try {
        const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!document) return res.status(404).json({ message: 'Document not found' });

        // Re-index document for vector search if content changed
        if (req.body.content || req.body.description || req.body.title) {
            try {
                await vectorService.indexDocument({
                    id: document._id.toString(),
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
            data: { documentId: document._id }
        });

        res.status(200).json(document);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a document by ID
exports.deleteDocumentById = async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        
        // Remove from vector index
        try {
            await vectorService.deleteDocument(document._id.toString());
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
            data: { documentId: document._id }
        });

        res.status(200).json({ message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Semantic search for documents
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
        let accessFilter = { _id: { $in: documentIds } };
        
        // Apply access level filtering based on user permissions
        if (req.user?.role !== 'admin') {
            accessFilter.$or = [
                { accessLevel: 'public' },
                { uploadedBy: req.user.userId },
                { sharedWith: { $in: [req.user.userId] } }
            ];
        }

        // Add company filter
        if (req.user?.companyId && req.user?.role !== 'admin') {
            accessFilter.companyId = req.user.companyId;
        }

        const documents = await Document.find(accessFilter);

        // Combine documents with relevance scores
        const results = documents.map(doc => {
            const searchResult = searchResults.find(r => r.metadata.id === doc._id.toString());
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

// Find similar documents to a given document
exports.findSimilarDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 5, threshold = 0.5 } = req.query;

        // Get the reference document
        const referenceDoc = await Document.findById(id);
        if (!referenceDoc) {
            return res.status(404).json({ message: 'Reference document not found' });
        }

        // Check access permissions
        if (req.user?.role !== 'admin') {
            const hasAccess = referenceDoc.accessLevel === 'public' ||
                             referenceDoc.uploadedBy === req.user.userId ||
                             (referenceDoc.sharedWith && referenceDoc.sharedWith.includes(req.user.userId));
            
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to reference document' });
            }
        }

        // Use document content for similarity search
        const searchContent = referenceDoc.content || referenceDoc.description || referenceDoc.title;
        
        const similarDocs = await vectorService.findSimilarDocuments(id, {
            limit: parseInt(limit),
            threshold: parseFloat(threshold),
            excludeIds: [id] // Exclude the reference document itself
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
        let accessFilter = { _id: { $in: documentIds } };
        
        if (req.user?.role !== 'admin') {
            accessFilter.$or = [
                { accessLevel: 'public' },
                { uploadedBy: req.user.userId },
                { sharedWith: { $in: [req.user.userId] } }
            ];
        }

        if (req.user?.companyId && req.user?.role !== 'admin') {
            accessFilter.companyId = req.user.companyId;
        }

        const documents = await Document.find(accessFilter);

        // Combine with similarity scores
        const results = documents.map(doc => {
            const simResult = similarDocs.find(r => r.metadata.id === doc._id.toString());
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

// Get document analytics and insights
exports.getDocumentAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        
        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check access permissions
        if (req.user?.role !== 'admin') {
            const hasAccess = document.accessLevel === 'public' ||
                             document.uploadedBy === req.user.userId ||
                             (document.sharedWith && document.sharedWith.includes(req.user.userId));
            
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        // Get analytics from vector service
        const analytics = await vectorService.getDocumentAnalytics(id);

        res.status(200).json({
            document: {
                id: document._id,
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

// Bulk index documents for vector search
exports.bulkIndexDocuments = async (req, res) => {
    try {
        // Check admin permissions
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { force = false } = req.query;
        
        // Get all documents that need indexing
        let filter = { status: { $ne: 'deleted' } };
        
        if (!force) {
            // Only index documents that haven't been indexed yet
            filter.vectorIndexed = { $ne: true };
        }

        const documents = await Document.find(filter);
        
        let indexed = 0;
        let failed = 0;
        const errors = [];

        for (const doc of documents) {
            try {
                if (doc.content || doc.description) {
                    await vectorService.indexDocument({
                        id: doc._id.toString(),
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
                    await Document.findByIdAndUpdate(doc._id, { vectorIndexed: true });
                    indexed++;
                }
            } catch (error) {
                failed++;
                errors.push({
                    documentId: doc._id,
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
