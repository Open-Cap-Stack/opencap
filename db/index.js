/**
 * DB Connection Utilities
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Utility functions for managing database connections.
 * Now uses ZeroDB instead of MongoDB.
 */

const zerodbService = require('../services/zerodbService');

let isConnected = false;

/**
 * Connect to the database (ZeroDB)
 */
const connectDB = async () => {
    try {
        if (isConnected && zerodbService.projectId) {
            console.log('Already connected to ZeroDB');
            return zerodbService;
        }

        const token = process.env.AINATIVE_API_TOKEN;
        if (!token) {
            console.warn('AINATIVE_API_TOKEN not set, skipping ZeroDB connection');
            return null;
        }

        const result = await zerodbService.initialize(token);
        isConnected = true;
        console.log('Connected to ZeroDB database');
        return zerodbService;
    } catch (error) {
        console.error('ZeroDB connection error:', error);
        throw error;
    }
};

/**
 * Disconnect from the database
 */
const disconnectDB = async () => {
    try {
        isConnected = false;
        console.log('Disconnected from ZeroDB');
    } catch (error) {
        console.error('Error disconnecting from ZeroDB:', error);
    }
};

/**
 * Check if connected
 */
const isDBConnected = () => {
    return isConnected && !!zerodbService.projectId;
};

module.exports = {
    connectDB,
    disconnectDB,
    isDBConnected,
    zerodbService
};
