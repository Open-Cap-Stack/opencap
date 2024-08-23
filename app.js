// app.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const shareClassRoutes = require('./routes/shareClassRoutes');
const stakeholderRoutes = require('./routes/stakeholderRoutes');
const documentRoutes = require('./routes/documentRoutes');
const fundraisingRoundRoutes = require('./routes/fundraisingRoundRoutes');
const equityPlanRoutes = require('./routes/equityPlanRoutes');
const documentEmbeddingRoutes = require('./routes/documentEmbeddingRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const activityRoutes = require('./routes/activityRoutes');
const investmentRoutes = require('./routes/investmentTrackerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentAccessRoutes = require('./routes/documentAccessRoutes');
const investorRoutes = require('./routes/investorRoutes');
const companyRoutes = require('./routes/Company'); 
const taxCalculatorRoutes = require('./routes/TaxCalculator');
const authRoutes = require('./routes/authRoutes');
const corporationRoutes = require('./routes/corporationRoutes');
const compensationRoutes = require('./routes/compensationRoutes');
const issuerRoutes = require('./routes/issuerRoutes');

const app = express();
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/shareClasses', shareClassRoutes);
app.use('/api/stakeholders', stakeholderRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/fundraisingRounds', fundraisingRoundRoutes);
app.use('/api/equityPlans', equityPlanRoutes);
app.use('/api/documentEmbeddings', documentEmbeddingRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/documentAccesses', documentAccessRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/taxCalculations', taxCalculatorRoutes);
app.use('/api/companies', companyRoutes);
app.use('/auth', authRoutes);
app.use('/api/v2', corporationRoutes);
app.use('/api/v2/compensation', compensationRoutes);
app.use('/api/v2/issuers', issuerRoutes);


module.exports = app;
