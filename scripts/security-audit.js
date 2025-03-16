#!/usr/bin/env node

/**
 * OpenCap Security Audit Script
 * This script performs a comprehensive security audit of the OpenCap project
 * following the Semantic Seed Venture Studio Coding Standards V2.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const outputDir = path.join(__dirname, '..', 'security-reports');
const dateStr = new Date().toISOString().split('T')[0];
const reportFile = path.join(outputDir, `security-audit-${dateStr}.md`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🔒 Starting OpenCap Security Audit...');

// Helper to run commands and capture output
function runCommand(command, errorMsg) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`❌ ${errorMsg}: ${error.message}`);
    return `Error: ${error.message}`;
  }
}

// Verify existing resources first
console.log('🔍 Verifying existing Docker resources...');
const dockerContainers = runCommand('docker ps -a --format "{{.Names}}"', 'Failed to check Docker containers');
const dockerVolumes = runCommand('docker volume ls --format "{{.Name}}"', 'Failed to check Docker volumes');

// 1. Run npm audit
console.log('📦 Running npm dependency audit...');
let npmAuditResult;
try {
  npmAuditResult = execSync('npm audit --json', { encoding: 'utf8' });
} catch (error) {
  // npm audit exits with error if vulnerabilities found, but we still want the report
  npmAuditResult = error.stdout;
}

// Parse JSON report
let auditData;
try {
  auditData = JSON.parse(npmAuditResult);
} catch (error) {
  console.error('❌ Failed to parse npm audit results:', error.message);
  auditData = { error: 'Failed to parse audit results' };
}

// 2. Check Dockerfile for security best practices
console.log('🐳 Analyzing Dockerfile security...');
const dockerfileResult = fs.existsSync(path.join(__dirname, '..', 'Dockerfile')) 
  ? runCommand('docker run --rm -v "$(pwd)":/app goodwithtech/dockle:latest --exit-code 1 -f json ./app', 'Dockerfile security check failed')
  : 'Dockerfile not found';

// 3. Check for outdated packages
console.log('📋 Checking for outdated packages...');
const outdatedResult = runCommand('npm outdated --json', 'Failed to check outdated packages');

// 4. Check for known security issues in code patterns
console.log('🔍 Scanning for security code patterns...');
// This would normally use a tool like node-scan or SonarQube
// For now we'll just check for common insecure patterns
const codePatternResult = runCommand('grep -r "eval(" --include="*.js" .', 'Code pattern scan error') || 'No dangerous eval() usage found';

// 5. Check coverage report to ensure security-critical code is well tested
console.log('🧪 Verifying test coverage of security-critical paths...');
let coverageResult = '';
if (fs.existsSync(path.join(__dirname, '..', 'coverage', 'coverage-summary.json'))) {
  coverageResult = fs.readFileSync(path.join(__dirname, '..', 'coverage', 'coverage-summary.json'), 'utf8');
} else {
  coverageResult = 'No coverage report found. Run npm run test:coverage first.';
}

// Generate consolidated report
console.log('📝 Generating security audit report...');

let vulnerabilitySummary = 'No vulnerabilities found';
if (auditData.vulnerabilities) {
  const vulnCount = Object.values(auditData.vulnerabilities).reduce((sum, severity) => sum + severity, 0);
  vulnerabilitySummary = `${vulnCount} vulnerabilities found (${
    Object.entries(auditData.vulnerabilities)
      .map(([severity, count]) => `${count} ${severity}`)
      .join(', ')
  })`;
}

const report = `# OpenCap Security Audit Report
*Generated on: ${dateStr}*

## Executive Summary

${vulnerabilitySummary}

## System Environment

- Node.js version: ${process.version}
- npm version: ${runCommand('npm --version', 'Failed to get npm version').trim()}
- Docker containers: ${dockerContainers.split('\n').length - 1} running
- Docker volumes: ${dockerVolumes.split('\n').length - 1} present

## Dependency Vulnerabilities

${
  auditData.vulnerabilities 
    ? `Found vulnerabilities in the following categories:
${Object.entries(auditData.vulnerabilities)
  .map(([severity, count]) => `- **${severity}**: ${count}`)
  .join('\n')}

### Critical & High Severity Issues

${
  auditData.advisories
    ? Object.values(auditData.advisories)
        .filter(adv => ['critical', 'high'].includes(adv.severity))
        .map(adv => `- **${adv.module_name}** (${adv.severity}): ${adv.title} 
  - Vulnerable versions: ${adv.vulnerable_versions}
  - Patched versions: ${adv.patched_versions}
  - Recommendation: ${adv.recommendation || 'Update to latest version'}`)
        .join('\n\n')
    : 'No critical or high severity issues found.'
}`
    : 'No vulnerability data available.'
}

## Docker Security Analysis

\`\`\`
${typeof dockerfileResult === 'string' ? dockerfileResult : JSON.stringify(dockerfileResult, null, 2)}
\`\`\`

## Outdated Packages

${
  outdatedResult && outdatedResult !== '{}\n'
    ? 'The following packages are outdated and should be updated:\n\n' +
      Object.entries(JSON.parse(outdatedResult))
        .map(([pkg, data]) => `- **${pkg}**: ${data.current} → ${data.latest} ${data.type === 'major' ? '(Major update)' : ''}`)
        .join('\n')
    : 'No outdated packages found.'
}

## Security Code Pattern Analysis

\`\`\`
${codePatternResult}
\`\`\`

## Test Coverage Analysis

${
  coverageResult.startsWith('No coverage')
    ? coverageResult
    : (() => {
        try {
          const coverage = JSON.parse(coverageResult);
          const total = coverage.total;
          
          return `Overall test coverage:
- Statements: ${total.statements.pct}%
- Branches: ${total.branches.pct}%
- Functions: ${total.functions.pct}%
- Lines: ${total.lines.pct}%

Security-critical areas:
${
  Object.entries(coverage)
    .filter(([path]) => 
      path !== 'total' && 
      (path.includes('/auth/') || 
       path.includes('/models/') || 
       path.includes('/controllers/'))
    )
    .map(([path, data]) => 
      `- **${path}**: ${data.statements.pct}% statements, ${data.branches.pct}% branches`
    )
    .join('\n')
}`;
        } catch (e) {
          return `Error parsing coverage data: ${e.message}`;
        }
      })()
}

## Recommendations

1. ${auditData.vulnerabilities && Object.values(auditData.vulnerabilities).reduce((sum, count) => sum + count, 0) > 0 
     ? '**Urgent**: Address the listed dependency vulnerabilities, particularly critical and high severity issues.'
     : 'Continue regular security audits and dependency updates.'}
2. ${outdatedResult && outdatedResult !== '{}\n' 
     ? 'Update outdated packages to their latest versions after thorough testing.'
     : 'Maintain current package update schedule.'}
3. Implement security scanning in the CI/CD pipeline for every commit.
4. Improve test coverage for security-critical code paths to at least 90%.
5. Add end-to-end security testing for authentication and authorization flows.

## Next Actions

1. Review this report with the security team
2. Create tickets for each vulnerability that needs to be addressed
3. Schedule the next security audit for one week from today
4. Update the dependency security plan as needed

*This report was automatically generated by the OpenCap Security Audit script.*
`;

// Write report to file
fs.writeFileSync(reportFile, report);

console.log(`✅ Security audit complete! Report saved to ${reportFile}`);
console.log(`Summary: ${vulnerabilitySummary}`);

// Exit with error code if vulnerabilities found (for CI/CD pipeline)
if (auditData.vulnerabilities && 
    Object.entries(auditData.vulnerabilities)
      .some(([severity, count]) => ['critical', 'high'].includes(severity) && count > 0)) {
  console.error('❌ Critical or high severity vulnerabilities found!');
  process.exit(1);
}

process.exit(0);
