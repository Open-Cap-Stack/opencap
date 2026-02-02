/**
 * Common ZeroDB Queries Example
 *
 * This file demonstrates common query patterns and best practices
 * for working with ZeroDB in OpenCap Stack.
 *
 * Queries covered:
 * - Simple filters
 * - Complex filters with AND/OR
 * - Sorting and pagination
 * - Counting records
 * - Batch operations
 * - Aggregations
 * - Joins (via multiple queries)
 *
 * Usage:
 * node examples/common-queries.js
 */

require('dotenv').config();
const zerodbService = require('../services/zerodbService');

/**
 * Example 1: Simple Filters
 */
async function simpleFilters() {
  console.log('\n=== Example 1: Simple Filters ===\n');

  // Find all C-Corps
  const cCorps = await zerodbService.queryTable('companies', {
    type: 'C-Corp'
  });
  console.log(`Found ${cCorps.length} C-Corps`);

  // Find active companies
  const activeCompanies = await zerodbService.queryTable('companies', {
    status: 'active'
  });
  console.log(`Found ${activeCompanies.length} active companies`);

  // Find by ID
  const company = await zerodbService.queryTable('companies', {
    id: 'company-123'
  });
  console.log(`Found company:`, company[0]?.name || 'Not found');
}

/**
 * Example 2: Complex Filters (AND/OR)
 */
async function complexFilters() {
  console.log('\n=== Example 2: Complex Filters ===\n');

  // AND condition - active C-Corps
  const activeCCorps = await zerodbService.queryTable('companies', {
    type: 'C-Corp',
    status: 'active'
  });
  console.log(`Found ${activeCCorps.length} active C-Corps`);

  // Range query - high valuation companies
  const highValueCompanies = await zerodbService.queryTable('companies', {
    valuation: { $gte: 5000000 } // >= 5M
  });
  console.log(`Found ${highValueCompanies.length} high-value companies`);

  // Date range - recently founded
  const recentCompanies = await zerodbService.queryTable('companies', {
    founded_date: {
      $gte: '2020-01-01',
      $lte: '2023-12-31'
    }
  });
  console.log(`Found ${recentCompanies.length} companies founded 2020-2023`);
}

/**
 * Example 3: Sorting and Pagination
 */
async function sortingAndPagination() {
  console.log('\n=== Example 3: Sorting and Pagination ===\n');

  // Sort by valuation (descending)
  const topCompanies = await zerodbService.queryTable('companies', {
    filter: { status: 'active' },
    sort: 'valuation',
    order: 'desc',
    limit: 10
  });
  console.log('Top 10 companies by valuation:');
  topCompanies.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name}: $${c.valuation.toLocaleString()}`);
  });

  // Pagination - page 2
  const page2 = await zerodbService.queryTable('companies', {
    limit: 20,
    offset: 20  // Skip first 20
  });
  console.log(`\nPage 2: ${page2.length} companies`);

  // Get total count
  const allCompanies = await zerodbService.queryTable('companies', {});
  console.log(`Total companies: ${allCompanies.length}`);
}

/**
 * Example 4: Batch Operations
 */
async function batchOperations() {
  console.log('\n=== Example 4: Batch Operations ===\n');

  // Batch insert
  const newCompanies = [
    {
      id: `company_${Date.now()}_1`,
      name: 'Batch Company 1',
      type: 'LLC',
      status: 'active',
      valuation: 1000000,
      created_at: new Date().toISOString()
    },
    {
      id: `company_${Date.now()}_2`,
      name: 'Batch Company 2',
      type: 'C-Corp',
      status: 'active',
      valuation: 2000000,
      created_at: new Date().toISOString()
    }
  ];

  console.log('Inserting batch of companies...');
  await Promise.all(
    newCompanies.map(company =>
      zerodbService.insertRow('companies', company)
    )
  );
  console.log(`✓ Inserted ${newCompanies.length} companies`);

  // Batch update
  console.log('\nUpdating multiple companies...');
  const companiesToUpdate = await zerodbService.queryTable('companies', {
    type: 'LLC'
  });

  await Promise.all(
    companiesToUpdate.map(company =>
      zerodbService.updateRows('companies', {
        id: company.id
      }, {
        updated_at: new Date().toISOString()
      })
    )
  );
  console.log(`✓ Updated ${companiesToUpdate.length} LLC companies`);
}

/**
 * Example 5: Aggregations
 */
async function aggregations() {
  console.log('\n=== Example 5: Aggregations ===\n');

  // Get all companies
  const allCompanies = await zerodbService.queryTable('companies', {});

  // Group by type
  const byType = allCompanies.reduce((acc, company) => {
    acc[company.type] = (acc[company.type] || 0) + 1;
    return acc;
  }, {});
  console.log('Companies by type:', byType);

  // Total valuation
  const totalValuation = allCompanies.reduce((sum, company) => {
    return sum + (company.valuation || 0);
  }, 0);
  console.log(`\nTotal valuation: $${totalValuation.toLocaleString()}`);

  // Average valuation
  const avgValuation = totalValuation / allCompanies.length;
  console.log(`Average valuation: $${avgValuation.toLocaleString()}`);

  // Count by status
  const byStatus = allCompanies.reduce((acc, company) => {
    acc[company.status] = (acc[company.status] || 0) + 1;
    return acc;
  }, {});
  console.log('\nCompanies by status:', byStatus);
}

/**
 * Example 6: Joins (Via Multiple Queries)
 */
async function joinsViaQueries() {
  console.log('\n=== Example 6: Joins (Multiple Queries) ===\n');

  // Get companies
  const companies = await zerodbService.queryTable('companies', {
    status: 'active'
  });

  console.log(`Found ${companies.length} active companies`);

  // For each company, get stakeholders
  for (const company of companies.slice(0, 3)) { // First 3 for demo
    const stakeholders = await zerodbService.queryTable('stakeholders', {
      company_id: company.id
    });

    console.log(`\n${company.name}:`);
    console.log(`  Stakeholders: ${stakeholders.length}`);

    if (stakeholders.length > 0) {
      stakeholders.forEach(s => {
        console.log(`    - ${s.name} (${s.type})`);
      });
    }
  }
}

/**
 * Example 7: Search Queries
 */
async function searchQueries() {
  console.log('\n=== Example 7: Search Queries ===\n');

  // Case-insensitive name search
  const searchTerm = 'tech';
  const allCompanies = await zerodbService.queryTable('companies', {});

  const results = allCompanies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log(`Search results for "${searchTerm}": ${results.length} companies`);
  results.forEach(c => console.log(`  - ${c.name}`));

  // Multi-field search
  const multiFieldResults = allCompanies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.description && company.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  console.log(`\nMulti-field search: ${multiFieldResults.length} companies`);
}

/**
 * Example 8: Performance Optimized Queries
 */
async function performanceOptimizedQueries() {
  console.log('\n=== Example 8: Performance Optimized Queries ===\n');

  // Use pagination for large datasets
  console.log('Using pagination for large result sets:');

  let offset = 0;
  const limit = 50;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const batch = await zerodbService.queryTable('companies', {
      limit,
      offset
    });

    console.log(`  Page ${page}: ${batch.length} records`);

    if (batch.length < limit) {
      hasMore = false;
    }

    offset += limit;
    page++;

    // Break after 3 pages for demo
    if (page > 3) break;
  }

  // Use projection to fetch only needed fields
  console.log('\nUsing field projection:');
  const companyNames = await zerodbService.queryTable('companies', {
    projection: ['id', 'name', 'type'] // Only fetch these fields
  });
  console.log(`Fetched ${companyNames.length} companies (limited fields)`);

  // Cache frequently accessed data
  console.log('\nCaching example:');
  const cache = new Map();

  async function getCachedCompany(id) {
    if (cache.has(id)) {
      console.log(`  Cache hit for ${id}`);
      return cache.get(id);
    }

    console.log(`  Cache miss for ${id}, fetching...`);
    const company = await zerodbService.queryTable('companies', {
      id
    });

    if (company[0]) {
      cache.set(id, company[0]);
    }

    return company[0];
  }

  // Test cache
  await getCachedCompany('company-123');
  await getCachedCompany('company-123'); // Should hit cache
}

/**
 * Main function
 */
async function main() {
  console.log('==========================================');
  console.log('Common ZeroDB Queries Examples');
  console.log('==========================================');

  try {
    // Initialize service
    await zerodbService.initialize();
    console.log('✓ ZeroDB service initialized\n');

    // Run examples
    await simpleFilters();
    await complexFilters();
    await sortingAndPagination();
    await batchOperations();
    await aggregations();
    await joinsViaQueries();
    await searchQueries();
    await performanceOptimizedQueries();

    console.log('\n==========================================');
    console.log('All Examples Completed Successfully!');
    console.log('==========================================\n');

    console.log('Next Steps:');
    console.log('- Explore vector search for semantic queries');
    console.log('- Try the sync setup examples');
    console.log('- Read docs/performance-tuning.md for optimization tips');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);

    console.log('\nTroubleshooting:');
    console.log('1. Verify ZERODB_API_KEY is set in .env');
    console.log('2. Verify ZERODB_PROJECT_ID is set in .env');
    console.log('3. Ensure tables exist (run npm run zerodb:init)');
    console.log('4. Check network connectivity');
    console.log('5. See docs/troubleshooting.md for more help');

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  simpleFilters,
  complexFilters,
  sortingAndPagination,
  batchOperations,
  aggregations,
  joinsViaQueries,
  searchQueries,
  performanceOptimizedQueries
};
