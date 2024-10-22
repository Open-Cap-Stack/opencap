const { connectDB, disconnectDB } = require('../db');
const app = require('../app');

let server;

beforeAll(async () => {
  await connectDB();
  server = app.listen(5001);
});

afterAll(async () => {
  await server.close();
  await disconnectDB();
});

describe('App Tests', () => {
  it('should run the server', async () => {
    expect(server).toBeDefined();
  });
});
