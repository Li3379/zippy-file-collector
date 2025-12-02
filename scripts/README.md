# 运维脚本说明

本目录包含 Zippy File Collector 项目的运维管理脚本。

## 📁 脚本列表

### 🚀 deploy.sh - 一键部署脚本

**功能**: 自动化部署整个应用环境

**适用场景**:
- 全新服务器部署
- 快速环境搭建
- 批量部署

**使用方法**:
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

**执行内容**:
- 系统环境检查
- Docker安装配置
- 1Panel安装
- 项目结构创建
- 应用部署启动
- 防火墙配置

**注意事项**:
- 需要root权限运行
- 仅支持Ubuntu系统
- 需要网络连接

### 💾 backup.sh - 备份脚本

**功能**: 自动备份应用数据和配置

**适用场景**:
- 定期数据备份
- 迁移前备份
- 安全备份

**使用方法**:
```bash
chmod +x backup.sh
./backup.sh
```

**备份内容**:
- 上传文件目录 (uploads/)
- 应用元数据 (file_metadata.json)
- 学生名单文件 (classmate.txt)
- 应用配置文件
- 1Panel配置（可选）

**备份位置**: `/opt/backups/zippy-file-collector/`

**保留策略**: 30天

### 🔄 restore.sh - 恢复脚本

**功能**: 从备份恢复应用数据

**适用场景**:
- 数据迁移
- 误操作恢复
- 灾难恢复

**使用方法**:
```bash
chmod +x restore.sh
./restore.sh <备份日期>
```

**参数说明**:
- 备份日期格式: YYYYMMDD_HHMMSS

**示例**:
```bash
./restore.sh 20231215_143022
```

**恢复流程**:
1. 停止应用服务
2. 恢复数据文件
3. 恢复配置文件
4. 重启应用服务
5. 健康检查验证

## 🔧 脚本配置

### 环境变量配置

脚本支持通过环境变量进行配置：

```bash
# 备份目录
export BACKUP_DIR="/custom/backup/path"

# 保留天数
export RETENTION_DAYS=60

# 项目目录
export PROJECT_DIR="/custom/project/path"
```

### 权限设置

所有脚本都需要设置执行权限：
```bash
chmod +x scripts/*.sh
```

## 📅 自动化任务

### 设置定时备份

使用crontab设置自动备份：

```bash
# 编辑crontab
crontab -e

# 添加每日凌晨3点备份任务
0 3 * * * /opt/zippy-file-collector/scripts/backup.sh

# 每周日凌晨2点进行完整备份
0 2 * * 0 /opt/zippy-file-collector/scripts/backup.sh && /opt/zippy-file-collector/scripts/backup_1panel.sh
```

### 设置监控任务

```bash
# 每5分钟检查应用健康状态
*/5 * * * * /opt/zippy-file-collector/scripts/health_check.sh

# 每小时检查系统资源
0 * * * * /opt/zippy-file-collector/scripts/system_check.sh
```

## 📊 日志管理

### 脚本日志位置

- 备份日志: `/opt/backups/zippy-file-collector/backup.log`
- 恢复日志: `/opt/backups/zippy-file-collector/restore.log`
- 部署日志: `/var/log/zippy-deploy.log`

### 日志轮转配置

在 `/etc/logrotate.d/zippy-file-collector` 中添加：

```
/opt/backups/zippy-file-collector/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## 🔍 故障排除

### 常见问题

1. **权限不足**
   ```bash
   sudo chmod +x scripts/*.sh
   sudo chown root:root scripts/*.sh
   ```

2. **Docker未启动**
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep 3000
   # 修改docker-compose.yml端口映射
   ```

4. **磁盘空间不足**
   ```bash
   # 清理旧备份
   ./backup.sh --cleanup
   # 清理Docker镜像
   docker system prune -a
   ```

### 调试模式

所有脚本支持调试模式：

```bash
# 开启详细输出
export DEBUG=1
./backup.sh

# 或者在脚本中设置
DEBUG=1 ./backup.sh
```

## 🔐 安全考虑

### 脚本安全

1. **权限控制**: 脚本应该只允许root用户执行
2. **输入验证**: 脚本会验证所有用户输入
3. **路径安全**: 使用绝对路径避免路径遍历

### 数据安全

1. **备份加密**: 建议对备份文件进行加密
2. **访问控制**: 限制备份目录访问权限
3. **传输安全**: 使用SCP/SFTP传输备份文件

## 📞 技术支持

### 联系方式

- 项目文档: [DEPLOYMENT.md](../DEPLOYMENT.md)
- 快速开始: [QUICK_START.md](../QUICK_START.md)

### 贡献指南

欢迎提交问题报告和功能请求：
1. 提供详细的错误信息
2. 包含系统环境信息
3. 附上相关日志文件

---

**注意**: 在生产环境使用前，请先在测试环境验证所有脚本功能。