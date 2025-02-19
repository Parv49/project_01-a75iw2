output "redis_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "The primary endpoint address of the Redis cluster"
}

output "redis_port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "The port number on which the Redis cluster accepts connections"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "The ID of the security group associated with the Redis cluster"
}

output "redis_connection_string" {
  value       = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
  description = "The Redis connection string for application configuration"
  sensitive   = true
}