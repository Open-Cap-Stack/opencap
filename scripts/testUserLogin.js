/**
 * Test User Login Script
 * 
 * Tests authentication for the created test users
 */

const request = require('supertest');
const app = require('../app');

const testCredentials = {
  admin: {
    email: 'sanket@opencapstack.com',
    password: 'MEok921$4sCP'
  },
  user: {
    email: 'test@opencapstack.com', 
    password: 'nzNN6YtN#EA3'
  }
};

async function testUserAuthentication() {
  try {
    console.log('🧪 Testing user authentication...\n');

    for (const [userType, credentials] of Object.entries(testCredentials)) {
      console.log(`Testing ${userType.toUpperCase()} login...`);
      
      try {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: credentials.email,
            password: credentials.password
          });

        if (response.status === 200) {
          console.log(`✅ ${userType.toUpperCase()} login successful`);
          console.log(`   Email: ${credentials.email}`);
          console.log(`   Role: ${response.body.user?.role || 'unknown'}`);
          console.log(`   Token: ${response.body.accessToken ? 'Generated' : 'Missing'}`);
          
          // Test token validation with a protected route
          if (response.body.accessToken) {
            const profileResponse = await request(app)
              .get('/api/v1/auth/profile')
              .set('Authorization', `Bearer ${response.body.accessToken}`);
              
            if (profileResponse.status === 200) {
              console.log(`   Profile Access: ✅ Working`);
            } else {
              console.log(`   Profile Access: ❌ Failed (${profileResponse.status})`);
            }
          }
          
        } else {
          console.log(`❌ ${userType.toUpperCase()} login failed`);
          console.log(`   Status: ${response.status}`);
          console.log(`   Error: ${response.body.message || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.log(`❌ ${userType.toUpperCase()} login error: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎯 Authentication test completed\n');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testUserAuthentication()
    .then(() => {
      console.log('✅ All authentication tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Authentication test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testUserAuthentication, testCredentials };