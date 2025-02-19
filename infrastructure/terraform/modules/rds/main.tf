# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.identifier}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Name        = "${var.identifier}-rds-monitoring"
  }
}

# Attach the enhanced monitoring policy to the IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS subnet group
resource "aws_db_subnet_group" "main" {
  name        = "${var.identifier}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${var.identifier} RDS instance"

  tags = {
    Environment = var.environment
    Name        = "${var.identifier}-subnet-group"
  }
}

# Security group for RDS instance
resource "aws_security_group" "rds" {
  name        = "${var.identifier}-rds-sg"
  description = "Security group for ${var.identifier} RDS instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = ["10.0.0.0/8"]
    description     = "Allow PostgreSQL access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Environment = var.environment
    Name        = "${var.identifier}-rds-sg"
    Purpose     = "PostgreSQL access control"
  }
}

# RDS parameter group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.identifier}-pg15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Environment = var.environment
    Name        = "${var.identifier}-pg15"
  }
}

# RDS instance
resource "aws_db_instance" "main" {
  identifier     = var.identifier
  engine         = var.engine
  engine_version = var.engine_version
  
  # Instance specifications
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true
  multi_az         = var.multi_az

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  # Performance and monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                  = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports      = ["postgresql", "upgrade"]

  # Protection and lifecycle
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.identifier}-final-snapshot-${formatdate("YYYYMMDDHHmmss", timestamp())}"

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  tags = {
    Environment        = var.environment
    Name              = "${var.identifier}-postgresql"
    BackupRetention   = "${var.backup_retention_period} days"
    MonitoringEnabled = "true"
  }
}

# Outputs
output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "The port number the RDS instance is listening on"
  value       = aws_db_instance.main.port
}

output "rds_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "rds_security_group_id" {
  description = "The ID of the security group associated with the RDS instance"
  value       = aws_security_group.rds.id
}