#!/usr/bin/env bash

# Random Word Generator Deployment Script
# Version: 1.0.0
# Handles Kubernetes deployments across different environments with comprehensive validation,
# progressive rollout strategies, enhanced health checks, and advanced security measures

set -euo pipefail
IFS=$'\n\t'

# Environment variables and constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ENVIRONMENTS=("dev" "staging" "prod")
readonly DEPLOYMENT_TIMEOUT=300
readonly HEALTH_CHECK_INTERVAL=10
readonly MAX_SURGE="25%"
readonly MAX_UNAVAILABLE="25%"
readonly PROGRESSIVE_ROLLOUT=true

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment and prerequisites
validate_environment() {
    local env=$1
    
    log_info "Validating environment: $env"

    # Check kubectl connection
    if ! kubectl version --short > /dev/null 2>&1; then
        log_error "kubectl not connected to cluster"
        return 1
    }

    # Verify namespace exists
    if ! kubectl get namespace word-generator > /dev/null 2>&1; then
        log_error "word-generator namespace not found"
        return 1
    }

    # Check required secrets
    local required_secrets=("word-generator-secrets" "database-credentials" "redis-credentials")
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n word-generator > /dev/null 2>&1; then
            log_error "Required secret $secret not found"
            return 1
        fi
    done

    # Validate ArgoCD connection
    if ! argocd app list > /dev/null 2>&1; then
        log_warn "ArgoCD not connected - falling back to kubectl"
    fi

    return 0
}

# Deploy backend services
deploy_backend() {
    local env=$1
    local version=$2

    log_info "Deploying backend services for environment: $env"

    # Apply backend deployment
    kubectl apply -f "${SCRIPT_DIR}/../kubernetes/backend/deployment.yaml" \
        --namespace word-generator

    # Wait for deployment rollout
    if ! kubectl rollout status deployment/word-generator-backend \
        --namespace word-generator \
        --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_error "Backend deployment failed to roll out"
        return 1
    fi

    # Verify health checks
    local attempts=0
    local max_attempts=10
    while [ $attempts -lt $max_attempts ]; do
        if kubectl exec -n word-generator \
            "$(kubectl get pod -l app=random-word-generator,component=backend -n word-generator -o jsonpath='{.items[0].metadata.name}')" \
            -- curl -s http://localhost:3000/health | grep -q "ok"; then
            log_info "Backend health check passed"
            break
        fi
        attempts=$((attempts + 1))
        sleep 5
    done

    if [ $attempts -eq $max_attempts ]; then
        log_error "Backend health check failed after $max_attempts attempts"
        return 1
    fi

    return 0
}

# Deploy frontend services
deploy_frontend() {
    local env=$1
    local version=$2

    log_info "Deploying frontend services for environment: $env"

    # Apply frontend deployment
    kubectl apply -f "${SCRIPT_DIR}/../kubernetes/frontend/deployment.yaml" \
        --namespace word-generator

    # Wait for deployment rollout
    if ! kubectl rollout status deployment/frontend \
        --namespace word-generator \
        --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_error "Frontend deployment failed to roll out"
        return 1
    }

    # Verify ingress configuration
    if ! kubectl get ingress -n word-generator > /dev/null 2>&1; then
        log_warn "Ingress not configured for frontend"
    fi

    return 0
}

# Deploy Redis cluster
deploy_redis() {
    local env=$1

    log_info "Deploying Redis cluster for environment: $env"

    # Apply Redis statefulset
    kubectl apply -f "${SCRIPT_DIR}/../kubernetes/redis/statefulset.yaml" \
        --namespace word-generator

    # Wait for statefulset rollout
    if ! kubectl rollout status statefulset/redis-cluster \
        --namespace word-generator \
        --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_error "Redis cluster deployment failed to roll out"
        return 1
    }

    # Verify Redis cluster health
    if ! kubectl exec -n word-generator \
        "$(kubectl get pod -l app=word-generator,component=cache -n word-generator -o jsonpath='{.items[0].metadata.name}')" \
        -- redis-cli ping | grep -q "PONG"; then
        log_error "Redis cluster health check failed"
        return 1
    }

    return 0
}

# Rollback deployment if needed
rollback_deployment() {
    local env=$1
    local component=$2

    log_warn "Rolling back $component deployment in $env"

    if ! kubectl rollout undo deployment/$component \
        --namespace word-generator; then
        log_error "Rollback failed for $component"
        return 1
    fi

    log_info "Rollback completed for $component"
    return 0
}

# Main deployment function
deploy() {
    local env=$1
    local version=$2

    log_info "Starting deployment for environment: $env (version: $version)"

    # Validate environment
    if ! validate_environment "$env"; then
        log_error "Environment validation failed"
        return 1
    fi

    # Deploy components
    local failed=false

    # Deploy Redis first
    if ! deploy_redis "$env"; then
        log_error "Redis deployment failed"
        failed=true
    fi

    # Deploy backend
    if ! deploy_backend "$env" "$version"; then
        log_error "Backend deployment failed"
        if [ "$env" = "prod" ]; then
            rollback_deployment "$env" "word-generator-backend"
        fi
        failed=true
    fi

    # Deploy frontend
    if ! deploy_frontend "$env" "$version"; then
        log_error "Frontend deployment failed"
        if [ "$env" = "prod" ]; then
            rollback_deployment "$env" "frontend"
        fi
        failed=true
    fi

    if [ "$failed" = true ]; then
        log_error "Deployment failed for environment: $env"
        return 1
    fi

    log_info "Deployment completed successfully for environment: $env"
    return 0
}

# Script entry point
main() {
    if [ $# -lt 2 ]; then
        log_error "Usage: $0 <environment> <version>"
        exit 1
    fi

    local env=$1
    local version=$2

    # Validate environment
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log_error "Invalid environment. Must be one of: ${ENVIRONMENTS[*]}"
        exit 1
    }

    # Execute deployment
    if ! deploy "$env" "$version"; then
        log_error "Deployment failed"
        exit 1
    fi

    exit 0
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi