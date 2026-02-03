/**
 * Form 3921 Model
 * Feature: Issue #71 - IRS Form 3921 Generation
 * Form 3921: Exercise of an Incentive Stock Option Under Section 422(b)
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Status constants
const FORM_STATUSES = ['draft', 'pending_review', 'approved', 'filed', 'corrected', 'voided'];
const FILING_METHODS = ['electronic', 'paper'];

// Schema definition (for documentation)
const schema = {
    _id: { type: 'string', required: true },
    formId: { type: 'string', unique: true },
    taxYear: { type: 'number', required: true, min: 2020 },
    companyId: { type: 'string', required: true },
    transferor: {
        name: { type: 'string', required: true },
        ein: { type: 'string', required: true },
        address: {
            street: { type: 'string', required: true },
            city: { type: 'string', required: true },
            state: { type: 'string', required: true },
            zipCode: { type: 'string', required: true },
            country: { type: 'string', default: 'US' }
        },
        telephone: { type: 'string' }
    },
    employeeId: { type: 'string', required: true },
    transferee: {
        name: { type: 'string', required: true },
        ssn: { type: 'string', required: true },
        address: {
            street: { type: 'string', required: true },
            city: { type: 'string', required: true },
            state: { type: 'string', required: true },
            zipCode: { type: 'string', required: true },
            country: { type: 'string', default: 'US' }
        },
        accountNumber: { type: 'string' }
    },
    exerciseDetails: {
        grantDate: { type: 'date', required: true },
        exerciseDate: { type: 'date', required: true },
        exercisePrice: { type: 'number', required: true, min: 0 },
        fmvOnExercise: { type: 'number', required: true, min: 0 },
        sharesTransferred: { type: 'number', required: true, min: 1 }
    },
    calculations: {
        totalExerciseCost: { type: 'number' },
        totalFMVAtExercise: { type: 'number' },
        bargainElement: { type: 'number' },
        amtPreference: { type: 'number' }
    },
    optionGrantId: { type: 'string' },
    optionExerciseId: { type: 'string' },
    status: { type: 'string', enum: FORM_STATUSES, default: 'draft' },
    filing: {
        filedDate: { type: 'date' },
        filedBy: { type: 'string' },
        confirmationNumber: { type: 'string' },
        method: { type: 'string', enum: FILING_METHODS }
    },
    isCorrection: { type: 'boolean', default: false },
    correctedFormId: { type: 'string' },
    correctionReason: { type: 'string' },
    copies: {
        copyAFiled: { type: 'boolean', default: false },
        copyBProvided: { type: 'boolean', default: false },
        copy1Filed: { type: 'boolean', default: false },
        copyCSent: { type: 'boolean', default: false }
    },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },
    notes: { type: 'string' },
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Calculate form values
const calculateFormValues = (exerciseDetails) => {
    const { exercisePrice, fmvOnExercise, sharesTransferred } = exerciseDetails;
    return {
        totalExerciseCost: exercisePrice * sharesTransferred,
        totalFMVAtExercise: fmvOnExercise * sharesTransferred,
        bargainElement: (fmvOnExercise - exercisePrice) * sharesTransferred,
        amtPreference: Math.max(0, (fmvOnExercise - exercisePrice) * sharesTransferred)
    };
};

// Calculate spread per share (virtual)
const getSpreadPerShare = (doc) => {
    if (!doc.exerciseDetails) return 0;
    return doc.exerciseDetails.fmvOnExercise - doc.exerciseDetails.exercisePrice;
};

// Create base model
const baseModel = createModel('form3921', schema);

// Extended model with custom methods
const Form3921 = {
    ...baseModel,

    // Expose constants
    FORM_STATUSES,
    FILING_METHODS,

    /**
     * Create a new Form 3921 with auto-generated ID and calculations
     * @param {Object} data - Form data
     * @returns {Object} Created form
     */
    async create(data) {
        const formId = data.formId || `f3921_${uuidv4()}`;

        // Calculate values from exercise details
        const calculations = calculateFormValues(data.exerciseDetails);

        // Prepare document
        const formData = {
            ...data,
            formId,
            calculations,
            status: data.status || 'draft',
            isCorrection: data.isCorrection || false,
            copies: data.copies || {
                copyAFiled: false,
                copyBProvided: false,
                copy1Filed: false,
                copyCSent: false
            },
            metadata: data.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return baseModel.create(formData);
    },

    /**
     * Update a form and recalculate values if needed
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Update result
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;

        // Recalculate if exercise details changed
        if (updateData.exerciseDetails) {
            const existingDoc = await baseModel.findOne(query);
            if (existingDoc) {
                const mergedExerciseDetails = {
                    ...existingDoc.exerciseDetails,
                    ...updateData.exerciseDetails
                };
                updateData.calculations = calculateFormValues(mergedExerciseDetails);
            }
        }

        updateData.updatedAt = new Date().toISOString();

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Approve a form
     * @param {string} formId - Form ID or _id
     * @param {string} userId - Approving user ID
     * @returns {Object} Updated form
     */
    async approve(formId, userId) {
        const doc = await baseModel.findOne({ $or: [{ _id: formId }, { formId }] });

        if (!doc) {
            throw new Error('Form not found');
        }

        if (doc.status !== 'pending_review') {
            throw new Error('Form must be in pending_review status to approve');
        }

        const updateData = {
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Mark a form as filed
     * @param {string} formId - Form ID or _id
     * @param {string} userId - Filing user ID
     * @param {Object} filingData - Filing details
     * @returns {Object} Updated form
     */
    async markFiled(formId, userId, filingData = {}) {
        const doc = await baseModel.findOne({ $or: [{ _id: formId }, { formId }] });

        if (!doc) {
            throw new Error('Form not found');
        }

        if (doc.status !== 'approved') {
            throw new Error('Form must be approved before filing');
        }

        const updateData = {
            status: 'filed',
            filing: {
                filedDate: new Date().toISOString(),
                filedBy: userId,
                ...filingData
            },
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Create a correction for an existing form
     * @param {string} formId - Original form ID or _id
     * @param {string} userId - User creating correction
     * @param {string} correctionReason - Reason for correction
     * @returns {Object} New correction form
     */
    async createCorrection(formId, userId, correctionReason) {
        const originalDoc = await baseModel.findOne({ $or: [{ _id: formId }, { formId }] });

        if (!originalDoc) {
            throw new Error('Original form not found');
        }

        // Create correction document
        const correctionData = {
            ...originalDoc,
            _id: undefined,
            formId: `f3921_${uuidv4()}`,
            status: 'draft',
            isCorrection: true,
            correctedFormId: originalDoc._id,
            correctionReason,
            createdBy: userId,
            updatedBy: null,
            approvedBy: null,
            approvedAt: null,
            filing: {},
            copies: {
                copyAFiled: false,
                copyBProvided: false,
                copy1Filed: false,
                copyCSent: false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const correction = await baseModel.create(correctionData);

        // Mark original as corrected
        await baseModel.updateOne(
            { _id: originalDoc._id },
            {
                $set: {
                    status: 'corrected',
                    updatedBy: userId,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        return correction;
    },

    /**
     * Find forms by company and tax year
     * @param {string} companyId - Company ID
     * @param {number} taxYear - Tax year
     * @returns {Array} Forms matching criteria
     */
    async findByCompanyAndYear(companyId, taxYear) {
        const results = await baseModel.find({ companyId, taxYear });
        return results.sort((a, b) => {
            const nameA = a.transferee?.name || '';
            const nameB = b.transferee?.name || '';
            return nameA.localeCompare(nameB);
        });
    },

    /**
     * Find forms by employee and tax year
     * @param {string} employeeId - Employee ID
     * @param {number} taxYear - Tax year
     * @returns {Array} Forms matching criteria
     */
    async findByEmployeeAndYear(employeeId, taxYear) {
        const results = await baseModel.find({ employeeId, taxYear });
        return results.sort((a, b) => {
            const dateA = new Date(a.exerciseDetails?.exerciseDate || 0);
            const dateB = new Date(b.exerciseDetails?.exerciseDate || 0);
            return dateA - dateB;
        });
    },

    /**
     * Get forms pending filing
     * @param {string} companyId - Company ID
     * @param {number} taxYear - Tax year
     * @returns {Array} Approved forms awaiting filing
     */
    async getPendingFiling(companyId, taxYear) {
        return baseModel.find({
            companyId,
            taxYear,
            status: 'approved'
        });
    },

    /**
     * Get filing summary for a company and year
     * @param {string} companyId - Company ID
     * @param {number} taxYear - Tax year
     * @returns {Object} Filing summary statistics
     */
    async getFilingSummary(companyId, taxYear) {
        const forms = await baseModel.find({ companyId, taxYear });

        const byStatus = {};
        let totalBargainElement = 0;
        let totalShares = 0;
        const employeeIds = new Set();

        for (const form of forms) {
            byStatus[form.status] = (byStatus[form.status] || 0) + 1;
            totalBargainElement += form.calculations?.bargainElement || 0;
            totalShares += form.exerciseDetails?.sharesTransferred || 0;
            if (form.employeeId) {
                employeeIds.add(form.employeeId);
            }
        }

        return {
            total: forms.length,
            byStatus,
            totalBargainElement,
            totalShares,
            employeeCount: employeeIds.size
        };
    },

    /**
     * Get spread per share (virtual property)
     * @param {Object} doc - Form document
     * @returns {number} Spread per share
     */
    getSpreadPerShare(doc) {
        return getSpreadPerShare(doc);
    },

    /**
     * Transform document for JSON response with virtuals
     * @param {Object} doc - Document to transform
     * @returns {Object} Transformed document
     */
    toJSON(doc) {
        if (!doc) return null;
        return {
            ...doc,
            spreadPerShare: getSpreadPerShare(doc),
            isQualifyingDisposition: null // Can only be determined at sale time
        };
    }
};

module.exports = Form3921;
