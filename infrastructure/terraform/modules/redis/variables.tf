# Redis ElastiCache Cluster Variables
# Terraform ~> 1.5

variable "cluster_id" {
  type        = string
  description = "Identifier for the Redis cluster"

  validation {
    condition     = length(var.cluster_id) <= 40
    error_message = "Cluster ID must be 40 characters or less"
  }
}

variable "node_type" {
  type        = string
  description = "The compute and memory capacity of the nodes"
  default     = "cache.t4g.medium"

  validation {
    condition     = can(regex("^cache\\.(t4g|r6g|m6g)\\.(small|medium|large|xlarge)$", var.node_type))
    error_message = "Node type must be a valid Redis node type"
  }
}

variable "num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the cluster"
  default     = 3

  validation {
    condition     = var.num_cache_nodes >= 3 && var.num_cache_nodes <= 6
    error_message = "Number of cache nodes must be between 3 and 6"
  }
}

variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family version"
  default     = "redis7.0"

  validation {
    condition     = can(regex("^redis[67]\\.[0-9]$", var.parameter_group_family))
    error_message = "Parameter group family must be redis6.x or redis7.x"
  }
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the Redis cluster will be deployed"

  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC ID"
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs where the Redis cluster will be deployed"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnet IDs are required for high availability"
  }
}

variable "multi_az_enabled" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of CIDR blocks allowed to access the Redis cluster"

  validation {
    condition     = length(var.allowed_cidr_blocks) > 0
    error_message = "At least one CIDR block must be provided"
  }
}