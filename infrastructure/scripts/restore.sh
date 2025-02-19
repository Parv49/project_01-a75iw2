#!/usr/bin/env bash

# Random Word Generator - Database and Cache Restore Script
# Version: 1.0.0
# Supports point-in-time recovery and validation for Redis and PostgreSQL

set -euo pipefail
IFS=$'\n\t'

# Global variables
readonly RESTORE_ROOT="/restore"
readonly S3_BUCKET="word-generator-backups"
readonly NAMESPACE="word-generator"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly LOG_FILE="${RESTORE_ROOT}/restore_${TIMESTAMP}.log"
readonly REDIS_BACKUP_PATH="${RESTORE_ROOT}/redis"
readonly PG_BACKUP_PATH="${RESTORE_ROOT}/postgres"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

# Initialize logging
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

# Utility functions
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Validate environment and prerequisites
validate_environment() {
    log "Validating environment and prerequisites..."
    
    # Check required tools
    command -v aws >/dev/null 2>&1 || error "AWS CLI is required but not installed"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
    
    # Validate AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "Invalid AWS credentials"
    
    # Check S3 bucket access
    aws s3 ls "s3://${S3_BUCKET}" >/dev/null 2>&1 || error "Cannot access S3 bucket: ${S3_BUCKET}"
    
    # Verify Kubernetes context
    kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1 || error "Cannot access Kubernetes namespace: ${NAMESPACE}"
    
    # Create restore directories
    mkdir -p "${REDIS_BACKUP_PATH}" "${PG_BACKUP_PATH}"
}

# Redis restore functions
restore_redis() {
    local backup_date=$1
    local force=${2:-false}
    
    log "Starting Redis restore process for backup date: ${backup_date}"
    
    # Download Redis backup
    aws s3 cp "s3://${S3_BUCKET}/redis/${backup_date}/dump.rdb" \
        "${REDIS_BACKUP_PATH}/dump.rdb" || error "Failed to download Redis backup"
    
    # Verify backup integrity
    file "${REDIS_BACKUP_PATH}/dump.rdb" | grep "Redis" || error "Invalid Redis backup file"
    
    # Scale down application pods
    log "Scaling down application deployments..."
    kubectl scale deployment -n "${NAMESPACE}" --replicas=0 \
        -l app=word-generator,component=api
    
    # Stop Redis pods in order
    log "Stopping Redis cluster pods..."
    for pod in $(kubectl get pods -n "${NAMESPACE}" -l component=cache -o name); do
        kubectl delete "${pod}" -n "${NAMESPACE}" --grace-period=30 || warn "Failed to gracefully stop pod: ${pod}"
    done
    
    # Replace Redis data
    log "Replacing Redis data files..."
    for pod in $(kubectl get pods -n "${NAMESPACE}" -l component=cache -o name); do
        kubectl cp "${REDIS_BACKUP_PATH}/dump.rdb" \
            "${NAMESPACE}/${pod}:/data/dump.rdb" || error "Failed to copy Redis data to pod: ${pod}"
    done
    
    # Restart Redis cluster
    log "Restarting Redis cluster..."
    kubectl rollout restart statefulset -n "${NAMESPACE}" redis-cluster
    kubectl rollout status statefulset -n "${NAMESPACE}" redis-cluster --timeout=300s
    
    # Validate restore
    validate_redis_restore || error "Redis restore validation failed"
    
    # Scale up application
    log "Scaling up application deployments..."
    kubectl scale deployment -n "${NAMESPACE}" --replicas=3 \
        -l app=word-generator,component=api
    
    success "Redis restore completed successfully"
}

# PostgreSQL restore functions
restore_postgres() {
    local backup_date=$1
    local point_in_time=$2
    
    log "Starting PostgreSQL restore process for backup date: ${backup_date}"
    
    # Download PostgreSQL backup
    aws s3 cp "s3://${S3_BUCKET}/postgres/${backup_date}/base.tar.gz" \
        "${PG_BACKUP_PATH}/base.tar.gz" || error "Failed to download PostgreSQL base backup"
    
    # Download WAL files if point-in-time recovery
    if [[ -n "${point_in_time}" ]]; then
        log "Downloading WAL files for point-in-time recovery..."
        aws s3 sync "s3://${S3_BUCKET}/postgres/${backup_date}/wal/" \
            "${PG_BACKUP_PATH}/wal/" || error "Failed to download WAL files"
    fi
    
    # Scale down application
    log "Scaling down application deployments..."
    kubectl scale deployment -n "${NAMESPACE}" --replicas=0 \
        -l app=word-generator,component=api
    
    # Stop PostgreSQL cluster
    log "Stopping PostgreSQL cluster..."
    kubectl scale statefulset -n "${NAMESPACE}" postgres --replicas=0
    
    # Restore base backup
    log "Restoring PostgreSQL base backup..."
    kubectl exec -n "${NAMESPACE}" postgres-0 -- \
        pg_restore -d "${DATABASE_NAME}" "${PG_BACKUP_PATH}/base.tar.gz" || error "Failed to restore base backup"
    
    # Apply WAL files if point-in-time recovery
    if [[ -n "${point_in_time}" ]]; then
        log "Applying WAL files up to ${point_in_time}..."
        kubectl exec -n "${NAMESPACE}" postgres-0 -- \
            pg_ctl -D /var/lib/postgresql/data promote || error "Failed to promote PostgreSQL"
    fi
    
    # Validate restore
    validate_postgres_restore || error "PostgreSQL restore validation failed"
    
    # Scale up application
    log "Scaling up application deployments..."
    kubectl scale deployment -n "${NAMESPACE}" --replicas=3 \
        -l app=word-generator,component=api
    
    success "PostgreSQL restore completed successfully"
}

# Validation functions
validate_redis_restore() {
    log "Validating Redis restore..."
    
    # Check cluster health
    kubectl exec -n "${NAMESPACE}" redis-cluster-0 -- \
        redis-cli cluster info | grep "cluster_state:ok" || return 1
    
    # Verify data accessibility
    kubectl exec -n "${NAMESPACE}" redis-cluster-0 -- \
        redis-cli ping | grep "PONG" || return 1
    
    return 0
}

validate_postgres_restore() {
    log "Validating PostgreSQL restore..."
    
    # Check database connectivity
    kubectl exec -n "${NAMESPACE}" postgres-0 -- \
        pg_isready || return 1
    
    # Verify data integrity
    kubectl exec -n "${NAMESPACE}" postgres-0 -- \
        psql -c "SELECT count(*) FROM word_dictionary;" || return 1
    
    return 0
}

# Main execution
main() {
    local backup_date=$1
    local component=$2
    local point_in_time=${3:-""}
    
    validate_environment
    
    case "${component}" in
        "redis")
            restore_redis "${backup_date}"
            ;;
        "postgres")
            restore_postgres "${backup_date}" "${point_in_time}"
            ;;
        "all")
            restore_redis "${backup_date}"
            restore_postgres "${backup_date}" "${point_in_time}"
            ;;
        *)
            error "Invalid component specified. Use: redis, postgres, or all"
            ;;
    esac
    
    success "Restore process completed successfully"
}

# Script entry point
if [[ $# -lt 2 ]]; then
    error "Usage: $0 <backup_date> <component> [point_in_time]"
fi

main "$@"