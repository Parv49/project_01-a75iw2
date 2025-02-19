#!/bin/bash

# Random Word Generator Application Backup Script
# Version: 1.0.0
# Performs automated backup of Redis cache and PostgreSQL database
# Supports full and incremental backups with compression and retention management

set -euo pipefail
IFS=$'\n\t'

# Global Configuration
BACKUP_ROOT="/backup"
RETENTION_DAYS=30
S3_BUCKET="word-generator-backups"
NAMESPACE="word-generator"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_ROOT}/${TIMESTAMP}"
LOG_FILE="${BACKUP_ROOT}/backup_${TIMESTAMP}.log"

# AWS S3 configuration
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-"us-east-1"}
S3_PATH="s3://${S3_BUCKET}/backups/${TIMESTAMP}"

# Compression settings
COMPRESSION_THREADS=$(nproc)
ZSTD_COMPRESSION_LEVEL=3

# Initialize logging
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

# Validate environment and dependencies
validate_environment() {
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
    command -v aws >/dev/null 2>&1 || error "aws-cli is required but not installed"
    command -v zstd >/dev/null 2>&1 || error "zstd is required but not installed"
    
    # Verify AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "Invalid AWS credentials"
    
    # Create backup directory
    mkdir -p "${BACKUP_PATH}" || error "Failed to create backup directory"
}

# Backup Redis cluster data
backup_redis() {
    local backup_path="$1"
    log "Starting Redis backup..."
    
    # Get Redis pods
    local redis_pods=($(kubectl get pods -n "${NAMESPACE}" -l app=word-generator,component=cache -o jsonpath='{.items[*].metadata.name}'))
    
    for pod in "${redis_pods[@]}"; do
        log "Backing up Redis pod: ${pod}"
        
        # Verify Redis health
        kubectl exec "${pod}" -n "${NAMESPACE}" -- redis-cli ping >/dev/null || error "Redis health check failed for ${pod}"
        
        # Create backup directory
        local pod_backup_dir="${backup_path}/redis/${pod}"
        mkdir -p "${pod_backup_dir}"
        
        # Execute SAVE command and copy RDB file
        kubectl exec "${pod}" -n "${NAMESPACE}" -- bash -c "redis-cli SAVE && cp /data/dump.rdb /tmp/dump.rdb"
        kubectl cp "${NAMESPACE}/${pod}:/tmp/dump.rdb" "${pod_backup_dir}/dump.rdb"
        
        # Compress backup
        zstd -T"${COMPRESSION_THREADS}" -"${ZSTD_COMPRESSION_LEVEL}" "${pod_backup_dir}/dump.rdb" -o "${pod_backup_dir}/dump.rdb.zst"
        rm "${pod_backup_dir}/dump.rdb"
        
        # Generate checksum
        sha256sum "${pod_backup_dir}/dump.rdb.zst" > "${pod_backup_dir}/dump.rdb.zst.sha256"
    done
    
    log "Redis backup completed successfully"
    return 0
}

# Backup PostgreSQL database
backup_postgres() {
    local backup_path="$1"
    local backup_type="$2"
    log "Starting PostgreSQL backup (${backup_type})..."
    
    local pg_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=word-generator,component=database -o jsonpath='{.items[0].metadata.name}')
    local backup_file="${backup_path}/postgres/word_generator_${backup_type}.sql"
    
    # Create backup directory
    mkdir -p "$(dirname "${backup_file}")"
    
    # Set pg_dump options based on backup type
    local pg_dump_opts=""
    if [ "${backup_type}" = "full" ]; then
        pg_dump_opts="--clean --if-exists --create --format=custom"
    else
        pg_dump_opts="--format=custom --data-only"
    fi
    
    # Execute pg_dump
    kubectl exec "${pg_pod}" -n "${NAMESPACE}" -- \
        pg_dump ${pg_dump_opts} \
        --compress=0 \
        --file=/tmp/backup.sql \
        "${DATABASE_NAME}"
    
    # Copy and compress backup
    kubectl cp "${NAMESPACE}/${pg_pod}:/tmp/backup.sql" "${backup_file}"
    zstd -T"${COMPRESSION_THREADS}" -"${ZSTD_COMPRESSION_LEVEL}" "${backup_file}" -o "${backup_file}.zst"
    rm "${backup_file}"
    
    # Generate checksum
    sha256sum "${backup_file}.zst" > "${backup_file}.zst.sha256"
    
    log "PostgreSQL backup completed successfully"
    return 0
}

# Validate backup integrity
validate_backup() {
    local backup_path="$1"
    log "Validating backup integrity..."
    
    local validation_errors=0
    
    # Validate Redis backups
    find "${backup_path}/redis" -name "*.zst" -type f | while read -r file; do
        if ! sha256sum -c "${file}.sha256" >/dev/null 2>&1; then
            log "Checksum validation failed for: ${file}"
            ((validation_errors++))
        fi
    done
    
    # Validate PostgreSQL backup
    if [ -f "${backup_path}/postgres/word_generator_full.sql.zst" ]; then
        if ! sha256sum -c "${backup_path}/postgres/word_generator_full.sql.zst.sha256" >/dev/null 2>&1; then
            log "Checksum validation failed for PostgreSQL backup"
            ((validation_errors++))
        fi
    fi
    
    if [ ${validation_errors} -gt 0 ]; then
        error "Backup validation failed with ${validation_errors} errors"
    fi
    
    log "Backup validation completed successfully"
    return 0
}

# Clean up old backups
cleanup_old_backups() {
    local backup_path="$1"
    log "Cleaning up old backups..."
    
    # Clean local backups
    find "${BACKUP_ROOT}" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;
    
    # Clean S3 backups
    aws s3 ls "${S3_BUCKET}/backups/" | while read -r line; do
        local backup_date=$(echo "$line" | awk '{print $1}')
        if [ $(date -d "${backup_date}" +%s) -lt $(date -d "-${RETENTION_DAYS} days" +%s) ]; then
            aws s3 rm --recursive "s3://${S3_BUCKET}/backups/${backup_date}/"
        fi
    done
    
    log "Cleanup completed successfully"
    return 0
}

# Upload backup to S3
upload_to_s3() {
    log "Uploading backup to S3..."
    
    # Upload with retry logic
    local retries=3
    local retry_delay=5
    
    while [ ${retries} -gt 0 ]; do
        if aws s3 sync "${BACKUP_PATH}" "${S3_PATH}" --only-show-errors; then
            log "Backup uploaded successfully to ${S3_PATH}"
            return 0
        fi
        ((retries--))
        if [ ${retries} -gt 0 ]; then
            log "Upload failed, retrying in ${retry_delay} seconds..."
            sleep ${retry_delay}
            ((retry_delay*=2))
        fi
    done
    
    error "Failed to upload backup to S3 after all retries"
}

# Main backup process
main() {
    log "Starting backup process..."
    
    # Validate environment
    validate_environment
    
    # Perform backups
    backup_redis "${BACKUP_PATH}"
    backup_postgres "${BACKUP_PATH}" "full"
    
    # Validate backups
    validate_backup "${BACKUP_PATH}"
    
    # Upload to S3
    upload_to_s3
    
    # Cleanup old backups
    cleanup_old_backups "${BACKUP_PATH}"
    
    log "Backup process completed successfully"
}

# Execute main function
main

exit 0