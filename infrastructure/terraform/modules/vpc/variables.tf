# Core VPC Configuration
variable "vpc_cidr" {
  type        = string
  description = "The CIDR block for the VPC"

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

variable "environment" {
  type        = string
  description = "Environment name used for resource tagging (e.g., dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AWS availability zones for subnet creation"

  validation {
    condition     = length(var.availability_zones) > 0
    error_message = "At least one availability zone must be specified"
  }
}

# DNS Configuration
variable "enable_dns_hostnames" {
  type        = bool
  description = "Enable DNS hostnames in the VPC"
  default     = true
}

variable "enable_dns_support" {
  type        = bool
  description = "Enable DNS support in the VPC"
  default     = true
}

# NAT Gateway Configuration
variable "single_nat_gateway" {
  type        = bool
  description = "Use a single NAT Gateway instead of one per AZ (cost optimization for non-prod)"
  default     = false
}