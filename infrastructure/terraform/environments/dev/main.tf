# Configure Terraform and providers
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "word-generator-dev-tfstate"
    key     = "terraform.tfstate"
    region  = "us-west-2"
    encrypt = true
  }
}

# Configure AWS provider
provider "aws" {
  region = local.region
}

# Local variables
locals {
  environment         = "dev"
  region             = "us-west-2"
  availability_zones = ["us-west-2a"]
  
  tags = {
    Environment = "dev"
    Project     = "random-word-generator"
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "../modules/vpc"

  environment         = local.environment
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = local.availability_zones
  single_nat_gateway = true
}

# EKS Module
module "eks" {
  source = "../modules/eks"

  cluster_name       = "word-generator-dev"
  kubernetes_version = "1.27"
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  node_groups = {
    main = {
      desired_size    = 2
      min_size       = 1
      max_size       = 3
      instance_types = ["t3.large"]
      disk_size      = 20
      labels = {
        Environment = "dev"
        NodeGroup   = "main"
      }
    }
  }

  enable_public_access = true
  kms_key_arn         = null # Using AWS-managed key for dev
}

# RDS Module
module "rds" {
  source = "../modules/rds"

  identifier      = "word-generator-dev"
  environment     = local.environment
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.large"
  
  allocated_storage = 50
  multi_az         = false
  
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
}

# Redis Module
module "redis" {
  source = "../modules/redis"

  cluster_id              = "word-generator-dev"
  node_type              = "cache.t3.medium"
  num_cache_nodes        = 2
  parameter_group_family = "redis7"
  
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  multi_az_enabled   = false
  allowed_cidr_blocks = ["10.0.0.0/16"]
}

# Outputs
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC ID"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint"
}

output "database_endpoint" {
  value       = module.rds.rds_endpoint
  description = "RDS instance endpoint"
}

output "redis_endpoint" {
  value       = module.redis.redis_endpoint
  description = "Redis cluster endpoint"
}