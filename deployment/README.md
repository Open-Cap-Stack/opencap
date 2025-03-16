# OpenCap Digital Ocean Deployment Guide

This guide outlines the steps to deploy the OpenCap stack on Digital Ocean Kubernetes Service (DOKS), following the Semantic Seed Venture Studio Coding Standards V2.0 principles for secure, quality-focused deployments.

## Prerequisites

1. **Digital Ocean Account**: With permissions to create Kubernetes clusters
2. **doctl CLI**: Installed and configured with appropriate access
3. **kubectl**: Installed and configured
4. **Docker**: For building and pushing images
5. **Docker Hub or Digital Ocean Container Registry**: For storing Docker images

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

## Step 2: Create Namespaces

```bash
# Create required namespaces
kubectl apply -f kubernetes/opencap-api.yaml
kubectl apply -f kubernetes/kong-gateway.yaml
```

## Step 3: Deploy Database Services

Following our principle of verifying existing resources before creating new ones:

```bash
# Check if there are any existing secrets or services
kubectl get secrets -n opencap
kubectl get services -n opencap

# Deploy MongoDB and PostgreSQL
kubectl apply -f kubernetes/mongodb.yaml
kubectl apply -f kubernetes/postgres.yaml

# Verify deployments are running
kubectl get pods -n opencap
```

## Step 4: Build and Push Docker Images

```bash
# Build the OpenCap API Docker image
docker build -t your-docker-username/opencap-api:latest .

# Push to Docker registry
docker push your-docker-username/opencap-api:latest
```

## Step 5: Update Kubernetes Configurations

Update the `opencap-api.yaml` file to use your Docker image:

```bash
# Replace placeholder with actual image
sed -i 's|\${DOCKER_REGISTRY}/opencap/api:\${IMAGE_TAG}|your-docker-username/opencap-api:latest|g' kubernetes/opencap-api.yaml
```

## Step 6: Deploy OpenCap API

```bash
# Deploy the OpenCap API
kubectl apply -f kubernetes/opencap-api.yaml

# Verify deployment
kubectl get pods -n opencap
kubectl get services -n opencap
```

## Step 7: Deploy Kong API Gateway

```bash
# Deploy Kong API Gateway
kubectl apply -f kubernetes/kong-gateway.yaml

# Verify deployment
kubectl get pods -n kong
kubectl get services -n kong
```

## Step 8: Configure DNS

Once Kong service receives an external IP:

```bash
# Get the external IP of Kong service
kubectl get service kong-proxy -n kong

# Configure your DNS provider to point api.opencap.example.com to this IP
```

## Step 9: TLS/SSL Configuration

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
curl -H "apikey: OpenCapAPIKey1234" https://api.opencap.example.com/health

# Verify MongoDB connectivity
kubectl exec -it $(kubectl get pod -l app=opencap-api -n opencap -o jsonpath="{.items[0].metadata.name}") -n opencap -- node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));"

# Verify PostgreSQL connectivity
kubectl exec -it $(kubectl get pod -l app=opencap-api -n opencap -o jsonpath="{.items[0].metadata.name}") -n opencap -- node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : 'PostgreSQL Connected'); pool.end(); });"
```

## Troubleshooting

Common issues and solutions:

1. **Database Connection Issues**: Check credentials in secrets and verify network policies
2. **API Errors**: Check logs with `kubectl logs deployment/opencap-api -n opencap`
3. **Kong Gateway Issues**: Check configuration with `kubectl get KongPlugin -n kong`

## Cleanup

To remove the deployment:

```bash
kubectl delete -f kubernetes/kong-gateway.yaml
kubectl delete -f kubernetes/opencap-api.yaml
kubectl delete -f kubernetes/postgres.yaml
kubectl delete -f kubernetes/mongodb.yaml
kubectl delete namespace opencap
kubectl delete namespace kong
```
