const mongoose = require('mongoose');
require('dotenv').config();
const opencap = process.env.MONGODB_URI;
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/open-cap-stack');
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
