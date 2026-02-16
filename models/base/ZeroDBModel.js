/**
 * ZeroDB Base Model
 *
 * Provides a Mongoose-like interface for ZeroDB operations.
 * This adapter allows seamless migration from Mongoose to ZeroDB.
 */

const zerodbService = require('../../services/zerodbService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class ZeroDBModel {
    constructor(tableName, schema = {}) {
        this.tableName = tableName;
        this.schema = schema;
        this._initialized = false;
    }

    /**
     * Ensure ZeroDB service is initialized
     */
    async _ensureInitialized() {
        if (!this._initialized) {
            const token = process.env.AINATIVE_API_TOKEN;
            if (token && !zerodbService.projectId) {
                await zerodbService.initialize(token);
            }
            this._initialized = true;
        }
    }

    /**
     * Generate a unique ID for new documents
     */
    _generateId() {
        return uuidv4();
    }

    /**
     * Add timestamps to document
     */
    _addTimestamps(doc, isNew = true) {
        const now = new Date().toISOString();
        if (isNew) {
            doc.createdAt = now;
        }
        doc.updatedAt = now;
        return doc;
    }

    /**
     * Create a new document
     * @param {Object} data - Document data
     * @returns {Object} Created document
     */
    async create(data) {
        await this._ensureInitialized();

        const doc = {
            _id: this._generateId(),
            __v: 0, // T0-6: Optimistic locking version field
            ...data
        };

        this._addTimestamps(doc, true);

        try {
            logger.debug(`[ZeroDBModel] Creating document in ${this.tableName}`);
            const result = await zerodbService.insertRow(this.tableName, doc);

            // ZeroDB returns { row_id, row_data: {...} }, unwrap it properly
            const insertedRow = result.data?.[0];
            if (insertedRow?.row_data) {
                return {
                    ...insertedRow.row_data,
                    // Keep our _id from row_data (not row_id) for consistency with queries
                    _id: insertedRow.row_data._id,
                    row_id: insertedRow.row_id  // Store row_id for updates/deletes
                };
            }
            // Return the doc with our _id (not row_id) for consistency
            return {
                ...doc,
                ...insertedRow,
                _id: doc._id,
                row_id: insertedRow?.row_id
            };
        } catch (error) {
            logger.error(`[ZeroDBModel] Error creating document in ${this.tableName}: ${error.message}`);
            // If table doesn't exist, try to create it and retry
            if (error.response?.status === 404 || error.message?.includes('not found')) {
                logger.info(`[ZeroDBModel] Table ${this.tableName} not found, attempting to create...`);
                try {
                    await zerodbService.createTable(this.tableName, { fields: {} });
                    const result = await zerodbService.insertRow(this.tableName, doc);
                    const insertedRow = result.data?.[0];
                    if (insertedRow?.row_data) {
                        return {
                            ...insertedRow.row_data,
                            _id: insertedRow.row_data._id,
                            row_id: insertedRow.row_id
                        };
                    }
                    return { ...doc, ...insertedRow, _id: doc._id, row_id: insertedRow?.row_id };
                } catch (createError) {
                    logger.error(`[ZeroDBModel] Failed to create table ${this.tableName}: ${createError.message}`);
                    throw error; // Throw original error
                }
            }
            throw error;
        }
    }

    /**
     * T0-7: Create a document with application-level uniqueness check.
     * Verifies that no existing document matches the given unique fields before inserting.
     * @param {Object} data - Document data
     * @param {Object} uniqueFields - Key-value pairs that must be unique (e.g., { stakeholderId: 'sh_123' })
     * @returns {Object} Created document
     * @throws {Error} If a document with matching unique fields already exists
     */
    async createWithUniquenessCheck(data, uniqueFields) {
        if (uniqueFields && Object.keys(uniqueFields).length > 0) {
            const existing = await this.findOne(uniqueFields);
            if (existing) {
                const fieldNames = Object.keys(uniqueFields).join(', ');
                const error = new Error(`Duplicate entry: a document with the same ${fieldNames} already exists in ${this.tableName}`);
                error.code = 'DUPLICATE_ENTRY';
                error.fields = uniqueFields;
                throw error;
            }
        }
        return this.create(data);
    }

    /**
     * Create multiple documents
     * @param {Array} dataArray - Array of document data
     * @returns {Array} Created documents
     */
    async insertMany(dataArray) {
        await this._ensureInitialized();

        const docs = dataArray.map(data => {
            const doc = {
                _id: this._generateId(),
                ...data
            };
            return this._addTimestamps(doc, true);
        });

        const result = await zerodbService.insertRows(this.tableName, docs);
        return result.data || docs;
    }

    /**
     * Find documents matching query
     * @param {Object} query - Query filter
     * @param {Object} options - Query options (projection, sort, skip, limit)
     * @returns {Array} Matching documents
     */
    async find(query = {}, options = {}) {
        await this._ensureInitialized();

        const { projection, sort, skip = 0, limit = 100 } = options;

        const result = await zerodbService.queryTable(this.tableName, {
            filter: query,
            skip,
            limit,
            sort: sort || {},
            projection: projection || {}
        });

        // ZeroDB returns data nested in row_data - unwrap it but preserve row_id
        const rawData = result.data || result || [];
        if (Array.isArray(rawData)) {
            return rawData.map(item => {
                if (item.row_data) {
                    return {
                        ...item.row_data,
                        row_id: item.row_id  // Preserve row_id for updates/deletes
                    };
                }
                return item;
            });
        }
        return rawData;
    }

    /**
     * Find a single document
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Found document or null
     */
    async findOne(query = {}, options = {}) {
        await this._ensureInitialized();

        // First try server-side filter
        const results = await this.find(query, { ...options, limit: 1 });
        if (results && results.length > 0) {
            return results[0];
        }

        // T2-1: Fallback with warning - client-side filtering for ZeroDB inconsistencies
        // Use a smaller limit to avoid loading excessive records
        if (Object.keys(query).length > 0) {
            logger.warn(`[ZeroDBModel] findOne fallback to client-side filter for ${this.tableName}, query: ${JSON.stringify(query)}`);
            const allResults = await this.find({}, { ...options, limit: 200 });
            return allResults.find(item => {
                return Object.entries(query).every(([key, value]) => item[key] === value);
            }) || null;
        }

        return null;
    }

    /**
     * Find document by ID
     * @param {string} id - Document ID
     * @param {Object} options - Query options
     * @returns {Object|null} Found document or null
     */
    async findById(id, options = {}) {
        await this._ensureInitialized();

        // First try direct filter query
        const filtered = await this.findOne({ _id: id }, options);
        if (filtered) {
            return filtered;
        }

        // Fallback: fetch and filter client-side if ZeroDB filter not working
        logger.warn(`[ZeroDBModel] findById fallback to client-side filter for ${this.tableName}, id: ${id}`);
        const allResults = await this.find({}, { ...options, limit: 200 });
        return allResults.find(item => item._id === id) || null;
    }

    /**
     * Update a single document
     * @param {Object} query - Query filter
     * @param {Object} update - Update operations
     * @param {Object} options - Update options
     * @returns {Object} Update result
     */
    async updateOne(query, update, options = {}) {
        await this._ensureInitialized();

        // First find the document using client-side fallback if needed
        const doc = await this.findOne(query);
        if (!doc) {
            return {
                acknowledged: true,
                modifiedCount: 0,
                matchedCount: 0
            };
        }

        // Handle $set operator or direct updates
        const updateData = update.$set || update;
        updateData.updatedAt = new Date().toISOString();

        // T0-6: Optimistic locking - check version and increment
        if (!options.skipVersionCheck && doc.__v !== undefined) {
            const expectedVersion = doc.__v;
            updateData.__v = expectedVersion + 1;

            // If caller provided an expected version, verify it matches
            if (options.expectedVersion !== undefined && options.expectedVersion !== expectedVersion) {
                const error = new Error('Version conflict: document was modified by another request');
                error.code = 'VERSION_CONFLICT';
                error.expectedVersion = options.expectedVersion;
                error.actualVersion = expectedVersion;
                throw error;
            }
        }

        // Track if we need post-write verification
        const needsVersionVerify = !options.skipVersionCheck && doc.__v !== undefined;
        const expectedNewVersion = needsVersionVerify ? updateData.__v : null;

        // If we have row_id, use it for reliable update
        if (doc.row_id) {
            const newRowData = { ...doc, ...updateData };
            // Remove internal fields that shouldn't be in row_data
            delete newRowData.row_id;
            delete newRowData.id;

            await zerodbService.client.put(
                `/v1/public/zerodb/${zerodbService.projectId}/database/tables/${this.tableName}/rows/${doc.row_id}`,
                { row_data: newRowData }
            );

            // Read-after-write verification: confirm our version won
            if (needsVersionVerify) {
                const verified = await this.findOne(query);
                if (verified && verified.__v !== expectedNewVersion) {
                    const error = new Error('Version conflict: document was modified by a concurrent request');
                    error.code = 'VERSION_CONFLICT';
                    throw error;
                }
            }

            return {
                acknowledged: true,
                modifiedCount: 1,
                matchedCount: 1
            };
        }

        // Fallback to filter-based update
        const result = await zerodbService.updateRows(this.tableName, {
            filter: query,
            update: { $set: updateData }
        });

        // Read-after-write verification for fallback path
        if (needsVersionVerify) {
            const verified = await this.findOne(query);
            if (verified && verified.__v !== expectedNewVersion) {
                const error = new Error('Version conflict: document was modified by a concurrent request');
                error.code = 'VERSION_CONFLICT';
                throw error;
            }
        }

        return {
            acknowledged: true,
            modifiedCount: result.modified_count || result.modifiedCount || 1,
            matchedCount: result.matched_count || result.matchedCount || 1
        };
    }

    /**
     * Update multiple documents
     * @param {Object} query - Query filter
     * @param {Object} update - Update operations
     * @param {Object} options - Update options
     * @returns {Object} Update result
     */
    async updateMany(query, update, options = {}) {
        await this._ensureInitialized();

        // Find ALL matching documents
        const docs = await this.find(query);
        if (!docs || docs.length === 0) {
            return {
                acknowledged: true,
                modifiedCount: 0,
                matchedCount: 0
            };
        }

        let modifiedCount = 0;
        for (const doc of docs) {
            try {
                // Update each document individually using its _id
                await this.updateOne({ _id: doc._id }, update, { ...options, skipVersionCheck: true });
                modifiedCount++;
            } catch (error) {
                logger.error(`[ZeroDBModel] updateMany: failed to update doc ${doc._id}: ${error.message}`);
            }
        }

        return {
            acknowledged: true,
            modifiedCount,
            matchedCount: docs.length
        };
    }

    /**
     * Find and update a document
     * @param {Object} query - Query filter
     * @param {Object} update - Update operations
     * @param {Object} options - Options (new: return updated doc, upsert: create if not exists)
     * @returns {Object|null} Updated document
     */
    async findOneAndUpdate(query, update, options = {}) {
        await this._ensureInitialized();

        const { new: returnNew = false, upsert = false } = options;

        // Get existing document first
        let doc = await this.findOne(query);

        if (!doc && upsert) {
            // Create new document if upsert is true
            const newDoc = { ...query, ...(update.$set || update) };
            return this.create(newDoc);
        }

        if (!doc) {
            return null;
        }

        // Update the document
        await this.updateOne(query, update);

        if (returnNew) {
            return this.findOne(query);
        }

        return doc;
    }

    /**
     * Find by ID and update
     * @param {string} id - Document ID
     * @param {Object} update - Update operations
     * @param {Object} options - Update options
     * @returns {Object|null} Updated document
     */
    async findByIdAndUpdate(id, update, options = {}) {
        return this.findOneAndUpdate({ _id: id }, update, options);
    }

    /**
     * Delete a single document
     * @param {Object} query - Query filter
     * @returns {Object} Delete result
     */
    async deleteOne(query) {
        await this._ensureInitialized();

        // First find the document to get its row_id for reliable deletion
        const doc = await this.findOne(query);
        if (!doc) {
            return {
                acknowledged: true,
                deletedCount: 0
            };
        }

        // Use the row_id for deletion if available, otherwise use filter
        if (doc.row_id) {
            await zerodbService.deleteRowById(this.tableName, doc.row_id);
            return {
                acknowledged: true,
                deletedCount: 1
            };
        }

        // Fallback to filter-based deletion
        const result = await zerodbService.deleteRows(this.tableName, { filter: query });

        return {
            acknowledged: true,
            deletedCount: result.deleted_count || result.deletedCount || 1
        };
    }

    /**
     * Delete multiple documents
     * @param {Object} query - Query filter
     * @returns {Object} Delete result
     */
    async deleteMany(query) {
        await this._ensureInitialized();

        // Find ALL matching documents
        const docs = await this.find(query);
        if (!docs || docs.length === 0) {
            return {
                acknowledged: true,
                deletedCount: 0
            };
        }

        let deletedCount = 0;
        for (const doc of docs) {
            try {
                if (doc.row_id) {
                    await zerodbService.deleteRowById(this.tableName, doc.row_id);
                } else {
                    await zerodbService.deleteRows(this.tableName, { filter: { _id: doc._id } });
                }
                deletedCount++;
            } catch (error) {
                logger.error(`[ZeroDBModel] deleteMany: failed to delete doc ${doc._id}: ${error.message}`);
            }
        }

        return {
            acknowledged: true,
            deletedCount
        };
    }

    /**
     * Find and delete a document
     * @param {Object} query - Query filter
     * @returns {Object|null} Deleted document
     */
    async findOneAndDelete(query) {
        await this._ensureInitialized();

        const doc = await this.findOne(query);
        if (doc) {
            await this.deleteOne(query);
        }
        return doc;
    }

    /**
     * Find by ID and delete
     * @param {string} id - Document ID
     * @returns {Object|null} Deleted document
     */
    async findByIdAndDelete(id) {
        return this.findOneAndDelete({ _id: id });
    }

    /**
     * Count documents matching query
     * @param {Object} query - Query filter
     * @returns {number} Count of matching documents
     */
    async countDocuments(query = {}) {
        await this._ensureInitialized();

        const result = await zerodbService.queryTable(this.tableName, {
            filter: query,
            limit: 0
        });

        return result.total || result.count || 0;
    }

    /**
     * Check if documents exist matching query
     * @param {Object} query - Query filter
     * @returns {boolean} True if documents exist
     */
    async exists(query) {
        const count = await this.countDocuments(query);
        return count > 0;
    }

    /**
     * Get distinct values for a field
     * @param {string} field - Field name
     * @param {Object} query - Query filter
     * @returns {Array} Distinct values
     */
    async distinct(field, query = {}) {
        await this._ensureInitialized();

        const results = await this.find(query, { projection: { [field]: 1 } });
        const values = results.map(doc => doc[field]).filter(v => v !== undefined);
        return [...new Set(values)];
    }

    /**
     * Aggregate pipeline (basic support)
     * @param {Array} pipeline - Aggregation pipeline
     * @returns {Array} Aggregation results
     */
    async aggregate(pipeline) {
        await this._ensureInitialized();

        // Basic aggregation support - extract $match stage for filtering
        let query = {};
        let results = [];

        for (const stage of pipeline) {
            if (stage.$match) {
                query = { ...query, ...stage.$match };
            }
        }

        results = await this.find(query);

        // Apply other stages manually if needed
        for (const stage of pipeline) {
            if (stage.$sort) {
                const sortField = Object.keys(stage.$sort)[0];
                const sortOrder = stage.$sort[sortField];
                results.sort((a, b) => {
                    if (sortOrder === 1) return a[sortField] > b[sortField] ? 1 : -1;
                    return a[sortField] < b[sortField] ? 1 : -1;
                });
            }
            if (stage.$limit) {
                results = results.slice(0, stage.$limit);
            }
            if (stage.$skip) {
                results = results.slice(stage.$skip);
            }
        }

        return results;
    }

    /**
     * Save a document (create or update)
     * @param {Object} doc - Document to save
     * @returns {Object} Saved document
     */
    async save(doc) {
        if (doc._id) {
            await this.updateOne({ _id: doc._id }, { $set: doc });
            return doc;
        }
        return this.create(doc);
    }

    /**
     * Create a new query builder to avoid shared mutable state.
     * Each call returns a fresh object that doesn't mutate the model singleton.
     * @returns {Object} Query builder with chainable methods
     */
    _createQueryBuilder(query = {}) {
        const model = this;
        const builder = {
            _query: query,
            _projection: null,
            _sort: null,
            _skip: null,
            _limit: null,
            _populate: null,

            lean() { return this; },

            select(fields) {
                this._projection = typeof fields === 'string'
                    ? fields.split(' ').reduce((acc, f) => {
                        if (f.startsWith('-')) {
                            acc[f.slice(1)] = 0;
                        } else {
                            acc[f] = 1;
                        }
                        return acc;
                    }, {})
                    : fields;
                return this;
            },

            populate(path) {
                this._populate = path;
                return this;
            },

            sort(sort) {
                this._sort = sort;
                return this;
            },

            skip(n) {
                this._skip = n;
                return this;
            },

            limit(n) {
                this._limit = n;
                return this;
            },

            async exec() {
                const options = {
                    projection: this._projection,
                    sort: this._sort,
                    skip: this._skip,
                    limit: this._limit
                };
                return model.find(this._query, options);
            },

            // Allow awaiting the builder directly
            then(resolve, reject) {
                return this.exec().then(resolve, reject);
            }
        };
        return builder;
    }

    /**
     * Lean query - returns plain objects (no-op in ZeroDB, included for compatibility)
     * Returns a query builder to avoid mutating the shared model instance.
     * @returns {Object} Query builder
     */
    lean() {
        return this._createQueryBuilder();
    }

    /**
     * Select fields (for compatibility)
     * Returns a query builder to avoid mutating the shared model instance.
     * @param {string|Object} fields - Fields to select
     * @returns {Object} Query builder
     */
    select(fields) {
        return this._createQueryBuilder().select(fields);
    }

    /**
     * Populate references (basic support - returns as-is for now)
     * Returns a query builder to avoid mutating the shared model instance.
     * @param {string|Object} path - Path to populate
     * @returns {Object} Query builder
     */
    populate(path) {
        return this._createQueryBuilder().populate(path);
    }

    /**
     * Sort results
     * Returns a query builder to avoid mutating the shared model instance.
     * @param {Object} sort - Sort specification
     * @returns {Object} Query builder
     */
    sort(sort) {
        return this._createQueryBuilder().sort(sort);
    }

    /**
     * Skip results
     * Returns a query builder to avoid mutating the shared model instance.
     * @param {number} n - Number to skip
     * @returns {Object} Query builder
     */
    skip(n) {
        return this._createQueryBuilder().skip(n);
    }

    /**
     * Limit results
     * Returns a query builder to avoid mutating the shared model instance.
     * @param {number} n - Maximum results
     * @returns {Object} Query builder
     */
    limit(n) {
        return this._createQueryBuilder().limit(n);
    }

    /**
     * Execute query with chained options
     * @returns {Array} Query results
     */
    async exec() {
        return this.find({});
    }
}

/**
 * Create a new ZeroDB Model
 * @param {string} tableName - Table name in ZeroDB
 * @param {Object} schema - Schema definition (for documentation/validation)
 * @returns {ZeroDBModel} Model instance
 */
function createModel(tableName, schema = {}) {
    return new ZeroDBModel(tableName, schema);
}

module.exports = { ZeroDBModel, createModel };
