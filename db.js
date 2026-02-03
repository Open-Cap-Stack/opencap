// utils/db.js
/**
 * Database Connection Module
 * Issue #175: Complete ZeroDB migration
 *
 * Provides conditional MongoDB connection based on MIGRATION_MODE:
 * - 'zerodb-only': No MongoDB connection (ZeroDB is primary)
 * - 'mongodb-only': Standard MongoDB connection (legacy mode)
 * - 'parallel': Both MongoDB and ZeroDB active (migration mode)
 */

const migrationMode = process.env.MIGRATION_MODE || 'mongodb-only';
const isMongoDBRequired = migrationMode !== 'zerodb-only';

// Lazy-load mongoose only when needed
let mongoose = null;
function getMongoose() {
  if (!mongoose) {
    if (!isMongoDBRequired) {
      return null;
    }
    mongoose = require('mongoose');
    mongoose.set('strictQuery', true);
  }
  return mongoose;
}

async function connectDB() {
  // In zerodb-only mode, skip MongoDB connection
  if (!isMongoDBRequired) {
    console.log('ZeroDB-only mode: Skipping MongoDB connection');
    return null;
  }

  const mg = getMongoose();
  if (!mg) {
    return null;
  }

  try {
    if (mg.connection.readyState === 0) {
      const conn = await mg.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/opencap_test', {
        // Add timeouts to prevent hanging connections
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
      });
      console.log('MongoDB Connected...');
      return conn;
    }
    return mg.connection;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Ensure connection is closed on error
    if (mg.connection.readyState !== 0) {
      await mg.connection.close();
    }
    process.exit(1);
  }
}

async function disconnectDB() {
  // In zerodb-only mode, nothing to disconnect
  if (!isMongoDBRequired) {
    return;
  }

  const mg = getMongoose();
  if (!mg) {
    return;
  }

  try {
    if (mg.connection.readyState !== 0) {
      await Promise.race([
        mg.connection.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection close timeout')), 5000)
        )
      ]);
      console.log('MongoDB Disconnected...');
    }
  } catch (err) {
    console.error('MongoDB disconnection error:', err);
    // Force close if normal close fails
    if (mg.connection.readyState !== 0) {
      mg.connection.destroy();
    }
  }
}

async function clearDB() {
  // In zerodb-only mode, nothing to clear
  if (!isMongoDBRequired) {
    return;
  }

  const mg = getMongoose();
  if (!mg) {
    return;
  }

  try {
    if (process.env.NODE_ENV === 'test') {
      const collections = mg.connection.collections;
      const clearPromises = Object.values(collections).map(collection =>
        collection.deleteMany({})
      );
      await Promise.all(clearPromises);
    }
  } catch (err) {
    console.error('Error clearing database:', err);
    throw err;
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
  getMongoose,
  isMongoDBRequired
};
