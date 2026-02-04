#!/usr/bin/env node
/**
 * Fix Document Ownership Migration Script
 *
 * Updates existing documents to have proper access control fields:
 * - uploadedBy: Sets the owner userId
 * - accessLevel: Sets to 'private' so only owner can access
 *
 * Usage:
 *   node scripts/fix-document-ownership.js <userId-or-email> [--dry-run]
 *
 * Example:
 *   node scripts/fix-document-ownership.js abc123-user-id-here
 *   node scripts/fix-document-ownership.js juweriya@ainative.studio
 *   node scripts/fix-document-ownership.js abc123-user-id-here --dry-run
 */

require('dotenv').config();
const axios = require('axios');

const ZERODB_BASE_URL = process.env.ZERODB_BASE_URL?.startsWith('http')
    ? process.env.ZERODB_BASE_URL
    : `https://${process.env.ZERODB_BASE_URL || 'api.ainative.studio'}`;
const ZERODB_PROJECT_ID = process.env.ZERODB_PROJECT_ID;
const ZERODB_API_KEY = process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY;

const client = axios.create({
    baseURL: ZERODB_BASE_URL,
    headers: {
        'Authorization': `Bearer ${ZERODB_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

async function queryDocuments() {
    const response = await client.post(
        `/v1/public/zerodb/${ZERODB_PROJECT_ID}/database/tables/documents/query`,
        { filter: {}, limit: 1000 }
    );
    return response.data.data || [];
}

async function updateDocument(rowId, existingRowData, updateData) {
    // Merge existing data with updates
    const newRowData = { ...existingRowData, ...updateData };
    const response = await client.put(
        `/v1/public/zerodb/${ZERODB_PROJECT_ID}/database/tables/documents/rows/${rowId}`,
        { row_data: newRowData }
    );
    return response.data;
}

async function queryUsers() {
    try {
        const response = await client.post(
            `/v1/public/zerodb/${ZERODB_PROJECT_ID}/database/tables/users/query`,
            { filter: {}, limit: 100 }
        );
        return response.data.data || [];
    } catch (error) {
        if (error.response?.status === 404) {
            return []; // Users table doesn't exist yet
        }
        throw error;
    }
}

async function findUserByEmail(email) {
    const users = await queryUsers();
    for (const user of users) {
        const userData = user.row_data || {};
        if (userData.email === email) {
            return userData;
        }
    }
    return null;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    let userIdOrEmail = args.find(arg => !arg.startsWith('--'));

    if (!userIdOrEmail) {
        console.error('Usage: node scripts/fix-document-ownership.js <userId-or-email> [--dry-run]');
        console.error('');
        console.error('Examples:');
        console.error('  node scripts/fix-document-ownership.js user_abc123');
        console.error('  node scripts/fix-document-ownership.js juweriya@ainative.studio');
        process.exit(1);
    }

    let userId = userIdOrEmail;

    // If input looks like an email, try to look up the user
    if (userIdOrEmail.includes('@')) {
        console.log(`Looking up user by email: ${userIdOrEmail}`);
        const user = await findUserByEmail(userIdOrEmail);
        if (user) {
            userId = user.userId;
            console.log(`Found user: ${user.displayName || user.email} (${userId})`);
        } else {
            console.error(`User not found with email: ${userIdOrEmail}`);
            console.error('');
            console.error('The user must log in at least once via AINative auth to be provisioned.');
            console.error('After they log in, run this script again.');
            process.exit(1);
        }
    }

    console.log('========================================');
    console.log('Document Ownership Migration Script');
    console.log('========================================');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update documents)'}`);
    console.log(`Owner userId: ${userId}`);
    console.log(`Access Level: private`);
    console.log('');

    try {
        // Query all documents
        console.log('Querying existing documents...');
        const documents = await queryDocuments();
        console.log(`Found ${documents.length} documents`);
        console.log('');

        if (documents.length === 0) {
            console.log('No documents to update.');
            return;
        }

        // Analyze documents
        const needsUpdate = [];
        const alreadyOk = [];

        for (const doc of documents) {
            const rowData = doc.row_data || {};
            const hasOwner = rowData.uploadedBy;
            const hasAccessLevel = rowData.accessLevel;

            if (!hasOwner || !hasAccessLevel) {
                needsUpdate.push({
                    rowId: doc.row_id,
                    rowData: rowData,
                    id: rowData.id || rowData._id,
                    name: rowData.name || rowData.title || rowData.fileName || 'Unnamed',
                    currentOwner: rowData.uploadedBy || 'NOT SET',
                    currentAccessLevel: rowData.accessLevel || 'NOT SET'
                });
            } else {
                alreadyOk.push({
                    id: rowData.id,
                    name: rowData.name || rowData.title || 'Unnamed',
                    owner: rowData.uploadedBy,
                    accessLevel: rowData.accessLevel
                });
            }
        }

        console.log('Analysis:');
        console.log(`  - Documents needing update: ${needsUpdate.length}`);
        console.log(`  - Documents already OK: ${alreadyOk.length}`);
        console.log('');

        if (needsUpdate.length === 0) {
            console.log('All documents already have proper ownership. No updates needed.');
            return;
        }

        console.log('Documents to update:');
        needsUpdate.forEach((doc, i) => {
            console.log(`  ${i + 1}. ${doc.name}`);
            console.log(`     ID: ${doc.id}`);
            console.log(`     Current owner: ${doc.currentOwner}`);
            console.log(`     Current accessLevel: ${doc.currentAccessLevel}`);
        });
        console.log('');

        if (dryRun) {
            console.log('DRY RUN - No changes made.');
            console.log('Run without --dry-run to apply changes.');
            return;
        }

        // Apply updates
        console.log('Applying updates...');
        let successCount = 0;
        let errorCount = 0;

        for (const doc of needsUpdate) {
            try {
                const updateData = {
                    uploadedBy: userId,
                    accessLevel: 'private',
                    updatedAt: new Date().toISOString()
                };

                await updateDocument(doc.rowId, doc.rowData, updateData);
                console.log(`  ✅ Updated: ${doc.name}`);
                successCount++;
            } catch (error) {
                console.error(`  ❌ Failed: ${doc.name} - ${error.message}`);
                errorCount++;
            }
        }

        console.log('');
        console.log('========================================');
        console.log('Migration Complete');
        console.log('========================================');
        console.log(`  Success: ${successCount}`);
        console.log(`  Failed: ${errorCount}`);

    } catch (error) {
        console.error('Migration failed:', error.message);
        if (error.response?.data) {
            console.error('API Error:', error.response.data);
        }
        process.exit(1);
    }
}

main();
