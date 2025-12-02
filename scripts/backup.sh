#!/bin/bash

# Zippy File Collector 备份脚本
# 使用方法: ./backup.sh

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/opt/backups/zippy-file-collector"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "开始备份 Zippy File Collector..."
echo "备份目录: $BACKUP_DIR"
echo "项目目录: $PROJECT_DIR"

# 备份数据文件
echo "1. 备份上传数据和配置..."
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" \
    -C "$PROJECT_DIR/data" \
    uploads/ \
    file_metadata.json \
    classmate.txt \
    2>/dev/null || echo "警告: 数据目录为空或不存在"

# 备份应用配置
echo "2. 备份应用配置..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    -C "$PROJECT_DIR" \
    Dockerfile \
    docker-compose.yml \
    package*.json \
    .env* \
    2>/dev/null

# 备份1Panel配置（如果存在）
if [ -d "/etc/1panel" ]; then
    echo "3. 备份1Panel配置..."
    tar -czf "$BACKUP_DIR/1panel_$DATE.tar.gz" -C /etc 1panel/ 2>/dev/null
fi

# 清理旧备份
echo "4. 清理过期备份..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 验证备份文件
echo "5. 验证备份文件..."
BACKUP_SUCCESS=true
for file in "$BACKUP_DIR"/*_$DATE.tar.gz; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        echo "✓ 备份成功: $(basename "$file") (大小: $SIZE)"
    else
        echo "✗ 备份失败: $file"
        BACKUP_SUCCESS=false
    fi
done

# 备份日志
echo "$(date): 备份任务完成" >> "$BACKUP_DIR/backup.log"

if [ "$BACKUP_SUCCESS" = true ]; then
    echo "备份任务成功完成！"
    exit 0
else
    echo "备份过程中出现错误，请检查日志"
    exit 1
fi