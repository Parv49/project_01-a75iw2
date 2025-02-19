# Cluster endpoint for kubectl and application access
output "cluster_endpoint" {
  value       = aws_eks_cluster.main.endpoint
  description = "The endpoint for the EKS Kubernetes API server"
}

# Cluster name for reference by other modules and tools
output "cluster_name" {
  value       = aws_eks_cluster.main.name
  description = "The name of the EKS cluster"
}

# Security group ID for network configuration
output "cluster_security_group_id" {
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  description = "The security group ID attached to the EKS cluster"
}

# IAM role ARN for authentication and authorization
output "cluster_iam_role_arn" {
  value       = aws_eks_cluster.main.role_arn
  description = "The IAM role ARN used by the EKS cluster"
}

# Node groups information for monitoring and management
output "node_groups" {
  value       = aws_eks_node_group.main
  description = "Map of all node groups created and their configurations"
}

# Certificate authority data for cluster authentication
output "cluster_certificate_authority" {
  value       = aws_eks_cluster.main.certificate_authority[0].data
  description = "Base64 encoded certificate data required for cluster authentication"
}

# OIDC provider URL for service account configuration
output "cluster_oidc_issuer_url" {
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
  description = "The URL of the OpenID Connect identity provider"
}

# Kubeconfig for cluster access
output "kubeconfig" {
  value = templatefile("${path.module}/templates/kubeconfig.tpl", {
    cluster_name                  = aws_eks_cluster.main.name
    cluster_endpoint             = aws_eks_cluster.main.endpoint
    cluster_certificate_authority = aws_eks_cluster.main.certificate_authority[0].data
    region                       = data.aws_region.current.name
  })
  description = "Kubeconfig file content for cluster access"
  sensitive   = true
}

# Cluster autoscaler role ARN for pod identity
output "cluster_autoscaler_role_arn" {
  value       = aws_iam_role.cluster_autoscaler.arn
  description = "IAM role ARN for cluster autoscaler pod identity"
}

# Node group IAM role ARN for worker node identity
output "node_group_role_arn" {
  value       = aws_iam_role.node_group.arn
  description = "IAM role ARN used by EKS worker nodes"
}