#!/bin/bash

# Dog Booking System - Database Backup Script
# This script creates database backups and uploads them to AWS S3

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
BACKUP_FILE="${BACKUP_DIR}/dogbooking_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check required environment variables
check_env() {
    local required_vars=("DB_HOST" "DB_DATABASE" "DB_USERNAME" "DB_PASSWORD" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "BACKUP_BUCKET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Create database backup
create_backup() {
    log "Starting database backup for: $DB_DATABASE"
    
    # Create database dump
    if mysqldump \
        --host="$DB_HOST" \
        --user="$DB_USERNAME" \
        --password="$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-table \
        --add-locks \
        --disable-keys \
        --extended-insert \
        --quick \
        --lock-tables=false \
        "$DB_DATABASE" > "$BACKUP_FILE"; then
        
        log "Database backup created successfully: $BACKUP_FILE"
    else
        error "Failed to create database backup"
        exit 1
    fi
    
    # Compress backup
    log "Compressing backup file..."
    if gzip "$BACKUP_FILE"; then
        BACKUP_FILE="${BACKUP_FILE}.gz"
        log "Backup compressed: $BACKUP_FILE"
    else
        warning "Failed to compress backup file"
    fi
}

# Upload to S3
upload_to_s3() {
    log "Uploading backup to S3: s3://$BACKUP_BUCKET/database/"
    
    if aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_BUCKET/database/" \
        --storage-class STANDARD_IA \
        --metadata timestamp="$TIMESTAMP"; then
        
        log "Backup uploaded successfully to S3"
    else
        error "Failed to upload backup to S3"
        exit 1
    fi
}

# Cleanup old local backups
cleanup_local() {
    log "Cleaning up local backups older than $RETENTION_DAYS days"
    
    if find "$BACKUP_DIR" -name "dogbooking_backup_*.sql*" -type f -mtime +$RETENTION_DAYS -delete; then
        log "Local cleanup completed"
    else
        warning "Failed to cleanup old local backups"
    fi
}

# Cleanup old S3 backups
cleanup_s3() {
    log "Cleaning up S3 backups older than $RETENTION_DAYS days"
    
    # Calculate date threshold
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        THRESHOLD_DATE=$(date -v-${RETENTION_DAYS}d +%Y-%m-%d)
    else
        # Linux
        THRESHOLD_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    fi
    
    # List and delete old files
    aws s3api list-objects-v2 \
        --bucket "$BACKUP_BUCKET" \
        --prefix "database/" \
        --query "Contents[?LastModified<='$THRESHOLD_DATE'].Key" \
        --output text | while read -r key; do
        
        if [ -n "$key" ] && [ "$key" != "None" ]; then
            log "Deleting old backup: $key"
            aws s3 rm "s3://$BACKUP_BUCKET/$key"
        fi
    done
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # You can implement notification logic here (Slack, Discord, email, etc.)
    if [ "$status" = "success" ]; then
        log "Backup completed successfully"
    else
        error "Backup failed: $message"
    fi
}

# Main execution
main() {
    log "Starting backup process..."
    
    # Check environment
    check_env
    
    # Create backup directory
    create_backup_dir
    
    # Create backup
    create_backup
    
    # Upload to S3
    upload_to_s3
    
    # Cleanup
    cleanup_local
    cleanup_s3
    
    # Send success notification
    send_notification "success" "Backup completed successfully"
    
    log "Backup process completed successfully!"
}

# Error handling
trap 'error "Backup script failed"; send_notification "error" "Backup script failed"; exit 1' ERR

# Run main function
main "$@" 