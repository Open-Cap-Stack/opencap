/**
 * BoardApproval Model Tests
 * Issue #325: Add BoardApproval model for 409A governance tracking
 *
 * Tests for board resolutions, votes, and approval governance.
 */

const BoardApproval = require('../../../models/BoardApproval');

// Mock the ZeroDB base model
jest.mock('../../../models/base/ZeroDBModel', () => ({
    createModel: jest.fn(() => {
        const mockData = [];

        return {
            create: jest.fn(async (data) => {
                const doc = { _id: `id_${Date.now()}_${Math.random()}`, ...data };
                mockData.push(doc);
                return doc;
            }),
            find: jest.fn(async (query = {}) => {
                return mockData.filter(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                });
            }),
            findOne: jest.fn(async (query = {}) => {
                return mockData.find(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                }) || null;
            }),
            findById: jest.fn(async (id) => {
                return mockData.find(doc => doc._id === id) || null;
            }),
            findOneAndUpdate: jest.fn(async (query, update) => {
                const doc = mockData.find(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (doc) {
                    Object.assign(doc, update);
                    return doc;
                }
                return null;
            }),
            updateOne: jest.fn(async (query, update) => {
                const doc = mockData.find(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (doc) {
                    if (update.$set) {
                        Object.assign(doc, update.$set);
                    } else {
                        Object.assign(doc, update);
                    }
                    return { modifiedCount: 1 };
                }
                return { modifiedCount: 0 };
            }),
            updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
            findByIdAndUpdate: jest.fn(async (id, update) => {
                const doc = mockData.find(d => d._id === id);
                if (doc) {
                    Object.assign(doc, update);
                    return doc;
                }
                return null;
            }),
            deleteOne: jest.fn(async (query) => {
                const index = mockData.findIndex(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (index >= 0) {
                    mockData.splice(index, 1);
                    return { deletedCount: 1 };
                }
                return { deletedCount: 0 };
            }),
            deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
            findOneAndDelete: jest.fn(async (query) => {
                const index = mockData.findIndex(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (index >= 0) {
                    const [doc] = mockData.splice(index, 1);
                    return doc;
                }
                return null;
            }),
            findByIdAndDelete: jest.fn(async (id) => {
                const index = mockData.findIndex(d => d._id === id);
                if (index >= 0) {
                    const [doc] = mockData.splice(index, 1);
                    return doc;
                }
                return null;
            }),
            countDocuments: jest.fn(async (query = {}) => {
                return mockData.filter(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                }).length;
            }),
            exists: jest.fn(async (query) => {
                return mockData.some(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                });
            }),
            distinct: jest.fn(async () => []),
            aggregate: jest.fn(async () => []),
            _mockData: mockData,
            _clearMockData: () => mockData.length = 0
        };
    })
}));

// Helper for unique test data
let testCounter = 0;
const getUniqueData = (base = {}) => ({
    companyId: `company_${++testCounter}`,
    title: `Board Approval ${testCounter}`,
    approvalType: '409a_valuation',
    meetingDate: new Date(),
    quorumPresent: true,
    ...base
});

describe('BoardApproval Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema and Enums', () => {
        it('should export APPROVAL_TYPES enum', () => {
            expect(BoardApproval.APPROVAL_TYPES).toEqual([
                '409a_valuation',
                'stock_option_plan',
                'option_grant',
                'share_issuance',
                'financing_round',
                'equity_plan_amendment',
                'other'
            ]);
        });

        it('should export MEETING_TYPES enum', () => {
            expect(BoardApproval.MEETING_TYPES).toEqual([
                'regular',
                'special',
                'unanimous_written_consent'
            ]);
        });

        it('should export APPROVAL_STATUS enum', () => {
            expect(BoardApproval.APPROVAL_STATUS).toEqual([
                'draft',
                'pending_signatures',
                'approved',
                'rejected',
                'superseded'
            ]);
        });

        it('should export VOTE_TYPES enum', () => {
            expect(BoardApproval.VOTE_TYPES).toEqual(['for', 'against', 'abstain', 'absent']);
        });

        it('should have correct schema structure', () => {
            const schema = BoardApproval.schema;
            expect(schema.approvalId).toBeDefined();
            expect(schema.companyId).toBeDefined();
            expect(schema.approvalType).toBeDefined();
            expect(schema.meetingDate).toBeDefined();
            expect(schema.quorumPresent).toBeDefined();
            expect(schema.boardMembers).toBeDefined();
            expect(schema.independentDirectorsApproved).toBeDefined();
        });
    });

    describe('create', () => {
        it('should create approval with required fields', async () => {
            const data = getUniqueData();
            const approval = await BoardApproval.create(data);

            expect(approval).toBeDefined();
            expect(approval.title).toBe(data.title);
            expect(approval.companyId).toBe(data.companyId);
            expect(approval.approvalType).toBe('409a_valuation');
            expect(approval.quorumPresent).toBe(true);
        });

        it('should generate approvalId if not provided', async () => {
            const data = getUniqueData();
            const approval = await BoardApproval.create(data);

            expect(approval.approvalId).toBeDefined();
            expect(approval.approvalId).toMatch(/^approval_/);
        });

        it('should use provided approvalId', async () => {
            const data = getUniqueData({ approvalId: 'custom_approval_123' });
            const approval = await BoardApproval.create(data);

            expect(approval.approvalId).toBe('custom_approval_123');
        });

        it('should set default values', async () => {
            const data = getUniqueData();
            const approval = await BoardApproval.create(data);

            expect(approval.status).toBe('draft');
            expect(approval.meetingType).toBe('regular');
            expect(approval.votesFor).toBe(0);
            expect(approval.votesAgainst).toBe(0);
            expect(approval.votesAbstained).toBe(0);
            expect(approval.unanimousApproval).toBe(false);
            expect(approval.independentDirectorsApproved).toBe(false);
            expect(approval.boardMembers).toEqual([]);
        });

        it('should throw error if companyId is missing', async () => {
            const data = {
                title: 'Test',
                approvalType: '409a_valuation',
                meetingDate: new Date(),
                quorumPresent: true
            };

            await expect(BoardApproval.create(data))
                .rejects.toThrow('Company ID is required');
        });

        it('should throw error if title is missing', async () => {
            const data = {
                companyId: 'company_1',
                approvalType: '409a_valuation',
                meetingDate: new Date(),
                quorumPresent: true
            };

            await expect(BoardApproval.create(data))
                .rejects.toThrow('Title is required');
        });

        it('should throw error if approvalType is missing', async () => {
            const data = {
                companyId: 'company_1',
                title: 'Test',
                meetingDate: new Date(),
                quorumPresent: true
            };

            await expect(BoardApproval.create(data))
                .rejects.toThrow('Approval type is required');
        });

        it('should throw error if meetingDate is missing', async () => {
            const data = {
                companyId: 'company_1',
                title: 'Test',
                approvalType: '409a_valuation',
                quorumPresent: true
            };

            await expect(BoardApproval.create(data))
                .rejects.toThrow('Meeting date is required');
        });

        it('should throw error if quorumPresent is missing', async () => {
            const data = {
                companyId: 'company_1',
                title: 'Test',
                approvalType: '409a_valuation',
                meetingDate: new Date()
            };

            await expect(BoardApproval.create(data))
                .rejects.toThrow('Quorum status is required');
        });

        it('should throw error for invalid approval type', async () => {
            const data = getUniqueData({ approvalType: 'invalid_type' });

            await expect(BoardApproval.create(data))
                .rejects.toThrow(/Invalid approval type/);
        });

        it('should throw error for invalid meeting type', async () => {
            const data = getUniqueData({ meetingType: 'invalid_meeting' });

            await expect(BoardApproval.create(data))
                .rejects.toThrow(/Invalid meeting type/);
        });

        it('should throw error for invalid status', async () => {
            const data = getUniqueData({ status: 'invalid_status' });

            await expect(BoardApproval.create(data))
                .rejects.toThrow(/Invalid status/);
        });

        it('should accept all valid approval types', async () => {
            for (const type of BoardApproval.APPROVAL_TYPES) {
                const data = getUniqueData({ approvalType: type });
                const approval = await BoardApproval.create(data);
                expect(approval.approvalType).toBe(type);
            }
        });

        it('should accept all valid meeting types', async () => {
            for (const type of BoardApproval.MEETING_TYPES) {
                const data = getUniqueData({ meetingType: type });
                const approval = await BoardApproval.create(data);
                expect(approval.meetingType).toBe(type);
            }
        });

        it('should calculate vote counts from board members', async () => {
            const data = getUniqueData({
                boardMembers: [
                    { memberId: 'm1', name: 'Member 1', vote: 'for' },
                    { memberId: 'm2', name: 'Member 2', vote: 'for' },
                    { memberId: 'm3', name: 'Member 3', vote: 'against' }
                ]
            });
            const approval = await BoardApproval.create(data);

            expect(approval.votesFor).toBe(2);
            expect(approval.votesAgainst).toBe(1);
            expect(approval.totalBoardMembers).toBe(3);
        });
    });

    describe('calculateVoteCounts', () => {
        it('should count votes correctly', () => {
            const boardMembers = [
                { memberId: 'm1', vote: 'for' },
                { memberId: 'm2', vote: 'for' },
                { memberId: 'm3', vote: 'against' },
                { memberId: 'm4', vote: 'abstain' },
                { memberId: 'm5', vote: 'absent' }
            ];

            const counts = BoardApproval.calculateVoteCounts(boardMembers);

            expect(counts.for).toBe(2);
            expect(counts.against).toBe(1);
            expect(counts.abstain).toBe(1);
            expect(counts.absent).toBe(1);
        });

        it('should handle empty board members', () => {
            const counts = BoardApproval.calculateVoteCounts([]);

            expect(counts.for).toBe(0);
            expect(counts.against).toBe(0);
            expect(counts.abstain).toBe(0);
            expect(counts.absent).toBe(0);
        });
    });

    describe('isQuorumMet', () => {
        it('should return quorumPresent when no board members', () => {
            const approval = { quorumPresent: true, boardMembers: [] };
            expect(BoardApproval.isQuorumMet(approval)).toBe(true);
        });

        it('should calculate quorum from board members', () => {
            const approval = {
                quorumPresent: false,
                boardMembers: [
                    { memberId: 'm1', vote: 'for' },
                    { memberId: 'm2', vote: 'for' },
                    { memberId: 'm3', vote: 'absent' }
                ],
                totalBoardMembers: 3,
                quorumRequirement: 0.5
            };

            // 2 out of 3 = 66% > 50% requirement
            expect(BoardApproval.isQuorumMet(approval)).toBe(true);
        });

        it('should return false when quorum not met', () => {
            const approval = {
                quorumPresent: false,
                boardMembers: [
                    { memberId: 'm1', vote: 'for' },
                    { memberId: 'm2', vote: 'absent' },
                    { memberId: 'm3', vote: 'absent' },
                    { memberId: 'm4', vote: 'absent' }
                ],
                totalBoardMembers: 4,
                quorumRequirement: 0.5
            };

            // 1 out of 4 = 25% < 50% requirement
            expect(BoardApproval.isQuorumMet(approval)).toBe(false);
        });
    });

    describe('isPassed', () => {
        it('should return true when more for votes than against', () => {
            const approval = {
                quorumPresent: true,
                votesFor: 3,
                votesAgainst: 1
            };

            expect(BoardApproval.isPassed(approval)).toBe(true);
        });

        it('should return false when more against votes', () => {
            const approval = {
                quorumPresent: true,
                votesFor: 1,
                votesAgainst: 3
            };

            expect(BoardApproval.isPassed(approval)).toBe(false);
        });

        it('should return false when no quorum', () => {
            const approval = {
                quorumPresent: false,
                boardMembers: [{ memberId: 'm1', vote: 'absent' }],
                totalBoardMembers: 1,
                quorumRequirement: 0.5,
                votesFor: 0,
                votesAgainst: 0
            };

            expect(BoardApproval.isPassed(approval)).toBe(false);
        });

        it('should return false when no votes cast', () => {
            const approval = {
                quorumPresent: true,
                votesFor: 0,
                votesAgainst: 0
            };

            expect(BoardApproval.isPassed(approval)).toBe(false);
        });
    });

    describe('checkIndependentDirectorsApproval', () => {
        it('should return true when majority of independent directors vote for', () => {
            const approval = {
                boardMembers: [
                    { memberId: 'm1', vote: 'for', independent: true },
                    { memberId: 'm2', vote: 'for', independent: true },
                    { memberId: 'm3', vote: 'against', independent: true },
                    { memberId: 'm4', vote: 'for', independent: false }
                ]
            };

            // 2 out of 3 independent = 66% > 50%
            expect(BoardApproval.checkIndependentDirectorsApproval(approval)).toBe(true);
        });

        it('should return false when independent directors do not approve', () => {
            const approval = {
                boardMembers: [
                    { memberId: 'm1', vote: 'against', independent: true },
                    { memberId: 'm2', vote: 'against', independent: true },
                    { memberId: 'm3', vote: 'for', independent: false }
                ]
            };

            expect(BoardApproval.checkIndependentDirectorsApproval(approval)).toBe(false);
        });

        it('should return false when no independent directors', () => {
            const approval = {
                boardMembers: [
                    { memberId: 'm1', vote: 'for', independent: false },
                    { memberId: 'm2', vote: 'for', independent: false }
                ]
            };

            expect(BoardApproval.checkIndependentDirectorsApproval(approval)).toBe(false);
        });

        it('should return false when no board members', () => {
            const approval = { boardMembers: [] };
            expect(BoardApproval.checkIndependentDirectorsApproval(approval)).toBe(false);
        });
    });

    describe('findByApprovalId', () => {
        it('should find approval by approvalId', async () => {
            const data = getUniqueData({ approvalId: 'find_test_1' });
            await BoardApproval.create(data);

            const found = await BoardApproval.findByApprovalId('find_test_1');
            expect(found).toBeDefined();
            expect(found.approvalId).toBe('find_test_1');
        });

        it('should return null for non-existent approval', async () => {
            const found = await BoardApproval.findByApprovalId('non_existent');
            expect(found).toBeNull();
        });
    });

    describe('findByCompany', () => {
        it('should find all approvals for a company', async () => {
            const companyId = `company_findByCompany_${Date.now()}`;
            await BoardApproval.create(getUniqueData({ companyId }));
            await BoardApproval.create(getUniqueData({ companyId }));
            await BoardApproval.create(getUniqueData({ companyId: 'other_company' }));

            const approvals = await BoardApproval.findByCompany(companyId);
            expect(approvals.length).toBe(2);
            expect(approvals.every(a => a.companyId === companyId)).toBe(true);
        });
    });

    describe('findByType', () => {
        it('should find approvals by type', async () => {
            const companyId = `company_type_${Date.now()}`;
            await BoardApproval.create(getUniqueData({ companyId, approvalType: '409a_valuation' }));
            await BoardApproval.create(getUniqueData({ companyId, approvalType: '409a_valuation' }));
            await BoardApproval.create(getUniqueData({ companyId, approvalType: 'option_grant' }));

            const approvals = await BoardApproval.findByType(companyId, '409a_valuation');
            expect(approvals.length).toBe(2);
            expect(approvals.every(a => a.approvalType === '409a_valuation')).toBe(true);
        });
    });

    describe('findByEntity', () => {
        it('should find approvals by related entity', async () => {
            await BoardApproval.create(getUniqueData({
                relatedEntityId: 'entity_123',
                relatedEntityType: 'Valuation409A'
            }));

            const approvals = await BoardApproval.findByEntity('entity_123');
            expect(approvals.length).toBe(1);
            expect(approvals[0].relatedEntityId).toBe('entity_123');
        });

        it('should filter by entity type', async () => {
            await BoardApproval.create(getUniqueData({
                relatedEntityId: 'entity_456',
                relatedEntityType: 'Valuation409A'
            }));
            await BoardApproval.create(getUniqueData({
                relatedEntityId: 'entity_456',
                relatedEntityType: 'EquityPlan'
            }));

            const approvals = await BoardApproval.findByEntity('entity_456', 'Valuation409A');
            expect(approvals.length).toBe(1);
            expect(approvals[0].relatedEntityType).toBe('Valuation409A');
        });
    });

    describe('findByStatus', () => {
        it('should find approvals by status', async () => {
            const companyId = `company_status_${Date.now()}`;
            await BoardApproval.create(getUniqueData({ companyId, status: 'approved' }));
            await BoardApproval.create(getUniqueData({ companyId, status: 'draft' }));

            const approved = await BoardApproval.findByStatus(companyId, 'approved');
            expect(approved.length).toBe(1);
            expect(approved[0].status).toBe('approved');
        });
    });

    describe('find409AApprovals', () => {
        it('should find 409A valuation approvals', async () => {
            const companyId = `company_409a_${Date.now()}`;
            await BoardApproval.create(getUniqueData({ companyId, approvalType: '409a_valuation' }));
            await BoardApproval.create(getUniqueData({ companyId, approvalType: 'option_grant' }));

            const approvals = await BoardApproval.find409AApprovals(companyId);
            expect(approvals.length).toBe(1);
            expect(approvals[0].approvalType).toBe('409a_valuation');
        });
    });

    describe('findPendingIndependentReview', () => {
        it('should find 409A approvals needing independent review', async () => {
            const companyId = `company_review_${Date.now()}`;
            await BoardApproval.create(getUniqueData({
                companyId,
                approvalType: '409a_valuation',
                status: 'pending_signatures',
                independentDirectorsApproved: false
            }));
            await BoardApproval.create(getUniqueData({
                companyId,
                approvalType: '409a_valuation',
                status: 'approved',
                independentDirectorsApproved: true
            }));

            const pending = await BoardApproval.findPendingIndependentReview(companyId);
            expect(pending.length).toBe(1);
            expect(pending[0].independentDirectorsApproved).toBe(false);
        });
    });

    describe('recordVote', () => {
        it('should record a vote', async () => {
            const data = getUniqueData({ approvalId: 'vote_test_1' });
            await BoardApproval.create(data);

            const updated = await BoardApproval.recordVote('vote_test_1', {
                memberId: 'm1',
                name: 'Test Member',
                vote: 'for',
                independent: true
            });

            expect(updated.boardMembers.length).toBe(1);
            expect(updated.boardMembers[0].vote).toBe('for');
            expect(updated.votesFor).toBe(1);
        });

        it('should update existing member vote', async () => {
            const data = getUniqueData({
                approvalId: 'vote_update_test',
                boardMembers: [{ memberId: 'm1', name: 'Test', vote: 'abstain' }]
            });
            await BoardApproval.create(data);

            const updated = await BoardApproval.recordVote('vote_update_test', {
                memberId: 'm1',
                vote: 'for'
            });

            expect(updated.boardMembers.length).toBe(1);
            expect(updated.boardMembers[0].vote).toBe('for');
            expect(updated.votesFor).toBe(1);
        });

        it('should throw error for non-existent approval', async () => {
            await expect(BoardApproval.recordVote('non_existent', { memberId: 'm1', vote: 'for' }))
                .rejects.toThrow('Approval not found');
        });

        it('should throw error for invalid vote type', async () => {
            const data = getUniqueData({ approvalId: 'invalid_vote_test' });
            await BoardApproval.create(data);

            await expect(BoardApproval.recordVote('invalid_vote_test', {
                memberId: 'm1',
                vote: 'invalid'
            })).rejects.toThrow(/Invalid vote/);
        });

        it('should not allow votes on finalized approval', async () => {
            const data = getUniqueData({ approvalId: 'finalized_vote_test', status: 'approved' });
            await BoardApproval.create(data);

            await expect(BoardApproval.recordVote('finalized_vote_test', {
                memberId: 'm1',
                vote: 'for'
            })).rejects.toThrow('Cannot modify votes on finalized approval');
        });

        it('should calculate unanimousApproval correctly', async () => {
            const data = getUniqueData({ approvalId: 'unanimous_test' });
            await BoardApproval.create(data);

            await BoardApproval.recordVote('unanimous_test', { memberId: 'm1', vote: 'for' });
            const updated = await BoardApproval.recordVote('unanimous_test', { memberId: 'm2', vote: 'for' });

            expect(updated.unanimousApproval).toBe(true);
        });

        it('should update independentDirectorsApproved', async () => {
            const data = getUniqueData({ approvalId: 'independent_test' });
            await BoardApproval.create(data);

            await BoardApproval.recordVote('independent_test', { memberId: 'm1', vote: 'for', independent: true });
            const updated = await BoardApproval.recordVote('independent_test', { memberId: 'm2', vote: 'for', independent: true });

            expect(updated.independentDirectorsApproved).toBe(true);
        });
    });

    describe('finalize', () => {
        it('should approve an approval', async () => {
            const data = getUniqueData({ approvalId: 'finalize_approve_test' });
            await BoardApproval.create(data);

            const finalized = await BoardApproval.finalize('finalize_approve_test', true, {
                approvedBy: 'admin_user',
                effectiveDate: new Date('2024-06-15')
            });

            expect(finalized.status).toBe('approved');
            expect(finalized.approvedBy).toBe('admin_user');
            expect(finalized.approvedAt).toBeDefined();
            expect(finalized.effectiveDate).toEqual(new Date('2024-06-15'));
        });

        it('should reject an approval', async () => {
            const data = getUniqueData({ approvalId: 'finalize_reject_test' });
            await BoardApproval.create(data);

            const finalized = await BoardApproval.finalize('finalize_reject_test', false);

            expect(finalized.status).toBe('rejected');
            expect(finalized.approvedAt).toBeDefined();
        });

        it('should throw error for non-existent approval', async () => {
            await expect(BoardApproval.finalize('non_existent', true))
                .rejects.toThrow('Approval not found');
        });

        it('should throw error if already finalized', async () => {
            const data = getUniqueData({ approvalId: 'already_finalized_test', status: 'approved' });
            await BoardApproval.create(data);

            await expect(BoardApproval.finalize('already_finalized_test', true))
                .rejects.toThrow('Approval already finalized');
        });

        it('should throw error without quorum', async () => {
            const data = getUniqueData({
                approvalId: 'no_quorum_test',
                quorumPresent: false,
                boardMembers: [{ memberId: 'm1', vote: 'absent' }],
                totalBoardMembers: 1,
                quorumRequirement: 0.5
            });
            await BoardApproval.create(data);

            await expect(BoardApproval.finalize('no_quorum_test', true))
                .rejects.toThrow('Cannot finalize without quorum');
        });

        it('should set default effectiveDate when approved', async () => {
            const data = getUniqueData({ approvalId: 'default_date_test' });
            await BoardApproval.create(data);

            const finalized = await BoardApproval.finalize('default_date_test', true);

            expect(finalized.effectiveDate).toBeDefined();
        });
    });

    describe('attachDocument', () => {
        it('should attach minutes document', async () => {
            const data = getUniqueData({ approvalId: 'attach_minutes_test' });
            await BoardApproval.create(data);

            const updated = await BoardApproval.attachDocument('attach_minutes_test', 'doc_123', 'minutes');

            expect(updated.minutesDocumentId).toBe('doc_123');
        });

        it('should attach resolution document', async () => {
            const data = getUniqueData({ approvalId: 'attach_resolution_test' });
            await BoardApproval.create(data);

            const updated = await BoardApproval.attachDocument('attach_resolution_test', 'doc_456', 'resolution');

            expect(updated.resolutionDocumentId).toBe('doc_456');
        });

        it('should attach general attachment', async () => {
            const data = getUniqueData({ approvalId: 'attach_general_test' });
            await BoardApproval.create(data);

            const updated = await BoardApproval.attachDocument('attach_general_test', 'doc_789', 'attachment');

            expect(updated.attachmentIds).toContain('doc_789');
        });

        it('should not duplicate attachments', async () => {
            const data = getUniqueData({ approvalId: 'dup_attach_test', attachmentIds: ['doc_111'] });
            await BoardApproval.create(data);

            const updated = await BoardApproval.attachDocument('dup_attach_test', 'doc_111', 'attachment');

            expect(updated.attachmentIds.filter(id => id === 'doc_111').length).toBe(1);
        });

        it('should throw error for non-existent approval', async () => {
            await expect(BoardApproval.attachDocument('non_existent', 'doc_1'))
                .rejects.toThrow('Approval not found');
        });
    });

    describe('getGovernanceSummary', () => {
        it('should return governance summary', async () => {
            const companyId = `company_summary_${Date.now()}`;
            await BoardApproval.create(getUniqueData({
                companyId,
                approvalType: '409a_valuation',
                status: 'approved'
            }));
            await BoardApproval.create(getUniqueData({
                companyId,
                approvalType: 'option_grant',
                status: 'draft'
            }));

            const summary = await BoardApproval.getGovernanceSummary(companyId);

            expect(summary.companyId).toBe(companyId);
            expect(summary.totalApprovals).toBe(2);
            expect(summary.byType['409a_valuation'].total).toBe(1);
            expect(summary.byType['409a_valuation'].approved).toBe(1);
            expect(summary.byStatus.approved).toBe(1);
            expect(summary.byStatus.draft).toBe(1);
        });

        it('should include recent approvals', async () => {
            const companyId = `company_recent_${Date.now()}`;
            await BoardApproval.create(getUniqueData({
                companyId,
                approvalType: '409a_valuation',
                status: 'approved',
                approvedAt: new Date()
            }));

            const summary = await BoardApproval.getGovernanceSummary(companyId);

            expect(summary.recentApprovals.length).toBeGreaterThan(0);
        });
    });

    describe('search', () => {
        it('should search by title', async () => {
            const companyId = `company_search_${Date.now()}`;
            await BoardApproval.create(getUniqueData({
                companyId,
                title: 'Q4 2024 Valuation Approval'
            }));
            await BoardApproval.create(getUniqueData({
                companyId,
                title: 'Stock Option Plan'
            }));

            const results = await BoardApproval.search(companyId, 'valuation');
            expect(results.length).toBe(1);
            expect(results[0].title).toContain('Valuation');
        });

        it('should search by description', async () => {
            const companyId = `company_search_desc_${Date.now()}`;
            await BoardApproval.create(getUniqueData({
                companyId,
                description: 'Annual 409A valuation report'
            }));

            const results = await BoardApproval.search(companyId, '409a');
            expect(results.length).toBe(1);
        });

        it('should be case insensitive', async () => {
            const companyId = `company_search_case_${Date.now()}`;
            await BoardApproval.create(getUniqueData({
                companyId,
                title: 'UPPERCASE TITLE'
            }));

            const results = await BoardApproval.search(companyId, 'uppercase');
            expect(results.length).toBe(1);
        });
    });
});
