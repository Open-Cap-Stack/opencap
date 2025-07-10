#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🎨 Starting OpenCap Frontend Server...');

// Change to frontend directory
const frontendDir = '/Volumes/Cody/projects/opencap-clean/frontend';
process.chdir(frontendDir);

// Start the frontend development server
const frontend = spawn('/opt/homebrew/bin/npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: frontendDir,
  env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH }
});

frontend.on('error', (error) => {
  console.error('❌ Failed to start frontend server:', error);
});

frontend.on('close', (code) => {
  console.log(`Frontend server exited with code ${code}`);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping frontend server...');
  frontend.kill();
  process.exit();
});

console.log('✅ Frontend server starting...');
console.log('📍 Frontend will be available at: http://localhost:5173');
console.log('\nPress Ctrl+C to stop the server');