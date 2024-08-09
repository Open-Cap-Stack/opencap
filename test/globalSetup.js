require("dotenv").config();
const mongoose = require("mongoose");

module.exports = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Drop the database to clean up after tests
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};
require("dotenv").config();
