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

variable "zerodb_api_key" {
  description = "ZeroDB API key for database operations"
  type        = string
  sensitive   = true
}

variable "ainative_api_token" {
  description = "AINative API token for ZeroDB authentication"
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
