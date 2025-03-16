terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.30.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11.0"
    }
  }
  
  backend "s3" {
    # Configure this for your specific backend
    # Example for DigitalOcean Spaces:
    # endpoint = "nyc3.digitaloceanspaces.com"
    # bucket = "opencap-terraform-state"
    # key = "opencap/terraform.tfstate"
    # region = "us-east-1" # DigitalOcean Spaces requires this to be us-east-1
    # skip_credentials_validation = true
    # skip_metadata_api_check = true
  }
}

provider "digitalocean" {
  # Token set via DO_TOKEN environment variable
}

# Create a DOKS (DigitalOcean Kubernetes Service) cluster
resource "digitalocean_kubernetes_cluster" "opencap_cluster" {
  name   = "opencap-cluster"
  region = var.region
  version = var.kubernetes_version
  
  node_pool {
    name       = "worker-pool"
    size       = var.node_size
    node_count = var.node_count
    
    labels = {
      app = "opencap"
      environment = "production"
    }
  }
}

# Configure kubectl
resource "null_resource" "configure_kubectl" {
  depends_on = [digitalocean_kubernetes_cluster.opencap_cluster]
  
  provisioner "local-exec" {
    command = "doctl kubernetes cluster kubeconfig save ${digitalocean_kubernetes_cluster.opencap_cluster.id}"
  }
}

# Create namespaces
resource "kubernetes_namespace" "opencap" {
  depends_on = [null_resource.configure_kubectl]
  
  metadata {
    name = "opencap"
  }
}

resource "kubernetes_namespace" "kong" {
  depends_on = [null_resource.configure_kubectl]
  
  metadata {
    name = "kong"
  }
}

resource "kubernetes_namespace" "monitoring" {
  depends_on = [null_resource.configure_kubectl]
  
  metadata {
    name = "monitoring"
  }
}

# Deploy prometheus for monitoring
resource "helm_release" "prometheus" {
  depends_on = [kubernetes_namespace.monitoring]
  
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"
  
  values = [
    file("${path.module}/prometheus-values.yaml")
  ]
}

# Deploy kong
resource "helm_release" "kong" {
  depends_on = [kubernetes_namespace.kong]
  
  name       = "kong"
  repository = "https://charts.konghq.com"
  chart      = "kong"
  namespace  = "kong"
  
  values = [
    file("${path.module}/kong-values.yaml")
  ]
}

# Output the cluster endpoint
output "kubernetes_endpoint" {
  value = digitalocean_kubernetes_cluster.opencap_cluster.endpoint
}

# Output the kubectl command for connecting to the cluster
output "kubectl_config" {
  value = "doctl kubernetes cluster kubeconfig save ${digitalocean_kubernetes_cluster.opencap_cluster.id}"
}

# Output the Kong gateway external IP
output "kong_gateway_ip" {
  value = "kubectl get svc -n kong kong-kong-proxy -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
}
