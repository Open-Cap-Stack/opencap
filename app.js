const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const shareClassRoutes = require('./routes/shareClassRoutes');
const stakeholderRoutes = require('./routes/stakeholderRoutes');
const documentRoutes = require('./routes/documentRoutes');
const fundraisingRoutes = require('./routes/fundraisingRoutes');
const equityPlanRoutes = require('./routes/equityPlanRoutes'); 

const app = express();
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/shareClasses', shareClassRoutes);
app.use('/api/stakeholders', stakeholderRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/fundraisingRoutes', fundraisingRoutes);
app.use('/api/equityPlans', equityPlanRoutes);

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in the environment variables.");
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = { app, connectDB };
