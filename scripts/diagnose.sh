#!/bin/bash

# 文件上传部署问题诊断脚本

echo "=== 文件上传部署问题诊断 ==="

# 1. 检查目录权限
echo "1. 检查数据目录权限..."
ls -la ./data/
ls -la ./data/uploads/

# 2. 检查磁盘空间
echo "2. 检查磁盘空间..."
df -h

# 3. 检查Docker服务状态
echo "3. 检查Docker服务..."
docker ps -a
docker logs zippy-file-collector --tail=50

# 4. 检查端口占用
echo "4. 检查端口占用..."
netstat -tulpn | grep :3000

# 5. 测试服务器连接
echo "5. 测试服务器连接..."
curl -I http://localhost:3000/health || echo "健康检查失败"

# 6. 检查内存使用
echo "6. 检查容器内存使用..."
docker stats --no-stream zippy-file-collector

echo "=== 诊断完成 ==="