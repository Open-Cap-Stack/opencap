/**
 * DocumentFolder Data Model
 *
 * Issue #188: Add Document Folder Management Endpoints
 * Migrated: ZeroDB Migration
 *
 * A comprehensive folder model supporting:
 * - Nested folder hierarchies
 * - Path generation for breadcrumbs
 * - Circular reference prevention
 * - Deletion validation
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');
const zerodbService = require('../services/zerodbService');

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
    return Array.isArray(rawData) ? rawData : [];
}

// Schema definition for documentation and validation
const documentFolderSchema = {
    folderId: { type: 'string', unique: true },
    name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
    parentId: { type: 'string', default: null },
    path: { type: 'string', required: true },
    level: { type: 'number', default: 0, min: 0 },
    ownerCompany: { type: 'string', required: true },
    createdBy: { type: 'string', required: true },
    description: { type: 'string', default: '' },
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('document_folders', documentFolderSchema);

// Invalid characters for folder names
const INVALID_CHARS = /[\/\\:*?"<>|]/;
const MAX_NAME_LENGTH = 255;

// Extended DocumentFolder model with business logic
const DocumentFolder = {
    ...baseModel,
    tableName: 'document_folders',
    schema: documentFolderSchema,

    /**
     * Validate folder name
     * @param {string} name - Folder name to validate
     * @throws {Error} If name is invalid
     */
    validateName(name) {
        if (!name || name.trim().length === 0) {
            throw new Error('Folder name is required');
        }

        if (name.length > MAX_NAME_LENGTH) {
            throw new Error(`Folder name must be between 1 and ${MAX_NAME_LENGTH} characters`);
        }

        if (INVALID_CHARS.test(name)) {
            throw new Error('Folder name cannot contain special characters: / \\ : * ? " < > |');
        }
    },

    /**
     * Generate folder path based on parent
     * @param {string} name - Folder name
     * @param {Object} parent - Parent folder object
     * @returns {string} Full path
     */
    generatePath(name, parent = null) {
        if (!parent) {
            return `/${name}`;
        }
        return `${parent.path}/${name}`;
    },

    /**
     * Calculate folder level in hierarchy
     * @param {Object} parent - Parent folder object
     * @returns {number} Folder level
     */
    calculateLevel(parent = null) {
        if (!parent) {
            return 0;
        }
        return (parent.level || 0) + 1;
    },

    /**
     * Create a new folder with validation
     * @param {Object} data - Folder data
     * @returns {Object} Created folder
     */
    async create(data) {
        // Validate folder name
        this.validateName(data.name);

        // Generate folderId if not provided
        if (!data.folderId) {
            data.folderId = uuidv4();
        }

        // Set timestamps
        const now = new Date().toISOString();
        data.createdAt = now;
        data.updatedAt = now;

        // Handle parent folder
        let parent = null;
        if (data.parentId) {
            parent = await this.findByFolderId(data.parentId);
            if (!parent) {
                throw new Error('Parent folder not found');
            }

            // Validate no circular reference
            const isValid = await this.validateHierarchy(data.parentId, data.folderId);
            if (!isValid) {
                throw new Error('Circular folder reference detected');
            }
        }

        // Generate path and level
        data.path = this.generatePath(data.name, parent);
        data.level = this.calculateLevel(parent);

        // Set defaults
        if (!data.metadata) {
            data.metadata = {};
        }
        if (!data.description) {
            data.description = '';
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find folder by folderId
     * @param {string} folderId - Folder ID
     * @returns {Object|null} Folder or null
     */
    async findByFolderId(folderId) {
        const result = await zerodbService.queryTable(this.tableName, {
            filter: { folderId },
            limit: 1
        });
        const folders = unwrapZeroDBResponse(result);
        return folders[0] || null;
    },

    /**
     * Find all child folders of a parent
     * @param {string} parentId - Parent folder ID
     * @returns {Array} Child folders
     */
    async findByParentId(parentId) {
        const result = await zerodbService.queryTable(this.tableName, {
            filter: { parentId }
        });
        return unwrapZeroDBResponse(result);
    },

    /**
     * Find root folders (no parent)
     * @param {string} ownerCompany - Company ID
     * @returns {Array} Root folders
     */
    async findRootFolders(ownerCompany) {
        // ZeroDB doesn't support $or or $exists, so fetch all and filter in JS
        const result = await zerodbService.queryTable(this.tableName, {
            filter: ownerCompany ? { ownerCompany } : {},
            limit: 1000
        });
        const folders = unwrapZeroDBResponse(result);
        // Filter for root folders (parentId is null, undefined, or empty string)
        return folders.filter(folder => !folder.parentId);
    },

    /**
     * Check if folder has child folders
     * @param {string} folderId - Folder ID
     * @returns {boolean} True if has children
     */
    async hasChildren(folderId) {
        const count = await zerodbService.countRows(this.tableName, { parentId: folderId });
        return count > 0;
    },

    /**
     * Check if folder contains documents
     * @param {string} folderId - Folder ID
     * @returns {boolean} True if has documents
     */
    async hasDocuments(folderId) {
        const count = await zerodbService.countRows('documents', { folderId });
        return count > 0;
    },

    /**
     * Get full path for folder
     * @param {Object} folder - Folder object
     * @returns {string} Full path
     */
    getFullPath(folder) {
        return folder.path || `/${folder.name}`;
    },

    /**
     * Generate breadcrumbs for folder navigation
     * @param {Object} folder - Folder object
     * @returns {Array} Breadcrumb items
     */
    async getBreadcrumbs(folder) {
        const breadcrumbs = [];
        let currentFolder = folder;

        // Build breadcrumbs from current to root
        while (currentFolder) {
            breadcrumbs.unshift({
                folderId: currentFolder.folderId,
                name: currentFolder.name,
                path: currentFolder.path
            });

            if (currentFolder.parentId) {
                currentFolder = await this.findByFolderId(currentFolder.parentId);
            } else {
                currentFolder = null;
            }
        }

        return breadcrumbs;
    },

    /**
     * Validate folder hierarchy to prevent circular references
     * @param {string} parentId - Parent folder ID
     * @param {string} folderId - Current folder ID
     * @returns {boolean} True if hierarchy is valid
     */
    async validateHierarchy(parentId, folderId) {
        // Cannot be its own parent
        if (parentId === folderId) {
            return false;
        }

        // Traverse up the hierarchy to check for circular reference
        let currentParentId = parentId;
        const visited = new Set([folderId]);

        while (currentParentId) {
            if (visited.has(currentParentId)) {
                // Circular reference detected
                return false;
            }

            visited.add(currentParentId);

            // Get parent folder
            const parent = await this.findByFolderId(currentParentId);
            if (!parent) {
                break;
            }

            currentParentId = parent.parentId;
        }

        return true;
    },

    /**
     * Validate folder can be deleted
     * @param {string} folderId - Folder ID to validate
     * @throws {Error} If folder cannot be deleted
     */
    async validateDelete(folderId) {
        // Check for child folders
        const hasChildFolders = await this.hasChildren(folderId);
        if (hasChildFolders) {
            throw new Error('Cannot delete folder with subfolders');
        }

        // Check for documents
        const hasFiles = await this.hasDocuments(folderId);
        if (hasFiles) {
            throw new Error('Cannot delete folder containing documents');
        }
    },

    /**
     * Update folder and regenerate paths for children
     * @param {string} folderId - Folder ID
     * @param {Object} updateData - Update data
     * @returns {Object} Updated folder
     */
    async update(folderId, updateData) {
        const folder = await this.findByFolderId(folderId);
        if (!folder) {
            throw new Error('Folder not found');
        }

        // Validate name if being updated
        if (updateData.name) {
            this.validateName(updateData.name);
        }

        // Validate parent change
        if (updateData.parentId !== undefined && updateData.parentId !== folder.parentId) {
            if (updateData.parentId) {
                // Validate new parent exists
                const newParent = await this.findByFolderId(updateData.parentId);
                if (!newParent) {
                    throw new Error('New parent folder not found');
                }

                // Validate no circular reference
                const isValid = await this.validateHierarchy(updateData.parentId, folderId);
                if (!isValid) {
                    throw new Error('Circular folder reference detected');
                }

                // Regenerate path and level
                updateData.path = this.generatePath(updateData.name || folder.name, newParent);
                updateData.level = this.calculateLevel(newParent);
            } else {
                // Moving to root
                updateData.path = `/${updateData.name || folder.name}`;
                updateData.level = 0;
            }
        } else if (updateData.name && updateData.name !== folder.name) {
            // Name changed but not parent - update path
            const parent = folder.parentId ? await this.findByFolderId(folder.parentId) : null;
            updateData.path = this.generatePath(updateData.name, parent);
        }

        updateData.updatedAt = new Date().toISOString();

        await zerodbService.updateRows(this.tableName,
            { folderId },
            { $set: updateData }
        );

        // If path changed, update all child folder paths recursively
        if (updateData.path && updateData.path !== folder.path) {
            await this.updateChildPaths(folderId, folder.path, updateData.path);
        }

        return this.findByFolderId(folderId);
    },

    /**
     * Update paths for all child folders recursively
     * @param {string} folderId - Parent folder ID
     * @param {string} oldPath - Old parent path
     * @param {string} newPath - New parent path
     */
    async updateChildPaths(folderId, oldPath, newPath) {
        const children = await this.findByParentId(folderId);

        for (const child of children) {
            const childNewPath = child.path.replace(oldPath, newPath);
            await zerodbService.updateRows(this.tableName,
                { folderId: child.folderId },
                { $set: { path: childNewPath } }
            );

            // Recursively update grandchildren
            await this.updateChildPaths(child.folderId, child.path, childNewPath);
        }
    },

    /**
     * Delete folder after validation
     * @param {string} folderId - Folder ID
     * @returns {Object} Deletion result
     */
    async delete(folderId) {
        await this.validateDelete(folderId);
        return zerodbService.deleteRows(this.tableName, { folderId });
    },

    /**
     * Get folder contents (child folders and documents)
     * @param {string} folderId - Folder ID
     * @returns {Object} Folder contents
     */
    async getContents(folderId) {
        const folder = await this.findByFolderId(folderId);
        if (!folder) {
            throw new Error('Folder not found');
        }

        // Get child folders
        const childFolders = await this.findByParentId(folderId);

        // Get documents in folder
        const documentsResult = await zerodbService.queryTable('documents', {
            filter: { folderId }
        });
        const documents = unwrapZeroDBResponse(documentsResult);

        return {
            folder,
            childFolders,
            documents,
            breadcrumbs: await this.getBreadcrumbs(folder)
        };
    },

    // Expose base model methods
    find: baseModel.find.bind(baseModel),
    findOne: baseModel.findOne.bind(baseModel),
    findById: baseModel.findById.bind(baseModel),
    updateOne: baseModel.updateOne.bind(baseModel),
    updateMany: baseModel.updateMany.bind(baseModel),
    findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
    findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
    deleteOne: baseModel.deleteOne.bind(baseModel),
    deleteMany: baseModel.deleteMany.bind(baseModel),
    findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
    findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
    countDocuments: baseModel.countDocuments.bind(baseModel),
    exists: baseModel.exists.bind(baseModel),
    distinct: baseModel.distinct.bind(baseModel),
    aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = DocumentFolder;
