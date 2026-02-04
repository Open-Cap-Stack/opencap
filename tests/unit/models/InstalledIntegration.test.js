/**
 * InstalledIntegration Model Unit Tests
 * Issue #202: Build Integration Marketplace Backend
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');
const InstalledIntegration = require('../../../models/InstalledIntegration');

describe('InstalledIntegration Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid installed integration', () => {
      const validData = {
        companyId: 'company123',
        integrationId: 'INT-001',
        installedBy: 'user123'
      };

      const installation = new InstalledIntegration(validData);
      const error = installation.validateSync();

      expect(error).toBeUndefined();
      expect(installation.companyId).toBe('company123');
      expect(installation.integrationId).toBe('INT-001');
    });

    it('should require companyId field', () => {
      const installation = new InstalledIntegration({
        integrationId: 'INT-001',
        installedBy: 'user123'
      });

      const error = installation.validateSync();
      expect(error.errors.companyId).toBeDefined();
    });

    it('should require integrationId field', () => {
      const installation = new InstalledIntegration({
        companyId: 'company123',
        installedBy: 'user123'
      });

      const error = installation.validateSync();
      expect(error.errors.integrationId).toBeDefined();
    });

    it('should require installedBy field', () => {
      const installation = new InstalledIntegration({
        companyId: 'company123',
        integrationId: 'INT-001'
      });

      const error = installation.validateSync();
      expect(error.errors.installedBy).toBeDefined();
    });

    it('should default status to pending', () => {
      const installation = new InstalledIntegration({
        companyId: 'company123',
        integrationId: 'INT-001',
        installedBy: 'user123'
      });

      expect(installation.status).toBe('pending');
    });
  });

  describe('Virtuals', () => {
    it('should compute isOperational as true for active status', () => {
      const installation = new InstalledIntegration({
        companyId: 'company123',
        integrationId: 'INT-001',
        installedBy: 'user123',
        status: 'active',
        lastConnectionTest: { success: true }
      });

      expect(installation.isOperational).toBe(true);
    });

    it('should compute isOperational as false for error status', () => {
      const installation = new InstalledIntegration({
        companyId: 'company123',
        integrationId: 'INT-001',
        installedBy: 'user123',
        status: 'error'
      });

      expect(installation.isOperational).toBe(false);
    });

    it('should compute daysSinceInstallation', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const installation = new InstalledIntegration({
        companyId: 'company123',
        integrationId: 'INT-001',
        installedBy: 'user123',
        installedAt: threeDaysAgo
      });

      expect(installation.daysSinceInstallation).toBe(3);
    });
  });

  describe('toJSON', () => {
    it('should include virtuals in JSON output', () => {
      const installation = new InstalledIntegration({
        companyId: 'company123',
        integrationId: 'INT-001',
        installedBy: 'user123',
        status: 'active'
      });

      const json = installation.toJSON();
      expect(json.isOperational).toBe(true);
      expect(json.daysSinceInstallation).toBeDefined();
    });
  });
});
