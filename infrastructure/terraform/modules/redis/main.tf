terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Redis ElastiCache Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = var.cluster_id
  description                   = "Redis cluster for word generation application caching"
  node_type                     = var.node_type
  num_cache_clusters           = var.num_cache_nodes
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  port                         = 6379
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]
  automatic_failover_enabled   = true
  multi_az_enabled            = var.multi_az_enabled
  engine                       = "redis"
  engine_version              = "7.0"
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  maintenance_window          = "sun:05:00-sun:09:00"
  snapshot_window             = "00:00-04:00"
  snapshot_retention_limit    = 7
  auto_minor_version_upgrade = true
  apply_immediately          = true
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.parameter_group_family
  name        = "${var.cluster_id}-params"
  description = "Redis parameter group for word generation application"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.cluster_id}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Redis cluster"
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.cluster_id}-sg"
  vpc_id      = var.vpc_id
  description = "Security group for Redis cluster"

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.cluster_id}-redis-sg"
  }
}