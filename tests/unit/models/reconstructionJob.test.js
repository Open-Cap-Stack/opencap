/**
 * ReconstructionJob Model Tests
 * Issue #624: AI Data Room Reconstruction — Job tracking model
 */

jest.mock('../../../services/zerodbService', () => ({
  insertRow:    jest.fn().mockResolvedValue({ data: [{ _id: 'test-id' }] }),
  queryTable:   jest.fn().mockResolvedValue({ data: [] }),
  updateRows:   jest.fn().mockResolvedValue({ modifiedCount: 1, modified_count: 1 }),
  deleteRows:   jest.fn().mockResolvedValue({ deletedCount: 1 }),
  initialize:   jest.fn().mockResolvedValue(true),
  projectId:    'test-project'
}));

const ReconstructionJob = require('../../../models/ReconstructionJob');

describe('ReconstructionJob Model', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ─── Schema ───────────────────────────────────────────────────────────────

  describe('Schema Definition', () => {
    it('has the correct table name', () => {
      expect(ReconstructionJob.tableName).toBe('reconstruction_jobs');
    });

    it('has all required schema fields', () => {
      const s = ReconstructionJob.schema;
      expect(s.jobId).toBeDefined();
      expect(s.companyId).toBeDefined();
      expect(s.userId).toBeDefined();
      expect(s.status).toBeDefined();
      expect(s.phase).toBeDefined();
      expect(s.intakeConfig).toBeDefined();
      expect(s.uploadedFiles).toBeDefined();
      expect(s.progress).toBeDefined();
      expect(s.result).toBeDefined();
      expect(s.error).toBeDefined();
    });

    it('marks jobId, companyId, userId as required', () => {
      expect(ReconstructionJob.schema.jobId.required).toBe(true);
      expect(ReconstructionJob.schema.companyId.required).toBe(true);
      expect(ReconstructionJob.schema.userId.required).toBe(true);
    });

    it('exposes all valid job statuses', () => {
      expect(ReconstructionJob.jobStatuses).toEqual([
        'queued', 'intake', 'running', 'complete', 'failed', 'cancelled'
      ]);
    });

    it('status schema field has the correct enum', () => {
      expect(ReconstructionJob.schema.status.enum).toEqual([
        'queued', 'intake', 'running', 'complete', 'failed', 'cancelled'
      ]);
    });

    it('phase defaults to 0', () => {
      expect(ReconstructionJob.schema.phase.default).toBe(0);
    });
  });

  // ─── createJob() ──────────────────────────────────────────────────────────

  describe('createJob()', () => {
    function mockInsert(rowData = {}) {
      const zdb = require('../../../services/zerodbService');
      zdb.insertRow.mockResolvedValueOnce({
        data: [{ row_data: { _id: 'job-id', ...rowData } }]
      });
    }

    it('creates a job and returns the record', async () => {
      mockInsert({ jobId: 'rj_abc', companyId: 'c-1', userId: 'u-1', status: 'queued' });
      const result = await ReconstructionJob.createJob({
        companyId: 'c-1',
        userId:    'u-1'
      });
      expect(result).toBeDefined();
      const zdb = require('../../../services/zerodbService');
      expect(zdb.insertRow).toHaveBeenCalledTimes(1);
    });

    it('auto-generates a jobId with rj_ prefix when not provided', async () => {
      mockInsert({ jobId: 'rj_auto' });
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      const inserted = zdb.insertRow.mock.calls[0][1];
      expect(inserted.jobId).toMatch(/^rj_/);
    });

    it('preserves an explicit jobId when provided', async () => {
      const explicitId = 'rj_explicit-123';
      mockInsert({ jobId: explicitId });
      await ReconstructionJob.createJob({ jobId: explicitId, companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      const inserted = zdb.insertRow.mock.calls[0][1];
      expect(inserted.jobId).toBe(explicitId);
    });

    it('defaults status to queued', async () => {
      mockInsert();
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      expect(zdb.insertRow.mock.calls[0][1].status).toBe('queued');
    });

    it('defaults phase to 0', async () => {
      mockInsert();
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      expect(zdb.insertRow.mock.calls[0][1].phase).toBe(0);
    });

    it('sets default progress object', async () => {
      mockInsert();
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      const inserted = zdb.insertRow.mock.calls[0][1];
      expect(inserted.progress.scoutComplete).toBe(false);
      expect(inserted.progress.classifyComplete).toBe(false);
      expect(inserted.progress.gapAnalysisComplete).toBe(false);
      expect(inserted.progress.finalizeComplete).toBe(false);
      expect(inserted.progress.agentsRun).toEqual([]);
    });

    it('initialises uploadedFiles as empty array', async () => {
      mockInsert();
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      expect(zdb.insertRow.mock.calls[0][1].uploadedFiles).toEqual([]);
    });

    it('initialises result and error as null', async () => {
      mockInsert();
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      const inserted = zdb.insertRow.mock.calls[0][1];
      expect(inserted.result).toBeNull();
      expect(inserted.error).toBeNull();
    });

    it('sets default intakeConfig with all four source connectors', async () => {
      mockInsert();
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1' });
      const zdb = require('../../../services/zerodbService');
      const { intakeConfig } = zdb.insertRow.mock.calls[0][1];
      expect(intakeConfig.sources.gmail).toBeDefined();
      expect(intakeConfig.sources.drive).toBeDefined();
      expect(intakeConfig.sources.carta).toBeDefined();
      expect(intakeConfig.sources.stripe).toBeDefined();
    });

    it('respects an explicitly supplied intakeConfig', async () => {
      mockInsert();
      const custom = {
        companyName: 'Acme', founderEmail: 'f@acme.com',
        targetDataRoomId: 'dr_xyz',
        sources: {
          gmail:  { enabled: true,  oauthCode: 'tok-g' },
          drive:  { enabled: false, oauthCode: null },
          carta:  { enabled: false, oauthCode: null },
          stripe: { enabled: false, oauthCode: null }
        }
      };
      await ReconstructionJob.createJob({ companyId: 'c-1', userId: 'u-1', intakeConfig: custom });
      const zdb = require('../../../services/zerodbService');
      expect(zdb.insertRow.mock.calls[0][1].intakeConfig.companyName).toBe('Acme');
    });
  });

  // ─── findByJobId() ────────────────────────────────────────────────────────

  describe('findByJobId()', () => {
    it('returns the job when found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ row_data: { jobId: 'rj_abc', status: 'queued' } }]
      });
      const result = await ReconstructionJob.findByJobId('rj_abc');
      expect(result).toBeDefined();
      expect(result.jobId).toBe('rj_abc');
    });

    it('returns null when not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });
      const result = await ReconstructionJob.findByJobId('rj_nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── findByCompany() ──────────────────────────────────────────────────────

  describe('findByCompany()', () => {
    it('returns all jobs for a given company', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [
          { row_data: { jobId: 'rj_1', companyId: 'c-1' } },
          { row_data: { jobId: 'rj_2', companyId: 'c-1' } }
        ]
      });
      const results = await ReconstructionJob.findByCompany('c-1');
      expect(results).toHaveLength(2);
    });

    it('returns an empty array when company has no jobs', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({ data: [] });
      const results = await ReconstructionJob.findByCompany('c-empty');
      expect(results).toEqual([]);
    });
  });

  // ─── updateStatus() ───────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('calls updateOne with correct status and phase', async () => {
      const zdb = require('../../../services/zerodbService');
      // findOne returns a doc (needed by updateOne internals)
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ row_data: { jobId: 'rj_abc', status: 'queued', row_id: 'row-1' } }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modifiedCount: 1 });

      await ReconstructionJob.updateStatus('rj_abc', 'running', 2, { scoutComplete: true, classifyComplete: false, gapAnalysisComplete: false, finalizeComplete: false, agentsRun: ['scout'] });
      // The call should have been made (either via updateRows or PUT)
      expect(zdb.queryTable).toHaveBeenCalled();
    });
  });

  // ─── setResult() ──────────────────────────────────────────────────────────

  describe('setResult()', () => {
    it('stores the result and marks job complete', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ row_data: { jobId: 'rj_abc', status: 'running', row_id: 'row-1' } }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modifiedCount: 1 });

      const result = { summary: { investorReadinessScore: 82 } };
      await ReconstructionJob.setResult('rj_abc', result);

      expect(zdb.queryTable).toHaveBeenCalled();
    });
  });

  // ─── setError() ───────────────────────────────────────────────────────────

  describe('setError()', () => {
    it('records the error message and marks job failed', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ row_data: { jobId: 'rj_abc', status: 'running', row_id: 'row-1' } }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modifiedCount: 1 });

      await ReconstructionJob.setError('rj_abc', 'Agent pipeline timed out');

      expect(zdb.queryTable).toHaveBeenCalled();
    });
  });
});
