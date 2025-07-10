/**
 * Cleanup Test Files Script
 * [Chore] OCDI-999: Remove test files after backup
 * 
 * This script removes test files that have been backed up to the opencap-test-backup directory.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to clean
const directoriesToClean = [
  'test',
  'mocha-tests',
  'dags/__pycache__',
  'docs/testing'
];

// Individual files to remove
const filesToRemove = [
  'jest.test.js',
  'clean-test-db.js',
  'parsePeriod.test.js',
  'simple_function.test.js',
  'simple2.test.js',
  'simple.test.js',
  'simple-mongodb-test.js',
  'temp.test.js',
  'temp_test_parsePeriod.js',
  'test-mongodb-conn.js'
];

// Test script files to keep
const testScriptsToKeep = [
  'scripts/test-shortcut-integration.js',
  'scripts/test-mongodb-connection.js',
  'scripts/cleanupTestFiles.js' // This script itself
];

console.log('🚀 Starting test files cleanup...');

// Function to safely remove a file
function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error removing ${filePath}:`, error.message);
    return false;
  }
}

// Function to safely remove a directory
function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      // Check if directory is empty
      const files = fs.readdirSync(dirPath);
      if (files.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`✅ Removed empty directory: ${dirPath}`);
      } else {
        console.log(`⚠️  Skipping non-empty directory: ${dirPath}`);
        return false;
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error removing directory ${dirPath}:`, error.message);
    return false;
  }
}

// Main cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up test files...');
  
  // Track what was removed
  const results = {
    filesRemoved: 0,
    filesSkipped: 0,
    dirsRemoved: 0,
    dirsSkipped: 0
  };

  // Remove individual files
  for (const file of filesToRemove) {
    const filePath = path.join(process.cwd(), file);
    if (removeFile(filePath)) {
      results.filesRemoved++;
    } else {
      results.filesSkipped++;
    }
  }

  // Clean up test directories
  for (const dir of directoriesToClean) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        // Use execSync to handle non-empty directories
        execSync(`rm -rf "${dirPath}"`);
        console.log(`✅ Removed directory: ${dirPath}`);
        results.dirsRemoved++;
      } catch (error) {
        console.error(`❌ Error removing directory ${dirPath}:`, error.message);
        results.dirsSkipped++;
      }
    } else {
      results.dirsSkipped++;
    }
  }

  // Clean up test scripts, keeping the ones we need
  const testScriptsDir = path.join(process.cwd(), 'scripts');
  if (fs.existsSync(testScriptsDir)) {
    const files = fs.readdirSync(testScriptsDir);
    for (const file of files) {
      const filePath = path.join(testScriptsDir, file);
      // Only remove test scripts that we're not keeping
      if (file.startsWith('test-') && !testScriptsToKeep.includes(`scripts/${file}`)) {
        if (removeFile(filePath)) {
          results.filesRemoved++;
        } else {
          results.filesSkipped++;
        }
      }
    }
  }

  console.log('\n📊 Cleanup Summary:');
  console.log(`✅ ${results.filesRemoved} files removed`);
  console.log(`⏩ ${results.filesSkipped} files skipped or not found`);
  console.log(`✅ ${results.dirsRemoved} directories removed`);
  console.log(`⏩ ${results.dirsSkipped} directories skipped or not found`);
  
  console.log('\n🔍 Check the backup directory if you need to restore any files:');
  console.log('   /Volumes/Cody/projects/opencap-test-backup/');
  
  console.log('\n✨ Cleanup complete!');
}

// Run the cleanup
cleanup().catch(console.error);
