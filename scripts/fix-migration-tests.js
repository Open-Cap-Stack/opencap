/**
 * Script to fix migration test data to include all required model fields
 */

const fs = require('fs');
const path = require('path');

// Read test file
const mongoBaselineTestPath = path.join(__dirname, '../tests/migration/pre-migration/mongodb-baseline.test.js');
const performanceTestPath = path.join(__dirname, '../tests/migration/performance/mongodb-vs-zerodb.test.js');

let baselineContent = fs.readFileSync(mongoBaselineTestPath, 'utf8');
let performanceContent = fs.readFileSync(performanceTestPath, 'utf8');

// Fix User.insertMany patterns - add required fields
baselineContent = baselineContent.replace(
  /\{ email: '([^']+)', password: '([^']+)', name: '([^']+)'( , role: '([^']+)')?\}/g,
  (match, email, password, name, roleMatch, role) => {
    const userRole = role || 'user';
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || 'User';
    return `{ userId: 'test-${email}', firstName: '${firstName}', lastName: '${lastName}', email: '${email}', password: '${password}', role: '${userRole}' }`;
  }
);

// Fix Company.create patterns - add required fields
baselineContent = baselineContent.replace(
  /Company\.create\(\s*\{([^}]+name: '([^']+)'[^}]*)\}\s*\)/g,
  (match, content, companyName) => {
    if (content.includes('companyId')) return match; // Already has required fields
    if (content.includes('CompanyName')) return match; // Already has CompanyName

    // Add minimal required fields
    const newContent = `{
      companyId: 'test-comp-${Date.now()}',
      CompanyName: '${companyName}',
      CompanyType: 'startup',
      RegisteredAddress: '123 Test St',
      TaxID: '12-3456789',
      corporationDate: new Date('2020-01-01'),
      ${content.replace(/name: '[^']+',?\s*/, '')}
    }`;
    return `Company.create(${newContent})`;
  }
);

// Write the fixed content
fs.writeFileSync(mongoBaselineTestPath, baselineContent);
fs.writeFileSync(performanceTestPath, performanceContent);

console.log('Migration test files fixed successfully');
