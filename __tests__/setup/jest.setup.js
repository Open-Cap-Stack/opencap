// __tests__/setup/jest.setup.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

jest.setTimeout(30000);

beforeAll(async () => {
  console.log('Test setup initialized');
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});