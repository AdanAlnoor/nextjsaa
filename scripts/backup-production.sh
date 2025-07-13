#!/bin/bash

# Production backup script
set -euo pipefail

# Configuration
BACKUP_DIR="/tmp/backups"
S3_BUCKET="${S3_BACKUP_BUCKET:-your-backup-bucket}"
DATABASE_URL="${DATABASE_URL}"
RETENTION_DAYS=30
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Function to send Slack notification
notify_slack() {
    local message="$1"
    local color="$2"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d @- <<EOF
{
    "attachments": [{
        "color": "$color",
        "text": "$message",
        "footer": "Backup System",
        "ts": $(date +%s)
    }]
}
EOF
    fi
}

# Start backup
echo "Starting backup at $(date)"
notify_slack "Starting production backup" "warning"

# Create database backup using Supabase CLI if available, otherwise pg_dump
if command -v supabase &> /dev/null && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
    echo "Using Supabase CLI for backup"
    if supabase db dump --project-ref "$SUPABASE_PROJECT_REF" \
        --exclude-table-data='audit_logs' \
        --exclude-table-data='background_job_logs' | \
        gzip -9 > "$BACKUP_PATH"; then
        
        echo "Supabase backup completed successfully"
        BACKUP_SUCCESS=true
    else
        echo "Supabase backup failed, trying pg_dump"
        BACKUP_SUCCESS=false
    fi
else
    echo "Using pg_dump for backup"
    BACKUP_SUCCESS=false
fi

# Fallback to pg_dump if Supabase CLI failed or not available
if [ "$BACKUP_SUCCESS" = false ]; then
    if pg_dump "$DATABASE_URL" \
        --no-owner \
        --no-privileges \
        --exclude-table-data='audit_logs' \
        --exclude-table-data='background_job_logs' | \
        gzip -9 > "$BACKUP_PATH"; then
        
        echo "Database backup completed successfully"
        BACKUP_SUCCESS=true
    else
        notify_slack "Database backup failed" "danger"
        exit 1
    fi
fi

if [ "$BACKUP_SUCCESS" = true ]; then
    # Get backup size
    BACKUP_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
        if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/database/${BACKUP_FILE}" \
            --storage-class STANDARD_IA; then
            
            echo "Backup uploaded to S3 successfully"
            
            # Create metadata file
            cat > "${BACKUP_PATH}.metadata" <<EOF
{
    "timestamp": "$TIMESTAMP",
    "size": "$BACKUP_SIZE",
    "retention_days": $RETENTION_DAYS,
    "environment": "${NODE_ENV:-production}"
}
EOF
            
            # Upload metadata
            aws s3 cp "${BACKUP_PATH}.metadata" "s3://${S3_BUCKET}/database/${BACKUP_FILE}.metadata"
            
            # Clean up old backups locally
            find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete || true
            
            # Clean up old S3 backups
            aws s3 ls "s3://${S3_BUCKET}/database/" | \
                awk '{print $4}' | \
                grep "^backup_" | \
                sort -r | \
                tail -n +$((RETENTION_DAYS + 1)) | \
                xargs -I {} aws s3 rm "s3://${S3_BUCKET}/database/{}" || true
            
            notify_slack "Production backup completed successfully. Size: $BACKUP_SIZE" "good"
        else
            notify_slack "Failed to upload backup to S3" "danger"
            echo "S3 upload failed, but backup file saved locally"
        fi
    else
        echo "AWS CLI not configured or S3 bucket not set, backup saved locally only"
        notify_slack "Production backup completed (local only). Size: $BACKUP_SIZE" "good"
    fi
fi

# Test backup restoration (on a test database) - only if TEST_RESTORE is set
if [ "${TEST_RESTORE:-false}" = "true" ]; then
    echo "Testing backup restoration..."
    
    TEST_DB="backup_test_${TIMESTAMP}"
    if command -v createdb &> /dev/null; then
        createdb "$TEST_DB" || true
        
        if gunzip -c "$BACKUP_PATH" | psql "postgresql://localhost/$TEST_DB"; then
            echo "Backup restoration test passed"
            dropdb "$TEST_DB" || true
        else
            notify_slack "Backup restoration test failed!" "danger"
            dropdb "$TEST_DB" || true
            exit 1
        fi
    else
        echo "PostgreSQL client tools not available, skipping restore test"
    fi
fi

echo "Backup process completed at $(date)"