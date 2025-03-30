/**
 * SPV Asset Model Tests
 * Bug Fix: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to use robust MongoDB connection utilities with retry logic
 * Following Semantic Seed Venture Studio Coding Standards
 */
const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const SPVAsset = require('../models/SPVasset');
const mongoDbConnection = require('../utils/mongoDbConnection');

describe('SPVAsset Model', () => {
  beforeAll(async () => {
    // Use the improved MongoDB connection utility with retry logic
    await mongoDbConnection.connectWithRetry();
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoDbConnection.disconnect();
  });

  beforeEach(async () => {
    // Use MongoDB connection utility with retry logic
    await mongoDbConnection.withRetry(async () => {
      await SPVAsset.deleteMany({});
    });
  });

  // Direct validator function tests to improve branch coverage
  describe('Validator Functions', () => {
    it('should validate asset ID formats correctly', () => {
      const { isValidAssetID } = SPVAsset.validators;
      
      // Valid formats
      expect(isValidAssetID('ASSET-123')).toBe(true);
      expect(isValidAssetID('A1')).toBe(true);
      expect(isValidAssetID('123-ABC')).toBe(true);
      
      // Invalid formats
      expect(isValidAssetID('')).toBe(false);
      expect(isValidAssetID(null)).toBe(false);
      expect(isValidAssetID(undefined)).toBe(false);
      expect(isValidAssetID('Asset with spaces')).toBe(false);
      expect(isValidAssetID('Asset@Special#Chars')).toBe(false);
    });
    
    it('should validate numbers correctly', () => {
      const { isValidNumber } = SPVAsset.validators;
      
      // Valid numbers
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(1.5)).toBe(true);
      expect(isValidNumber(-10)).toBe(true);
      
      // Invalid numbers
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
      expect(isValidNumber('string')).toBe(false);
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
    });
    
    it('should validate positive numbers correctly', () => {
      const { isValidPositiveNumber } = SPVAsset.validators;
      
      // Valid positive numbers
      expect(isValidPositiveNumber(0)).toBe(true);
      expect(isValidPositiveNumber(1.5)).toBe(true);
      expect(isValidPositiveNumber(1000000)).toBe(true);
      
      // Invalid numbers
      expect(isValidPositiveNumber(-1)).toBe(false);
      expect(isValidPositiveNumber(null)).toBe(false);
      expect(isValidPositiveNumber(undefined)).toBe(false);
      expect(isValidPositiveNumber('string')).toBe(false);
      expect(isValidPositiveNumber(NaN)).toBe(false);
      expect(isValidPositiveNumber(Infinity)).toBe(false);
    });
    
    it('should validate dates correctly', () => {
      const { isValidDate } = SPVAsset.validators;
      
      // Valid dates
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2023-01-01'))).toBe(true);
      
      // Invalid dates
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate('2023-01-01')).toBe(false);
      expect(isValidDate(new Date('invalid-date'))).toBe(false);
    });
    
    it('should validate asset types correctly', () => {
      const { isValidType } = SPVAsset.validators;
      
      // Valid types
      expect(isValidType('Real Estate')).toBe(true);
      expect(isValidType('Financial Instrument')).toBe(true);
      
      // Invalid types
      expect(isValidType('')).toBe(false);
      expect(isValidType(null)).toBe(false);
      expect(isValidType(undefined)).toBe(false);
      expect(isValidType('Invalid Type')).toBe(false);
      expect(isValidType('real estate')).toBe(false); // case sensitive
    });
  });

  // Regular model tests
  it('should create an SPVAsset with valid fields', async () => {
    const assetData = {
      AssetID: 'ASSET-001',
      SPVID: 'SPV-001',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    // Use MongoDB connection utility with retry logic
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const asset = new SPVAsset(assetData);
      return await asset.save();
    });

    expect(savedAsset.AssetID).toBe(assetData.AssetID);
    expect(savedAsset.SPVID).toBe(assetData.SPVID);
    expect(savedAsset.Type).toBe(assetData.Type);
    expect(savedAsset.Value).toBe(assetData.Value);
    expect(savedAsset.Description).toBe(assetData.Description);
    expect(new Date(savedAsset.AcquisitionDate).toISOString()).toBe(assetData.AcquisitionDate.toISOString());
    
    // Verify createdAt and updatedAt timestamps are present
    expect(savedAsset.createdAt).toBeDefined();
    expect(savedAsset.updatedAt).toBeDefined();
  });

  it('should not create an SPVAsset without required fields', async () => {
    const assetData = {
      SPVID: 'SPV-001',
      Value: 1000000,
    };

    let error;
    try {
      await mongoDbConnection.withRetry(async () => {
        const asset = new SPVAsset(assetData);
        return await asset.save();
      });
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.AssetID).toBeTruthy();
    expect(error.errors.Type).toBeTruthy();
    expect(error.errors.Description).toBeTruthy();
    expect(error.errors.AcquisitionDate).toBeTruthy();
  });

  it('should enforce Type enum validation', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Invalid Type', // Not in enum
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    let error;
    try {
      await mongoDbConnection.withRetry(async () => {
        const asset = new SPVAsset(assetData);
        return await asset.save();
      });
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.Type).toBeTruthy();
  });

  it('should enforce Value as a number', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 'not-a-number', // Should be a number
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    let error;
    try {
      await mongoDbConnection.withRetry(async () => {
        const asset = new SPVAsset(assetData);
        return await asset.save();
      });
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.Value).toBeTruthy();
  });

  it('should not create an SPVAsset with negative Value', async () => {
    const assetData = {
      AssetID: 'ASSET-001',
      SPVID: 'SPV-001',
      Type: 'Real Estate',
      Value: -50000, // Negative value
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
      fail('Should throw validation error');
    } catch (error) {
      expect(error.errors.Value).toBeTruthy();
    }
  });

  it('should not create an SPVAsset with non-numeric Value', async () => {
    const assetData = {
      AssetID: 'ASSET-001',
      SPVID: 'SPV-001',
      Type: 'Real Estate',
      Value: 'NotANumber', // Non-numeric value
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
      fail('Should throw validation error');
    } catch (error) {
      expect(error.errors.Value).toBeTruthy();
    }
  });

  it('should not create an SPVAsset with invalid AssetID format', async () => {
    const assetData = {
      AssetID: 'invalid id with spaces', // Invalid format
      SPVID: 'SPV-001',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
      fail('Should throw validation error');
    } catch (error) {
      expect(error.errors.AssetID).toBeTruthy();
    }
  });

  it('should not create an SPVAsset with duplicate AssetID', async () => {
    // First asset
    const firstAsset = new SPVAsset({
      AssetID: 'ASSET-001',
      SPVID: 'SPV-001',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'First asset with this ID',
      AcquisitionDate: new Date(),
    });
    await firstAsset.save();

    // Second asset with same AssetID
    const duplicateAsset = {
      AssetID: 'ASSET-001', // Duplicate AssetID
      SPVID: 'SPV-002',
      Type: 'Financial Instrument',
      Value: 500000,
      Description: 'Second asset with same ID',
      AcquisitionDate: new Date(),
    };

    try {
      const asset = new SPVAsset(duplicateAsset);
      await asset.save();
      fail('Should throw duplicate key error');
    } catch (error) {
      expect(error.code).toBe(11000); // MongoDB duplicate key error code
    }
  });

  it('should be able to query SPVAssets by Type and SPVID', async () => {
    // Create multiple assets
    await SPVAsset.create([
      {
        AssetID: 'ASSET-001',
        SPVID: 'SPV-001',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-002',
        SPVID: 'SPV-001',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-003',
        SPVID: 'SPV-002',
        Type: 'Real Estate',
        Value: 2000000,
        Description: 'Apartment complex',
        AcquisitionDate: new Date(),
      }
    ]);

    // Query by Type
    const realEstateAssets = await SPVAsset.find({ Type: 'Real Estate' });
    expect(realEstateAssets).toHaveLength(2);

    // Query by SPVID
    const spv001Assets = await SPVAsset.find({ SPVID: 'SPV-001' });
    expect(spv001Assets).toHaveLength(2);

    // Query by Type and SPVID
    const spv001RealEstate = await SPVAsset.find({ 
      SPVID: 'SPV-001', 
      Type: 'Real Estate' 
    });
    expect(spv001RealEstate).toHaveLength(1);
  });

  it('should convert AssetID and SPVID to uppercase', async () => {
    const assetData = {
      AssetID: 'asset-lowercase',
      SPVID: 'spv-lowercase',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Asset with lowercase IDs',
      AcquisitionDate: new Date(),
    };

    const asset = new SPVAsset(assetData);
    const savedAsset = await asset.save();

    // Check that IDs were converted to uppercase
    expect(savedAsset.AssetID).toBe('ASSET-LOWERCASE');
    expect(savedAsset.SPVID).toBe('SPV-LOWERCASE');
  });

  it('should trim whitespace from AssetID and SPVID', async () => {
    const assetData = {
      AssetID: '  ASSET-WHITESPACE  ',
      SPVID: '  SPV-WHITESPACE  ',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Asset with whitespace in IDs',
      AcquisitionDate: new Date(),
    };

    const asset = new SPVAsset(assetData);
    const savedAsset = await asset.save();

    // Check that whitespace was trimmed
    expect(savedAsset.AssetID).toBe('ASSET-WHITESPACE');
    expect(savedAsset.SPVID).toBe('SPV-WHITESPACE');
  });

  it('should not create an SPVAsset with invalid AcquisitionDate', async () => {
    const assetData = {
      AssetID: 'ASSET-DATE',
      SPVID: 'SPV-DATE',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Asset with invalid date',
      AcquisitionDate: 'not-a-date', // Invalid date
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
      fail('Should throw validation error');
    } catch (error) {
      expect(error.errors.AcquisitionDate).toBeTruthy();
    }
  });

  it('should not create an SPVAsset with description exceeding max length', async () => {
    // Create a description that exceeds the 500 character limit
    let longDescription = '';
    for (let i = 0; i < 51; i++) {
      longDescription += 'This description is too long. '; // 10 words x 51 = 510 chars
    }

    const assetData = {
      AssetID: 'ASSET-LONG-DESC',
      SPVID: 'SPV-LONG-DESC',
      Type: 'Real Estate',
      Value: 1000000,
      Description: longDescription,
      AcquisitionDate: new Date(),
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
      fail('Should throw validation error');
    } catch (error) {
      expect(error.errors.Description).toBeTruthy();
    }
  });

  it('should allow creating multiple assets with same SPVID but different AssetIDs', async () => {
    // Create first asset
    const firstAsset = await SPVAsset.create({
      AssetID: 'ASSET-SAME-SPV-1',
      SPVID: 'SPV-MULTI-ASSETS',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'First asset with same SPV',
      AcquisitionDate: new Date(),
    });

    // Create second asset with same SPVID
    const secondAsset = await SPVAsset.create({
      AssetID: 'ASSET-SAME-SPV-2',
      SPVID: 'SPV-MULTI-ASSETS',
      Type: 'Financial Instrument',
      Value: 500000,
      Description: 'Second asset with same SPV',
      AcquisitionDate: new Date(),
    });

    // Query for all assets with this SPVID
    const assets = await SPVAsset.find({ SPVID: 'SPV-MULTI-ASSETS' });
    expect(assets).toHaveLength(2);
    
    // Verify different asset types were saved
    const types = assets.map(a => a.Type);
    expect(types).toContain('Real Estate');
    expect(types).toContain('Financial Instrument');
  });

  it('should format asset for API response using toApiResponse method', async () => {
    const assetData = {
      AssetID: 'ASSET-API-RESPONSE',
      SPVID: 'SPV-API-RESPONSE',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Asset for API response test',
      AcquisitionDate: new Date(),
    };

    const asset = new SPVAsset(assetData);
    const savedAsset = await asset.save();
    
    // Call the instance method
    const apiResponse = savedAsset.toApiResponse();
    
    // Verify the API response format
    expect(apiResponse).toEqual({
      id: savedAsset._id,
      assetId: 'ASSET-API-RESPONSE',
      spvId: 'SPV-API-RESPONSE',
      type: 'Real Estate',
      value: 1000000,
      description: 'Asset for API response test',
      acquisitionDate: savedAsset.AcquisitionDate
    });
  });

  it('should calculate current value using calculateCurrentValue method', async () => {
    const assetData = {
      AssetID: 'ASSET-CALC-VALUE',
      SPVID: 'SPV-CALC-VALUE',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Asset for value calculation test',
      AcquisitionDate: new Date(),
    };

    const asset = new SPVAsset(assetData);
    const savedAsset = await asset.save();
    
    // Call the instance method
    const currentValue = savedAsset.calculateCurrentValue();
    
    // Verify the calculated value
    expect(currentValue).toBe(1000000);
  });

  it('should find assets by SPVID using static method', async () => {
    // Create test assets
    await SPVAsset.create([
      {
        AssetID: 'ASSET-STATIC-1',
        SPVID: 'SPV-STATIC-TEST',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'First asset for static method test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-STATIC-2',
        SPVID: 'SPV-STATIC-TEST',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Second asset for static method test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-STATIC-3',
        SPVID: 'SPV-OTHER',
        Type: 'Real Estate',
        Value: 750000,
        Description: 'Asset with different SPVID',
        AcquisitionDate: new Date(),
      }
    ]);
    
    // Call the static method
    const assets = await SPVAsset.findBySPVID('SPV-STATIC-TEST');
    
    // Verify results
    expect(assets).toHaveLength(2);
    expect(assets[0].SPVID).toBe('SPV-STATIC-TEST');
    expect(assets[1].SPVID).toBe('SPV-STATIC-TEST');
  });

  it('should find assets by Type using static method', async () => {
    // Create test assets for this specific test to ensure we have control over the data
    await SPVAsset.create([
      {
        AssetID: 'ASSET-TYPE-1',
        SPVID: 'SPV-TYPE-TEST',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'First asset for type test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-TYPE-2',
        SPVID: 'SPV-TYPE-TEST',
        Type: 'Real Estate',
        Value: 500000,
        Description: 'Second asset for type test',
        AcquisitionDate: new Date(),
      }
    ]);
    
    // Call the static method
    const realEstateAssets = await SPVAsset.findByType('Real Estate');
    
    // Verify there are at least 2 real estate assets
    expect(realEstateAssets.length).toBeGreaterThanOrEqual(2);
    
    // Verify all returned assets are Real Estate type
    realEstateAssets.forEach(asset => {
      expect(asset.Type).toBe('Real Estate');
    });
  });

  it('should calculate total value by SPVID using static method', async () => {
    // Create test assets with known values
    await SPVAsset.create([
      {
        AssetID: 'ASSET-TOTAL-1',
        SPVID: 'SPV-TOTAL-TEST',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'First asset for total value test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-TOTAL-2',
        SPVID: 'SPV-TOTAL-TEST',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Second asset for total value test',
        AcquisitionDate: new Date(),
      }
    ]);
    
    // Call the static method
    const totalValue = await SPVAsset.getTotalValueBySPVID('SPV-TOTAL-TEST');
    
    // Verify the total value (1000000 + 500000 = 1500000)
    expect(totalValue).toBe(1500000);
  });

  it('should handle lowercase SPVID in static methods', async () => {
    // Create specific test assets with an uppercase SPVID
    const testSPVID = 'SPV-CASE-TEST';
    await SPVAsset.create([
      {
        AssetID: 'ASSET-CASE-1',
        SPVID: testSPVID,
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'First asset for case sensitivity test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-CASE-2',
        SPVID: testSPVID,
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Second asset for case sensitivity test',
        AcquisitionDate: new Date(),
      }
    ]);
    
    // Call the static method with lowercase SPVID
    const assets = await SPVAsset.findBySPVID(testSPVID.toLowerCase());
    
    // Verify it found the assets despite the case difference
    expect(assets).toHaveLength(2);
    expect(assets[0].SPVID).toBe(testSPVID);
    expect(assets[1].SPVID).toBe(testSPVID);
  });

  // Tests for edge cases in static methods
  it('should return empty array for findBySPVID with null/undefined SPVID', async () => {
    const nullResult = await SPVAsset.findBySPVID(null);
    const undefinedResult = await SPVAsset.findBySPVID(undefined);
    
    expect(nullResult).toEqual([]);
    expect(undefinedResult).toEqual([]);
  });
  
  it('should return empty array for findByType with invalid type', async () => {
    const result = await SPVAsset.findByType('InvalidType');
    expect(result).toEqual([]);
  });
  
  it('should return 0 for getTotalValueBySPVID with null/undefined SPVID', async () => {
    const nullResult = await SPVAsset.getTotalValueBySPVID(null);
    const undefinedResult = await SPVAsset.getTotalValueBySPVID(undefined);
    
    expect(nullResult).toBe(0);
    expect(undefinedResult).toBe(0);
  });
  
  it('should return the list of valid asset types', () => {
    const validTypes = SPVAsset.getValidTypes();
    expect(validTypes).toEqual(['Real Estate', 'Financial Instrument']);
    expect(validTypes).toEqual(expect.arrayContaining(['Real Estate', 'Financial Instrument']));
  });
  
  it('should find assets by filters', async () => {
    // Create test assets with different properties
    await SPVAsset.create([
      {
        AssetID: 'ASSET-FILTER-1',
        SPVID: 'SPV-FILTER-TEST',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'First asset for filter test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-FILTER-2',
        SPVID: 'SPV-FILTER-TEST',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Second asset for filter test',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'ASSET-FILTER-3',
        SPVID: 'SPV-OTHER-FILTER',
        Type: 'Real Estate',
        Value: 2000000,
        Description: 'High value asset',
        AcquisitionDate: new Date(),
      }
    ]);
    
    // Test with SPVID filter
    const spvResults = await SPVAsset.findByFilters({ spvId: 'SPV-FILTER-TEST' });
    expect(spvResults).toHaveLength(2);
    
    // Test with type filter
    const typeResults = await SPVAsset.findByFilters({ type: 'Real Estate' });
    expect(typeResults.length).toBeGreaterThanOrEqual(2);
    
    // Test with value range filter
    const valueResults = await SPVAsset.findByFilters({ minValue: 750000 });
    expect(valueResults.length).toBeGreaterThanOrEqual(2);
    
    // Test with combined filters
    const combinedResults = await SPVAsset.findByFilters({
      spvId: 'SPV-FILTER-TEST',
      type: 'Financial Instrument'
    });
    expect(combinedResults).toHaveLength(1);
    expect(combinedResults[0].AssetID).toBe('ASSET-FILTER-2');
    
    // Test with min and max value
    const rangeResults = await SPVAsset.findByFilters({
      minValue: 400000,
      maxValue: 1500000
    });
    expect(rangeResults.length).toBeGreaterThanOrEqual(2);
    
    // Test with invalid filters (should ignore them)
    const invalidTypeResults = await SPVAsset.findByFilters({ type: 'InvalidType' });
    expect(invalidTypeResults).toHaveLength(0);
    
    // Test with empty filters (should return all)
    const emptyResults = await SPVAsset.findByFilters({});
    expect(emptyResults.length).toBeGreaterThan(0);
  });
});
