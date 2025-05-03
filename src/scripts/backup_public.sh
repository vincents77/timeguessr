#!/bin/bash
# scripts/backup_public.sh

mkdir -p backups
timestamp=$(date +"%Y%m%d_%H%M%S")
tar -czf backups/public_backup_$timestamp.tar.gz public
echo "✅ Backup created at backups/public_backup_$timestamp.tar.gz"