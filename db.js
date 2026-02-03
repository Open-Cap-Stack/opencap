/**
 * Database Connection Module
 * Migrated: ZeroDB Migration - Issue #175
 *
 * This module provides database connection utilities for ZeroDB.
 * MongoDB support removed in favor of ZeroDB-only architecture.
 */

const zerodbService = require('./services/zerodbService');

let isConnected = false;

/**
 * Connect to ZeroDB
 * @returns {Object} ZeroDB service instance
 */
async function connectDB() {
    try {
        if (isConnected && zerodbService.projectId) {
            console.log('ZeroDB already connected...');
            return zerodbService;
        }

        const token = process.env.AINATIVE_API_TOKEN;
        if (!token) {
            throw new Error('AINATIVE_API_TOKEN is required for ZeroDB connection');
        }

        const result = await zerodbService.initialize(token);
        isConnected = true;
        console.log('ZeroDB Connected...', { projectId: result.projectId });
        return zerodbService;
    } catch (err) {
        console.error('ZeroDB connection error:', err);
        throw err;
    }
}

/**
 * Disconnect from ZeroDB
 * Note: ZeroDB uses HTTP API so no persistent connection to close
 */
async function disconnectDB() {
    try {
        isConnected = false;
        console.log('ZeroDB Disconnected...');
    } catch (err) {
        console.error('ZeroDB disconnection error:', err);
    }
}

/**
 * Clear database tables (for testing)
 * Warning: This will delete all data in the specified tables
 */
async function clearDB() {
    try {
        if (process.env.NODE_ENV === 'test') {
            console.log('Clearing ZeroDB tables for testing...');
            // Note: ZeroDB table clearing would need to be implemented
            // based on the specific API capabilities
            const tables = [
                'users', 'companies', 'stakeholders', 'securities',
                'transactions', 'documents', 'valuations',
                'compliance_events', 'audit_logs'
            ];

            for (const table of tables) {
                try {
                    await zerodbService.deleteRows(table, {});
                    console.log(`Cleared table: ${table}`);
                } catch (err) {
                    // Table might not exist or be empty
                    console.log(`Could not clear table ${table}: ${err.message}`);
                }
            }
        }
    } catch (err) {
        console.error('Error clearing database:', err);
        throw err;
    }
}

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
function isDBConnected() {
    return isConnected && !!zerodbService.projectId;
}

/**
 * Get database status
 * @returns {Object} Database status information
 */
async function getDBStatus() {
    if (!isConnected || !zerodbService.projectId) {
        return { status: 'disconnected' };
    }

    try {
        const status = await zerodbService.getDatabaseStatus();
        return {
            status: 'connected',
            projectId: zerodbService.projectId,
            ...status
        };
    } catch (err) {
        return {
            status: 'error',
            error: err.message
        };
    }
}

// Add cleanup handler for process termination
process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
});

module.exports = {
    connectDB,
    disconnectDB,
    clearDB,
    isDBConnected,
    getDBStatus,
    zerodbService
};
