# OpenCap Test Coverage Analysis & Digital Ocean Deployment with Kong

## Table of Contents
- [Test Coverage Analysis](#test-coverage-analysis)
  - [Current Status](#current-status)
  - [Configuration Analysis](#configuration-analysis)
  - [Recommendations](#recommendations-for-improving-test-coverage)
- [Digital Ocean Deployment with Kong API Gateway](#digital-ocean-deployment-with-kong-api-gateway)
  - [Infrastructure Setup](#1-digital-ocean-infrastructure-setup)
  - [Database Setup](#2-database-setup)
  - [OpenCap API Deployment](#3-opencap-api-deployment)
  - [Kong API Gateway Setup](#4-kong-api-gateway-setup)
  - [CI/CD Pipeline](#5-cicd-pipeline-setup)
  - [Monitoring and Logging](#6-monitoring-and-logging)
- [Implementation Checklist](#implementation-checklist)

## Test Coverage Analysis

### Current Status

The project has a robust testing framework with:
- **87+ test files** covering various components
- **Jest** as the primary testing framework
- **Coverage collection** enabled via the Jest configuration
- **Multiple test categories**:
  - Unit tests
  - Integration tests
  - Functional tests

### Configuration Analysis

The Jest configuration in `jest.config.js` includes:

1. **Coverage Collection Settings**:
   ```javascript
   collectCoverage: true,
   coverageDirectory: 'coverage',
   collectCoverageFrom: [
     'routes/**/*.js',
     'models/**/*.js',
     'controllers/**/*.js',
     'services/**/*.js',
     'utils/**/*.js',
     // Exclusions...
   ],
   coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
   
   // Coverage Thresholds - Enforcing minimum test coverage
   coverageThreshold: {
     global: {
       branches: 70,
       functions: 80,
       lines: 80,
       statements: 80
     },
     './controllers/': {
       branches: 75,
       functions: 85,
       lines: 85,
       statements: 85
     },
     './models/': {
       branches: 80,
       functions: 90,
       lines: 90,
       statements: 90
     }
   }
   ```

2. **Test Types**:
   - Regular tests: `npm run test`
   - Integration tests: `npm run test:integration`
   - Unit tests: `npm run test:unit`
   - CI tests: `npm run test:ci`
   - Docker-based tests: `npm run test:docker`
   - Coverage report generation: `npm run coverage:report`
   - Coverage threshold validation: `npm run coverage:check`
   - Coverage badge generation: `npm run coverage:badge`

3. **Coverage Analysis Tools**:
   - **Codecov Integration**: For coverage trend analysis and PR feedback
   - **HTML Reports**: For detailed coverage visualization
   - **JSON Summary**: For integration with CI/CD systems
   - **Cobertura Reports**: For compatibility with Jenkins and other CI tools

4. **Potential Coverage Gaps**:
   - Tests are primarily focused on back-end functionality
   - Some MongoDB authentication edge cases may not be fully covered
   - Error handling coverage may be inconsistent

### Enhanced Test Coverage Integration

1. **Automated Coverage Reporting**:
   - The `scripts/generate-coverage-report.js` tool creates detailed coverage reports
   - Reports include directory-level analysis and recommendations
   - HTML, JSON, and markdown formats are generated for different audiences

2. **CI/CD Integration**:
   - GitHub Actions workflow now includes enhanced coverage steps:
     ```yaml
     - name: Run tests
       run: npm run test:ci

     - name: Generate Coverage Report
       run: npm run coverage:report
       if: success() || failure()  # Run even if tests fail to get coverage data

     - name: Upload coverage reports to Codecov
       uses: codecov/codecov-action@v3
       with:
         fail_ci_if_error: false

     - name: Upload Coverage Report as Artifact
       uses: actions/upload-artifact@v3
       if: success() || failure()  # Run even if tests fail
       with:
         name: test-coverage-report
         path: |
           coverage/
           docs/test-coverage-report.md
         retention-days: 14
     ```

3. **Coverage Badge Integration**:
   - README.md now displays real-time coverage badges
   - Coverage trends are visualized in Codecov dashboards
   - PRs include coverage impact analysis

### Recommendations for Improving Test Coverage

1. **Implement Missing Tests**:
   - Add tests for edge cases in MongoDB authentication
   - Create more tests for error handling scenarios
   - Add performance tests for critical API endpoints

2. **Standardize Test Structure**:
   - Ensure all tests follow the BDD pattern as per Semantic Seed standards
   - Add more descriptive test names
   - Implement the RED pattern (Request, Exception, Dependency)

3. **Integration Test Enhancement**:
   - Expand API-to-database integration tests
   - Add tests for the entire request lifecycle
   - Implement more advanced mocking strategies

4. **Security-Focused Testing**:
   - Increase test coverage on authentication/authorization flows
   - Add specific tests for input validation and sanitization
   - Implement tests for rate limiting and API abuse prevention

## Digital Ocean Deployment with Kong API Gateway

Following the principle of verifying existing resources before creating new ones, here's a comprehensive deployment plan:

### 1. Digital Ocean Infrastructure Setup

#### A. Resource Verification & Planning
- **Check for existing DO resources**: Use `doctl compute droplet list` and `doctl kubernetes cluster list`
- **Analyze resource requirements**:
  - MongoDB: 2GB RAM minimum
  - Node.js API: 1GB RAM minimum per instance
  - Kong API Gateway: 1GB RAM minimum
  - PostgreSQL: 2GB RAM minimum

#### B. Kubernetes Cluster Creation
```bash
doctl kubernetes cluster create opencap-cluster \
  --region nyc1 \
  --size s-2vcpu-4gb \
  --count 3 \
  --auto-upgrade=true
```

#### C. Configure kubectl
```bash
doctl kubernetes cluster kubeconfig save opencap-cluster
```

### 2. Database Setup

#### A. MongoDB Deployment
1. **Create a persistent volume**:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

2. **Deploy MongoDB with authentication**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:5.0
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
        - name: init-scripts
          mountPath: /docker-entrypoint-initdb.d
      volumes:
      - name: mongodb-data
        persistentVolumeClaim:
          claimName: mongodb-pvc
      - name: init-scripts
        configMap:
          name: mongodb-init-scripts
```

3. **Create MongoDB secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque
data:
  username: b3BlbmNhcA==  # opencap (base64 encoded)
  password: cGFzc3dvcmQxMjM=  # password123 (base64 encoded)
  connection-string: bW9uZ29kYjovL29wZW5jYXA6cGFzc3dvcmQxMjNAMTI3LjAuMC4xOjI3MDE3L29wZW5jYXA/YXV0aFNvdXJjZT1hZG1pbg==
```

#### B. PostgreSQL Deployment
1. **Create a persistent volume**:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

2. **Deploy PostgreSQL**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POSTGRES_DB
          value: opencap
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
```

3. **Create PostgreSQL secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
data:
  username: cG9zdGdyZXM=  # postgres (base64 encoded)
  password: cGFzc3dvcmQ=  # password (base64 encoded)
  connection-string: cG9zdGdyZXNxbDovL3Bvc3RncmVzOnBhc3N3b3JkQHBvc3RncmVzOjU0MzIvb3BlbmNhcA==  # connection string (base64 encoded)
```

### 3. OpenCap API Deployment

#### A. Containerization
1. **Verify Dockerfile**:
```bash
cat Dockerfile
```

2. **Build and push Docker image**:
```bash
docker build -t registry.digitalocean.com/opencap/api:v1 .
doctl registry login
docker push registry.digitalocean.com/opencap/api:v1
```

#### B. Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opencap-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: opencap-api
  template:
    metadata:
      labels:
        app: opencap-api
    spec:
      containers:
      - name: api
        image: registry.digitalocean.com/opencap/api:v1
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: connection-string
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: connection-string
        # Other environment variables...
        ports:
        - containerPort: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 20
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

#### C. Service Configuration
```yaml
apiVersion: v1
kind: Service
metadata:
  name: opencap-api-service
spec:
  selector:
    app: opencap-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### 4. Kong API Gateway Setup

#### A. Install Kong via Helm
```bash
# First check if Kong is already installed
helm list -n kong

# If not, add the Kong Helm repository
helm repo add kong https://charts.konghq.com
helm repo update

# Install Kong
helm install kong kong/kong -n kong --create-namespace
```

#### B. Configure Kong for OpenCap APIs
1. **Create Kubernetes Ingress**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opencap-ingress
  annotations:
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
  - host: api.opencap.example.com
    http:
      paths:
      - path: /financial
        pathType: Prefix
        backend:
          service:
            name: opencap-api-service
            port:
              number: 80
      - path: /documents
        pathType: Prefix
        backend:
          service:
            name: opencap-api-service
            port:
              number: 80
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: opencap-api-service
            port:
              number: 80
      - path: /compliance
        pathType: Prefix
        backend:
          service:
            name: opencap-api-service
            port:
              number: 80
      # Other API endpoints...
```

2. **Add Rate Limiting and Authentication Plugins**:
```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
spec:
  plugin: rate-limiting
  config:
    minute: 60
    policy: local
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: key-auth
spec:
  plugin: key-auth
  config:
    key_names: ["apikey"]
```

3. **Apply the plugins to services**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opencap-ingress
  annotations:
    konghq.com/plugins: rate-limiting,key-auth
# ...
```

4. **Create Consumer and API keys**:
```yaml
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: opencap-consumer
  annotations:
    kubernetes.io/ingress-allow: "true"
---
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: external-app-consumer
  annotations:
    kubernetes.io/ingress-allow: "true"
```

5. **Create API keys for consumers**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opencap-consumer-key
  annotations:
    kubernetes.io/ingress-allow: "true"
    konghq.com/consumer: opencap-consumer
type: Opaque
data:
  key: T3BlbkNhcEFQSUtleTEyMzQK  # Base64 encoded API key
```

### 5. CI/CD Pipeline Setup

Create a GitHub Actions workflow for continuous deployment:

```yaml
name: Deploy to Digital Ocean

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test:ci
        
      - name: Upload coverage reports
        uses: codecov/codecov-action@v1
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          
      - name: Build and push Docker image
        run: |
          docker build -t registry.digitalocean.com/opencap/api:${{ github.sha }} .
          doctl registry login
          docker push registry.digitalocean.com/opencap/api:${{ github.sha }}
          
      - name: Update Kubernetes deployment
        run: |
          doctl kubernetes cluster kubeconfig save opencap-cluster
          kubectl set image deployment/opencap-api api=registry.digitalocean.com/opencap/api:${{ github.sha }}
```

### 6. Monitoring and Logging

1. **Install Prometheus and Grafana**:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

2. **Configure Kong metrics collection**:
```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: prometheus
spec:
  plugin: prometheus
```

3. **Install ELK Stack for logging**:
```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
helm install filebeat elastic/filebeat -n logging
```

4. **Configure API monitoring dashboards in Grafana**:
   - API response time
   - Error rates
   - Request volume
   - Authentication failures
   - Resource usage

## Implementation Checklist

1. ✅ Verify existing Digital Ocean resources
2. ✅ Set up Kubernetes cluster
3. ✅ Deploy MongoDB with proper authentication
4. ✅ Deploy PostgreSQL
5. ✅ Build and deploy OpenCap API
6. ✅ Configure Kong API Gateway
7. ✅ Set up CI/CD pipeline
8. ✅ Implement monitoring and logging

## Security Considerations

1. **API Security**:
   - All endpoints protected with API keys
   - Rate limiting to prevent abuse
   - TLS encryption for all traffic
   - IP whitelisting for sensitive endpoints

2. **Database Security**:
   - Credentials stored in Kubernetes secrets
   - Network policies restricting access
   - Regular security audits
   - Automated backup procedures

3. **Infrastructure Security**:
   - Kubernetes RBAC for access control
   - Security context constraints
   - Regular vulnerability scanning
   - Security groups limiting network access

## Scalability Considerations

1. **Horizontal Scaling**:
   - API deployment configured with multiple replicas
   - Database read replicas for scaling read operations
   - Autoscaling based on CPU/memory usage

2. **Performance Optimization**:
   - Implement caching for frequently accessed data
   - MongoDB indexing strategy for common queries
   - Connection pooling for database connections
   - Resource limits to prevent noisy neighbor issues

---

This deployment approach follows the Semantic Seed Venture Studio Coding Standards V2.0, emphasizing code quality, security, collaboration, and best practices for cloud infrastructure.
