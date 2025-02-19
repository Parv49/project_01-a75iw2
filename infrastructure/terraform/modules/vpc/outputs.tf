# VPC ID output
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

# VPC CIDR block output
output "vpc_cidr" {
  value       = aws_vpc.main.cidr_block
  description = "The CIDR block of the VPC"
}

# Public subnet IDs output
output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "List of IDs of public subnets"
}

# Private subnet IDs output
output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "List of IDs of private subnets"
}

# Availability zones output
output "availability_zones" {
  value       = var.availability_zones
  description = "List of availability zones used in the VPC configuration"
}