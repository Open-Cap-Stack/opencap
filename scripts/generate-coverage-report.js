#!/usr/bin/env node

/**
 * OpenCap Coverage Report Generator
 * This script generates a detailed test coverage report and updates the documentation
 * following the Semantic Seed Venture Studio Coding Standards V2.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure the scripts directory exists
if (!fs.existsSync(path.join(__dirname))) {
  fs.mkdirSync(path.join(__dirname), { recursive: true });
}

console.log('🧪 Generating OpenCap Test Coverage Report...');

// Step 1: Run tests with coverage
try {
  console.log('\n📊 Running tests and collecting coverage metrics...');
  execSync('npm run test:coverage', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}

// Step 2: Generate and format coverage report
try {
  console.log('\n📝 Formatting coverage data...');
  
  // Check if coverage directory and summary exists
  const coverageSummaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coverageSummaryPath)) {
    console.error('❌ Coverage summary not found. Make sure tests run correctly with coverage reporting.');
    process.exit(1);
  }
  
  // Read and parse coverage data
  const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
  const totalCoverage = coverageSummary.total;
  
  // Generate markdown report
  const reportDate = new Date().toISOString().split('T')[0];
  
  let markdownReport = `# OpenCap Test Coverage Report\n\n`;
  markdownReport += `*Generated on: ${reportDate}*\n\n`;
  markdownReport += `## Summary\n\n`;
  markdownReport += `| Metric | Coverage | Threshold |\n`;
  markdownReport += `|--------|----------|----------|\n`;
  markdownReport += `| Statements | ${totalCoverage.statements.pct.toFixed(2)}% | 80% |\n`;
  markdownReport += `| Branches | ${totalCoverage.branches.pct.toFixed(2)}% | 70% |\n`;
  markdownReport += `| Functions | ${totalCoverage.functions.pct.toFixed(2)}% | 80% |\n`;
  markdownReport += `| Lines | ${totalCoverage.lines.pct.toFixed(2)}% | 80% |\n\n`;
  
  // Add coverage by directory
  markdownReport += `## Coverage by Directory\n\n`;
  markdownReport += `| Directory | Statements | Branches | Functions | Lines |\n`;
  markdownReport += `|-----------|------------|----------|-----------|-------|\n`;
  
  // Filter out total and files that are not directories
  const directories = Object.keys(coverageSummary)
    .filter(key => key !== 'total' && !key.includes('opencap/') && key.includes('/'));
  
  // Group by top-level directory
  const dirGroups = {};
  directories.forEach(dir => {
    const topDir = dir.split('/')[0];
    if (!dirGroups[topDir]) {
      dirGroups[topDir] = [];
    }
    dirGroups[topDir].push(dir);
  });
  
  // Add rows for each directory group
  Object.keys(dirGroups).sort().forEach(topDir => {
    const stats = {
      statements: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
      lines: { covered: 0, total: 0 }
    };
    
    // Aggregate statistics for the directory
    dirGroups[topDir].forEach(dir => {
      const coverage = coverageSummary[dir];
      stats.statements.covered += coverage.statements.covered;
      stats.statements.total += coverage.statements.total;
      stats.branches.covered += coverage.branches.covered;
      stats.branches.total += coverage.branches.total;
      stats.functions.covered += coverage.functions.covered;
      stats.functions.total += coverage.functions.total;
      stats.lines.covered += coverage.lines.covered;
      stats.lines.total += coverage.lines.total;
    });
    
    // Calculate percentages
    const statsPct = {
      statements: ((stats.statements.covered / stats.statements.total) * 100 || 0).toFixed(2),
      branches: ((stats.branches.covered / stats.branches.total) * 100 || 0).toFixed(2),
      functions: ((stats.functions.covered / stats.functions.total) * 100 || 0).toFixed(2),
      lines: ((stats.lines.covered / stats.lines.total) * 100 || 0).toFixed(2)
    };
    
    markdownReport += `| **${topDir}/** | ${statsPct.statements}% | ${statsPct.branches}% | ${statsPct.functions}% | ${statsPct.lines}% |\n`;
  });
  
  // Add recommendations section
  markdownReport += `\n## Recommendations\n\n`;
  
  // Identify areas needing improvement
  const lowCoverageThreshold = 70;
  const areasForImprovement = [];
  
  Object.keys(dirGroups).forEach(topDir => {
    const files = dirGroups[topDir];
    const lowCoverageFiles = files.filter(file => {
      const coverage = coverageSummary[file];
      return (
        coverage.statements.pct < lowCoverageThreshold ||
        coverage.branches.pct < lowCoverageThreshold ||
        coverage.functions.pct < lowCoverageThreshold ||
        coverage.lines.pct < lowCoverageThreshold
      );
    });
    
    if (lowCoverageFiles.length > 0) {
      areasForImprovement.push({
        directory: topDir,
        count: lowCoverageFiles.length
      });
    }
  });
  
  if (areasForImprovement.length > 0) {
    markdownReport += `The following areas need more test coverage:\n\n`;
    areasForImprovement.forEach(area => {
      markdownReport += `- **${area.directory}/** (${area.count} files below ${lowCoverageThreshold}% coverage)\n`;
    });
  } else {
    markdownReport += `✅ All areas have adequate test coverage. Continue maintaining high standards as new code is developed.\n`;
  }
  
  // Add next steps
  markdownReport += `\n## Next Steps\n\n`;
  markdownReport += `1. 🎯 Focus on writing tests for the areas identified above\n`;
  markdownReport += `2. 📈 Implement more integration tests to ensure system components work together\n`;
  markdownReport += `3. 🔄 Consider adding end-to-end tests for critical user flows\n`;
  markdownReport += `4. 🚀 Enforce coverage thresholds in CI/CD pipeline\n`;
  
  // Save the report
  const reportPath = path.join(__dirname, '..', 'docs', 'test-coverage-report.md');
  fs.writeFileSync(reportPath, markdownReport);
  
  console.log(`\n✅ Coverage report generated at ${reportPath}`);
  
} catch (error) {
  console.error('❌ Error generating coverage report:', error);
  process.exit(1);
}
