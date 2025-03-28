/**
 * OCAE-202: Debug file to verify route configuration
 * 
 * This script helps verify the auth routes are properly registered
 */

const express = require('express');
const request = require('supertest');
const authRoutes = require('../../routes/authRoutes');

// Create a minimal Express app for testing just the auth routes
const app = express();
// Add necessary middleware for body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRoutes);

async function testRoutes() {
  console.log('Testing /auth/register route');
  try {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'user'
      });
    
    console.log('Status:', response.status);
    console.log('Body:', response.body);
  } catch (error) {
    console.error('Error occurred:', error.message);
  }
}

testRoutes();
