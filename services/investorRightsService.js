/**
 * InvestorRights Service
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * Business logic for managing investor rights including:
 * - Rights creation and validation
 * - Rights exercise workflow
 * - Conflict detection
 * - Expiration tracking
 * - Audit history management
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

// Valid right types
const VALID_RIGHT_TYPES = [
  'PRO_RATA',
  'INFORMATION_RIGHTS',
  'BOARD_SEAT',
  'OBSERVER_SEAT',
  'ANTI_DILUTION',
  'VETO_RIGHTS',
  'DRAG_ALONG',
  'TAG_ALONG',
  'PREEMPTIVE',
  'FIRST_REFUSAL',
  'CO_SALE',
  'REDEMPTION',
  'REGISTRATION'
];

// Valid statuses
const VALID_STATUSES = ['ACTIVE', 'EXPIRED', 'EXERCISED', 'WAIVED', 'PENDING', 'SUSPENDED'];

// Rights that can only be exercised once
const ONE_TIME_RIGHTS = ['BOARD_SEAT', 'OBSERVER_SEAT', 'REDEMPTION'];

// Non-exercisable statuses
const NON_EXERCISABLE_STATUSES = ['EXPIRED', 'EXERCISED', 'WAIVED', 'SUSPENDED'];

class InvestorRightsService {
  /**
   * Create a new investor right
   * @param {Object} rightData - The right data
   * @param {string} userId - ID of the user creating the right
   * @returns {Promise<Object>} The created right
   */
  async createRight(rightData, userId) {
    // Validate the data
    const validation = this.validateRightData(rightData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Generate rightId if not provided
    if (!rightData.rightId) {
      rightData.rightId = `RIGHT-${uuidv4().substring(0, 8).toUpperCase()}`;
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(rightData);
    if (conflicts.length > 0) {
      throw new Error(`Right conflict detected: ${conflicts.map(c => c.message).join(', ')}`);
    }

    // Prepare the right data
    const newRight = {
      ...rightData,
      status: rightData.status || 'ACTIVE',
      effectiveDate: rightData.effectiveDate || new Date(),
      auditLog: [{
        action: 'CREATED',
        userId,
        timestamp: new Date(),
        changes: rightData
      }]
    };

    // Create the right
    const result = await databaseAdapter.create('InvestorRights', newRight);
    return result;
  }

  /**
   * Update an existing investor right
   * @param {string} id - The right ID
   * @param {Object} updateData - The update data
   * @param {string} userId - ID of the user performing the update
   * @returns {Promise<Object>} The updated right
   */
  async updateRight(id, updateData, userId) {
    // Find the existing right
    const existingRight = await databaseAdapter.findById('InvestorRights', id);
    if (!existingRight) {
      throw new Error('Investor right not found');
    }

    // Prepare audit entry
    const auditEntry = {
      action: 'UPDATED',
      userId,
      timestamp: new Date(),
      previousValues: {
        status: existingRight.status,
        terms: existingRight.terms
      },
      newValues: updateData
    };

    // Prepare update with audit log
    const update = {
      ...updateData,
      $push: { auditLog: auditEntry }
    };

    // For non-MongoDB adapter, we need to handle differently
    const finalUpdate = {
      ...updateData,
      auditLog: [...(existingRight.auditLog || []), auditEntry]
    };

    const result = await databaseAdapter.findByIdAndUpdate(
      'InvestorRights',
      id,
      finalUpdate,
      { new: true }
    );

    return result;
  }

  /**
   * Exercise a right
   * @param {string} id - The right ID
   * @param {Object} exerciseData - Exercise details
   * @param {string} userId - ID of the user exercising the right
   * @returns {Promise<Object>} The updated right
   */
  async exerciseRight(id, exerciseData, userId) {
    // Find the right
    const right = await databaseAdapter.findById('InvestorRights', id);
    if (!right) {
      throw new Error('Investor right not found');
    }

    // Check if can be exercised
    if (NON_EXERCISABLE_STATUSES.includes(right.status)) {
      throw new Error(`Right cannot be exercised - current status: ${right.status}`);
    }

    // Check expiration
    if (right.expirationDate && new Date() > new Date(right.expirationDate)) {
      throw new Error('Right has expired and cannot be exercised');
    }

    // Prepare exercise history entry
    const exerciseEntry = {
      ...exerciseData,
      exerciseDate: exerciseData.exerciseDate || new Date(),
      exercisedBy: userId,
      timestamp: new Date()
    };

    // Determine new status
    const isOneTimeRight = ONE_TIME_RIGHTS.includes(right.rightType);
    const newStatus = isOneTimeRight ? 'EXERCISED' : right.status;

    // Prepare audit entry
    const auditEntry = {
      action: 'EXERCISED',
      userId,
      timestamp: new Date(),
      changes: exerciseData
    };

    // Update the right
    const update = {
      status: newStatus,
      exerciseHistory: [...(right.exerciseHistory || []), exerciseEntry],
      auditLog: [...(right.auditLog || []), auditEntry]
    };

    const result = await databaseAdapter.findByIdAndUpdate(
      'InvestorRights',
      id,
      update,
      { new: true }
    );

    return result;
  }

  /**
   * Waive a right
   * @param {string} id - The right ID
   * @param {Object} waiveData - Waive details (reason, documentReference)
   * @param {string} userId - ID of the user waiving the right
   * @returns {Promise<Object>} The updated right
   */
  async waiveRight(id, waiveData, userId) {
    // Find the right
    const right = await databaseAdapter.findById('InvestorRights', id);
    if (!right) {
      throw new Error('Investor right not found');
    }

    // Prepare audit entry
    const auditEntry = {
      action: 'WAIVED',
      userId,
      timestamp: new Date(),
      previousValues: { status: right.status },
      newValues: { status: 'WAIVED' },
      reason: waiveData.reason
    };

    // Update the right
    const update = {
      status: 'WAIVED',
      waiveDetails: {
        ...waiveData,
        waivedBy: userId,
        waivedAt: new Date()
      },
      auditLog: [...(right.auditLog || []), auditEntry]
    };

    const result = await databaseAdapter.findByIdAndUpdate(
      'InvestorRights',
      id,
      update,
      { new: true }
    );

    return result;
  }

  /**
   * Find rights expiring within a specified number of days
   * @param {number} days - Number of days to look ahead (default 30)
   * @param {string} companyId - Optional company ID filter
   * @returns {Promise<Array>} Array of expiring rights
   */
  async findExpiringRights(days = 30, companyId = null) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const query = {
      status: 'ACTIVE',
      expirationDate: {
        $gte: now,
        $lte: futureDate
      }
    };

    if (companyId) {
      query.companyId = companyId;
    }

    const result = await databaseAdapter.find('InvestorRights', query, {
      sort: { expirationDate: 1 }
    });

    return result;
  }

  /**
   * Check for conflicts with existing rights
   * @param {Object} newRight - The new right to check
   * @returns {Promise<Array>} Array of conflicts found
   */
  async checkConflicts(newRight) {
    const conflicts = [];
    const { companyId, rightType, terms, investorId } = newRight;

    // Find existing active rights of the same type for this company
    const existingRights = await databaseAdapter.find('InvestorRights', {
      companyId,
      rightType,
      status: 'ACTIVE'
    }, {}) || [];

    // Exclude the same investor's rights when updating
    const otherInvestorRights = (existingRights || []).filter(r => r.investorId !== investorId);

    // Check for board seat conflicts
    if (rightType === 'BOARD_SEAT' && existingRights.length > 0) {
      let totalSeats = 0;
      let assignedSeats = 0;

      existingRights.forEach(r => {
        if (r.terms?.totalSeats) totalSeats = Math.max(totalSeats, r.terms.totalSeats);
        if (r.terms?.assignedSeats) assignedSeats += r.terms.assignedSeats;
      });

      // If trying to add a new board seat and all are assigned
      if (assignedSeats >= totalSeats && totalSeats > 0) {
        conflicts.push({
          type: 'BOARD_SEAT_LIMIT',
          message: 'All board seats are already assigned',
          existingRights: existingRights.map(r => r.rightId)
        });
      }
    }

    // Check for veto rights conflicts
    if (rightType === 'VETO_RIGHTS' && terms?.vetoScope && existingRights.length > 0) {
      const overlappingVeto = existingRights.find(r =>
        r.terms?.vetoScope === terms.vetoScope ||
        r.terms?.vetoScope === 'ALL_DECISIONS' ||
        terms.vetoScope === 'ALL_DECISIONS'
      );

      if (overlappingVeto) {
        conflicts.push({
          type: 'VETO_OVERLAP',
          message: 'Veto rights overlap with existing rights',
          existingRight: overlappingVeto.rightId
        });
      }
    }

    // Check for pro-rata percentage exceeding 100%
    if (rightType === 'PRO_RATA' && terms?.percentage) {
      const totalPercentage = otherInvestorRights.reduce((sum, r) => {
        return sum + (r.terms?.percentage || 0);
      }, terms.percentage);

      if (totalPercentage > 100) {
        conflicts.push({
          type: 'PRO_RATA_EXCEEDS_100',
          message: `Total pro-rata percentage would exceed 100% (${totalPercentage}%)`,
          totalPercentage
        });
      }
    }

    return conflicts;
  }

  /**
   * Get rights by investor
   * @param {string} investorId - The investor ID
   * @param {Object} options - Filter options (status, companyId)
   * @returns {Promise<Array>} Array of rights
   */
  async getRightsByInvestor(investorId, options = {}) {
    const query = { investorId };

    if (options.status) query.status = options.status;
    if (options.companyId) query.companyId = options.companyId;

    const result = await databaseAdapter.find('InvestorRights', query, {
      sort: { createdAt: -1 }
    });

    return result;
  }

  /**
   * Get rights by share class
   * @param {string} shareClassId - The share class ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of rights
   */
  async getRightsByShareClass(shareClassId, options = {}) {
    const query = { shareClassId };

    if (options.status) query.status = options.status;

    const result = await databaseAdapter.find('InvestorRights', query, {
      sort: { createdAt: -1 }
    });

    return result;
  }

  /**
   * Get audit history for a right
   * @param {string} id - The right ID
   * @returns {Promise<Array>} Audit history
   */
  async getAuditHistory(id) {
    const right = await databaseAdapter.findById('InvestorRights', id);
    if (!right) {
      throw new Error('Investor right not found');
    }

    return right.auditLog || [];
  }

  /**
   * Generate a rights summary report for a company
   * @param {string} companyId - The company ID
   * @returns {Promise<Object>} Summary report
   */
  async generateRightsReport(companyId) {
    const rights = await databaseAdapter.find('InvestorRights', { companyId }, {});

    // Group by type
    const byType = {};
    VALID_RIGHT_TYPES.forEach(type => {
      byType[type] = rights.filter(r => r.rightType === type).length;
    });

    // Group by status
    const byStatus = {};
    VALID_STATUSES.forEach(status => {
      byStatus[status] = rights.filter(r => r.status === status).length;
    });

    // Group by investor
    const byInvestor = {};
    rights.forEach(r => {
      if (!byInvestor[r.investorId]) {
        byInvestor[r.investorId] = [];
      }
      byInvestor[r.investorId].push(r.rightType);
    });

    // Find expiring rights (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = rights.filter(r =>
      r.status === 'ACTIVE' &&
      r.expirationDate &&
      new Date(r.expirationDate) <= thirtyDaysFromNow &&
      new Date(r.expirationDate) > now
    );

    return {
      companyId,
      totalRights: rights.length,
      byType,
      byStatus,
      byInvestor,
      expiringSoon: expiringSoon.length,
      generatedAt: new Date()
    };
  }

  /**
   * Validate right data
   * @param {Object} data - The data to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validateRightData(data) {
    const errors = [];

    // Required fields
    if (!data.investorId) {
      errors.push({ field: 'investorId', message: 'Investor ID is required' });
    }
    if (!data.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required' });
    }
    if (!data.rightType) {
      errors.push({ field: 'rightType', message: 'Right type is required' });
    }

    // Validate rightType enum
    if (data.rightType && !VALID_RIGHT_TYPES.includes(data.rightType)) {
      errors.push({
        field: 'rightType',
        message: `Invalid right type. Must be one of: ${VALID_RIGHT_TYPES.join(', ')}`
      });
    }

    // Validate status if provided
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      errors.push({
        field: 'status',
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Validate expiration date if provided
    if (data.expirationDate) {
      const expDate = new Date(data.expirationDate);
      if (isNaN(expDate.getTime())) {
        errors.push({ field: 'expirationDate', message: 'Invalid expiration date format' });
      }
    }

    // Validate terms based on right type
    if (data.rightType === 'PRO_RATA' && data.terms?.percentage) {
      if (data.terms.percentage < 0 || data.terms.percentage > 100) {
        errors.push({ field: 'terms.percentage', message: 'Pro-rata percentage must be between 0 and 100' });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new InvestorRightsService();
