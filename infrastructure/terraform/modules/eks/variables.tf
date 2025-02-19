# EKS Cluster Configuration
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"

  validation {
    condition     = length(var.cluster_name) <= 100 && can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must start with a letter, contain only alphanumeric characters and hyphens, and be no longer than 100 characters"
  }
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.27 or higher"
  }
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where EKS cluster will be created"

  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC ID starting with 'vpc-'"
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for EKS node groups"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability"
  }
}

variable "node_groups" {
  type = map(object({
    instance_types = list(string)
    desired_size   = number
    min_size      = number
    max_size      = number
    disk_size     = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
    capacity_type = string
  }))
  description = "Configuration for EKS managed node groups"

  default = {
    api_nodes = {
      instance_types = ["t3.large"]
      desired_size   = 3
      min_size      = 2
      max_size      = 10
      disk_size     = 50
      labels = {
        role        = "api"
        environment = "production"
      }
      taints        = []
      capacity_type = "ON_DEMAND"
    }
    worker_nodes = {
      instance_types = ["t3.xlarge"]
      desired_size   = 2
      min_size      = 2
      max_size      = 8
      disk_size     = 100
      labels = {
        role        = "worker"
        environment = "production"
      }
      taints        = []
      capacity_type = "ON_DEMAND"
    }
  }

  validation {
    condition     = alltrue([for k, v in var.node_groups : v.min_size <= v.desired_size && v.desired_size <= v.max_size])
    error_message = "For each node group, min_size must be <= desired_size <= max_size"
  }

  validation {
    condition     = alltrue([for k, v in var.node_groups : v.disk_size >= 20])
    error_message = "Disk size must be at least 20 GB for each node group"
  }

  validation {
    condition     = alltrue([for k, v in var.node_groups : contains(["ON_DEMAND", "SPOT"], v.capacity_type)])
    error_message = "Capacity type must be either ON_DEMAND or SPOT"
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional resource tags for EKS cluster and node groups"
  default = {
    Project     = "random-word-generator"
    ManagedBy   = "terraform"
    Environment = "production"
    Owner       = "platform-team"
    CostCenter  = "platform-infrastructure"
  }

  validation {
    condition     = length(var.tags) > 0
    error_message = "At least one tag must be specified"
  }
}