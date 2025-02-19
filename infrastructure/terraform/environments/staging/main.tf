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
    bucket  = "word-generator-staging-tfstate"
    key     = "terraform.tfstate"
    region  = "us-west-2"
    encrypt = true
  }
}

# Provider configuration
provider "aws" {
  region = local.region
}

# Local variables
locals {
  environment        = "staging"
  region            = "us-west-2"
  availability_zones = ["us-west-2a"]
  
  tags = {
    Environment = "staging"
    Project     = "random-word-generator"
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  environment         = local.environment
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = local.availability_zones
  single_nat_gateway = true

  tags = local.tags
}

# EKS Module
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "word-generator-staging"
  cluster_version = "1.27"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_groups = {
    app = {
      desired_size    = 2
      min_size        = 2
      max_size        = 4
      instance_types  = ["t3.large"]
    }
  }

  tags = local.tags
}

# RDS Module
module "rds" {
  source = "../../modules/rds"

  identifier      = "word-generator-staging"
  engine          = "postgres"
  engine_version  = "15.4"
  instance_class  = "db.t3.large"
  allocated_storage = 100
  multi_az        = false

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  environment     = local.environment
}

# Redis Module
module "redis" {
  source = "../../modules/redis"

  cluster_id      = "word-generator-staging"
  node_type       = "cache.t3.medium"
  num_cache_nodes = 2
  parameter_group_family = "redis7"
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  multi_az_enabled = false
  allowed_cidr_blocks = ["10.0.0.0/16"]
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.rds_endpoint
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.redis_endpoint
}