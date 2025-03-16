#!/usr/bin/env node

/**
 * This script updates Mongoose connection options in test files to be compatible
 * with newer versions of MongoDB. It removes deprecated options like useFindAndModify
 * and useCreateIndex which are no longer needed in newer versions.
 * 
 * Following the Semantic Seed Venture Studio Coding Standards, this script verifies 
 * existing resources before making changes.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Regular expressions to match Mongoose connection patterns
const CONNECTION_PATTERNS = [
  /mongoose\.connect\([^{]+([\s\S]*?)\)/g,
  /mongoose\.createConnection\([^{]+([\s\S]*?)\)/g
];

// Options to remove
const DEPRECATED_OPTIONS = [
  'useFindAndModify',
  'useCreateIndex',
  'useNewUrlParser',
  'useUnifiedTopology'
];

/**
 * Process a single file to update Mongoose connection options
 */
async function processFile(filePath) {
  try {
    // Read file content
    const content = await readFileAsync(filePath, 'utf8');
    let updatedContent = content;
    let fileWasUpdated = false;

    // Check if file contains mongoose.connect with options
    for (const pattern of CONNECTION_PATTERNS) {
      if (pattern.test(content)) {
        // Replace mongoose connection options
        updatedContent = updatedContent.replace(pattern, (match) => {
          // If the match contains options object
          if (match.includes('{') && match.includes('}')) {
            let newMatch = match;
            
            // Remove deprecated options
            for (const option of DEPRECATED_OPTIONS) {
              const optionPattern = new RegExp(`\\s*${option}:\\s*(true|false),?\\s*`, 'g');
              newMatch = newMatch.replace(optionPattern, '');
            }
            
            // Clean up empty options object
            newMatch = newMatch.replace(/\(\s*([^,]+),\s*\{\s*\}\s*\)/, '($1)');
            
            // Handle trailing commas in options object
            newMatch = newMatch.replace(/,\s*\}/g, ' }');
            
            fileWasUpdated = newMatch !== match;
            return newMatch;
          }
          return match;
        });
      }
    }

    // Only write to file if changes were made
    if (fileWasUpdated) {
      await writeFileAsync(filePath, updatedContent);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏩ No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively scan directory for JavaScript files
 */
async function scanDirectory(directory) {
  const items = await readdirAsync(directory);
  let updatedFiles = 0;

  for (const item of items) {
    const itemPath = path.join(directory, item);
    const stats = await statAsync(itemPath);

    if (stats.isDirectory()) {
      // Skip node_modules and .git directories
      if (item !== 'node_modules' && item !== '.git') {
        updatedFiles += await scanDirectory(itemPath);
      }
    } else if (stats.isFile() && (itemPath.endsWith('.js') || itemPath.endsWith('.ts'))) {
      const wasUpdated = await processFile(itemPath);
      if (wasUpdated) updatedFiles++;
    }
  }

  return updatedFiles;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 Scanning for test files with outdated Mongoose connection options...');
    const testDir = path.join(process.cwd(), '__tests__');
    const rootDir = process.cwd();
    
    // First verify the test directory exists
    try {
      await statAsync(testDir);
      console.log(`Found test directory: ${testDir}`);
    } catch (error) {
      console.error(`❌ Test directory not found: ${testDir}`);
      process.exit(1);
    }

    // Scan test directory
    const updatedFilesCount = await scanDirectory(testDir);
    
    // Also update db.js in root directory if it exists
    const dbPath = path.join(rootDir, 'db.js');
    try {
      await statAsync(dbPath);
      const wasUpdated = await processFile(dbPath);
      if (wasUpdated) updatedFilesCount++;
    } catch (error) {
      // db.js doesn't exist, that's okay
    }
    
    console.log(`\n🎉 Finished updating Mongoose connection options in ${updatedFilesCount} files.`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
