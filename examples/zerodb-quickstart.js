/**
 * ZeroDB Quick Start Example
 *
 * This file demonstrates the basic usage of ZeroDB in OpenCap Stack.
 * It covers:
 * - Initializing the ZeroDB service
 * - Creating tables
 * - Inserting data
 * - Querying data
 * - Updating records
 * - Basic error handling
 *
 * Usage:
 * 1. Ensure your .env file is configured with ZERODB_API_KEY and ZERODB_PROJECT_ID
 * 2. Run: node examples/zerodb-quickstart.js
 */

require('dotenv').config();
const zerodbService = require('../services/zerodbService');

/**
 * Main function demonstrating ZeroDB operations
 */
async function main() {
  console.log('==========================================');
  console.log('ZeroDB Quick Start Example');
  console.log('==========================================\n');

  try {
    // Step 1: Initialize the ZeroDB service
    console.log('Step 1: Initializing ZeroDB service...');
    await zerodbService.initialize();
    console.log('✓ ZeroDB service initialized\n');

    // Step 2: Check database status
    console.log('Step 2: Checking database status...');
    const status = await zerodbService.getDatabaseStatus();
    console.log('✓ Database status:', JSON.stringify(status, null, 2), '\n');

    // Step 3: Create a sample table
    console.log('Step 3: Creating sample companies table...');

    const companySchema = {
      id: 'string',
      name: 'string',
      type: 'string',
      founded_date: 'string',
      valuation: 'number',
      status: 'string',
      created_at: 'string',
      updated_at: 'string'
    };

    try {
      await zerodbService.createTable('companies_demo', companySchema);
      console.log('✓ Table created successfully\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✓ Table already exists, continuing...\n');
      } else {
        throw err;
      }
    }

    // Step 4: Insert sample data
    console.log('Step 4: Inserting sample companies...');

    const sampleCompanies = [
      {
        id: `company_${Date.now()}_1`,
        name: 'Acme Corporation',
        type: 'C-Corp',
        founded_date: '2020-01-15',
        valuation: 5000000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `company_${Date.now()}_2`,
        name: 'Tech Innovations LLC',
        type: 'LLC',
        founded_date: '2021-03-20',
        valuation: 2500000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `company_${Date.now()}_3`,
        name: 'Global Ventures Inc',
        type: 'C-Corp',
        founded_date: '2019-11-05',
        valuation: 10000000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const company of sampleCompanies) {
      await zerodbService.insertRow('companies_demo', company);
      console.log(`✓ Inserted: ${company.name}`);
    }
    console.log('\n');

    // Step 5: Query all companies
    console.log('Step 5: Querying all companies...');
    const allCompanies = await zerodbService.queryTable('companies_demo', {});
    console.log(`✓ Found ${allCompanies.length} companies:\n`);

    allCompanies.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} (${company.type}) - Valuation: $${company.valuation.toLocaleString()}`);
    });
    console.log('\n');

    // Step 6: Query with filter
    console.log('Step 6: Querying C-Corp companies only...');
    const cCorps = await zerodbService.queryTable('companies_demo', {
      type: 'C-Corp'
    });
    console.log(`✓ Found ${cCorps.length} C-Corp companies:\n`);

    cCorps.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} - Valuation: $${company.valuation.toLocaleString()}`);
    });
    console.log('\n');

    // Step 7: Update a record
    console.log('Step 7: Updating company valuation...');
    const companyToUpdate = allCompanies[0];

    await zerodbService.updateRows('companies_demo', {
      id: companyToUpdate.id
    }, {
      valuation: companyToUpdate.valuation * 1.5,
      updated_at: new Date().toISOString()
    });

    console.log(`✓ Updated ${companyToUpdate.name} valuation to $${(companyToUpdate.valuation * 1.5).toLocaleString()}\n`);

    // Step 8: Verify update
    console.log('Step 8: Verifying update...');
    const updatedCompany = await zerodbService.queryTable('companies_demo', {
      id: companyToUpdate.id
    });

    if (updatedCompany && updatedCompany.length > 0) {
      console.log(`✓ Verified: ${updatedCompany[0].name} now has valuation of $${updatedCompany[0].valuation.toLocaleString()}\n`);
    }

    // Step 9: Clean up (optional - comment out to keep data)
    console.log('Step 9: Cleaning up demo data...');
    for (const company of allCompanies) {
      await zerodbService.deleteRows('companies_demo', {
        id: company.id
      });
    }
    console.log('✓ Demo data cleaned up\n');

    console.log('==========================================');
    console.log('Quick Start Example Completed Successfully!');
    console.log('==========================================\n');

    console.log('Next Steps:');
    console.log('- Try modifying the queries in Step 6');
    console.log('- Explore vector search: examples/vector-search.js');
    console.log('- Learn about sync: examples/sync-setup.js');
    console.log('- Check common queries: examples/common-queries.js');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);

    // Troubleshooting tips
    console.log('\nTroubleshooting:');
    console.log('1. Verify ZERODB_API_KEY is set in .env');
    console.log('2. Verify ZERODB_PROJECT_ID is set in .env');
    console.log('3. Check your internet connection');
    console.log('4. Ensure your API token has proper permissions');
    console.log('5. See docs/troubleshooting.md for more help');

    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
