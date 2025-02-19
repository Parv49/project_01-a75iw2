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
    bucket         = "word-generator-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Configure AWS Provider
provider "aws" {
  region = local.region
}

# Local variables
locals {
  environment         = "prod"
  region             = "us-west-2"
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
  
  tags = {
    Environment = "prod"
    Project     = "random-word-generator"
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "../modules/vpc"

  vpc_cidr            = "10.0.0.0/16"
  environment         = local.environment
  availability_zones  = local.availability_zones
  single_nat_gateway  = false
}

# EKS Module
module "eks" {
  source = "../modules/eks"

  cluster_name      = "word-generator-prod"
  cluster_version   = "1.27"
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids

  node_groups = {
    app = {
      desired_size    = 3
      min_size        = 2
      max_size        = 10
      instance_types  = ["t3.large"]
      labels = {
        role = "application"
      }
    }
  }
}

# RDS Module
module "rds" {
  source = "../modules/rds"

  identifier        = "word-generator-prod"
  engine           = "postgres"
  engine_version   = "15.4"
  instance_class   = "db.r6g.2xlarge"
  allocated_storage = 500
  multi_az         = true
  
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  environment      = local.environment
}

# Redis Module
module "redis" {
  source = "../modules/redis"

  cluster_id        = "word-generator-prod"
  node_type         = "cache.r6g.xlarge"
  num_cache_nodes   = 3
  parameter_group_family = "redis7"
  
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  multi_az_enabled  = true
  allowed_cidr_blocks = [module.vpc.vpc_cidr]
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