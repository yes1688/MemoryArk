#!/bin/bash

# MemoryArk 2.0 自動備份腳本

BACKUP_DIR="/backup/memoryark"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="memoryark_backup_$DATE"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

# 停止服務
systemctl --user stop memoryark

# 備份資料庫
cp data/memoryark.db "$BACKUP_DIR/${BACKUP_NAME}.db"

# 備份上傳檔案（使用 rsync 增量備份）
rsync -av --delete uploads/ "$BACKUP_DIR/uploads_$DATE/"

# 壓縮備份
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}.db" "uploads_$DATE/"

# 清理超過 30 天的備份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# 重啟服務
systemctl --user start memoryark

echo "備份完成: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
