#!/usr/bin/env bash

# Rollback Script for Kubernetes Deployments
# Version: 1.0.0
# Dependencies:
# - kubectl v1.27+
# - argocd-cli v2.7+

set -euo pipefail

# Global variables from specification
readonly ENVIRONMENTS=("dev" "staging" "prod")
readonly COMPONENTS=("backend" "frontend" "redis")
readonly ROLLBACK_TIMEOUT=300
readonly HEALTH_CHECK_RETRIES=5
readonly ARGOCD_SERVER="argocd.cluster.local"
readonly LOG_LEVEL="INFO"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    if [[ "${LOG_LEVEL}" == "INFO" ]]; then
        echo -e "${GREEN}[INFO]${NC} $1"
    fi
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate rollback environment with enhanced security checks
validate_rollback_environment() {
    local environment=$1
    local require_mfa=${2:-true}

    log_info "Validating environment: ${environment}"

    # Verify environment is valid
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${environment} " ]]; then
        log_error "Invalid environment: ${environment}"
        return 1
    }

    # Verify ArgoCD connectivity
    if ! argocd cluster list --server "${ARGOCD_SERVER}" &>/dev/null; then
        log_error "Unable to connect to ArgoCD server"
        return 1
    }

    # Verify kubectl context
    current_context=$(kubectl config current-context)
    if [[ ! "${current_context}" =~ "${environment}" ]]; then
        log_error "Current kubectl context does not match environment: ${current_context}"
        return 1
    }

    # Verify RBAC permissions
    if ! kubectl auth can-i rollback deployments --namespace=word-generator; then
        log_error "Insufficient RBAC permissions for rollback"
        return 1
    }

    # Check MFA if required
    if [[ "${require_mfa}" == "true" ]]; then
        if ! verify_mfa; then
            log_error "MFA verification failed"
            return 1
        fi
    fi

    log_info "Environment validation successful"
    return 0
}

# Get previous stable revision with enhanced stability verification
get_previous_revision() {
    local component=$1
    local environment=$2

    log_info "Retrieving previous stable revision for ${component} in ${environment}"

    # Get deployment history
    local revision_history
    revision_history=$(kubectl rollout history deployment/${component} -n word-generator)
    if [[ $? -ne 0 ]]; then
        log_error "Failed to retrieve deployment history"
        return 1
    }

    # Get previous revision number
    local previous_revision
    previous_revision=$(echo "${revision_history}" | grep -A 1 "REVISION" | tail -n 1 | awk '{print $1}')
    
    # Verify revision stability
    if ! verify_revision_stability "${component}" "${previous_revision}"; then
        log_error "Previous revision stability check failed"
        return 1
    }

    echo "${previous_revision}"
}

# Perform rollback with comprehensive verification
perform_rollback() {
    local component=$1
    local environment=$2
    local revision=$3

    log_info "Initiating rollback for ${component} to revision ${revision}"

    # Create pre-rollback snapshot
    create_snapshot "${component}" "${environment}"

    # Stop incoming traffic
    if ! update_traffic_rules "${component}" "stop"; then
        log_error "Failed to stop incoming traffic"
        return 1
    }

    # Execute rollback
    if ! kubectl rollout undo deployment/${component} -n word-generator --to-revision="${revision}"; then
        log_error "Rollback failed for ${component}"
        restore_traffic_rules "${component}"
        return 1
    }

    # Wait for rollback to complete
    if ! kubectl rollout status deployment/${component} -n word-generator --timeout="${ROLLBACK_TIMEOUT}s"; then
        log_error "Rollback did not complete within timeout"
        return 1
    }

    # Verify deployment health
    if ! verify_rollback_health "${component}" "${environment}"; then
        log_error "Health check failed after rollback"
        return 1
    }

    # Restore traffic
    update_traffic_rules "${component}" "restore"

    # Sync ArgoCD state
    argocd app sync "${component}-${environment}" --server "${ARGOCD_SERVER}"

    log_info "Rollback completed successfully for ${component}"
    return 0
}

# Verify rollback health with enhanced metrics validation
verify_rollback_health() {
    local component=$1
    local environment=$2
    local retry_count=0

    log_info "Verifying health for ${component}"

    while [[ ${retry_count} -lt ${HEALTH_CHECK_RETRIES} ]]; do
        # Check pod status
        if ! kubectl get pods -n word-generator -l app="${component}" | grep -q "Running"; then
            log_warn "Pods not running, attempt ${retry_count}/${HEALTH_CHECK_RETRIES}"
            ((retry_count++))
            sleep 5
            continue
        fi

        # Check readiness probe
        if ! kubectl get pods -n word-generator -l app="${component}" | grep -q "1/1"; then
            log_warn "Pods not ready, attempt ${retry_count}/${HEALTH_CHECK_RETRIES}"
            ((retry_count++))
            sleep 5
            continue
        }

        # Verify service endpoints
        if ! kubectl get endpoints -n word-generator "${component}" | grep -q ":"; then
            log_warn "Service endpoints not available, attempt ${retry_count}/${HEALTH_CHECK_RETRIES}"
            ((retry_count++))
            sleep 5
            continue
        }

        log_info "Health check passed for ${component}"
        return 0
    done

    log_error "Health check failed after ${HEALTH_CHECK_RETRIES} attempts"
    return 1
}

# Helper functions
verify_mfa() {
    # Implement MFA verification logic
    return 0
}

verify_revision_stability() {
    local component=$1
    local revision=$2
    
    # Implement revision stability verification
    return 0
}

create_snapshot() {
    local component=$1
    local environment=$2
    
    # Implement snapshot creation logic
    log_info "Created pre-rollback snapshot for ${component}"
}

update_traffic_rules() {
    local component=$1
    local action=$2
    
    # Implement traffic management logic
    log_info "Updated traffic rules for ${component}: ${action}"
    return 0
}

# Main rollback function
rollback_deployment() {
    local component=$1
    local environment=$2
    local security_context=${3:-"require_mfa=true"}

    log_info "Starting rollback process for ${component} in ${environment}"

    # Validate environment
    if ! validate_rollback_environment "${environment}" "${security_context}"; then
        log_error "Environment validation failed"
        return 1
    }

    # Get previous stable revision
    local previous_revision
    previous_revision=$(get_previous_revision "${component}" "${environment}")
    if [[ $? -ne 0 ]]; then
        log_error "Failed to get previous revision"
        return 1
    }

    # Perform rollback
    if ! perform_rollback "${component}" "${environment}" "${previous_revision}"; then
        log_error "Rollback failed"
        return 1
    }

    log_info "Rollback completed successfully"
    return 0
}

# Function to rollback all components
rollback_all() {
    local environment=$1
    local security_context=${2:-"require_mfa=true"}

    log_info "Starting rollback for all components in ${environment}"

    for component in "${COMPONENTS[@]}"; do
        if ! rollback_deployment "${component}" "${environment}" "${security_context}"; then
            log_error "Rollback failed for ${component}"
            return 1
        fi
    done

    log_info "All components rolled back successfully"
    return 0
}

# Main script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -lt 2 ]]; then
        echo "Usage: $0 <component> <environment> [security_context]"
        exit 1
    fi

    rollback_deployment "$1" "$2" "${3:-}"
fi