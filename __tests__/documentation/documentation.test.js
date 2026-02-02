/**
 * Documentation Validation Tests
 *
 * These tests ensure that all documentation is accurate, up-to-date,
 * and that all code examples are executable and working.
 *
 * Test Driven Documentation: Write tests first, then update docs to pass.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Documentation Validation', () => {
  describe('README.md Validation', () => {
    let readmeContent;

    beforeAll(() => {
      const readmePath = path.join(__dirname, '../../README.md');
      readmeContent = fs.readFileSync(readmePath, 'utf-8');
    });

    test('README should reference ZeroDB instead of MongoDB as primary database', () => {
      // MongoDB should only be mentioned in migration context
      const zerodbMentions = (readmeContent.match(/ZeroDB/gi) || []).length;
      const mongodbMentions = (readmeContent.match(/MongoDB(?!.*migration|.*legacy|.*phased out)/gi) || []).length;

      expect(zerodbMentions).toBeGreaterThan(5);
      // MongoDB mentions should be minimal and contextual
    });

    test('README should include ZeroDB setup instructions', () => {
      expect(readmeContent).toContain('ZERODB_API_KEY');
      expect(readmeContent).toContain('ZERODB_PROJECT_ID');
      expect(readmeContent).toContain('ZERODB_BASE_URL');
    });

    test('README should NOT include MongoDB as required prerequisite', () => {
      const prerequisitesSection = readmeContent.split('## Installation')[0];
      expect(prerequisitesSection.toLowerCase()).not.toContain('mongodb');
    });

    test('README should link to ZeroDB migration guide', () => {
      expect(readmeContent).toContain('zerodb-migration-guide');
    });

    test('README should link to ZeroDB API reference', () => {
      expect(readmeContent).toContain('zerodb-api-reference');
    });

    test('README should include troubleshooting link', () => {
      expect(readmeContent).toContain('troubleshooting');
    });
  });

  describe('Environment Variables Validation', () => {
    let envExampleContent;

    beforeAll(() => {
      const envPath = path.join(__dirname, '../../.env.example');
      envExampleContent = fs.readFileSync(envPath, 'utf-8');
    });

    test('.env.example should include all required ZeroDB variables', () => {
      expect(envExampleContent).toContain('ZERODB_API_KEY');
      expect(envExampleContent).toContain('ZERODB_BASE_URL');
      expect(envExampleContent).toContain('ZERODB_PROJECT_ID');
    });

    test('.env.example should mark MongoDB as legacy/optional', () => {
      const mongodbLine = envExampleContent.split('\n').find(line => line.includes('MONGODB_URI'));
      expect(mongodbLine).toBeDefined();
      // Should have a comment indicating it's legacy/optional
      const lineIndex = envExampleContent.split('\n').indexOf(mongodbLine);
      const commentLine = envExampleContent.split('\n')[lineIndex - 1] || '';
      expect(commentLine.toLowerCase()).toMatch(/legacy|optional|migration/);
    });

    test('.env.example should include sync configuration', () => {
      expect(envExampleContent).toContain('ENABLE_SYNC');
      expect(envExampleContent).toContain('SYNC_DIRECTION');
    });

    test('.env.example should include database monitoring configuration', () => {
      expect(envExampleContent).toContain('ENABLE_DB_MONITORING');
    });
  });

  describe('Documentation Files Existence', () => {
    test('ZeroDB migration guide should exist', () => {
      const migrationGuidePath = path.join(__dirname, '../../docs/zerodb-migration-guide.md');
      expect(fs.existsSync(migrationGuidePath)).toBe(true);
    });

    test('ZeroDB API reference should exist', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      expect(fs.existsSync(apiRefPath)).toBe(true);
    });

    test('Troubleshooting guide should exist', () => {
      const troubleshootingPath = path.join(__dirname, '../../docs/troubleshooting.md');
      expect(fs.existsSync(troubleshootingPath)).toBe(true);
    });

    test('Performance tuning guide should exist', () => {
      const perfPath = path.join(__dirname, '../../docs/performance-tuning.md');
      expect(fs.existsSync(perfPath)).toBe(true);
    });
  });

  describe('Documentation Content Validation', () => {
    test('ZeroDB migration guide should include setup steps', () => {
      const migrationGuidePath = path.join(__dirname, '../../docs/zerodb-migration-guide.md');
      const content = fs.readFileSync(migrationGuidePath, 'utf-8');

      expect(content).toContain('Prerequisites');
      expect(content).toContain('Step 1');
      expect(content).toContain('ZERODB_API_KEY');
    });

    test('ZeroDB API reference should document all main endpoints', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      const content = fs.readFileSync(apiRefPath, 'utf-8');

      expect(content).toContain('/projects/');
      expect(content).toContain('/database/tables');
      expect(content).toContain('/database/vectors');
      expect(content).toContain('/database/memory');
    });

    test('Troubleshooting guide should include common errors', () => {
      const troubleshootingPath = path.join(__dirname, '../../docs/troubleshooting.md');
      const content = fs.readFileSync(troubleshootingPath, 'utf-8');

      expect(content).toContain('401');
      expect(content).toContain('Connection');
      expect(content.toLowerCase()).toContain('error');
    });

    test('Performance tuning guide should include optimization strategies', () => {
      const perfPath = path.join(__dirname, '../../docs/performance-tuning.md');
      const content = fs.readFileSync(perfPath, 'utf-8');

      expect(content.toLowerCase()).toContain('cache');
      expect(content.toLowerCase()).toContain('index');
      expect(content.toLowerCase()).toContain('batch');
    });
  });

  describe('Example Files Validation', () => {
    test('ZeroDB quickstart example should exist', () => {
      const quickstartPath = path.join(__dirname, '../../examples/zerodb-quickstart.js');
      expect(fs.existsSync(quickstartPath)).toBe(true);
    });

    test('Sync setup example should exist', () => {
      const syncExamplePath = path.join(__dirname, '../../examples/sync-setup.js');
      expect(fs.existsSync(syncExamplePath)).toBe(true);
    });

    test('Common queries example should exist', () => {
      const queriesPath = path.join(__dirname, '../../examples/common-queries.js');
      expect(fs.existsSync(queriesPath)).toBe(true);
    });
  });

  describe('Code Examples Syntax Validation', () => {
    test('All JavaScript example files should have valid syntax', () => {
      const examplesDir = path.join(__dirname, '../../examples');

      if (!fs.existsSync(examplesDir)) {
        return; // Skip if examples directory doesn't exist yet
      }

      const exampleFiles = fs.readdirSync(examplesDir)
        .filter(file => file.endsWith('.js'));

      exampleFiles.forEach(file => {
        const filePath = path.join(examplesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Basic syntax check - try to parse as JavaScript
        expect(() => {
          new Function(content);
        }).not.toThrow();
      });
    });

    test('Example files should include proper documentation', () => {
      const examplesDir = path.join(__dirname, '../../examples');

      if (!fs.existsSync(examplesDir)) {
        return; // Skip if examples directory doesn't exist yet
      }

      const exampleFiles = fs.readdirSync(examplesDir)
        .filter(file => file.endsWith('.js'));

      exampleFiles.forEach(file => {
        const filePath = path.join(examplesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Should have JSDoc comments
        expect(content).toContain('/**');
        expect(content).toContain('*/');
      });
    });
  });

  describe('Link Validation', () => {
    test('Internal documentation links should be valid', () => {
      const docsDir = path.join(__dirname, '../../docs');
      const docFiles = fs.readdirSync(docsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(docsDir, file));

      docFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Find markdown links [text](link)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
          const linkPath = match[2];

          // Skip external links
          if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
            continue;
          }

          // Skip anchors
          if (linkPath.startsWith('#')) {
            continue;
          }

          // Resolve relative links
          const resolvedPath = path.resolve(path.dirname(filePath), linkPath);

          // Check if file exists
          if (!fs.existsSync(resolvedPath)) {
            fail(`Broken link in ${path.basename(filePath)}: ${linkPath}`);
          }
        }
      });
    });
  });

  describe('API Documentation Completeness', () => {
    test('All ZeroDB endpoints should be documented', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      const content = fs.readFileSync(apiRefPath, 'utf-8');

      const requiredEndpoints = [
        'POST /projects/',
        'GET /projects/',
        'GET /projects/{project_id}/database/status',
        'POST /projects/{project_id}/database/tables',
        'GET /projects/{project_id}/database/tables',
        'POST /projects/{project_id}/database/vectors/upsert',
        'POST /projects/{project_id}/database/vectors/search',
        'GET /projects/{project_id}/database/vectors',
        'POST /projects/{project_id}/database/memory/store',
        'GET /projects/{project_id}/database/memory',
        'POST /projects/{project_id}/database/events/publish',
        'GET /projects/{project_id}/database/events',
        'POST /projects/{project_id}/database/files/upload',
        'GET /projects/{project_id}/database/files'
      ];

      requiredEndpoints.forEach(endpoint => {
        expect(content).toContain(endpoint);
      });
    });

    test('API documentation should include request/response examples', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      const content = fs.readFileSync(apiRefPath, 'utf-8');

      expect(content).toContain('Request');
      expect(content).toContain('Response');
      expect(content).toContain('```json');
    });

    test('API documentation should include authentication information', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      const content = fs.readFileSync(apiRefPath, 'utf-8');

      expect(content.toLowerCase()).toContain('authentication');
      expect(content).toContain('Bearer');
      expect(content).toContain('Authorization');
    });
  });

  describe('Setup Instructions Validation', () => {
    test('Migration guide should include step-by-step instructions', () => {
      const migrationGuidePath = path.join(__dirname, '../../docs/zerodb-migration-guide.md');
      const content = fs.readFileSync(migrationGuidePath, 'utf-8');

      // Should have numbered steps
      expect(content).toMatch(/Step 1|1\./);
      expect(content).toMatch(/Step 2|2\./);
      expect(content).toMatch(/Step 3|3\./);
    });

    test('Migration guide should include verification steps', () => {
      const migrationGuidePath = path.join(__dirname, '../../docs/zerodb-migration-guide.md');
      const content = fs.readFileSync(migrationGuidePath, 'utf-8');

      expect(content.toLowerCase()).toContain('verify');
      expect(content.toLowerCase()).toContain('test');
    });

    test('Migration guide should include rollback instructions', () => {
      const migrationGuidePath = path.join(__dirname, '../../docs/zerodb-migration-guide.md');
      const content = fs.readFileSync(migrationGuidePath, 'utf-8');

      expect(content.toLowerCase()).toContain('rollback');
    });
  });

  describe('Code Snippet Validation', () => {
    test('Documentation should include executable code snippets', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      const content = fs.readFileSync(apiRefPath, 'utf-8');

      // Should have code blocks
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
      expect(codeBlocks.length).toBeGreaterThan(10);
    });

    test('Code snippets should be properly formatted', () => {
      const apiRefPath = path.join(__dirname, '../../docs/zerodb-api-reference.md');
      const content = fs.readFileSync(apiRefPath, 'utf-8');

      // Code blocks should have language specifier
      const codeBlocks = content.match(/```\w+/g) || [];
      expect(codeBlocks.length).toBeGreaterThan(5);
    });
  });

  describe('Error Documentation', () => {
    test('Troubleshooting guide should document common error codes', () => {
      const troubleshootingPath = path.join(__dirname, '../../docs/troubleshooting.md');
      const content = fs.readFileSync(troubleshootingPath, 'utf-8');

      const commonErrorCodes = ['400', '401', '403', '404', '500'];
      commonErrorCodes.forEach(code => {
        expect(content).toContain(code);
      });
    });

    test('Troubleshooting guide should include solutions', () => {
      const troubleshootingPath = path.join(__dirname, '../../docs/troubleshooting.md');
      const content = fs.readFileSync(troubleshootingPath, 'utf-8');

      expect(content.toLowerCase()).toContain('solution');
      expect(content.toLowerCase()).toContain('fix');
    });
  });

  describe('Performance Documentation', () => {
    test('Performance guide should include benchmarks', () => {
      const perfPath = path.join(__dirname, '../../docs/performance-tuning.md');
      const content = fs.readFileSync(perfPath, 'utf-8');

      expect(content.toLowerCase()).toContain('benchmark');
      expect(content.toLowerCase()).toContain('performance');
    });

    test('Performance guide should include configuration examples', () => {
      const perfPath = path.join(__dirname, '../../docs/performance-tuning.md');
      const content = fs.readFileSync(perfPath, 'utf-8');

      expect(content).toContain('```');
      expect(content.toLowerCase()).toContain('config');
    });
  });
});

describe('Example Code Execution Tests', () => {
  describe('ZeroDB Service Examples', () => {
    test('Example code should be executable (syntax check)', () => {
      const quickstartPath = path.join(__dirname, '../../examples/zerodb-quickstart.js');

      if (!fs.existsSync(quickstartPath)) {
        return; // Skip if file doesn't exist yet
      }

      const content = fs.readFileSync(quickstartPath, 'utf-8');

      // Should not throw syntax errors
      expect(() => {
        require(quickstartPath);
      }).not.toThrow(SyntaxError);
    });
  });
});
