// app.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Initialize dotenv to load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
app.use(express.json());

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/opencap";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Import route modules
const financialReportRoutes = require("./routes/financialReportingRoutes");
const userRoutes = require("./routes/userRoutes");
const shareClassRoutes = require("./routes/shareClassRoutes");
const stakeholderRoutes = require("./routes/stakeholderRoutes");
const documentRoutes = require("./routes/documentRoutes");
const fundraisingRoundRoutes = require("./routes/fundraisingRoundRoutes");
const equityPlanRoutes = require("./routes/equityPlanRoutes");
const documentEmbeddingRoutes = require("./routes/documentEmbeddingRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const activityRoutes = require("./routes/activityRoutes");
const investmentRoutes = require("./routes/investmentTrackerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const documentAccessRoutes = require("./routes/documentAccessRoutes");
const investorRoutes = require("./routes/investorRoutes");
const companyRoutes = require("./routes/companyRoutes");
const taxCalculatorRoutes = require("./routes/taxCalculatorRoutes");
const authRoutes = require("./routes/authRoutes");

// General API routes
app.use("/api/financial-reports", financialReportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shareClasses", shareClassRoutes);
app.use("/api/stakeholders", stakeholderRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/fundraisingRounds", fundraisingRoundRoutes);
app.use("/api/equityPlans", equityPlanRoutes);
app.use("/api/documentEmbeddings", documentEmbeddingRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/documentAccesses", documentAccessRoutes);
app.use("/api/investors", investorRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/taxCalculations", taxCalculatorRoutes);
app.use("/auth", authRoutes);

// Error handling middleware for more graceful error messages
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
