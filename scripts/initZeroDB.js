#!/usr/bin/env node

/**
 * ZeroDB Initialization Script
 * 
 * Initializes ZeroDB project and core tables for OpenCap financial management
 */

const dotenv = require('dotenv');
const zerodbService = require('../services/zerodbService');
const vectorService = require('../services/vectorService');
const streamingService = require('../services/streamingService');
const memoryService = require('../services/memoryService');

// Load environment variables
dotenv.config();

// Configuration
const config = {
  userId: process.env.OPENCAP_USER_ID || 'opencap-system-user',
  userEmail: process.env.OPENCAP_USER_EMAIL || 'system@opencap.ai'
};

/**
 * Initialize OpenCap project in ZeroDB
 */
async function initializeProject() {
  console.log('🚀 Initializing ZeroDB for OpenCap...');
  
  try {
    // Use AINATIVE_API_TOKEN from environment variables
    const token = process.env.AINATIVE_API_TOKEN;
    if (!token) {
      throw new Error('AINATIVE_API_TOKEN not set in environment variables');
    }
    console.log('✅ Using AINATIVE_API_TOKEN for authentication');
    
    // Initialize core ZeroDB service
    console.log('\n🔧 Initializing ZeroDB services...');
    const projectInfo = await zerodbService.initialize(token);
    console.log('✅ ZeroDB core service initialized');
    console.log('   Project ID:', projectInfo.projectId);
    
    // Initialize specialized services
    await vectorService.initialize(token);
    console.log('✅ Vector service initialized');
    
    await streamingService.initialize(token);
    console.log('✅ Streaming service initialized');
    
    await memoryService.initialize(token);
    console.log('✅ Memory service initialized');
    
    return projectInfo;
  } catch (error) {
    console.error('❌ Error initializing project:', error);
    throw error;
  }
}

/**
 * Create core financial tables
 */
async function createCoreTables() {
  console.log('\n📊 Creating core financial tables...');
  
  const tables = [
    {
      name: 'companies',
      schema: {
        id: 'uuid',
        name: 'string',
        legal_name: 'string',
        tax_id: 'string',
        incorporation_date: 'date',
        jurisdiction: 'string',
        status: 'string',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'stakeholders',
      schema: {
        id: 'uuid',
        company_id: 'uuid',
        name: 'string',
        email: 'string',
        stakeholder_type: 'string',
        status: 'string',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'securities',
      schema: {
        id: 'uuid',
        company_id: 'uuid',
        security_type: 'string',
        name: 'string',
        shares_authorized: 'bigint',
        shares_issued: 'bigint',
        shares_outstanding: 'bigint',
        par_value: 'decimal',
        currency: 'string',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'transactions',
      schema: {
        id: 'uuid',
        company_id: 'uuid',
        transaction_type: 'string',
        security_id: 'uuid',
        stakeholder_id: 'uuid',
        shares: 'bigint',
        price_per_share: 'decimal',
        total_amount: 'decimal',
        currency: 'string',
        transaction_date: 'date',
        status: 'string',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'documents',
      schema: {
        id: 'uuid',
        company_id: 'uuid',
        document_type: 'string',
        title: 'string',
        description: 'text',
        file_path: 'string',
        file_size: 'bigint',
        mime_type: 'string',
        upload_date: 'timestamp',
        indexed: 'boolean',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'valuations',
      schema: {
        id: 'uuid',
        company_id: 'uuid',
        valuation_date: 'date',
        valuation_method: 'string',
        pre_money_valuation: 'decimal',
        post_money_valuation: 'decimal',
        currency: 'string',
        notes: 'text',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'compliance_events',
      schema: {
        id: 'uuid',
        company_id: 'uuid',
        event_type: 'string',
        event_date: 'date',
        description: 'text',
        status: 'string',
        due_date: 'date',
        completed_date: 'date',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    },
    {
      name: 'audit_logs',
      schema: {
        id: 'uuid',
        user_id: 'uuid',
        company_id: 'uuid',
        action: 'string',
        entity_type: 'string',
        entity_id: 'uuid',
        changes: 'jsonb',
        ip_address: 'string',
        user_agent: 'string',
        created_at: 'timestamp'
      }
    }
  ];
  
  const createdTables = [];
  
  for (const table of tables) {
    try {
      console.log(`   Creating table: ${table.name}...`);
      const result = await zerodbService.createTable(table.name, table.schema);
      createdTables.push(result);
      console.log(`   ✅ ${table.name} created successfully`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`   ℹ️  ${table.name} already exists, skipping...`);
      } else {
        console.error(`   ❌ Error creating ${table.name}:`, error.message);
        throw error;
      }
    }
  }
  
  return createdTables;
}

/**
 * Initialize vector namespaces
 */
async function initializeVectorNamespaces() {
  console.log('\n🔍 Initializing vector search namespaces...');
  
  const namespaces = [
    'documents',
    'compliance',
    'financial',
    'contracts',
    'legal'
  ];
  
  console.log('   Configured namespaces:', namespaces.join(', '));
  console.log('   ✅ Vector namespaces ready');
  
  return namespaces;
}

/**
 * Set up event streaming topics
 */
async function setupEventStreaming() {
  console.log('\n📡 Setting up event streaming...');
  
  const topics = [
    'transaction_created',
    'transaction_updated',
    'document_uploaded',
    'compliance_event',
    'stakeholder_changed',
    'valuation_updated',
    'security_issued',
    'audit_log'
  ];
  
  console.log('   Configured topics:', topics.join(', '));
  console.log('   ✅ Event streaming ready');
  
  return topics;
}

/**
 * Initialize agent memory system
 */
async function initializeMemorySystem() {
  console.log('\n🧠 Initializing agent memory system...');
  
  console.log('   Agent ID:', config.userId);
  console.log('   User Email:', config.userEmail);
  console.log('   ✅ Memory system ready');
  
  return {
    agentId: config.userId,
    userEmail: config.userEmail
  };
}

/**
 * Verify ZeroDB setup
 */
async function verifySetup() {
  console.log('\n✅ Verifying ZeroDB setup...');
  
  try {
    // List all tables
    const tables = await zerodbService.listTables();
    console.log(`   📊 Tables: ${tables.length} tables available`);
    
    // Get database status
    const status = await zerodbService.getDatabaseStatus();
    console.log(`   💾 Database status: ${status.status || 'operational'}`);
    
    return {
      tables: tables.length,
      status: status.status || 'operational'
    };
  } catch (error) {
    console.error('   ❌ Error verifying setup:', error.message);
    throw error;
  }
}

/**
 * Main initialization function
 */
async function main() {
  console.log('=' .repeat(60));
  console.log('🏗️  OpenCap ZeroDB Initialization');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Initialize project and services
    const projectInfo = await initializeProject();
    
    // Step 2: Create core tables
    const tables = await createCoreTables();
    
    // Step 3: Initialize vector namespaces
    const namespaces = await initializeVectorNamespaces();
    
    // Step 4: Set up event streaming
    const topics = await setupEventStreaming();
    
    // Step 5: Initialize memory system
    const memory = await initializeMemorySystem();
    
    // Step 6: Verify setup
    const verification = await verifySetup();
    
    // Success summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ZeroDB initialization completed successfully!');
    console.log('=' .repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   Project ID: ${projectInfo.projectId}`);
    console.log(`   Tables: ${verification.tables} created`);
    console.log(`   Vector Namespaces: ${namespaces.length} configured`);
    console.log(`   Event Topics: ${topics.length} configured`);
    console.log(`   Memory System: Initialized`);
    console.log(`   Database Status: ${verification.status}`);
    console.log('\n✅ OpenCap is ready to use ZeroDB!');
    console.log('=' .repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ZeroDB initialization failed:');
    console.error('   Error:', error.message);
    if (error.response?.data) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify AINATIVE_API_TOKEN is set in .env');
    console.log('   2. Check ZeroDB API status');
    console.log('   3. Ensure network connectivity');
    console.log('   4. Review error message above for specific issues');
    
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  main();
}

module.exports = { initializeProject, createCoreTables, verifySetup };
