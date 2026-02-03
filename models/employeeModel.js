/**
 * Employee Model - ZeroDB
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages employee records with equity, vesting schedules, and tax calculations.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Email validation regex
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// Schema definition for documentation and validation
const employeeSchema = {
    EmployeeID: { type: 'string', required: true, unique: true },
    Name: { type: 'string', required: true, trim: true },
    Email: { type: 'string', required: true, unique: true, pattern: EMAIL_REGEX },
    EquityOverview: {
        type: 'object',
        schema: {
            TotalEquity: { type: 'number', default: 0 },
            VestedEquity: { type: 'number', default: 0 },
            UnvestedEquity: { type: 'number', default: 0 }
        },
        default: {
            TotalEquity: 0,
            VestedEquity: 0,
            UnvestedEquity: 0
        }
    },
    DocumentAccess: {
        type: 'array',
        items: {
            DocID: { type: 'string', required: true },
            DocumentType: { type: 'string', required: true },
            Timestamp: { type: 'string' }
        },
        default: []
    },
    VestingSchedule: {
        type: 'object',
        schema: {
            StartDate: { type: 'string', default: null },
            CliffDate: { type: 'string', default: null },
            VestingPeriod: { type: 'number', default: 0 },
            TotalEquity: { type: 'number', default: 0 }
        },
        default: {
            StartDate: null,
            CliffDate: null,
            VestingPeriod: 0,
            TotalEquity: 0
        }
    },
    TaxCalculator: {
        type: 'object',
        schema: {
            TaxBracket: { type: 'number', default: 0 },
            TaxLiability: { type: 'number', default: 0 }
        },
        default: {
            TaxBracket: 0,
            TaxLiability: 0
        }
    }
};

// Create base model with ZeroDB
const baseModel = createModel('employees', employeeSchema);

/**
 * Validate employee data before create/update
 * @param {Object} data - Employee data to validate
 * @throws {Error} If validation fails
 */
function validateEmployee(data) {
    // Required field validation
    if (!data.EmployeeID) {
        throw new Error('EmployeeID is required');
    }
    if (!data.Name) {
        throw new Error('Name is required');
    }
    if (!data.Email) {
        throw new Error('Email is required');
    }

    // Email format validation
    if (!EMAIL_REGEX.test(data.Email)) {
        throw new Error('Invalid email format');
    }

    // Equity validation (pre-save hook logic from original model)
    if (data.EquityOverview) {
        const { TotalEquity = 0, VestedEquity = 0, UnvestedEquity = 0 } = data.EquityOverview;
        if (TotalEquity < VestedEquity + UnvestedEquity) {
            throw new Error('TotalEquity must be greater than or equal to the sum of VestedEquity and UnvestedEquity');
        }
    }

    // Vesting schedule validation (pre-save hook logic from original model)
    if (data.VestingSchedule) {
        const { StartDate, CliffDate } = data.VestingSchedule;
        if (StartDate && CliffDate) {
            const startDateObj = new Date(StartDate);
            const cliffDateObj = new Date(CliffDate);
            if (cliffDateObj <= startDateObj) {
                throw new Error('CliffDate must be after StartDate');
            }
        }
    }

    // Document access validation
    if (data.DocumentAccess && Array.isArray(data.DocumentAccess)) {
        for (const doc of data.DocumentAccess) {
            if (!doc.DocID) {
                throw new Error('DocID is required for document access');
            }
            if (!doc.DocumentType) {
                throw new Error('DocumentType is required for document access');
            }
        }
    }
}

/**
 * Apply default values to employee data
 * @param {Object} data - Employee data
 * @returns {Object} Employee data with defaults applied
 */
function applyDefaults(data) {
    const defaults = {
        EquityOverview: {
            TotalEquity: 0,
            VestedEquity: 0,
            UnvestedEquity: 0
        },
        DocumentAccess: [],
        VestingSchedule: {
            StartDate: null,
            CliffDate: null,
            VestingPeriod: 0,
            TotalEquity: 0
        },
        TaxCalculator: {
            TaxBracket: 0,
            TaxLiability: 0
        }
    };

    // Trim name if provided
    const processedData = { ...data };
    if (processedData.Name) {
        processedData.Name = processedData.Name.trim();
    }

    return {
        ...defaults,
        ...processedData,
        EquityOverview: {
            ...defaults.EquityOverview,
            ...(processedData.EquityOverview || {})
        },
        VestingSchedule: {
            ...defaults.VestingSchedule,
            ...(processedData.VestingSchedule || {})
        },
        TaxCalculator: {
            ...defaults.TaxCalculator,
            ...(processedData.TaxCalculator || {})
        }
    };
}

// Extended Employee model with validation and business logic
const Employee = {
    ...baseModel,

    // Export email regex for external use
    EMAIL_REGEX,

    /**
     * Create a new employee with validation
     * @param {Object} data - Employee data
     * @returns {Object} Created employee
     */
    async create(data) {
        validateEmployee(data);
        const employeeData = applyDefaults(data);
        return baseModel.create(employeeData);
    },

    /**
     * Find employee by EmployeeID
     * @param {string} employeeId - The EmployeeID to search for
     * @returns {Object|null} Employee or null
     */
    async findByEmployeeId(employeeId) {
        return baseModel.findOne({ EmployeeID: employeeId });
    },

    /**
     * Find employee by email
     * @param {string} email - The email to search for
     * @returns {Object|null} Employee or null
     */
    async findByEmail(email) {
        return baseModel.findOne({ Email: email });
    },

    /**
     * Update employee with validation
     * @param {string} employeeId - The EmployeeID of the employee
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated employee
     */
    async update(employeeId, updateData) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        // Merge with existing data for validation
        const mergedData = {
            ...employee,
            ...updateData,
            EquityOverview: {
                ...employee.EquityOverview,
                ...(updateData.EquityOverview || {})
            },
            VestingSchedule: {
                ...employee.VestingSchedule,
                ...(updateData.VestingSchedule || {})
            },
            TaxCalculator: {
                ...employee.TaxCalculator,
                ...(updateData.TaxCalculator || {})
            }
        };

        validateEmployee(mergedData);

        return baseModel.findOneAndUpdate(
            { EmployeeID: employeeId },
            { $set: updateData },
            { new: true }
        );
    },

    /**
     * Update equity overview
     * @param {string} employeeId - The EmployeeID of the employee
     * @param {Object} equityData - New equity data
     * @returns {Object} Updated employee
     */
    async updateEquityOverview(employeeId, equityData) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const updatedEquity = {
            ...employee.EquityOverview,
            ...equityData
        };

        // Validate equity
        const { TotalEquity = 0, VestedEquity = 0, UnvestedEquity = 0 } = updatedEquity;
        if (TotalEquity < VestedEquity + UnvestedEquity) {
            throw new Error('TotalEquity must be greater than or equal to the sum of VestedEquity and UnvestedEquity');
        }

        return baseModel.findOneAndUpdate(
            { EmployeeID: employeeId },
            { $set: { EquityOverview: updatedEquity } },
            { new: true }
        );
    },

    /**
     * Update vesting schedule
     * @param {string} employeeId - The EmployeeID of the employee
     * @param {Object} vestingData - New vesting schedule data
     * @returns {Object} Updated employee
     */
    async updateVestingSchedule(employeeId, vestingData) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const updatedVesting = {
            ...employee.VestingSchedule,
            ...vestingData
        };

        // Validate dates
        if (updatedVesting.StartDate && updatedVesting.CliffDate) {
            const startDateObj = new Date(updatedVesting.StartDate);
            const cliffDateObj = new Date(updatedVesting.CliffDate);
            if (cliffDateObj <= startDateObj) {
                throw new Error('CliffDate must be after StartDate');
            }
        }

        return baseModel.findOneAndUpdate(
            { EmployeeID: employeeId },
            { $set: { VestingSchedule: updatedVesting } },
            { new: true }
        );
    },

    /**
     * Add document access
     * @param {string} employeeId - The EmployeeID of the employee
     * @param {Object} documentAccess - Document access entry
     * @returns {Object} Updated employee
     */
    async addDocumentAccess(employeeId, documentAccess) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        if (!documentAccess.DocID) {
            throw new Error('DocID is required for document access');
        }
        if (!documentAccess.DocumentType) {
            throw new Error('DocumentType is required for document access');
        }

        const entry = {
            ...documentAccess,
            Timestamp: documentAccess.Timestamp || new Date().toISOString()
        };

        const documents = [...(employee.DocumentAccess || []), entry];

        return baseModel.findOneAndUpdate(
            { EmployeeID: employeeId },
            { $set: { DocumentAccess: documents } },
            { new: true }
        );
    },

    /**
     * Remove document access
     * @param {string} employeeId - The EmployeeID of the employee
     * @param {string} docId - The DocID to remove
     * @returns {Object} Updated employee
     */
    async removeDocumentAccess(employeeId, docId) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const documents = (employee.DocumentAccess || []).filter(
            doc => doc.DocID !== docId
        );

        return baseModel.findOneAndUpdate(
            { EmployeeID: employeeId },
            { $set: { DocumentAccess: documents } },
            { new: true }
        );
    },

    /**
     * Update tax calculator
     * @param {string} employeeId - The EmployeeID of the employee
     * @param {Object} taxData - New tax calculator data
     * @returns {Object} Updated employee
     */
    async updateTaxCalculator(employeeId, taxData) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const updatedTax = {
            ...employee.TaxCalculator,
            ...taxData
        };

        return baseModel.findOneAndUpdate(
            { EmployeeID: employeeId },
            { $set: { TaxCalculator: updatedTax } },
            { new: true }
        );
    },

    /**
     * Calculate vested equity based on current date
     * @param {string} employeeId - The EmployeeID of the employee
     * @returns {Object} Vesting calculation result
     */
    async calculateVestedEquity(employeeId) {
        const employee = await this.findByEmployeeId(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const { VestingSchedule, EquityOverview } = employee;
        if (!VestingSchedule.StartDate) {
            return {
                vestedEquity: 0,
                unvestedEquity: EquityOverview.TotalEquity,
                percentVested: 0
            };
        }

        const now = new Date();
        const startDate = new Date(VestingSchedule.StartDate);
        const cliffDate = VestingSchedule.CliffDate ? new Date(VestingSchedule.CliffDate) : null;
        const vestingPeriodMonths = VestingSchedule.VestingPeriod || 0;
        const totalEquity = VestingSchedule.TotalEquity || EquityOverview.TotalEquity;

        // Before cliff date, nothing is vested
        if (cliffDate && now < cliffDate) {
            return {
                vestedEquity: 0,
                unvestedEquity: totalEquity,
                percentVested: 0
            };
        }

        // Calculate months elapsed
        const monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 +
            (now.getMonth() - startDate.getMonth());

        if (vestingPeriodMonths <= 0) {
            return {
                vestedEquity: totalEquity,
                unvestedEquity: 0,
                percentVested: 100
            };
        }

        const percentVested = Math.min(100, (monthsElapsed / vestingPeriodMonths) * 100);
        const vestedEquity = (percentVested / 100) * totalEquity;
        const unvestedEquity = totalEquity - vestedEquity;

        return {
            vestedEquity: Math.round(vestedEquity * 100) / 100,
            unvestedEquity: Math.round(unvestedEquity * 100) / 100,
            percentVested: Math.round(percentVested * 100) / 100
        };
    }
};

module.exports = Employee;
