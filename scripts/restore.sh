#!/bin/bash

# Zippy File Collector 恢复脚本
# 使用方法: ./restore.sh <备份日期YYYYMMDD_HHMMSS>

set -e

# 检查参数
if [ $# -ne 1 ]; then
    echo "错误: 缺少备份日期参数"
    echo "用法: $0 <备份日期，格式：YYYYMMDD_HHMMSS>"
    echo "示例: $0 20231215_143022"
    exit 1
fi

BACKUP_DATE=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/opt/backups/zippy-file-collector"

echo "开始恢复 Zippy File Collector..."
echo "备份日期: $BACKUP_DATE"
echo "项目目录: $PROJECT_DIR"
echo "备份目录: $BACKUP_DIR"

# 检查备份文件是否存在
DATA_BACKUP="$BACKUP_DIR/data_$BACKUP_DATE.tar.gz"
CONFIG_BACKUP="$BACKUP_DIR/config_$BACKUP_DATE.tar.gz"

if [ ! -f "$DATA_BACKUP" ]; then
    echo "错误: 数据备份文件不存在: $DATA_BACKUP"
    exit 1
fi

if [ ! -f "$CONFIG_BACKUP" ]; then
    echo "错误: 配置备份文件不存在: $CONFIG_BACKUP"
    exit 1
fi

# 确认恢复操作
echo -e "\n警告: 此操作将覆盖当前的数据和配置文件！"
read -p "是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "恢复操作已取消"
    exit 0
fi

# 1. 停止应用服务
echo "1. 停止应用服务..."
cd "$PROJECT_DIR"
if [ -f "docker-compose.yml" ]; then
    docker-compose down
    echo "✓ Docker服务已停止"
else
    echo "警告: 未找到docker-compose.yml文件"
fi

# 2. 恢复数据文件
echo "2. 恢复数据文件..."
if [ -f "$DATA_BACKUP" ]; then
    # 创建数据目录
    mkdir -p "$PROJECT_DIR/data"
    
    # 解压数据备份
    tar -xzf "$DATA_BACKUP" -C "$PROJECT_DIR/data"
    echo "✓ 数据文件恢复完成"
else
    echo "警告: 数据备份文件不存在，跳过数据恢复"
fi

# 3. 恢复配置文件
echo "3. 恢复配置文件..."
if [ -f "$CONFIG_BACKUP" ]; then
    tar -xzf "$CONFIG_BACKUP" -C "$PROJECT_DIR"
    echo "✓ 配置文件恢复完成"
else
    echo "警告: 配置备份文件不存在，跳过配置恢复"
fi

# 4. 设置权限
echo "4. 设置文件权限..."
mkdir -p "$PROJECT_DIR/data/uploads"
mkdir -p "$PROJECT_DIR/logs"
chmod -R 755 "$PROJECT_DIR/data/uploads"
chmod -R 755 "$PROJECT_DIR/logs"

# 5. 重启应用服务
echo "5. 重启应用服务..."
cd "$PROJECT_DIR"
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
    echo "✓ Docker服务启动完成"
    
    # 等待服务启动
    echo "等待服务启动..."
    sleep 15
    
    # 验证服务状态
    if docker ps | grep -q "zippy-file-collector"; then
        echo "✓ 容器运行正常"
    else
        echo "✗ 容器启动失败"
        echo "请检查日志: docker-compose logs"
        exit 1
    fi
    
    # 健康检查
    echo "进行健康检查..."
    HEALTH_CHECK_URL="http://localhost:3000/health"
    for i in {1..10}; do
        if curl -s -f "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
            echo "✓ 应用健康检查通过"
            break
        fi
        
        if [ $i -eq 10 ]; then
            echo "✗ 应用健康检查失败"
            echo "请检查应用日志: docker-compose logs file-collector"
            exit 1
        fi
        
        echo "等待应用启动... ($i/10)"
        sleep 5
    done
else
    echo "警告: 未找到docker-compose.yml文件，请手动启动应用"
fi

# 6. 恢复完成
echo -e "\n==================================="
echo "恢复任务完成！"
echo "==================================="
echo "备份日期: $BACKUP_DATE"
echo "项目目录: $PROJECT_DIR"

if [ -f "docker-compose.yml" ]; then
    echo "服务状态: $(docker-compose ps --format 'table {{.Name}}\t{{.Status}}')"
fi

echo -e "\n请验证应用功能是否正常："
echo "1. 访问 http://your-domain.com"
echo "2. 检查文件上传功能"
echo "3. 验证学生名单显示"
echo "4. 确认数据完整性"

# 记录恢复日志
echo "$(date): 恢复备份 $BACKUP_DATE 完成" >> "$BACKUP_DIR/restore.log"
echo "恢复操作已记录到: $BACKUP_DIR/restore.log"