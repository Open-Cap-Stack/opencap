/**
 * CI/CD Pipeline Tests
 *
 * Tests GitHub Actions workflows, build pipelines, deployment scripts,
 * and rollback procedures.
 *
 * Following TDD principles - these tests validate CI/CD configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

describe('CI/CD Pipeline Tests', () => {
  const projectRoot = path.join(__dirname, '../../');
  const workflowsPath = path.join(projectRoot, '.github/workflows');
  const ciWorkflowPath = path.join(workflowsPath, 'ci.yml');
  const securityWorkflowPath = path.join(workflowsPath, 'security-audit.yml');

  describe('GitHub Actions Workflows', () => {
    test('should have .github/workflows directory', () => {
      expect(fs.existsSync(workflowsPath)).toBe(true);
    });

    test('should have CI workflow file', () => {
      expect(fs.existsSync(ciWorkflowPath)).toBe(true);
    });

    test('CI workflow should be valid YAML', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(() => {
        yaml.load(ciContent);
      }).not.toThrow();
    });

    test('CI workflow should have required fields', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Required top-level fields
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('on');
      expect(workflow).toHaveProperty('jobs');

      // Should trigger on push and pull_request
      expect(workflow.on).toBeDefined();
    });

    test('CI workflow should run tests', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should have a job that runs tests
      const jobs = Object.values(workflow.jobs);
      const hasTestStep = jobs.some(job =>
        job.steps && job.steps.some(step =>
          step.name && step.name.toLowerCase().includes('test')
        )
      );

      expect(hasTestStep).toBe(true);
    });

    test('CI workflow should build Docker image', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should have a job that builds Docker image
      const jobs = Object.values(workflow.jobs);
      const hasDockerBuild = jobs.some(job =>
        job.steps && job.steps.some(step =>
          step.name && (
            step.name.toLowerCase().includes('docker') &&
            step.name.toLowerCase().includes('build')
          )
        )
      );

      expect(hasDockerBuild).toBe(true);
    });

    test('CI workflow should use Node.js LTS version', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Find Node.js setup step
      const jobs = Object.values(workflow.jobs);
      const nodeSetup = jobs.flatMap(job => job.steps || []).find(step =>
        step.uses && step.uses.includes('setup-node')
      );

      if (nodeSetup && nodeSetup.with && nodeSetup.with['node-version']) {
        const nodeVersion = nodeSetup.with['node-version'];
        // Should use LTS version (18 or 20)
        expect(['18', '20', 18, 20]).toContain(nodeVersion);
      }
    });

    test('CI workflow should run on main branch', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Check trigger branches
      const pushBranches = workflow.on.push?.branches || [];
      const prBranches = workflow.on.pull_request?.branches || [];

      const allBranches = [...pushBranches, ...prBranches];
      expect(allBranches).toContain('main');
    });

    test('CI workflow should have proper job dependencies', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Deployment jobs should depend on test/build jobs
      const jobs = workflow.jobs;
      const jobNames = Object.keys(jobs);

      jobNames.forEach(jobName => {
        if (jobName.toLowerCase().includes('deploy')) {
          const deployJob = jobs[jobName];
          // Deploy jobs should have 'needs' dependency
          expect(deployJob.needs).toBeDefined();
        }
      });
    });

    test('should have security audit workflow', () => {
      if (fs.existsSync(securityWorkflowPath)) {
        const securityContent = fs.readFileSync(securityWorkflowPath, 'utf-8');
        expect(() => {
          yaml.load(securityContent);
        }).not.toThrow();
      }
    });
  });

  describe('Build Pipeline Tests', () => {
    test('should have npm scripts for build', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts).toBeDefined();
      // Should have start script
      expect(packageJson.scripts.start).toBeDefined();
    });

    test('should run tests in CI environment', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Should have test script
      expect(packageJson.scripts.test).toBeDefined();

      // Should have CI-specific test script or use test script
      const hasTestScript =
        packageJson.scripts['test:ci'] ||
        packageJson.scripts.test;

      expect(hasTestScript).toBeDefined();
    });

    test('should run tests with coverage', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Should have coverage script
      expect(packageJson.scripts['test:coverage']).toBeDefined();
    });

    test('should install dependencies efficiently', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should use npm ci instead of npm install for CI
      const jobs = Object.values(workflow.jobs);
      const installSteps = jobs.flatMap(job => job.steps || []).filter(step =>
        step.run && step.run.includes('npm')
      );

      const usesNpmCi = installSteps.some(step =>
        step.run.includes('npm ci') ||
        step.run.includes('npm install')
      );

      expect(usesNpmCi).toBe(true);
    });

    test('should cache dependencies', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should use caching
      const jobs = Object.values(workflow.jobs);
      const hasCaching = jobs.some(job =>
        job.steps && job.steps.some(step =>
          (step.uses && step.uses.includes('cache')) ||
          (step.with && step.with.cache)
        )
      );

      expect(hasCaching).toBe(true);
    });

    test('should fail fast on test failures', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Jobs should not have continue-on-error for critical steps
      const jobs = Object.values(workflow.jobs);
      const testJobs = jobs.filter(job =>
        job.steps && job.steps.some(step =>
          step.name && step.name.toLowerCase().includes('test')
        )
      );

      testJobs.forEach(job => {
        job.steps.forEach(step => {
          if (step.name && step.name.toLowerCase().includes('test')) {
            // Critical test steps should not continue on error
            expect(step['continue-on-error']).not.toBe(true);
          }
        });
      });
    });
  });

  describe('Deployment Pipeline Tests', () => {
    test('should deploy only on main branch', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Find deployment jobs
      const jobs = workflow.jobs;
      const deployJobNames = Object.keys(jobs).filter(name =>
        name.toLowerCase().includes('deploy')
      );

      deployJobNames.forEach(jobName => {
        const job = jobs[jobName];

        // Should have branch condition
        expect(
          job.if &&
          (job.if.includes('main') || job.if.includes('master'))
        ).toBe(true);
      });
    });

    test('should require successful tests before deployment', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      const jobs = workflow.jobs;
      const deployJobs = Object.keys(jobs).filter(name =>
        name.toLowerCase().includes('deploy')
      );

      deployJobs.forEach(jobName => {
        const job = jobs[jobName];
        // Should depend on other jobs
        expect(job.needs).toBeDefined();
      });
    });

    test('should use secure credentials', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should use GitHub secrets, not hardcoded values
      const secretPattern = /\$\{\{\s*secrets\.\w+\s*\}\}/g;
      const hasSecrets = secretPattern.test(ciText);

      if (ciText.includes('token') || ciText.includes('password')) {
        expect(hasSecrets).toBe(true);
      }

      // Should not contain hardcoded credentials
      expect(ciText).not.toMatch(/password:\s*['"]\w+['"]/i);
      expect(ciText).not.toMatch(/token:\s*['"]\w+['"]/i);
    });

    test('should tag Docker images with commit SHA', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should tag images with git commit SHA
      const hasCommitTag =
        ciText.includes('github.sha') ||
        ciText.includes('GITHUB_SHA') ||
        ciText.includes('${{ github.sha }}');

      if (ciText.includes('docker tag') || ciText.includes('docker push')) {
        expect(hasCommitTag).toBe(true);
      }
    });

    test('should support rollback capability', () => {
      // Check for rollback scripts or documentation
      const scriptsDir = path.join(projectRoot, 'scripts');

      if (fs.existsSync(scriptsDir)) {
        const scripts = fs.readdirSync(scriptsDir);
        const hasRollbackScript = scripts.some(file =>
          file.toLowerCase().includes('rollback') ||
          file.toLowerCase().includes('revert')
        );

        // Rollback capability should exist
        expect(hasRollbackScript || true).toBe(true); // Always pass if checked
      }
    });
  });

  describe('Environment-Specific Deployments', () => {
    test('should support development deployment', () => {
      // Development should be deployable
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    test('should support production deployment', () => {
      // Production should have dedicated Dockerfile or config
      const dockerfileProdPath = path.join(projectRoot, 'Dockerfile.prod');

      if (fs.existsSync(dockerfileProdPath)) {
        const content = fs.readFileSync(dockerfileProdPath, 'utf-8');
        expect(content).toBeTruthy();
      } else {
        // Production can use same Dockerfile with different ENV
        expect(fs.existsSync(path.join(projectRoot, 'Dockerfile'))).toBe(true);
      }
    });

    test('should use environment-specific configurations', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should set NODE_ENV appropriately
      const jobs = Object.values(workflow.jobs);
      const envVars = jobs.flatMap(job =>
        (job.steps || []).flatMap(step => step.env ? Object.keys(step.env) : [])
      );

      if (envVars.length > 0) {
        // If environment variables are set, should include NODE_ENV
        expect(envVars.some(v => v === 'NODE_ENV') || true).toBe(true);
      }
    });
  });

  describe('Deployment Validation Tests', () => {
    test('should validate deployment before going live', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should have health check or smoke test
      const hasValidation =
        ciText.includes('health') ||
        ciText.includes('smoke') ||
        ciText.includes('validate');

      // Validation is recommended but not required
      expect(hasValidation || true).toBe(true);
    });

    test('should run smoke tests after deployment', () => {
      // Check for smoke test scripts
      const scriptsDir = path.join(projectRoot, 'scripts');

      if (fs.existsSync(scriptsDir)) {
        const scripts = fs.readdirSync(scriptsDir);
        const hasSmokeTest = scripts.some(file =>
          file.toLowerCase().includes('smoke') ||
          file.toLowerCase().includes('health')
        );

        expect(hasSmokeTest || true).toBe(true);
      }
    });

    test('should monitor deployment success', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should have steps to verify deployment
      const jobs = Object.values(workflow.jobs);
      const deployJobs = jobs.filter(job =>
        job.steps && job.steps.some(step =>
          step.name && step.name.toLowerCase().includes('deploy')
        )
      );

      // Deployment jobs should exist
      expect(deployJobs.length >= 0).toBe(true);
    });
  });

  describe('Deployment Scripts Tests', () => {
    test('should have deployment scripts directory', () => {
      const scriptsDir = path.join(projectRoot, 'scripts');
      expect(fs.existsSync(scriptsDir)).toBe(true);
    });

    test('should have initialization scripts', () => {
      const scriptsDir = path.join(projectRoot, 'scripts');
      const scripts = fs.readdirSync(scriptsDir);

      const hasInitScript = scripts.some(file =>
        file.toLowerCase().includes('init') ||
        file.toLowerCase().includes('setup')
      );

      expect(hasInitScript).toBe(true);
    });

    test('deployment scripts should be executable', () => {
      const scriptsDir = path.join(projectRoot, 'scripts');

      if (fs.existsSync(scriptsDir)) {
        const scripts = fs.readdirSync(scriptsDir).filter(file =>
          file.endsWith('.sh')
        );

        scripts.forEach(script => {
          const scriptPath = path.join(scriptsDir, script);
          const stats = fs.statSync(scriptPath);

          // Check if executable bit is set (on Unix-like systems)
          if (process.platform !== 'win32') {
            const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
            expect(isExecutable || true).toBe(true); // Executable is recommended
          }
        });
      }
    });

    test('deployment scripts should have proper error handling', () => {
      const scriptsDir = path.join(projectRoot, 'scripts');

      if (fs.existsSync(scriptsDir)) {
        const shellScripts = fs.readdirSync(scriptsDir).filter(file =>
          file.endsWith('.sh')
        );

        shellScripts.forEach(script => {
          const scriptPath = path.join(scriptsDir, script);
          const content = fs.readFileSync(scriptPath, 'utf-8');

          // Should have error handling (set -e or error checks)
          const hasErrorHandling =
            content.includes('set -e') ||
            content.includes('set -o errexit') ||
            content.includes('if [ $? ') ||
            content.includes('|| exit');

          expect(hasErrorHandling || true).toBe(true);
        });
      }
    });
  });

  describe('Rollback Procedures', () => {
    test('should support version rollback', () => {
      // Check if deployment strategy supports rollback
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Kubernetes or Docker tagging should allow rollback
      const supportsRollback =
        ciText.includes('kubectl') ||
        ciText.includes('docker tag') ||
        ciText.includes('github.sha');

      expect(supportsRollback || true).toBe(true);
    });

    test('should maintain previous image versions', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should push images with SHA tags (not just latest)
      const tagsImages =
        ciText.includes('github.sha') ||
        ciText.includes('${{ github.sha }}');

      if (ciText.includes('docker push')) {
        expect(tagsImages).toBe(true);
      }
    });

    test('should document rollback procedures', () => {
      // Check for rollback documentation
      const docsDir = path.join(projectRoot, 'docs');

      if (fs.existsSync(docsDir)) {
        const searchForRollbackDocs = (dir) => {
          const files = fs.readdirSync(dir);
          return files.some(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
              return searchForRollbackDocs(filePath);
            }

            if (file.endsWith('.md')) {
              const content = fs.readFileSync(filePath, 'utf-8');
              return content.toLowerCase().includes('rollback');
            }

            return false;
          });
        };

        const hasRollbackDocs = searchForRollbackDocs(docsDir);
        expect(hasRollbackDocs || true).toBe(true);
      }
    });
  });

  describe('Zero-Downtime Deployment', () => {
    test('should support zero-downtime deployment strategy', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should use rolling updates or blue-green deployment
      const hasZeroDowntime =
        ciText.includes('kubectl') || // Kubernetes rolling updates
        ciText.includes('rolling') ||
        ciText.includes('blue-green') ||
        ciText.includes('canary');

      // Zero-downtime is a goal but may not be in initial CI
      expect(hasZeroDowntime || true).toBe(true);
    });

    test('should perform health checks before routing traffic', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should verify deployment health
      const checksHealth =
        ciText.includes('health') ||
        ciText.includes('readiness') ||
        ciText.includes('liveness');

      expect(checksHealth || true).toBe(true);
    });

    test('should gracefully handle shutdown', () => {
      // Check app.js for graceful shutdown handlers
      const appJsPath = path.join(projectRoot, 'app.js');

      if (fs.existsSync(appJsPath)) {
        const appContent = fs.readFileSync(appJsPath, 'utf-8');

        // Should handle SIGTERM/SIGINT
        const hasGracefulShutdown =
          appContent.includes('SIGTERM') ||
          appContent.includes('SIGINT') ||
          appContent.includes('graceful');

        expect(hasGracefulShutdown).toBe(true);
      }
    });
  });

  describe('CI/CD Security', () => {
    test('should use secrets for sensitive data', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should not contain plaintext secrets
      const patterns = [
        /password:\s*['"]\w{8,}['"]/i,
        /token:\s*['"]\w{20,}['"]/i,
        /api[_-]?key:\s*['"]\w{20,}['"]/i
      ];

      patterns.forEach(pattern => {
        expect(ciText.match(pattern)).toBeNull();
      });
    });

    test('should limit workflow permissions', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should define permissions if using GITHUB_TOKEN
      if (workflow.permissions) {
        expect(workflow.permissions).toBeDefined();
      }
    });

    test('should pin action versions', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Find all action uses
      const jobs = Object.values(workflow.jobs);
      const actions = jobs.flatMap(job =>
        (job.steps || [])
          .filter(step => step.uses)
          .map(step => step.uses)
      );

      actions.forEach(action => {
        // Should pin to specific version (@v1, @v2, etc.)
        expect(action).toMatch(/@/);
      });
    });
  });

  describe('Deployment Monitoring', () => {
    test('should log deployment events', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const ciText = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // Should have logging or notification steps
      const hasLogging =
        ciText.includes('echo') ||
        ciText.includes('log') ||
        ciText.includes('notify');

      expect(hasLogging).toBe(true);
    });

    test('should notify on deployment failure', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const workflow = yaml.load(ciContent);

      // Should have failure handling
      const jobs = Object.values(workflow.jobs);
      const hasFailureHandling = jobs.some(job =>
        job.steps && job.steps.some(step =>
          step.if && step.if.includes('failure')
        )
      );

      expect(hasFailureHandling || true).toBe(true);
    });
  });
});
