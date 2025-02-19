# RDS endpoint output - provides the complete connection endpoint URL
output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance in the format of 'endpoint:port'"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

# RDS address output - provides just the hostname portion of the endpoint
output "rds_address" {
  description = "The hostname of the RDS instance endpoint"
  value       = aws_db_instance.main.address
  sensitive   = false
}

# RDS port output - provides the port number the database is listening on
output "rds_port" {
  description = "The port number on which the RDS instance accepts connections"
  value       = aws_db_instance.main.port
  sensitive   = false
}

# RDS ARN output - provides the Amazon Resource Name for the instance
output "rds_arn" {
  description = "The Amazon Resource Name (ARN) of the RDS instance"
  value       = aws_db_instance.main.arn
  sensitive   = false
}

# RDS identifier output - provides the unique identifier of the instance
output "rds_identifier" {
  description = "The identifier of the RDS instance"
  value       = aws_db_instance.main.identifier
  sensitive   = false
}