#!/usr/bin/env node

/**
 * ZeroDB Initialization Script for OpenCap
 * 
 * This script initializes the ZeroDB project and sets up the lakehouse infrastructure
 * for OpenCap including vector search, real-time streaming, and memory management
 */

const jwt = require('jsonwebtoken');
const zerodbService = require('../services/zerodbService');
const vectorService = require('../services/vectorService');
const streamingService = require('../services/streamingService');
const memoryService = require('../services/memoryService');

// Configuration
const config = {
  secretKey: process.env.JWT_SECRET || 'your-secret-key-here',
  userId: process.env.OPENCAP_USER_ID || 'opencap-system-user',
  userEmail: process.env.OPENCAP_USER_EMAIL || 'system@opencap.ai'
};

/**
 * Generate JWT token for system operations
 */
function generateSystemToken() {
  const payload = {
    sub: config.userId,
    role: 'ADMIN',
    email: config.userEmail,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, config.secretKey, { algorithm: 'HS256' });
}

/**
 * Initialize ZeroDB project
 */
async function initializeProject() {
  console.log('🚀 Initializing ZeroDB for OpenCap...');
  
  try {
    const token = generateSystemToken();
    console.log('✅ Generated system JWT token');
    
    // Initialize services
    console.log('🔧 Initializing ZeroDB services...');
    await zerodbService.initialize(token);
    await vectorService.initialize(token);
    await streamingService.initialize(token);
    await memoryService.initialize(token);
    
    console.log('✅ All services initialized successfully');
    
    // Get project status
    const dbStatus = await zerodbService.getDatabaseStatus();
    console.log('📊 Database Status:', dbStatus);
    
    return {
      success: true,
      projectId: zerodbService.projectId,
      databaseStatus: dbStatus
    };
  } catch (error) {
    console.error('❌ Failed to initialize ZeroDB:', error);
    throw error;
  }
}

/**
 * Set up initial tables and schemas
 */
async function setupTables() {
  console.log('📋 Setting up initial tables...');
  
  try {
    // Financial Reports table
    await zerodbService.createTable('financial_reports', {
      id: 'uuid',
      company_id: 'string',
      report_type: 'string',
      reporting_period: 'string',
      total_revenue: 'decimal',
      total_expenses: 'decimal',
      net_income: 'decimal',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    });
    console.log('✅ Created financial_reports table');
    
    // Documents table
    await zerodbService.createTable('documents', {
      id: 'uuid',
      document_name: 'string',
      document_type: 'string',
      file_size: 'integer',
      content_type: 'string',
      company_id: 'string',
      access_level: 'string',
      created_at: 'timestamp'
    });
    console.log('✅ Created documents table');
    
    // SPV table
    await zerodbService.createTable('spvs', {
      id: 'uuid',
      spv_name: 'string',
      spv_type: 'string',
      total_commitment: 'decimal',
      investor_count: 'integer',
      status: 'string',
      created_at: 'timestamp'
    });
    console.log('✅ Created spvs table');
    
    // Users activity table
    await zerodbService.createTable('user_activities', {
      id: 'uuid',
      user_id: 'string',
      activity_type: 'string',
      entity_type: 'string',
      entity_id: 'string',
      timestamp: 'timestamp',
      metadata: 'json'
    });
    console.log('✅ Created user_activities table');
    
    console.log('✅ All tables created successfully');
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    // Don't throw - tables might already exist
    console.log('⚠️  Some tables may already exist, continuing...');
  }
}

/**
 * Test vector operations
 */
async function testVectorOperations() {
  console.log('🧪 Testing vector operations...');
  
  try {
    // Test document indexing
    const testDocId = 'test-financial-report-001';
    const testContent = 'Financial Report Q1 2024: Revenue $1,000,000, Expenses $600,000, Net Income $400,000. Strong performance in technology sector.';
    
    await vectorService.indexDocument(
      testDocId,
      'Q1 2024 Financial Report',
      testContent,
      'financial_report',
      {
        company_id: 'test-company-001',
        report_type: 'quarterly',
        reporting_period: 'Q1 2024',
        total_revenue: 1000000,
        total_expenses: 600000,
        net_income: 400000
      }
    );
    console.log('✅ Test document indexed successfully');
    
    // Test vector search
    const searchResults = await vectorService.searchFinancialDocuments(
      'quarterly financial performance revenue',
      5
    );
    console.log('✅ Vector search test completed:', {
      query: 'quarterly financial performance revenue',
      results_count: searchResults.results.length,
      search_time_ms: searchResults.search_time_ms
    });
    
    console.log('✅ Vector operations test completed');
  } catch (error) {
    console.error('❌ Vector operations test failed:', error);
    throw error;
  }
}

/**
 * Test streaming operations
 */
async function testStreamingOperations() {
  console.log('🌊 Testing streaming operations...');
  
  try {
    // Test financial transaction event
    await streamingService.publishFinancialTransaction({
      id: 'test-transaction-001',
      type: 'financial_report_created',
      amount: 1000000,
      currency: 'USD',
      companyId: 'test-company-001',
      category: 'quarterly_report',
      status: 'created'
    }, config.userId);
    console.log('✅ Financial transaction event published');
    
    // Test user activity event
    await streamingService.publishUserActivity(
      config.userId,
      'system_initialization',
      {
        sessionId: 'init-session-001',
        feature: 'zerodb_setup',
        success: true
      }
    );
    console.log('✅ User activity event published');
    
    // Test system alert
    await streamingService.publishSystemAlert(
      'system_initialization',
      'low',
      'ZeroDB initialization completed successfully',
      {
        component: 'zerodb_service',
        affected_users: [config.userId]
      }
    );
    console.log('✅ System alert published');
    
    console.log('✅ Streaming operations test completed');
  } catch (error) {
    console.error('❌ Streaming operations test failed:', error);
    throw error;
  }
}

/**
 * Test memory operations
 */
async function testMemoryOperations() {
  console.log('🧠 Testing memory operations...');
  
  try {
    // Create test session
    const sessionId = await memoryService.createSession(config.userId, {
      userAgent: 'OpenCap-Init-Script/1.0',
      ipAddress: '127.0.0.1',
      deviceType: 'server',
      browser: 'node'
    });
    console.log('✅ Test session created:', sessionId);
    
    // Store test workflow state
    await memoryService.storeWorkflowState(
      'zerodb-initialization',
      sessionId,
      'completed',
      {
        step: 'final',
        progress: 100,
        duration_ms: Date.now()
      },
      {
        userId: config.userId,
        automated: true
      }
    );
    console.log('✅ Workflow state stored');
    
    // Test caching
    await memoryService.cacheData(
      'system_status',
      {
        status: 'healthy',
        initialized_at: new Date().toISOString(),
        version: '1.0.0'
      },
      5 * 60 * 1000 // 5 minutes
    );
    console.log('✅ System status cached');
    
    console.log('✅ Memory operations test completed');
  } catch (error) {
    console.error('❌ Memory operations test failed:', error);
    throw error;
  }
}

/**
 * Get system analytics
 */
async function getSystemAnalytics() {
  console.log('📈 Getting system analytics...');
  
  try {
    // Get database status
    const dbStatus = await zerodbService.getDatabaseStatus();
    
    // Get tables
    const tables = await zerodbService.listTables();
    
    // Get streaming analytics
    const streamingAnalytics = await streamingService.getAnalytics('financial_transaction', '1h');
    
    const analytics = {
      database: dbStatus,
      tables: tables.map(t => ({
        name: t.table_name,
        created_at: t.created_at
      })),
      streaming: {
        total_events: streamingAnalytics.total_events,
        events_per_hour: Object.keys(streamingAnalytics.events_per_hour).length
      },
      initialization_completed_at: new Date().toISOString()
    };
    
    console.log('📊 System Analytics:', JSON.stringify(analytics, null, 2));
    return analytics;
  } catch (error) {
    console.error('❌ Failed to get system analytics:', error);
    throw error;
  }
}

/**
 * Main initialization function
 */
async function main() {
  console.log('🎯 Starting OpenCap ZeroDB Initialization...\n');
  
  try {
    // Step 1: Initialize project
    const initResult = await initializeProject();
    console.log(`📋 Project ID: ${initResult.projectId}\n`);
    
    // Step 2: Set up tables
    await setupTables();
    console.log('');
    
    // Step 3: Test vector operations
    await testVectorOperations();
    console.log('');
    
    // Step 4: Test streaming operations
    await testStreamingOperations();
    console.log('');
    
    // Step 5: Test memory operations
    await testMemoryOperations();
    console.log('');
    
    // Step 6: Get analytics
    const analytics = await getSystemAnalytics();
    console.log('');
    
    console.log('🎉 OpenCap ZeroDB initialization completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update your application to use the ZeroDB services');
    console.log('2. Configure authentication tokens for production');
    console.log('3. Set up monitoring and alerting');
    console.log('4. Review the generated analytics above');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  }
}

// Handle CLI execution
if (require.main === module) {
  main();
}

module.exports = {
  initializeProject,
  setupTables,
  testVectorOperations,
  testStreamingOperations,
  testMemoryOperations,
  getSystemAnalytics
};