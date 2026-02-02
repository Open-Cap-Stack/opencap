/**
 * End-to-End Production Readiness Tests for ZeroDB Phase 1-3
 * GitHub Issue #35: Final validation and production readiness
 *
 * Tests comprehensive functionality across all ZeroDB features:
 * - Table operations (CRUD)
 * - Vector search
 * - Memory management
 * - Event streaming
 * - File storage
 * - Agent logging
 * - RLHF tracking
 */

const zerodbService = require('../../services/zerodbService');
const vectorService = require('../../services/vectorService');
const streamingService = require('../../services/streamingService');
const memoryService = require('../../services/memoryService');

describe('ZeroDB Production Readiness - End-to-End Tests', () => {
  let testToken;
  let projectId;
  let testCompanyId;
  let testTableName;

  // Setup: Initialize all services before tests
  beforeAll(async () => {
    testToken = process.env.AINATIVE_API_TOKEN;

    if (!testToken) {
      throw new Error('AINATIVE_API_TOKEN not set - required for E2E tests');
    }

    // Initialize core service
    const projectInfo = await zerodbService.initialize(testToken);
    projectId = projectInfo.projectId;

    // Initialize specialized services
    await vectorService.initialize(testToken);
    await streamingService.initialize(testToken);
    await memoryService.initialize(testToken);

    // Setup test identifiers
    testTableName = `test_companies_${Date.now()}`;
    testCompanyId = `company_${Date.now()}`;
  }, 30000);

  describe('Phase 1: Core Table Operations', () => {
    describe('Given a ZeroDB project is initialized', () => {
      test('When listing tables, Then it should return an array', async () => {
        const tables = await zerodbService.listTables();

        expect(tables).toBeDefined();
        expect(Array.isArray(tables)).toBe(true);
      });

      test('When getting database status, Then it should return operational status', async () => {
        const status = await zerodbService.getDatabaseStatus();

        expect(status).toBeDefined();
        expect(status).toHaveProperty('status');
      });
    });

    describe('Given table creation is requested', () => {
      test('When creating a new table with valid schema, Then it should succeed', async () => {
        const schema = {
          id: 'uuid',
          name: 'string',
          email: 'string',
          status: 'string',
          created_at: 'timestamp',
          metadata: 'jsonb'
        };

        const result = await zerodbService.createTable(testTableName, schema);

        expect(result).toBeDefined();
        expect(result.table_name || result.name).toBe(testTableName);
      });

      test('When creating duplicate table, Then it should handle gracefully', async () => {
        const schema = { id: 'uuid', name: 'string' };

        await expect(
          zerodbService.createTable(testTableName, schema)
        ).rejects.toThrow();
      });
    });

    describe('Given a table exists', () => {
      test('When inserting a row, Then it should return the inserted data', async () => {
        const rowData = {
          id: testCompanyId,
          name: 'Test Company Inc.',
          email: 'test@company.com',
          status: 'active',
          created_at: new Date().toISOString(),
          metadata: { industry: 'technology' }
        };

        const result = await zerodbService.insertRow(testTableName, rowData);

        expect(result).toBeDefined();
        expect(result.rows || result).toBeDefined();
      });

      test('When querying rows with filter, Then it should return matching rows', async () => {
        const query = { status: 'active' };

        const results = await zerodbService.queryRows(testTableName, query);

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
      });

      test('When updating a row, Then it should reflect the changes', async () => {
        const query = { id: testCompanyId };
        const update = { $set: { status: 'verified' } };

        const result = await zerodbService.updateRows(testTableName, query, update);

        expect(result).toBeDefined();

        // Verify update
        const updated = await zerodbService.queryRows(testTableName, { id: testCompanyId });
        expect(updated[0].status).toBe('verified');
      });

      test('When counting rows, Then it should return accurate count', async () => {
        const count = await zerodbService.countRows(testTableName, {});

        expect(count).toBeDefined();
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThan(0);
      });

      test('When deleting a row, Then it should remove the data', async () => {
        const query = { id: testCompanyId };

        const result = await zerodbService.deleteRows(testTableName, query);

        expect(result).toBeDefined();

        // Verify deletion
        const remaining = await zerodbService.queryRows(testTableName, { id: testCompanyId });
        expect(remaining.length).toBe(0);
      });
    });
  });

  describe('Phase 2: Vector Search Operations', () => {
    let testVectorId;

    describe('Given vector embeddings need to be stored', () => {
      test('When upserting a vector, Then it should succeed', async () => {
        const embedding = Array.from({ length: 1536 }, () => Math.random());
        const metadata = {
          document_id: 'doc_12345',
          content_type: 'financial_report',
          company_id: testCompanyId
        };

        const result = await zerodbService.upsertVector(
          embedding,
          'financial',
          metadata,
          'Test financial document content',
          'opencap_test'
        );

        expect(result).toBeDefined();
        testVectorId = result.id || result.vector_id;
      });

      test('When searching for similar vectors, Then it should return relevant results', async () => {
        const queryVector = Array.from({ length: 1536 }, () => Math.random());

        const results = await zerodbService.searchVectors(
          queryVector,
          5,
          'financial'
        );

        expect(results).toBeDefined();
        expect(Array.isArray(results.results || results)).toBe(true);
      });

      test('When listing vectors, Then it should return paginated results', async () => {
        const vectors = await zerodbService.listVectors('financial', 0, 10);

        expect(vectors).toBeDefined();
        expect(Array.isArray(vectors.vectors || vectors)).toBe(true);
      });
    });
  });

  describe('Phase 3: Memory Management Operations', () => {
    const agentId = 'test_agent_001';
    const sessionId = `session_${Date.now()}`;

    describe('Given agent memory needs to be stored', () => {
      test('When storing user memory, Then it should succeed', async () => {
        const result = await zerodbService.storeMemory(
          agentId,
          sessionId,
          'user',
          'What are our Q4 financial projections?',
          { intent: 'query', topic: 'financials' }
        );

        expect(result).toBeDefined();
        expect(result.id || result.memory_id).toBeDefined();
      });

      test('When storing assistant memory, Then it should succeed', async () => {
        const result = await zerodbService.storeMemory(
          agentId,
          sessionId,
          'assistant',
          'Based on current trends, Q4 revenue is projected at $2.5M',
          { confidence: 0.85, sources: ['financial_report_q3'] }
        );

        expect(result).toBeDefined();
      });

      test('When listing memory for a session, Then it should return conversation history', async () => {
        const memories = await zerodbService.listMemory(
          agentId,
          sessionId,
          null,
          0,
          100
        );

        expect(memories).toBeDefined();
        expect(Array.isArray(memories.memories || memories)).toBe(true);
        expect((memories.memories || memories).length).toBeGreaterThanOrEqual(2);
      });

      test('When filtering memory by role, Then it should return only matching records', async () => {
        const userMemories = await zerodbService.listMemory(
          agentId,
          sessionId,
          'user',
          0,
          100
        );

        expect(userMemories).toBeDefined();
        const memoryArray = userMemories.memories || userMemories;
        expect(memoryArray.every(m => m.role === 'user')).toBe(true);
      });
    });
  });

  describe('Phase 3: Event Streaming Operations', () => {
    const testTopic = 'test_company_events';

    describe('Given events need to be published', () => {
      test('When publishing an event, Then it should succeed', async () => {
        const eventPayload = {
          event_type: 'company_created',
          company_id: testCompanyId,
          timestamp: new Date().toISOString(),
          data: {
            name: 'Test Company Inc.',
            industry: 'technology'
          }
        };

        const result = await zerodbService.publishEvent(testTopic, eventPayload);

        expect(result).toBeDefined();
        expect(result.id || result.event_id).toBeDefined();
      });

      test('When listing events, Then it should return published events', async () => {
        const events = await zerodbService.listEvents(testTopic, 0, 10);

        expect(events).toBeDefined();
        expect(Array.isArray(events.events || events)).toBe(true);
      });

      test('When publishing multiple events, Then all should be stored', async () => {
        const eventTypes = ['company_updated', 'stakeholder_added', 'transaction_created'];

        for (const eventType of eventTypes) {
          await zerodbService.publishEvent(testTopic, {
            event_type: eventType,
            company_id: testCompanyId,
            timestamp: new Date().toISOString()
          });
        }

        const allEvents = await zerodbService.listEvents(testTopic, 0, 100);
        const eventArray = allEvents.events || allEvents;

        expect(eventArray.length).toBeGreaterThanOrEqual(4); // Including the first event
      });
    });
  });

  describe('Phase 3: File Management Operations', () => {
    describe('Given file metadata needs to be stored', () => {
      test('When uploading file metadata, Then it should succeed', async () => {
        const fileKey = `test_files/${Date.now()}/financial_report.pdf`;

        const result = await zerodbService.uploadFileMetadata(
          fileKey,
          'Q3_Financial_Report.pdf',
          'application/pdf',
          1024000,
          {
            company_id: testCompanyId,
            report_type: 'financial',
            quarter: 'Q3',
            year: 2024
          }
        );

        expect(result).toBeDefined();
        expect(result.file_key).toBe(fileKey);
      });

      test('When listing files, Then it should return uploaded files', async () => {
        const files = await zerodbService.listFiles(0, 10);

        expect(files).toBeDefined();
        expect(Array.isArray(files.files || files)).toBe(true);
      });
    });
  });

  describe('Phase 3: Agent Logging Operations', () => {
    const testAgentId = 'financial_analyzer_agent';
    const testSessionId = `logging_session_${Date.now()}`;

    describe('Given agent operations need to be logged', () => {
      test('When storing INFO level log, Then it should succeed', async () => {
        const result = await zerodbService.storeAgentLog(
          testAgentId,
          testSessionId,
          'INFO',
          'Starting financial analysis for Q4 2024',
          { company_id: testCompanyId, analysis_type: 'quarterly' }
        );

        expect(result).toBeDefined();
      });

      test('When storing ERROR level log, Then it should succeed', async () => {
        const result = await zerodbService.storeAgentLog(
          testAgentId,
          testSessionId,
          'ERROR',
          'Failed to retrieve balance sheet data',
          { error_code: 'DATA_NOT_FOUND', retry_count: 3 }
        );

        expect(result).toBeDefined();
      });

      test('When listing agent logs, Then it should return logged entries', async () => {
        const logs = await zerodbService.listAgentLogs(
          testAgentId,
          testSessionId,
          null,
          0,
          100
        );

        expect(logs).toBeDefined();
        expect(Array.isArray(logs.logs || logs)).toBe(true);
      });

      test('When filtering logs by level, Then it should return only matching logs', async () => {
        const errorLogs = await zerodbService.listAgentLogs(
          testAgentId,
          testSessionId,
          'ERROR',
          0,
          100
        );

        const logArray = errorLogs.logs || errorLogs;
        expect(logArray.every(log => log.log_level === 'ERROR')).toBe(true);
      });
    });
  });

  describe('Phase 3: RLHF Operations', () => {
    const rlhfSessionId = `rlhf_session_${Date.now()}`;

    describe('Given RLHF feedback needs to be logged', () => {
      test('When logging positive RLHF feedback, Then it should succeed', async () => {
        const result = await zerodbService.logRLHF(
          'Analyze the financial health of Company X',
          'Company X shows strong financial indicators with 85% YoY revenue growth...',
          rlhfSessionId,
          0.95,
          'Accurate and comprehensive analysis'
        );

        expect(result).toBeDefined();
      });

      test('When logging negative RLHF feedback, Then it should succeed', async () => {
        const result = await zerodbService.logRLHF(
          'Calculate tax obligations for 2024',
          'The tax amount is approximately $50,000',
          rlhfSessionId,
          0.3,
          'Calculation appears inaccurate, missing key deductions'
        );

        expect(result).toBeDefined();
      });

      test('When logging multiple RLHF entries, Then all should be stored', async () => {
        const testCases = [
          { input: 'Test 1', output: 'Response 1', score: 0.8 },
          { input: 'Test 2', output: 'Response 2', score: 0.6 },
          { input: 'Test 3', output: 'Response 3', score: 0.9 }
        ];

        for (const testCase of testCases) {
          const result = await zerodbService.logRLHF(
            testCase.input,
            testCase.output,
            rlhfSessionId,
            testCase.score,
            'Test feedback'
          );

          expect(result).toBeDefined();
        }
      });
    });
  });

  describe('Integration: Multi-Feature Workflow', () => {
    describe('Given a complete financial document workflow', () => {
      test('When processing a document end-to-end, Then all operations should succeed', async () => {
        const workflowId = `workflow_${Date.now()}`;

        // Step 1: Store file metadata
        const fileResult = await zerodbService.uploadFileMetadata(
          `workflows/${workflowId}/report.pdf`,
          'Annual_Report_2024.pdf',
          'application/pdf',
          2048000,
          { workflow_id: workflowId }
        );
        expect(fileResult).toBeDefined();

        // Step 2: Store document embeddings
        const embedding = Array.from({ length: 1536 }, () => Math.random());
        const vectorResult = await zerodbService.upsertVector(
          embedding,
          'documents',
          { workflow_id: workflowId, document_type: 'annual_report' },
          'Annual report financial summary content',
          'workflow_test'
        );
        expect(vectorResult).toBeDefined();

        // Step 3: Publish document event
        const eventResult = await zerodbService.publishEvent(
          'document_processing',
          {
            event_type: 'document_processed',
            workflow_id: workflowId,
            status: 'completed'
          }
        );
        expect(eventResult).toBeDefined();

        // Step 4: Log agent activity
        const logResult = await zerodbService.storeAgentLog(
          'document_processor',
          workflowId,
          'INFO',
          'Document workflow completed successfully',
          { steps_completed: 3 }
        );
        expect(logResult).toBeDefined();

        // Step 5: Store workflow memory
        const memoryResult = await zerodbService.storeMemory(
          'document_processor',
          workflowId,
          'system',
          'Processed annual report successfully',
          { workflow_status: 'complete' }
        );
        expect(memoryResult).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('Given invalid operations are attempted', () => {
      test('When querying non-existent table, Then it should handle error gracefully', async () => {
        await expect(
          zerodbService.queryRows('non_existent_table_xyz', {})
        ).rejects.toThrow();
      });

      test('When inserting invalid data type, Then it should reject', async () => {
        await expect(
          zerodbService.insertRow(testTableName, { invalid: undefined })
        ).rejects.toThrow();
      });

      test('When searching with invalid vector dimensions, Then it should reject', async () => {
        const invalidVector = [0.1, 0.2]; // Wrong dimension

        await expect(
          zerodbService.searchVectors(invalidVector, 10, 'financial')
        ).rejects.toThrow();
      });
    });

    describe('Given boundary conditions', () => {
      test('When querying with limit=0, Then it should return empty array', async () => {
        const results = await zerodbService.queryRows(testTableName, {}, { limit: 0 });

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
      });

      test('When listing with very large limit, Then it should handle gracefully', async () => {
        const results = await zerodbService.listVectors('financial', 0, 10000);

        expect(results).toBeDefined();
      });
    });
  });

  // Cleanup: Remove test data after all tests complete
  afterAll(async () => {
    try {
      // Clean up test table
      if (testTableName) {
        await zerodbService.deleteRows(testTableName, {});
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });
});
