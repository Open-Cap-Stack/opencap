#!/usr/bin/env node
/**
 * Script to remove all mongoose imports from codebase
 * Issues #380, #385
 *
 * This script replaces mongoose.Types.ObjectId.isValid() calls with
 * our ZeroDB-compatible utility and removes unused mongoose imports.
 */

const fs = require('fs');
const path = require('path');

// Files to process (from grep results)
const filesToProcess = [
  'routes/v1/spvAssetRoutes.js',
  'routes/v1/complianceCheckRoutes.js',
  'controllers/v1/financialReportController.js',
  'controllers/v1/financialMetricsController.js',
  'controllers/semanticSearchController.js',
  'controllers/financialReportingController.js',
  'controllers/employeeController.js',
  'controllers/analyticsController.js',
  'controllers/agentMemoryController.js',
  'controllers/SPVNested.js',
  'services/safeConversionService.js'
];

function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Check if file uses mongoose for ObjectId validation
  const usesMongooseValidation = content.includes('mongoose.Types.ObjectId.isValid');

  if (usesMongooseValidation) {
    // Add inputSanitizer import if not present
    if (!content.includes("require('../utils/inputSanitizer')") &&
        !content.includes("require('../../utils/inputSanitizer')")) {

      // Determine the correct relative path
      const depth = filePath.split('/').length - 1;
      const prefix = '../'.repeat(depth);

      // Find a good place to add the import (after other requires)
      const requireRegex = /^const .+ = require\(.+\);$/gm;
      const matches = content.match(requireRegex);

      if (matches && matches.length > 0) {
        const lastRequire = matches[matches.length - 1];
        const insertIndex = content.indexOf(lastRequire) + lastRequire.length;
        content = content.slice(0, insertIndex) +
                  `\nconst { isValidObjectId } = require('${prefix}utils/inputSanitizer');` +
                  content.slice(insertIndex);
        modified = true;
      }
    }

    // Replace mongoose.Types.ObjectId.isValid with isValidObjectId
    content = content.replace(/mongoose\.Types\.ObjectId\.isValid/g, 'isValidObjectId');
    modified = true;
  }

  // Remove mongoose import if present and no longer used
  const mongooseImportPattern = /^const mongoose = require\(['"]mongoose['"]\);?\s*$/gm;

  if (mongooseImportPattern.test(content)) {
    // Check if mongoose is still used elsewhere in the file
    const tempContent = content.replace(mongooseImportPattern, '');

    if (!tempContent.includes('mongoose.')) {
      content = content.replace(mongooseImportPattern, '');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Processed ${filePath}`);
  } else {
    console.log(`- Skipped ${filePath} (no changes needed)`);
  }
}

// Process all files
console.log('Removing mongoose imports...\n');
filesToProcess.forEach(processFile);
console.log('\nDone!');
