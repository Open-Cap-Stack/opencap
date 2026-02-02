console.log('✅ Node.js is working!');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());

// Try to start the backend server directly
const path = require('path');
const fs = require('fs');

const projectRoot = '/Volumes/Cody/projects/opencap-clean';
const appFile = path.join(projectRoot, 'app.js');

console.log('Checking for app.js:', appFile);

if (fs.existsSync(appFile)) {
  console.log('✅ app.js found');
  
  // Change to project directory
  process.chdir(projectRoot);
  console.log('Changed to directory:', process.cwd());
  
  // Try to require and run the app
  try {
    console.log('🚀 Starting OpenCap backend server...');
    require('./app.js');
  } catch (error) {
    console.error('❌ Error starting app:', error.message);
  }
} else {
  console.log('❌ app.js not found');
}