require('dotenv').config();
const mongoose = require('mongoose');

module.exports = async () => {
  const connection = mongoose.connection;
  try {
    if (connection.readyState === 1) {
      await connection.dropDatabase();
    }
  } catch (error) {
    console.error('Error dropping database during teardown:', error.message);
  } finally {
    await connection.close();
  }
};
