require('dotenv').config();
const mongoose = require('mongoose');

module.exports = async () => {
  const connection = mongoose.connection;

  try {
    // Check if the connection is open before dropping the database
    if (connection.readyState === 1) {
      console.log('Dropping the database...');
      await connection.dropDatabase();
    } else {
      console.log('No active MongoDB connection to drop.');
    }
  } catch (error) {
    console.error('Error dropping database during teardown:', error.message);
  } finally {
    // Always attempt to close the connection
    try {
      if (connection.readyState !== 0) {
        console.log('Closing the MongoDB connection...');
        await connection.close();
      } else {
        console.log('No active connection to close.');
      }
    } catch (closeError) {
      console.error('Error closing the connection:', closeError.message);
    }
  }
};
