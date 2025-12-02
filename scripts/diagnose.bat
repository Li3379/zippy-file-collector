@echo off
REM 文件上传部署问题诊断脚本 - Windows版本

echo === 文件上传部署问题诊断 ===

REM 1. 检查目录权限
echo 1. 检查数据目录权限...
dir data\
dir data\uploads\

REM 2. 检查磁盘空间
echo 2. 检查磁盘空间...
wmic logicaldisk get size,freespace,caption

REM 3. 检查Docker服务状态
echo 3. 检查Docker服务...
docker ps -a
docker logs zippy-file-collector --tail=50

REM 4. 检查端口占用
echo 4. 检查端口占用...
netstat -an | findstr :3000

REM 5. 测试服务器连接
echo 5. 测试服务器连接...
curl -I http://localhost:3000/health || echo 健康检查失败

REM 6. 检查容器资源使用
echo 6. 检查容器资源使用...
docker stats --no-stream zippy-file-collector

echo === 诊断完成 ===
pause