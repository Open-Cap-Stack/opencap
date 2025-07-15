#!/usr/bin/env node

/**
 * ZeroDB API Complete Testing Script
 * 
 * Tests all 17 ZeroDB API endpoints based on the comprehensive documentation
 * at /docs/zerodb.md
 * 
 * Usage:
 *   node scripts/testZeroDB.js
 *   npm run test:zerodb
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const BASE_URL = process.env.ZERODB_BASE_URL || 'https://api.ainative.studio/api/v1';
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-here';
const USER_ID = process.env.ZERODB_USER_ID || '550e8400-e29b-41d4-a716-446655440000';
const USER_EMAIL = process.env.ZERODB_USER_EMAIL || 'admin@ainative.studio';

class ZeroDBTester {
  constructor() {
    this.baseURL = BASE_URL;
    this.token = null;
    this.projectId = null;
    this.testResults = [];
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate JWT token for authentication
   */
  generateToken() {
    const payload = {
      sub: USER_ID,
      role: 'ADMIN',
      email: USER_EMAIL,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    };

    this.token = jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
    
    // Add token to client headers
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    
    console.log('✅ JWT token generated successfully');
  }

  /**
   * Log test result
   */
  logResult(testName, success, data = null, error = null) {
    const result = {
      test: testName,
      success,
      timestamp: new Date().toISOString(),
      data,
      error: error?.message || error
    };
    
    this.testResults.push(result);
    
    if (success) {
      console.log(`✅ ${testName}`);
    } else {
      console.log(`❌ ${testName}: ${error?.message || error}`);
    }
  }

  /**
   * Test 1: Create Project
   */
  async testCreateProject() {
    try {
      const response = await this.client.post('/projects/', {
        name: 'OpenCap Test Project',
        description: 'Automated testing project for ZeroDB API validation'
      });
      
      this.projectId = response.data.id;
      this.logResult('Create Project', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Create Project', false, null, error);
      throw error;
    }
  }

  /**
   * Test 2: List Projects
   */
  async testListProjects() {
    try {
      const response = await this.client.get('/projects/');
      this.logResult('List Projects', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Projects', false, null, error);
      throw error;
    }
  }

  /**
   * Test 3: Get Database Status
   */
  async testDatabaseStatus() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/status`);
      this.logResult('Database Status', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Database Status', false, null, error);
      throw error;
    }
  }

  /**
   * Test 4: Create Table
   */
  async testCreateTable() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/tables`, {
        table_name: 'test_financial_data',
        schema_definition: {
          id: 'uuid',
          company_id: 'uuid',
          transaction_type: 'string',
          amount: 'decimal',
          currency: 'string',
          created_at: 'timestamp'
        }
      });
      
      this.logResult('Create Table', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Create Table', false, null, error);
      throw error;
    }
  }

  /**
   * Test 5: List Tables
   */
  async testListTables() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/tables`);
      this.logResult('List Tables', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Tables', false, null, error);
      throw error;
    }
  }

  /**
   * Test 6: Upsert Vector
   */
  async testUpsertVector() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/vectors/upsert`, {
        vector_embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        namespace: 'financial_documents',
        vector_metadata: {
          type: 'financial_report',
          company: 'Test Company',
          quarter: 'Q1 2025'
        },
        document: 'Q1 2025 Financial Report for Test Company showing strong revenue growth',
        source: 'automated_test'
      });
      
      this.logResult('Upsert Vector', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Upsert Vector', false, null, error);
      throw error;
    }
  }

  /**
   * Test 7: Search Vectors
   */
  async testSearchVectors() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/vectors/search`, {
        query_vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        limit: 5,
        namespace: 'financial_documents'
      });
      
      this.logResult('Search Vectors', true, { 
        total_count: response.data.total_count,
        vectors_found: response.data.vectors?.length || 0
      });
      return response.data;
    } catch (error) {
      this.logResult('Search Vectors', false, null, error);
      throw error;
    }
  }

  /**
   * Test 8: List Vectors
   */
  async testListVectors() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/vectors`, {
        params: {
          namespace: 'financial_documents',
          limit: 10
        }
      });
      
      this.logResult('List Vectors', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Vectors', false, null, error);
      throw error;
    }
  }

  /**
   * Test 9: Store Memory
   */
  async testStoreMemory() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/memory/store`, {
        agent_id: '550e8400-e29b-41d4-a716-446655440000',
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
        content: 'What is the current financial status of our Q1 performance?',
        memory_metadata: {
          context: 'financial_inquiry',
          sentiment: 'neutral',
          priority: 'high'
        }
      });
      
      this.logResult('Store Memory', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Store Memory', false, null, error);
      throw error;
    }
  }

  /**
   * Test 10: List Memory Records
   */
  async testListMemory() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/memory`, {
        params: {
          agent_id: '550e8400-e29b-41d4-a716-446655440000',
          limit: 10
        }
      });
      
      this.logResult('List Memory Records', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Memory Records', false, null, error);
      throw error;
    }
  }

  /**
   * Test 11: Publish Event
   */
  async testPublishEvent() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/events/publish`, {
        topic: 'financial_transaction',
        event_payload: {
          action: 'transaction_created',
          transaction_id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: USER_ID,
          amount: 50000.00,
          currency: 'USD',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'investment',
            company: 'Test Company Inc',
            status: 'pending'
          }
        }
      });
      
      this.logResult('Publish Event', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Publish Event', false, null, error);
      throw error;
    }
  }

  /**
   * Test 12: List Events
   */
  async testListEvents() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/events`, {
        params: {
          topic: 'financial_transaction',
          limit: 10
        }
      });
      
      this.logResult('List Events', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Events', false, null, error);
      throw error;
    }
  }

  /**
   * Test 13: Upload File Metadata
   */
  async testUploadFileMetadata() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/files/upload`, {
        file_key: 'financial_reports/q1_2025_report.pdf',
        file_name: 'Q1_2025_Financial_Report.pdf',
        content_type: 'application/pdf',
        size_bytes: 2048000,
        file_metadata: {
          description: 'Q1 2025 comprehensive financial report',
          category: 'financial_reports',
          upload_source: 'automated_test',
          compliance_reviewed: false
        }
      });
      
      this.logResult('Upload File Metadata', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Upload File Metadata', false, null, error);
      throw error;
    }
  }

  /**
   * Test 14: List Files
   */
  async testListFiles() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/files`, {
        params: {
          limit: 10
        }
      });
      
      this.logResult('List Files', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Files', false, null, error);
      throw error;
    }
  }

  /**
   * Test 15: Log RLHF Dataset
   */
  async testLogRLHF() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/rlhf/log`, {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        input_prompt: 'Generate a financial summary for Q1 2025 performance',
        model_output: 'Q1 2025 showed strong performance with 15% revenue growth, improved profit margins, and successful cost management initiatives across all business units.',
        reward_score: 8.5,
        notes: 'Good comprehensive summary, accurate financial metrics, could include more specific numbers'
      });
      
      this.logResult('Log RLHF Dataset', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Log RLHF Dataset', false, null, error);
      throw error;
    }
  }

  /**
   * Test 16: Store Agent Log
   */
  async testStoreAgentLog() {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/agent/log`, {
        agent_id: '550e8400-e29b-41d4-a716-446655440000',
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        log_level: 'INFO',
        log_message: 'Successfully processed financial data query and generated comprehensive report',
        raw_payload: {
          processing_time_ms: 1250,
          tokens_used: 485,
          model: 'claude-sonnet-4',
          status: 'success',
          query_type: 'financial_analysis',
          data_sources: ['transactions', 'reports', 'metrics']
        }
      });
      
      this.logResult('Store Agent Log', true, response.data);
      return response.data;
    } catch (error) {
      this.logResult('Store Agent Log', false, null, error);
      throw error;
    }
  }

  /**
   * Test 17: List Agent Logs
   */
  async testListAgentLogs() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/agent/logs`, {
        params: {
          agent_id: '550e8400-e29b-41d4-a716-446655440000',
          log_level: 'INFO',
          limit: 10
        }
      });
      
      this.logResult('List Agent Logs', true, { count: response.data.length });
      return response.data;
    } catch (error) {
      this.logResult('List Agent Logs', false, null, error);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting ZeroDB API Complete Testing Suite');
    console.log('='.repeat(50));
    console.log(`Base URL: ${this.baseURL}`);
    console.log(`User ID: ${USER_ID}`);
    console.log(`User Email: ${USER_EMAIL}`);
    console.log('='.repeat(50));

    try {
      // Generate authentication token
      this.generateToken();

      // Run all tests in sequence
      const tests = [
        () => this.testCreateProject(),
        () => this.testListProjects(),
        () => this.testDatabaseStatus(),
        () => this.testCreateTable(),
        () => this.testListTables(),
        () => this.testUpsertVector(),
        () => this.testSearchVectors(),
        () => this.testListVectors(),
        () => this.testStoreMemory(),
        () => this.testListMemory(),
        () => this.testPublishEvent(),
        () => this.testListEvents(),
        () => this.testUploadFileMetadata(),
        () => this.testListFiles(),
        () => this.testLogRLHF(),
        () => this.testStoreAgentLog(),
        () => this.testListAgentLogs()
      ];

      for (let i = 0; i < tests.length; i++) {
        console.log(`\n[${i + 1}/17] Running test...`);
        try {
          await tests[i]();
        } catch (error) {
          console.warn(`Test ${i + 1} failed, continuing with remaining tests...`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error('❌ Critical error during testing:', error.message);
    }

    // Print summary
    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 ZeroDB API Testing Complete');
    console.log('='.repeat(50));

    const successful = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;

    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📊 Success Rate: ${((successful / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
    }

    if (this.projectId) {
      console.log(`\n🏗️  Test Project ID: ${this.projectId}`);
      console.log('(This project can be used for further testing or cleaned up manually)');
    }

    console.log('\n📝 Full test results saved to test results array');
    console.log('🎯 ZeroDB API testing completed successfully!');

    // Exit with appropriate code
    process.exit(failed === 0 ? 0 : 1);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ZeroDBTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = ZeroDBTester;