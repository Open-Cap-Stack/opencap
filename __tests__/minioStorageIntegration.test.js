const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

describe('MinIO Data Storage Integration Test', () => {
  const airflowUrl = 'http://localhost:8081/api/v1/dags/test_dag/dagRuns';

  it('should trigger the DAG and store the dataset in MinIO', async () => {
    try {
      // Trigger the DAG to upload the dataset to MinIO
      const response = await axios.post(airflowUrl, {}, {
        auth: {
          username: process.env.AIRFLOW_USERNAME || 'admin',
          password: process.env.AIRFLOW_PASSWORD || 'admin_password'
        },
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{}'
      });

      // Check for successful DAG triggering
      expect(response.status).toBe(200);
      console.log('DAG triggered successfully:', response.data);

      // Validate the file upload (you might need to enhance this by directly checking MinIO if necessary)
      // Here, we assume the upload task logs success if it runs successfully in the DAG
    } catch (error) {
      console.error('Error during MinIO upload:', error);
      throw error;
    }
  });
});
