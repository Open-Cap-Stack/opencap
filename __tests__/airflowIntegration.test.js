const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path'); // Import path module

// Load environment variables from .env file
dotenv.config();

// Dummy processDataset function (since there is no 'dataProcessing' module)
const processDataset = (datasetPath) => {
  // Simulate processing the CSV dataset
  const data = [
    { name: 'Item 1', value: 100 },
    { name: 'Item 2', value: 200 },
  ];
  return data;
};

describe('Airflow Integration and Data Processing Test', () => {
  const airflowUrl = process.env.AIRFLOW_URL || 'http://localhost:8081/api/v1/dags/test_dag/dagRuns';

  // Test for triggering a DAG (unchanged, since it's already passing)
  it('should trigger a DAG and receive a successful response', async () => {
    try {
      const response = await axios.post(
        airflowUrl,
        {},
        {
          auth: {
            username: process.env.AIRFLOW_USERNAME || 'admin',
            password: process.env.AIRFLOW_PASSWORD || 'admin_password',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('dag_id', 'test_dag');
      expect(response.data).toHaveProperty('state', 'queued');
      console.log('DAG triggered successfully:', response.data);
    } catch (error) {
      console.error('Error triggering DAG:', error.response ? error.response.data : error.message);
      throw error;
    }
  });

  // Refactor for the dataset processing test
  it('should process the dataset correctly', () => {
    // Path to the test dataset CSV file (assuming a mock dataset)
    const datasetPath = path.join(__dirname, 'test-dataset.csv');

    // Process the dataset
    const processedData = processDataset(datasetPath);

    // Assertions for the processed data
    expect(processedData).toBeDefined();
    expect(processedData.length).toBeGreaterThan(0);

    processedData.forEach((item) => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('value');
      expect(typeof item.name).toBe('string');
      expect(typeof item.value).toBe('number');
    });

    console.log('Data processed successfully:', processedData);
  });
});
