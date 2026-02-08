/**
 * ConvertibleNote Model
 * Issue #322: Add Convertible Note terms data model for 409A compliance
 *
 * Tracks convertible notes and SAFEs that convert into equity
 * at a future financing event or maturity.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Enum definitions for validation
const NOTE_TYPES = ['convertible_note', 'safe', 'kiss', 'simple_agreement'];
const NOTE_STATUS = ['outstanding', 'converted', 'repaid', 'defaulted', 'cancelled'];
const INTEREST_METHODS = ['simple', 'compound_annual', 'compound_monthly', 'none'];
const CONVERSION_TRIGGERS = ['qualified_financing', 'change_of_control', 'ipo', 'maturity', 'elective'];
const SAFE_TYPES = ['pre_money', 'post_money', 'mfn']; // Most Favored Nation

// Schema definition for documentation and validation
const convertibleNoteSchema = {
    // Core identifiers
    noteId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },

    // Note classification
    noteType: { type: 'string', enum: NOTE_TYPES, default: 'convertible_note' },
    safeType: { type: 'string', enum: SAFE_TYPES }, // Only for SAFEs
    status: { type: 'string', enum: NOTE_STATUS, default: 'outstanding' },

    // Linked entities
    investorId: { type: 'string' }, // Note holder
    financingRoundId: { type: 'string' }, // Round where issued
    convertedToRoundId: { type: 'string' }, // Round where converted
    shareClassId: { type: 'string' }, // Share class converted to

    // Principal and investment
    principalAmount: { type: 'number', required: true, min: 0 },
    purchaseDate: { type: 'date', required: true },

    // Interest terms (for convertible notes, not SAFEs)
    interestRate: { type: 'number', default: 0, min: 0, max: 100 }, // Annual rate %
    interestMethod: { type: 'string', enum: INTEREST_METHODS, default: 'simple' },
    accruedInterest: { type: 'number', default: 0, min: 0 },
    interestStartDate: { type: 'date' },

    // Maturity (for convertible notes)
    maturityDate: { type: 'date' },
    maturityMonths: { type: 'number', min: 0 }, // Alternative to maturityDate

    // Conversion terms
    valuationCap: { type: 'number', min: 0 }, // Maximum valuation for conversion
    discount: { type: 'number', default: 0, min: 0, max: 100 }, // Discount percentage
    discountRate: { type: 'number', min: 0, max: 1 }, // Decimal form (e.g., 0.20 for 20%)
    conversionFloor: { type: 'number', min: 0 }, // Minimum price per share
    qualifiedFinancingThreshold: { type: 'number', min: 0 }, // Min raise to trigger conversion

    // Conversion triggers
    conversionTriggers: { type: 'array', default: ['qualified_financing'] }, // What triggers conversion
    autoConvertOnQualifiedFinancing: { type: 'boolean', default: true },
    autoConvertOnMaturity: { type: 'boolean', default: false },
    changeOfControlMultiple: { type: 'number', default: 1, min: 1 }, // Return multiple on CoC

    // Conversion details (when converted)
    conversionDate: { type: 'date' },
    conversionPricePerShare: { type: 'number', min: 0 },
    sharesConverted: { type: 'number', min: 0 },
    conversionValuation: { type: 'number', min: 0 }, // Valuation used for conversion
    wasCapHit: { type: 'boolean' }, // Did conversion use cap?
    wasDiscountApplied: { type: 'boolean' }, // Was discount applied?

    // Pro-rata and participation rights
    proRataRights: { type: 'boolean', default: false },
    majorInvestorThreshold: { type: 'number', min: 0 }, // Amount for major investor status
    informationRights: { type: 'boolean', default: false },
    mfnRights: { type: 'boolean', default: false }, // Most Favored Nation

    // 409A valuation impact
    estimatedConversionPrice: { type: 'number', min: 0 }, // Current estimate
    estimatedShares: { type: 'number', min: 0 }, // Estimated shares on conversion
    dilutiveImpact: { type: 'number', min: 0 }, // Fully diluted impact
    probabilityOfConversion: { type: 'number', min: 0, max: 100 }, // For 409A modeling

    // Documentation
    noteAgreementUrl: { type: 'string' },
    boardApprovalDate: { type: 'date' },
    boardApprovalId: { type: 'string' },

    // Metadata
    notes: { type: 'string' },
    tags: { type: 'array', default: [] },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('convertible_notes', convertibleNoteSchema);

// Extended ConvertibleNote model with business logic
const ConvertibleNote = {
    ...baseModel,
    tableName: 'convertible_notes',
    schema: convertibleNoteSchema,

    // Expose enums for validation
    NOTE_TYPES,
    NOTE_STATUS,
    INTEREST_METHODS,
    CONVERSION_TRIGGERS,
    SAFE_TYPES,

    /**
     * Create a new convertible note with defaults and validation
     * @param {Object} data - Note data
     * @returns {Object} Created note
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('Company ID is required');
        }
        if (!data.name) {
            throw new Error('Note name is required');
        }
        if (data.principalAmount === undefined || data.principalAmount < 0) {
            throw new Error('Principal amount is required and cannot be negative');
        }
        if (!data.purchaseDate) {
            throw new Error('Purchase date is required');
        }

        // Validate enums
        if (data.noteType && !NOTE_TYPES.includes(data.noteType)) {
            throw new Error(`Invalid note type. Must be one of: ${NOTE_TYPES.join(', ')}`);
        }
        if (data.safeType && !SAFE_TYPES.includes(data.safeType)) {
            throw new Error(`Invalid SAFE type. Must be one of: ${SAFE_TYPES.join(', ')}`);
        }
        if (data.status && !NOTE_STATUS.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${NOTE_STATUS.join(', ')}`);
        }
        if (data.interestMethod && !INTEREST_METHODS.includes(data.interestMethod)) {
            throw new Error(`Invalid interest method. Must be one of: ${INTEREST_METHODS.join(', ')}`);
        }

        // SAFEs don't have interest
        if (data.noteType === 'safe' && data.interestRate && data.interestRate > 0) {
            throw new Error('SAFEs do not accrue interest. Set interestRate to 0 or use convertible_note type.');
        }

        // Generate noteId if not provided
        if (!data.noteId) {
            data.noteId = `note_${uuidv4()}`;
        }

        // Calculate maturity date if maturityMonths provided
        if (data.maturityMonths && !data.maturityDate && data.purchaseDate) {
            const purchaseDate = new Date(data.purchaseDate);
            const maturityDate = new Date(purchaseDate);
            maturityDate.setMonth(maturityDate.getMonth() + data.maturityMonths);
            data.maturityDate = maturityDate;
        }

        // Set defaults
        const dataWithDefaults = {
            noteType: 'convertible_note',
            status: 'outstanding',
            interestRate: 0,
            interestMethod: 'simple',
            accruedInterest: 0,
            discount: 0,
            changeOfControlMultiple: 1,
            autoConvertOnQualifiedFinancing: true,
            autoConvertOnMaturity: false,
            conversionTriggers: ['qualified_financing'],
            proRataRights: false,
            informationRights: false,
            mfnRights: false,
            tags: [],
            ...data
        };

        // For SAFEs, ensure no interest
        if (dataWithDefaults.noteType === 'safe') {
            dataWithDefaults.interestRate = 0;
            dataWithDefaults.interestMethod = 'none';
            dataWithDefaults.accruedInterest = 0;
        }

        return baseModel.create.call(baseModel, dataWithDefaults);
    },

    /**
     * Find note by noteId
     * @param {string} noteId - Note ID
     * @returns {Object|null} Note or null
     */
    async findByNoteId(noteId) {
        return baseModel.findOne.call(baseModel, { noteId });
    },

    /**
     * Find all notes for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Notes for the company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Find outstanding notes for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Outstanding notes
     */
    async findOutstanding(companyId) {
        const notes = await baseModel.find.call(baseModel, { companyId });
        return notes.filter(n => n.status === 'outstanding');
    },

    /**
     * Find notes by investor
     * @param {string} investorId - Investor ID
     * @returns {Array} Notes for the investor
     */
    async findByInvestor(investorId) {
        return baseModel.find.call(baseModel, { investorId });
    },

    /**
     * Find notes by type
     * @param {string} companyId - Company ID
     * @param {string} noteType - Note type
     * @returns {Array} Notes of the given type
     */
    async findByType(companyId, noteType) {
        const notes = await baseModel.find.call(baseModel, { companyId });
        return notes.filter(n => n.noteType === noteType);
    },

    /**
     * Find SAFEs for a company
     * @param {string} companyId - Company ID
     * @returns {Array} SAFEs for the company
     */
    async findSAFEs(companyId) {
        return this.findByType(companyId, 'safe');
    },

    /**
     * Find notes maturing within a date range
     * @param {string} companyId - Company ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Notes maturing in range
     */
    async findMaturingBetween(companyId, startDate, endDate) {
        const notes = await baseModel.find.call(baseModel, { companyId });
        return notes.filter(n => {
            if (!n.maturityDate) return false;
            const matDate = new Date(n.maturityDate);
            return matDate >= startDate && matDate <= endDate && n.status === 'outstanding';
        });
    },

    /**
     * Calculate accrued interest for a note
     * @param {Object} note - Note object
     * @param {Date} asOfDate - Date to calculate to (default: now)
     * @returns {number} Accrued interest amount
     */
    calculateAccruedInterest(note, asOfDate = new Date()) {
        if (note.noteType === 'safe' || note.interestRate === 0) {
            return 0;
        }

        const startDate = new Date(note.interestStartDate || note.purchaseDate);
        const endDate = new Date(asOfDate);

        if (endDate <= startDate) {
            return 0;
        }

        const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const yearFraction = daysDiff / 365;
        const rate = note.interestRate / 100;

        switch (note.interestMethod) {
            case 'simple':
                return note.principalAmount * rate * yearFraction;

            case 'compound_annual':
                return note.principalAmount * (Math.pow(1 + rate, yearFraction) - 1);

            case 'compound_monthly':
                const months = daysDiff / 30;
                const monthlyRate = rate / 12;
                return note.principalAmount * (Math.pow(1 + monthlyRate, months) - 1);

            case 'none':
            default:
                return 0;
        }
    },

    /**
     * Calculate total amount due (principal + interest)
     * @param {Object} note - Note object
     * @param {Date} asOfDate - Date to calculate to (default: now)
     * @returns {number} Total amount due
     */
    calculateTotalDue(note, asOfDate = new Date()) {
        const accruedInterest = this.calculateAccruedInterest(note, asOfDate);
        return note.principalAmount + accruedInterest;
    },

    /**
     * Calculate conversion price per share
     * @param {Object} note - Note object
     * @param {number} pricePerShare - Round price per share
     * @param {number} preMoneyValuation - Pre-money valuation of round
     * @returns {Object} Conversion details
     */
    calculateConversionPrice(note, pricePerShare, preMoneyValuation = null) {
        let conversionPrice = pricePerShare;
        let wasCapHit = false;
        let wasDiscountApplied = false;

        // Apply discount
        const discount = note.discount || (note.discountRate ? note.discountRate * 100 : 0);
        if (discount > 0) {
            const discountedPrice = pricePerShare * (1 - discount / 100);
            if (discountedPrice < conversionPrice) {
                conversionPrice = discountedPrice;
                wasDiscountApplied = true;
            }
        }

        // Apply valuation cap
        if (note.valuationCap && preMoneyValuation) {
            // For pre-money SAFEs: cap price = cap / fully diluted shares
            // For simplicity, we compare cap to valuation
            if (preMoneyValuation > note.valuationCap) {
                const capPrice = pricePerShare * (note.valuationCap / preMoneyValuation);
                if (capPrice < conversionPrice) {
                    conversionPrice = capPrice;
                    wasCapHit = true;
                }
            }
        }

        // Apply floor
        if (note.conversionFloor && conversionPrice < note.conversionFloor) {
            conversionPrice = note.conversionFloor;
        }

        return {
            conversionPrice,
            wasCapHit,
            wasDiscountApplied,
            discountApplied: discount,
            effectiveValuation: wasCapHit ? note.valuationCap : preMoneyValuation
        };
    },

    /**
     * Calculate shares on conversion
     * @param {Object} note - Note object
     * @param {number} conversionPrice - Price per share for conversion
     * @param {Date} asOfDate - Date to calculate interest to
     * @returns {number} Number of shares
     */
    calculateConversionShares(note, conversionPrice, asOfDate = new Date()) {
        const totalDue = this.calculateTotalDue(note, asOfDate);
        return totalDue / conversionPrice;
    },

    /**
     * Calculate dilutive impact of all notes for a company
     * @param {string} companyId - Company ID
     * @param {number} estimatedPricePerShare - Estimated price for 409A
     * @returns {Object} Dilution summary
     */
    async calculateDilutiveImpact(companyId, estimatedPricePerShare) {
        const notes = await this.findOutstanding(companyId);

        let totalPrincipal = 0;
        let totalAccruedInterest = 0;
        let totalEstimatedShares = 0;

        const noteDetails = notes.map(n => {
            const accruedInterest = this.calculateAccruedInterest(n);
            const totalDue = n.principalAmount + accruedInterest;

            // Use lowest of cap or discount for estimation
            let estimatedConversionPrice = estimatedPricePerShare;
            if (n.discount > 0) {
                estimatedConversionPrice = estimatedPricePerShare * (1 - n.discount / 100);
            }
            // Cap would need valuation context - using discount-only estimate here

            const estimatedShares = totalDue / estimatedConversionPrice;

            totalPrincipal += n.principalAmount;
            totalAccruedInterest += accruedInterest;
            totalEstimatedShares += estimatedShares;

            return {
                noteId: n.noteId,
                name: n.name,
                noteType: n.noteType,
                principalAmount: n.principalAmount,
                accruedInterest,
                totalDue,
                estimatedShares,
                valuationCap: n.valuationCap,
                discount: n.discount
            };
        });

        return {
            totalNotes: notes.length,
            totalPrincipal,
            totalAccruedInterest,
            totalDue: totalPrincipal + totalAccruedInterest,
            totalEstimatedShares,
            notes: noteDetails
        };
    },

    /**
     * Convert a note to equity
     * @param {string} noteId - Note ID
     * @param {Object} conversionDetails - Conversion parameters
     * @returns {Object} Updated note
     */
    async convert(noteId, conversionDetails) {
        const note = await this.findByNoteId(noteId);

        if (!note) {
            throw new Error('Note not found');
        }

        if (note.status !== 'outstanding') {
            throw new Error(`Cannot convert note with status: ${note.status}`);
        }

        const {
            pricePerShare,
            preMoneyValuation,
            roundId,
            shareClassId,
            conversionDate = new Date()
        } = conversionDetails;

        if (!pricePerShare) {
            throw new Error('Price per share is required for conversion');
        }

        const { conversionPrice, wasCapHit, wasDiscountApplied } =
            this.calculateConversionPrice(note, pricePerShare, preMoneyValuation);

        const sharesConverted = this.calculateConversionShares(note, conversionPrice, conversionDate);

        return baseModel.findOneAndUpdate.call(baseModel,
            { noteId },
            {
                status: 'converted',
                conversionDate,
                conversionPricePerShare: conversionPrice,
                sharesConverted,
                conversionValuation: wasCapHit ? note.valuationCap : preMoneyValuation,
                wasCapHit,
                wasDiscountApplied,
                convertedToRoundId: roundId,
                shareClassId,
                accruedInterest: this.calculateAccruedInterest(note, conversionDate),
                updatedAt: new Date()
            }
        );
    },

    /**
     * Check if note is past maturity
     * @param {Object} note - Note object
     * @returns {boolean} True if past maturity
     */
    isPastMaturity(note) {
        if (!note.maturityDate) return false;
        return new Date(note.maturityDate) < new Date();
    },

    /**
     * Get days to maturity
     * @param {Object} note - Note object
     * @returns {number|null} Days until maturity (null if no maturity date)
     */
    getDaysToMaturity(note) {
        if (!note.maturityDate) return null;
        const now = new Date();
        const maturity = new Date(note.maturityDate);
        const diffTime = maturity - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Search notes by text
     * @param {string} searchText - Text to search
     * @returns {Array} Matching notes
     */
    async search(searchText) {
        const results = await baseModel.find.call(baseModel, {});
        const lowerSearch = searchText.toLowerCase();
        return results.filter(n =>
            n.name?.toLowerCase().includes(lowerSearch) ||
            n.description?.toLowerCase().includes(lowerSearch) ||
            n.noteId?.toLowerCase().includes(lowerSearch)
        );
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

module.exports = ConvertibleNote;
