/**
 * BoardApproval Model
 * Issue #325: Add BoardApproval model for 409A governance tracking
 *
 * Tracks board resolutions, votes, and approvals as first-class entities.
 * Critical for 409A compliance - IRS scrutiny focuses on governance trail
 * and whether valuations were properly approved by an independent board.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Enum definitions
const APPROVAL_TYPES = [
    '409a_valuation',
    'stock_option_plan',
    'option_grant',
    'share_issuance',
    'financing_round',
    'equity_plan_amendment',
    'other'
];

const MEETING_TYPES = [
    'regular',
    'special',
    'unanimous_written_consent'
];

const APPROVAL_STATUS = [
    'draft',
    'pending_signatures',
    'approved',
    'rejected',
    'superseded'
];

const VOTE_TYPES = ['for', 'against', 'abstain', 'absent'];

// Schema definition
const boardApprovalSchema = {
    // Core identifiers
    _id: { type: 'string', required: true, unique: true },
    approvalId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },

    // Approval type and related entity
    approvalType: { type: 'string', required: true, enum: APPROVAL_TYPES },
    relatedEntityId: { type: 'string' },
    relatedEntityType: { type: 'string' },
    title: { type: 'string', required: true },
    description: { type: 'string' },

    // Meeting details
    meetingDate: { type: 'date', required: true },
    meetingType: { type: 'string', enum: MEETING_TYPES, default: 'regular' },
    quorumPresent: { type: 'boolean', required: true },
    resolutionText: { type: 'string' },

    // Voting
    votesFor: { type: 'number', default: 0, min: 0 },
    votesAgainst: { type: 'number', default: 0, min: 0 },
    votesAbstained: { type: 'number', default: 0, min: 0 },
    unanimousApproval: { type: 'boolean', default: false },
    independentDirectorsApproved: { type: 'boolean', default: false }, // Key for 409A

    // Board members
    boardMembers: { type: 'array', default: [] },
    // Each member: { memberId, name, role, vote, independent, conflictOfInterest }
    chairperson: { type: 'string' },
    totalBoardMembers: { type: 'number', default: 0, min: 0 },
    quorumRequirement: { type: 'number', default: 0.5, min: 0, max: 1 }, // e.g., 0.5 = 50%

    // Documentation
    minutesDocumentId: { type: 'string' },
    resolutionDocumentId: { type: 'string' },
    attachmentIds: { type: 'array', default: [] },

    // Status
    status: { type: 'string', enum: APPROVAL_STATUS, default: 'draft' },
    effectiveDate: { type: 'date' },

    // Audit trail
    submittedBy: { type: 'string' },
    submittedAt: { type: 'date' },
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },

    // Metadata
    notes: { type: 'string' },
    tags: { type: 'array', default: [] },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('board_approvals', boardApprovalSchema);

// Extended BoardApproval model with business logic
const BoardApproval = {
    ...baseModel,
    tableName: 'board_approvals',
    schema: boardApprovalSchema,

    // Expose enums
    APPROVAL_TYPES,
    MEETING_TYPES,
    APPROVAL_STATUS,
    VOTE_TYPES,

    /**
     * Create a new board approval with validation
     * @param {Object} data - Approval data
     * @returns {Object} Created approval
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('Company ID is required');
        }
        if (!data.title) {
            throw new Error('Title is required');
        }
        if (!data.approvalType) {
            throw new Error('Approval type is required');
        }
        if (!data.meetingDate) {
            throw new Error('Meeting date is required');
        }
        if (data.quorumPresent === undefined) {
            throw new Error('Quorum status is required');
        }

        // Validate enums
        if (!APPROVAL_TYPES.includes(data.approvalType)) {
            throw new Error(`Invalid approval type. Must be one of: ${APPROVAL_TYPES.join(', ')}`);
        }
        if (data.meetingType && !MEETING_TYPES.includes(data.meetingType)) {
            throw new Error(`Invalid meeting type. Must be one of: ${MEETING_TYPES.join(', ')}`);
        }
        if (data.status && !APPROVAL_STATUS.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${APPROVAL_STATUS.join(', ')}`);
        }

        // Generate approvalId if not provided
        if (!data.approvalId) {
            data.approvalId = `approval_${uuidv4()}`;
        }

        // Set defaults
        const dataWithDefaults = {
            meetingType: 'regular',
            status: 'draft',
            votesFor: 0,
            votesAgainst: 0,
            votesAbstained: 0,
            unanimousApproval: false,
            independentDirectorsApproved: false,
            boardMembers: [],
            attachmentIds: [],
            totalBoardMembers: 0,
            quorumRequirement: 0.5,
            tags: [],
            ...data
        };

        // Calculate vote counts from board members if provided
        if (dataWithDefaults.boardMembers.length > 0) {
            const voteCounts = this.calculateVoteCounts(dataWithDefaults.boardMembers);
            dataWithDefaults.votesFor = voteCounts.for;
            dataWithDefaults.votesAgainst = voteCounts.against;
            dataWithDefaults.votesAbstained = voteCounts.abstain;
            dataWithDefaults.totalBoardMembers = dataWithDefaults.boardMembers.length;
            dataWithDefaults.unanimousApproval = voteCounts.against === 0 && voteCounts.abstain === 0 && voteCounts.for > 0;
            dataWithDefaults.independentDirectorsApproved = this.checkIndependentDirectorsApproval(dataWithDefaults);
        }

        return baseModel.create.call(baseModel, dataWithDefaults);
    },

    /**
     * Calculate vote counts from board members
     * @param {Array} boardMembers - Board member votes
     * @returns {Object} Vote counts { for, against, abstain, absent }
     */
    calculateVoteCounts(boardMembers) {
        const counts = { for: 0, against: 0, abstain: 0, absent: 0 };
        for (const member of boardMembers) {
            if (member.vote && counts[member.vote] !== undefined) {
                counts[member.vote]++;
            }
        }
        return counts;
    },

    /**
     * Check if quorum is met
     * @param {Object} approval - Approval object
     * @returns {boolean} Whether quorum is met
     */
    isQuorumMet(approval) {
        if (!approval.boardMembers || approval.boardMembers.length === 0) {
            return approval.quorumPresent;
        }

        const votingMembers = approval.boardMembers.filter(m => m.vote !== 'absent').length;
        const totalMembers = approval.totalBoardMembers || approval.boardMembers.length;
        const requiredQuorum = approval.quorumRequirement || 0.5;

        return votingMembers / totalMembers >= requiredQuorum;
    },

    /**
     * Check if approval passed
     * @param {Object} approval - Approval object
     * @returns {boolean} Whether approval passed
     */
    isPassed(approval) {
        if (!this.isQuorumMet(approval)) {
            return false;
        }

        const totalVotes = approval.votesFor + approval.votesAgainst;
        if (totalVotes === 0) {
            return false;
        }

        return approval.votesFor > approval.votesAgainst;
    },

    /**
     * Check if independent directors approved
     * @param {Object} approval - Approval object
     * @returns {boolean} Whether independent directors approved
     */
    checkIndependentDirectorsApproval(approval) {
        if (!approval.boardMembers || approval.boardMembers.length === 0) {
            return false;
        }

        const independentMembers = approval.boardMembers.filter(m => m.independent);
        if (independentMembers.length === 0) {
            return false;
        }

        const independentForVotes = independentMembers.filter(m => m.vote === 'for').length;
        return independentForVotes > independentMembers.length / 2;
    },

    /**
     * Find approval by approvalId
     * @param {string} approvalId - Approval ID
     * @returns {Object|null} Approval or null
     */
    async findByApprovalId(approvalId) {
        return baseModel.findOne.call(baseModel, { approvalId });
    },

    /**
     * Find all approvals for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Approvals for the company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Find approvals by type
     * @param {string} companyId - Company ID
     * @param {string} approvalType - Approval type
     * @returns {Array} Approvals of the type
     */
    async findByType(companyId, approvalType) {
        const approvals = await baseModel.find.call(baseModel, { companyId });
        return approvals.filter(a => a.approvalType === approvalType);
    },

    /**
     * Find approvals for a specific entity
     * @param {string} relatedEntityId - Entity ID
     * @param {string} relatedEntityType - Entity type (optional)
     * @returns {Array} Approvals for the entity
     */
    async findByEntity(relatedEntityId, relatedEntityType = null) {
        const query = { relatedEntityId };
        if (relatedEntityType) {
            query.relatedEntityType = relatedEntityType;
        }
        return baseModel.find.call(baseModel, query);
    },

    /**
     * Find approvals by status
     * @param {string} companyId - Company ID
     * @param {string} status - Status
     * @returns {Array} Approvals with status
     */
    async findByStatus(companyId, status) {
        const approvals = await baseModel.find.call(baseModel, { companyId });
        return approvals.filter(a => a.status === status);
    },

    /**
     * Find 409A valuation approvals
     * @param {string} companyId - Company ID
     * @returns {Array} 409A valuation approvals
     */
    async find409AApprovals(companyId) {
        return this.findByType(companyId, '409a_valuation');
    },

    /**
     * Get approvals requiring independent director review
     * @param {string} companyId - Company ID
     * @returns {Array} Approvals needing independent review
     */
    async findPendingIndependentReview(companyId) {
        const approvals = await baseModel.find.call(baseModel, { companyId });
        return approvals.filter(a =>
            a.approvalType === '409a_valuation' &&
            a.status !== 'approved' &&
            a.status !== 'rejected' &&
            !a.independentDirectorsApproved
        );
    },

    /**
     * Record a vote
     * @param {string} approvalId - Approval ID
     * @param {Object} voteData - { memberId, vote, independent, conflictOfInterest }
     * @returns {Object} Updated approval
     */
    async recordVote(approvalId, voteData) {
        const approval = await this.findByApprovalId(approvalId);

        if (!approval) {
            throw new Error('Approval not found');
        }

        if (approval.status === 'approved' || approval.status === 'rejected') {
            throw new Error('Cannot modify votes on finalized approval');
        }

        if (!VOTE_TYPES.includes(voteData.vote)) {
            throw new Error(`Invalid vote. Must be one of: ${VOTE_TYPES.join(', ')}`);
        }

        const boardMembers = [...(approval.boardMembers || [])];
        const memberIndex = boardMembers.findIndex(m => m.memberId === voteData.memberId);

        if (memberIndex >= 0) {
            boardMembers[memberIndex] = { ...boardMembers[memberIndex], ...voteData };
        } else {
            boardMembers.push(voteData);
        }

        // Recalculate vote counts
        const voteCounts = this.calculateVoteCounts(boardMembers);
        const unanimousApproval = voteCounts.against === 0 && voteCounts.abstain === 0 && voteCounts.for > 0;
        const independentDirectorsApproved = this.checkIndependentDirectorsApproval({ boardMembers });

        return baseModel.findOneAndUpdate.call(baseModel,
            { approvalId },
            {
                boardMembers,
                totalBoardMembers: boardMembers.length,
                votesFor: voteCounts.for,
                votesAgainst: voteCounts.against,
                votesAbstained: voteCounts.abstain,
                unanimousApproval,
                independentDirectorsApproved,
                updatedAt: new Date()
            }
        );
    },

    /**
     * Finalize approval (approve or reject)
     * @param {string} approvalId - Approval ID
     * @param {boolean} approved - Whether approved
     * @param {Object} details - { approvedBy, effectiveDate }
     * @returns {Object} Updated approval
     */
    async finalize(approvalId, approved, details = {}) {
        const approval = await this.findByApprovalId(approvalId);

        if (!approval) {
            throw new Error('Approval not found');
        }

        if (approval.status === 'approved' || approval.status === 'rejected') {
            throw new Error('Approval already finalized');
        }

        if (!approval.quorumPresent && !this.isQuorumMet(approval)) {
            throw new Error('Cannot finalize without quorum');
        }

        const status = approved ? 'approved' : 'rejected';
        const updateData = {
            status,
            approvedAt: new Date(),
            updatedAt: new Date()
        };

        if (details.approvedBy) {
            updateData.approvedBy = details.approvedBy;
        }
        if (details.effectiveDate) {
            updateData.effectiveDate = details.effectiveDate;
        } else if (approved) {
            updateData.effectiveDate = new Date();
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { approvalId },
            updateData
        );
    },

    /**
     * Attach document to approval
     * @param {string} approvalId - Approval ID
     * @param {string} documentId - Document ID
     * @param {string} documentType - 'minutes', 'resolution', or 'attachment'
     * @returns {Object} Updated approval
     */
    async attachDocument(approvalId, documentId, documentType = 'attachment') {
        const approval = await this.findByApprovalId(approvalId);

        if (!approval) {
            throw new Error('Approval not found');
        }

        const updateData = { updatedAt: new Date() };

        if (documentType === 'minutes') {
            updateData.minutesDocumentId = documentId;
        } else if (documentType === 'resolution') {
            updateData.resolutionDocumentId = documentId;
        } else {
            const attachmentIds = [...(approval.attachmentIds || [])];
            if (!attachmentIds.includes(documentId)) {
                attachmentIds.push(documentId);
            }
            updateData.attachmentIds = attachmentIds;
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { approvalId },
            updateData
        );
    },

    /**
     * Get governance summary for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Governance summary
     */
    async getGovernanceSummary(companyId) {
        const approvals = await this.findByCompany(companyId);

        const byType = {};
        for (const type of APPROVAL_TYPES) {
            const typeApprovals = approvals.filter(a => a.approvalType === type);
            byType[type] = {
                total: typeApprovals.length,
                approved: typeApprovals.filter(a => a.status === 'approved').length,
                pending: typeApprovals.filter(a => a.status !== 'approved' && a.status !== 'rejected').length,
                rejected: typeApprovals.filter(a => a.status === 'rejected').length
            };
        }

        const byStatus = {};
        for (const status of APPROVAL_STATUS) {
            byStatus[status] = approvals.filter(a => a.status === status).length;
        }

        return {
            companyId,
            totalApprovals: approvals.length,
            byType,
            byStatus,
            pendingIndependentReview: approvals.filter(a =>
                a.approvalType === '409a_valuation' &&
                !a.independentDirectorsApproved &&
                a.status !== 'approved'
            ).length,
            recentApprovals: approvals
                .filter(a => a.status === 'approved')
                .sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0))
                .slice(0, 5)
                .map(a => ({
                    approvalId: a.approvalId,
                    title: a.title,
                    type: a.approvalType,
                    approvedAt: a.approvedAt
                }))
        };
    },

    /**
     * Search approvals by text
     * @param {string} companyId - Company ID
     * @param {string} searchText - Text to search
     * @returns {Array} Matching approvals
     */
    async search(companyId, searchText) {
        const approvals = await this.findByCompany(companyId);
        const lowerSearch = searchText.toLowerCase();

        return approvals.filter(a =>
            a.title?.toLowerCase().includes(lowerSearch) ||
            a.description?.toLowerCase().includes(lowerSearch) ||
            a.resolutionText?.toLowerCase().includes(lowerSearch)
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

module.exports = BoardApproval;
