/**
 * ZeroDB Base Model
 *
 * Provides a Mongoose-like interface for ZeroDB operations.
 * This adapter allows seamless migration from Mongoose to ZeroDB.
 */

const zerodbService = require('../../services/zerodbService');
const { v4: uuidv4 } = require('uuid');

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
            ...data
        };

        this._addTimestamps(doc, true);

        try {
            console.log(`[ZeroDBModel] Creating document in ${this.tableName}:`, JSON.stringify(doc, null, 2));
            const result = await zerodbService.insertRow(this.tableName, doc);
            console.log(`[ZeroDBModel] Insert result:`, JSON.stringify(result, null, 2));

            // ZeroDB returns { row_id, row_data: {...} }, unwrap it properly
            const insertedRow = result.data?.[0];
            if (insertedRow?.row_data) {
                return {
                    ...insertedRow.row_data,
                    id: insertedRow.row_id || insertedRow.row_data.id,
                    _id: insertedRow.row_id || insertedRow.row_data._id,
                    row_id: insertedRow.row_id
                };
            }
            // Return the doc with any available ids from result
            return {
                ...doc,
                ...insertedRow,
                id: insertedRow?.row_id || doc._id,
                _id: insertedRow?.row_id || doc._id
            };
        } catch (error) {
            console.error(`[ZeroDBModel] Error creating document in ${this.tableName}:`, error.message);
            // If table doesn't exist, try to create it and retry
            if (error.response?.status === 404 || error.message?.includes('not found')) {
                console.log(`[ZeroDBModel] Table ${this.tableName} not found, attempting to create...`);
                try {
                    await zerodbService.createTable(this.tableName, { fields: {} });
                    console.log(`[ZeroDBModel] Table ${this.tableName} created, retrying insert...`);
                    const result = await zerodbService.insertRow(this.tableName, doc);
                    const insertedRow = result.data?.[0];
                    if (insertedRow?.row_data) {
                        return {
                            ...insertedRow.row_data,
                            id: insertedRow.row_id || insertedRow.row_data.id,
                            _id: insertedRow.row_id || insertedRow.row_data._id,
                            row_id: insertedRow.row_id
                        };
                    }
                    return { ...doc, ...insertedRow };
                } catch (createError) {
                    console.error(`[ZeroDBModel] Failed to create table ${this.tableName}:`, createError.message);
                    throw error; // Throw original error
                }
            }
            throw error;
        }
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

        // ZeroDB returns data nested in row_data - unwrap it
        const rawData = result.data || result || [];
        if (Array.isArray(rawData)) {
            return rawData.map(item => item.row_data || item);
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

        const results = await this.find(query, { ...options, limit: 1 });
        return results[0] || null;
    }

    /**
     * Find document by ID
     * @param {string} id - Document ID
     * @param {Object} options - Query options
     * @returns {Object|null} Found document or null
     */
    async findById(id, options = {}) {
        return this.findOne({ _id: id }, options);
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

        // Handle $set operator or direct updates
        const updateData = update.$set || update;
        updateData.updatedAt = new Date().toISOString();

        const result = await zerodbService.updateRows(this.tableName, {
            filter: query,
            update: { $set: updateData }
        });

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
        return this.updateOne(query, update, options);
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
        return this.deleteOne(query);
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
     * Lean query - returns plain objects (no-op in ZeroDB, included for compatibility)
     * @returns {ZeroDBModel} This model instance
     */
    lean() {
        return this;
    }

    /**
     * Select fields (for compatibility)
     * @param {string|Object} fields - Fields to select
     * @returns {ZeroDBModel} This model instance
     */
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
    }

    /**
     * Populate references (basic support - returns as-is for now)
     * @param {string|Object} path - Path to populate
     * @returns {ZeroDBModel} This model instance
     */
    populate(path) {
        // ZeroDB doesn't support joins natively
        // For now, return this for chaining compatibility
        this._populate = path;
        return this;
    }

    /**
     * Sort results
     * @param {Object} sort - Sort specification
     * @returns {ZeroDBModel} This model instance
     */
    sort(sort) {
        this._sort = sort;
        return this;
    }

    /**
     * Skip results
     * @param {number} n - Number to skip
     * @returns {ZeroDBModel} This model instance
     */
    skip(n) {
        this._skip = n;
        return this;
    }

    /**
     * Limit results
     * @param {number} n - Maximum results
     * @returns {ZeroDBModel} This model instance
     */
    limit(n) {
        this._limit = n;
        return this;
    }

    /**
     * Execute query with chained options
     * @returns {Array} Query results
     */
    async exec() {
        const options = {
            projection: this._projection,
            sort: this._sort,
            skip: this._skip,
            limit: this._limit
        };

        const results = await this.find(this._query || {}, options);

        // Reset chained options
        this._projection = null;
        this._sort = null;
        this._skip = null;
        this._limit = null;
        this._query = null;

        return results;
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
