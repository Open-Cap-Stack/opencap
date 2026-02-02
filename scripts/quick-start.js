#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 OpenCap Quick Start Script');
console.log('==============================\n');

// Check if we're in the right directory
const projectRoot = '/Volumes/Cody/projects/opencap-clean';
const frontendDir = path.join(projectRoot, 'frontend');

// Check if directories exist
if (!fs.existsSync(projectRoot)) {
  console.error('❌ Project root directory not found:', projectRoot);
  process.exit(1);
}

if (!fs.existsSync(frontendDir)) {
  console.error('❌ Frontend directory not found:', frontendDir);
  process.exit(1);
}

console.log('✅ Project directories found');
console.log('📂 Project root:', projectRoot);
console.log('📂 Frontend dir:', frontendDir);

// Function to start backend
function startBackend() {
  console.log('\n🔧 Starting Backend Server...');
  
  const backend = spawn('/opt/homebrew/bin/node', ['app.js'], {
    cwd: projectRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  backend.stdout.on('data', (data) => {
    console.log('BACKEND:', data.toString().trim());
  });

  backend.stderr.on('data', (data) => {
    console.error('BACKEND ERROR:', data.toString().trim());
  });

  backend.on('error', (error) => {
    console.error('❌ Backend failed to start:', error.message);
  });

  return backend;
}

// Function to start frontend
function startFrontend() {
  console.log('\n🎨 Starting Frontend Server...');
  
  const frontend = spawn('/opt/homebrew/bin/npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH }
  });

  frontend.stdout.on('data', (data) => {
    console.log('FRONTEND:', data.toString().trim());
  });

  frontend.stderr.on('data', (data) => {
    console.error('FRONTEND ERROR:', data.toString().trim());
  });

  frontend.on('error', (error) => {
    console.error('❌ Frontend failed to start:', error.message);
  });

  return frontend;
}

// Start both servers
const backendProcess = startBackend();
const frontendProcess = startFrontend();

// Handle shutdown
function shutdown() {
  console.log('\n🛑 Shutting down servers...');
  
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Wait a moment then show URLs
setTimeout(() => {
  console.log('\n🌐 Servers should be starting...');
  console.log('📍 Backend API:  http://localhost:5000');
  console.log('📍 Frontend App: http://localhost:5173');
  console.log('📚 API Docs:     http://localhost:5000/api-docs');
  console.log('\n💡 Press Ctrl+C to stop both servers');
}, 3000);

// Keep the script running
setInterval(() => {
  // Just keep alive
}, 1000);