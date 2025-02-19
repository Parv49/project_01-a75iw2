# RDS instance identifier
variable "identifier" {
  type        = string
  description = "Unique identifier for the RDS instance"
}

# Environment tag
variable "environment" {
  type        = string
  description = "Environment name for resource tagging"
}

# Database engine configuration
variable "engine" {
  type        = string
  description = "Database engine type specification"
  default     = "postgres"
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version specification"
  default     = "15.3"
}

# Instance specifications
variable "instance_class" {
  type        = string
  description = "RDS instance type specification"
}

variable "allocated_storage" {
  type        = number
  description = "Storage size in GB for RDS instance"
  default     = 500
}

# High availability configuration
variable "multi_az" {
  type        = bool
  description = "Multi-AZ deployment configuration"
  default     = true
}

# Network configuration
variable "vpc_id" {
  type        = string
  description = "VPC ID for RDS deployment"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for RDS subnet group"
}

# Backup configuration
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 30
}