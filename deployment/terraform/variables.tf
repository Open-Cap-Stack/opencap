variable "region" {
  description = "DigitalOcean region for the Kubernetes cluster"
  type        = string
  default     = "sfo3"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the cluster"
  type        = string
  default     = "1.28.2-do.0"
}

variable "node_size" {
  description = "Size of the worker nodes"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "node_count" {
  description = "Number of worker nodes in the cluster"
  type        = number
  default     = 3
}

variable "mongodb_username" {
  description = "MongoDB username"
  type        = string
  default     = "opencap"
  sensitive   = true
}

variable "mongodb_password" {
  description = "MongoDB password"
  type        = string
  sensitive   = true
}

variable "postgres_username" {
  description = "PostgreSQL username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for API authentication"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "API key for accessing the OpenCap API"
  type        = string
  sensitive   = true
}

variable "docker_image" {
  description = "Docker image for the OpenCap API"
  type        = string
  default     = "opencap/api:latest"
}

variable "domain_name" {
  description = "Domain name for the OpenCap API"
  type        = string
  default     = "api.opencap.example.com"
}
