# OpenCap Digital Ocean Deployment Guide

This guide outlines the steps to deploy the OpenCap stack on Digital Ocean Kubernetes Service (DOKS), following the Semantic Seed Venture Studio Coding Standards V2.0 principles for secure, quality-focused deployments.

## Architecture Overview

OpenCap uses **ZeroDB** as its primary database, which is accessed via the AINative API. This eliminates the need to deploy and manage local database instances.

- **Primary Database**: ZeroDB (managed via AINative API)
- **File Storage**: MinIO (S3-compatible) or ZeroDB File Storage
- **API Gateway**: Kong

## Prerequisites

1. **Digital Ocean Account**: With permissions to create Kubernetes clusters
2. **doctl CLI**: Installed and configured with appropriate access
3. **kubectl**: Installed and configured
4. **Docker**: For building and pushing images
5. **Docker Hub or Digital Ocean Container Registry**: For storing Docker images
6. **ZeroDB Credentials**: API key and token from https://ainative.studio

## Step 1: Create Kubernetes Cluster

```bash
# Create a Kubernetes cluster with 3 nodes (2 vCPU, 4GB RAM each)
doctl kubernetes cluster create opencap-cluster \
  --region sfo3 \
  --size s-2vcpu-4gb \
  --count 3 \
  --version latest

# Configure kubectl to use the new cluster
doctl kubernetes cluster kubeconfig save opencap-cluster
```

## Step 2: Create Namespaces and Secrets

```bash
# Create required namespaces
kubectl apply -f kubernetes/opencap-api.yaml

# Create ZeroDB credentials secret
kubectl create secret generic opencap-api-secret -n opencap \
  --from-literal=jwt-secret=YOUR_JWT_SECRET \
  --from-literal=zerodb-api-key=YOUR_ZERODB_API_KEY \
  --from-literal=ainative-api-token=YOUR_AINATIVE_API_TOKEN
```

## Step 3: Build and Push Docker Images

```bash
# Build the OpenCap API Docker image
docker build -t your-docker-username/opencap-api:latest .

# Push to Docker registry
docker push your-docker-username/opencap-api:latest
```

## Step 4: Update Kubernetes Configurations

Update the `opencap-api.yaml` file to use your Docker image:

```bash
# Replace placeholder with actual image
sed -i 's|\${DOCKER_REGISTRY}/opencap/api:\${IMAGE_TAG}|your-docker-username/opencap-api:latest|g' kubernetes/opencap-api.yaml
```

## Step 5: Deploy OpenCap API

```bash
# Deploy the OpenCap API
kubectl apply -f kubernetes/opencap-api.yaml

# Verify deployment
kubectl get pods -n opencap
kubectl get services -n opencap
```

## Step 6: Deploy Kong API Gateway

```bash
# Deploy Kong API Gateway
kubectl apply -f kubernetes/kong-gateway.yaml

# Verify deployment
kubectl get pods -n kong
kubectl get services -n kong
```

## Step 7: Configure DNS

Once Kong service receives an external IP:

```bash
# Get the external IP of Kong service
kubectl get service kong-proxy -n kong

# Configure your DNS provider to point api.opencap.example.com to this IP
```

## Step 8: TLS/SSL Configuration

For production deployments, configure TLS:

```bash
# Install cert-manager for TLS
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.11.0/cert-manager.yaml

# Create a ClusterIssuer for Let's Encrypt
kubectl apply -f kubernetes/cert-issuer.yaml

# Update Kong ingress to use TLS
kubectl apply -f kubernetes/kong-gateway-tls.yaml
```

## Security Considerations

Following secure deployment practices:

1. **Secrets Management**: All sensitive data is stored in Kubernetes Secrets
2. **Network Policies**: Limit communication between pods
3. **Resource Limits**: All deployments have CPU and memory limits
4. **Health Checks**: Liveness and readiness probes implemented
5. **Autoscaling**: HPA configured for the OpenCap API
6. **ZeroDB Security**: API keys rotated regularly, never committed to version control

## Monitoring

Deploy monitoring stack:

```bash
# Install Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

## Verification Steps

After deployment, run verification checks to ensure all components are operational:

```bash
# Verify API health endpoint
curl -H "apikey: YOUR_API_KEY" https://api.opencap.example.com/health

# Verify ZeroDB connectivity
curl -H "apikey: YOUR_API_KEY" https://api.opencap.example.com/api/v1/health/zerodb

# Check API logs
kubectl logs deployment/opencap-api -n opencap
```

## Troubleshooting

Common issues and solutions:

1. **ZeroDB Connection Issues**:
   - Verify API key and token are correct
   - Check network egress is allowed to api.ainative.studio
   - Review logs: `kubectl logs deployment/opencap-api -n opencap`

2. **API Errors**:
   - Check logs with `kubectl logs deployment/opencap-api -n opencap`
   - Verify environment variables are set correctly

3. **Kong Gateway Issues**:
   - Check configuration with `kubectl get KongPlugin -n kong`
   - Review Kong logs: `kubectl logs deployment/kong -n kong`

## Cleanup

To remove the deployment:

```bash
kubectl delete -f kubernetes/kong-gateway.yaml
kubectl delete -f kubernetes/opencap-api.yaml
kubectl delete namespace opencap
kubectl delete namespace kong
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `ENABLE_ZERODB` | Enable ZeroDB as primary database | Yes |
| `ZERODB_API_KEY` | ZeroDB API key | Yes |
| `AINATIVE_API_TOKEN` | AINative API token | Yes |
| `ZERODB_BASE_URL` | ZeroDB API endpoint | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NODE_ENV` | Node environment (production/development) | Yes |
| `PORT` | API server port | Yes |
