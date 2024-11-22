// __tests__/setup/testData.js

const mongoose = require('mongoose');

const testData = {
  basic: {
    SPVID: 'SPV-TEST-001',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'Test User',
    Timestamp: new Date('2024-01-01'),
    Details: 'Test compliance check'
  },
  
  // Data for different scenarios
  withInvalidTimestamp: {
    SPVID: 'SPV-TEST-002',
    RegulationType: 'HIPAA',
    Status: 'Non-Compliant',
    LastCheckedBy: 'Test User',
    Timestamp: new Date('2025-01-01'), // Future date
    Details: 'Test invalid timestamp'
  },
  
  withLowerCaseRegType: {
    SPVID: 'SPV-TEST-003',
    RegulationType: 'gdpr',
    Status: 'Compliant',
    LastCheckedBy: 'Test User',
    Timestamp: new Date(),
    Details: 'Test lowercase regulation type'
  },
  
  nonCompliant: {
    SPVID: 'SPV-TEST-004',
    RegulationType: 'SOX',
    Status: 'Non-Compliant',
    LastCheckedBy: 'Test User',
    Timestamp: new Date(),
    Details: 'Test non-compliant check'
  },
  
  invalidSPVID: {
    SPVID: 'invalid_spvid',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'Test User',
    Timestamp: new Date(),
    Details: 'Test invalid SPVID format'
  }
};

module.exports = testData;