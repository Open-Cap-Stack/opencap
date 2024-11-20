const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('Airflow Integration Tests', () => {
  let mock;
  const airflowConfig = {
    baseURL: 'http://localhost:8080/api/v1',
    auth: {
      username: 'admin',
      password: 'admin_password'
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    mock.reset();
  });

  it('should trigger DAG run with MinIO configuration', async () => {
    const dagId = 'test_dag';
    const dagRunId = `manual__${new Date().toISOString()}`;
    const minioConfig = {
      bucket: 'lakehouse-bucket',
      object_name: 'test-dataset.csv',
      minio_endpoint: 'localhost:9000'
    };

    mock.onPost(`${airflowConfig.baseURL}/dags/${dagId}/dagRuns`)
      .reply(200, {
        dag_id: dagId,
        dag_run_id: dagRunId,
        state: 'queued',
        conf: minioConfig
      });

    const response = await axios.post(
      `${airflowConfig.baseURL}/dags/${dagId}/dagRuns`,
      { conf: minioConfig },
      airflowConfig
    );

    expect(response.status).toBe(200);
    expect(response.data.dag_id).toBe(dagId);
    expect(response.data.conf).toEqual(minioConfig);
  });

  it('should monitor DAG execution status', async () => {
    const dagId = 'test_dag';
    const dagRunId = `manual__${new Date().toISOString()}`;
    const statusSequence = [
      { state: 'queued' },
      { state: 'running' },
      { state: 'success' }
    ];
    
    let statusCallCount = 0;
    mock.onGet(`${airflowConfig.baseURL}/dags/${dagId}/dagRuns/${dagRunId}`)
      .reply(() => {
        const status = statusSequence[statusCallCount % statusSequence.length];
        statusCallCount++;
        return [200, {
          dag_id: dagId,
          dag_run_id: dagRunId,
          ...status
        }];
      });

    for (let i = 0; i < statusSequence.length; i++) {
      const response = await axios.get(
        `${airflowConfig.baseURL}/dags/${dagId}/dagRuns/${dagRunId}`,
        airflowConfig
      );
      expect(response.data.state).toBe(statusSequence[i].state);
    }
  });

  it('should handle DAG variables', async () => {
    const variables = {
      MINIO_BUCKET: 'lakehouse-bucket',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
      PROCESSING_DATE: new Date().toISOString()
    };

    mock.onPatch(`${airflowConfig.baseURL}/variables`)
      .reply(200, variables);

    mock.onGet(`${airflowConfig.baseURL}/variables`)
      .reply(200, variables);

    const setResponse = await axios.patch(
      `${airflowConfig.baseURL}/variables`,
      variables,
      airflowConfig
    );
    expect(setResponse.status).toBe(200);

    const getResponse = await axios.get(
      `${airflowConfig.baseURL}/variables`,
      airflowConfig
    );
    expect(getResponse.data).toEqual(variables);
  });

  it('should verify DAG configuration', async () => {
    const dagId = 'test_dag';
    const expectedConfig = {
      schedule_interval: '@once',
      catchup: false,
      max_active_runs: 1,
      tags: ['minio', 'data-processing']
    };

    mock.onGet(`${airflowConfig.baseURL}/dags/${dagId}/details`)
      .reply(200, {
        dag_id: dagId,
        ...expectedConfig,
        is_active: true
      });

    const response = await axios.get(
      `${airflowConfig.baseURL}/dags/${dagId}/details`,
      airflowConfig
    );

    expect(response.status).toBe(200);
    expect(response.data.schedule_interval).toBe(expectedConfig.schedule_interval);
    expect(response.data.catchup).toBe(expectedConfig.catchup);
    expect(response.data.is_active).toBe(true);
  });

  it('should handle task instance retries', async () => {
    const dagId = 'test_dag';
    const taskId = 'upload_data_to_minio';
    const dagRunId = `manual__${new Date().toISOString()}`;
    const taskStates = [
      { try_number: 1, state: 'failed' },
      { try_number: 2, state: 'failed' },
      { try_number: 3, state: 'success' }
    ];

    let tryNumber = 0;
    mock.onGet(`${airflowConfig.baseURL}/dags/${dagId}/dagRuns/${dagRunId}/taskInstances/${taskId}`)
      .reply(() => {
        const state = taskStates[tryNumber % taskStates.length];
        tryNumber++;
        return [200, state];
      });

    for (let i = 0; i < taskStates.length; i++) {
      const response = await axios.get(
        `${airflowConfig.baseURL}/dags/${dagId}/dagRuns/${dagRunId}/taskInstances/${taskId}`,
        airflowConfig
      );
      expect(response.data.try_number).toBe(taskStates[i].try_number);
      expect(response.data.state).toBe(taskStates[i].state);
    }
  });

  it('should handle connection timeout', async () => {
    const dagId = 'test_dag';
    
    mock.onPost(`${airflowConfig.baseURL}/dags/${dagId}/dagRuns`)
      .timeout();

    try {
      await axios.post(
        `${airflowConfig.baseURL}/dags/${dagId}/dagRuns`,
        {},
        { ...airflowConfig, timeout: 1000 }
      );
      fail('Should have thrown a timeout error');
    } catch (error) {
      expect(error.code).toBe('ECONNABORTED');
    }
  });

  it('should handle unauthorized access', async () => {
    const dagId = 'test_dag';
    
    mock.onPost(`${airflowConfig.baseURL}/dags/${dagId}/dagRuns`)
      .reply(401, {
        detail: 'Unauthorized',
        status: 401,
        title: 'Unauthorized',
        type: 'about:blank'
      });

    try {
      await axios.post(
        `${airflowConfig.baseURL}/dags/${dagId}/dagRuns`,
        {},
        {
          ...airflowConfig,
          auth: { username: 'wrong', password: 'wrong' }
        }
      );
      fail('Should have thrown an unauthorized error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
});
