const mongoose = require('mongoose');
require('dotenv').config();
const opencap = process.env.MONGODB_URI;
const connectDB = async () => {
  try {
    await mongoose.connect(opencap, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
