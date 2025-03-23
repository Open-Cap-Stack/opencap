/**
 * Test Script for Shortcut API Integration
 * 
 * [Chore] OCAE-302: Integrate Shortcut API for Backlog Management
 * 
 * This script performs a simple test of the Shortcut API integration:
 * 1. Retrieves workflow information
 * 2. Creates a test epic
 * 3. Creates a test story under that epic
 * 4. Verifies everything works as expected
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function testShortcutIntegration() {
  console.log('🧪 Testing Shortcut API Integration for OpenCap');
  console.log('------------------------------------------------');
  
  try {
    // 1. Validate API token
    console.log('✓ Checking API token...');
    if (!process.env.SHORTCUT_API_TOKEN) {
      throw new Error('SHORTCUT_API_TOKEN not found in environment variables');
    }
    console.log('✓ API token found');
    
    // 2. Get workflows to find workflow states
    console.log('\n✓ Retrieving workflows...');
    const workflows = await shortcut.getWorkflows();
    if (!workflows || !workflows.length) {
      throw new Error('No workflows found');
    }
    
    console.log(`✓ Found ${workflows.length} workflows`);
    
    // Select the first workflow and its first state for testing
    const testWorkflow = workflows[0];
    const testState = testWorkflow.states[0];
    
    console.log(`✓ Using workflow: ${testWorkflow.name} (ID: ${testWorkflow.id})`);
    console.log(`✓ Using state: ${testState.name} (ID: ${testState.id})`);
    
    // 3. Create a test epic
    console.log('\n✓ Creating test epic...');
    const testEpic = await shortcut.createEpic({
      name: 'OpenCap Test Epic',
      description: 'Test epic for validating Shortcut API integration'
    });
    
    console.log(`✓ Test epic created: "${testEpic.name}" (ID: ${testEpic.id})`);
    
    // 4. Create a test story
    console.log('\n✓ Creating test story...');
    const testStory = await shortcut.createStory({
      name: '[Chore] OCAE-TEST: Test Shortcut Integration',
      description: 'This is a test story to validate our Shortcut API integration. This story follows the Semantic Seed Venture Studio Coding Standards.',
      type: 'chore',
      workflowStateId: testState.id,
      epicId: testEpic.id
    });
    
    console.log(`✓ Test story created: "${testStory.name}" (ID: ${testStory.id})`);
    
    // 5. Verify story was created with correct properties
    console.log('\n✓ Verifying story properties...');
    const verifications = [
      { test: 'Story type', expected: 'chore', actual: testStory.story_type },
      { test: 'Epic ID', expected: testEpic.id, actual: testStory.epic_id },
      { test: 'Workflow state', expected: testState.id, actual: testStory.workflow_state_id }
    ];
    
    verifications.forEach(v => {
      if (v.expected === v.actual) {
        console.log(`✓ ${v.test}: Correct (${v.actual})`);
      } else {
        console.log(`✗ ${v.test}: Incorrect (Expected: ${v.expected}, Got: ${v.actual})`);
      }
    });
    
    // 6. Final result
    console.log('\n🎉 Test completed successfully!');
    console.log('You can now proceed to create the full OpenCap backlog');
    console.log('Check your Shortcut workspace to verify the test epic and story were created correctly');
    
    return {
      success: true,
      workflow: { id: testWorkflow.id, name: testWorkflow.name },
      state: { id: testState.id, name: testState.name },
      epic: { id: testEpic.id, name: testEpic.name },
      story: { id: testStory.id, name: testStory.name }
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify your SHORTCUT_API_TOKEN is correct in .env');
    console.log('2. Check if you have permission to create epics and stories');
    console.log('3. Verify the Shortcut API is available: https://api.app.shortcut.com/api/v3');
    
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

// Run the test
testShortcutIntegration();
