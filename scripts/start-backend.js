#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting OpenCap Backend Server...');

// Change to project directory
process.chdir('/Volumes/Cody/projects/opencap-clean');

// Start the backend server
const backend = spawn('/opt/homebrew/bin/node', ['app.js'], {
  stdio: 'inherit',
  cwd: '/Volumes/Cody/projects/opencap-clean'
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend server:', error);
});

backend.on('close', (code) => {
  console.log(`Backend server exited with code ${code}`);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping backend server...');
  backend.kill();
  process.exit();
});

console.log('✅ Backend server starting...');
console.log('📍 Backend will be available at: http://localhost:5000');
console.log('📚 API docs will be at: http://localhost:5000/api-docs');
console.log('\nPress Ctrl+C to stop the server');