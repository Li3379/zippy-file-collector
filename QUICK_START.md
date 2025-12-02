# 快速部署指南

## 🚀 一键部署（Docker方式）

### 前提条件
- 腾讯云轻量级应用服务器
- 已安装1Panel
- 域名（可选）

### 部署步骤

#### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker（1Panel会自动安装）
# 安装1Panel
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh
sudo bash quick_start.sh
```

#### 2. 上传项目文件
```bash
# 创建项目目录
mkdir -p /opt/zippy-file-collector
cd /opt/zippy-file-collector

# 上传项目文件（使用SCP或其他方式）
# scp -r ./zippy-file-collector/* root@your-server:/opt/zippy-file-collector/

# 或者Git克隆
git clone <your-repo-url> .
```

#### 3. 配置数据文件
```bash
# 创建数据目录
mkdir -p data logs

# 创建学生名单
cat > data/classmate.txt << EOF
张三
李四
王五
赵六
钱七
# 添加更多学生...
EOF

# 复制环境配置
cp .env.example .env
```

#### 4. 部署应用
```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 5. 配置1Panel

1. **登录1Panel**: http://your-server:8888
2. **创建网站**: 网站 → 创建网站 → 反向代理
3. **配置代理**: 代理地址 `http://127.0.0.1:3000`
4. **配置SSL**: 网站设置 → SSL → Let's Encrypt

### 验证部署
```bash
# 检查容器状态
docker ps | grep zippy-file-collector

# 检查应用健康
curl http://localhost:3000/health

# 访问应用
http://your-domain.com
```

## 📋 配置文件说明

| 文件 | 说明 | 必需 |
|------|------|------|
| `Dockerfile` | Docker镜像构建文件 | ✅ |
| `docker-compose.yml` | 容器编排配置 | ✅ |
| `.env.example` | 环境变量示例 | ❌ |
| `classmate.txt` | 学生名单文件 | ✅ |
| `data/uploads/` | 上传文件目录 | ✅ |

## 🔧 常用命令

```bash
# 重启应用
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新应用
git pull && docker-compose build && docker-compose up -d

# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 查看资源使用
docker stats zippy-file-collector
```

## 📞 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep 3000
   # 修改docker-compose.yml中的端口映射
   ```

2. **权限问题**
   ```bash
   # 检查数据目录权限
   ls -la data/
   # 修复权限
   sudo chown -R 1001:1001 data/
   ```

3. **内存不足**
   ```bash
   # 检查系统资源
   free -h
   # 调整容器内存限制
   ```

### 日志查看
```bash
# 应用日志
docker-compose logs file-collector

# Nginx日志（通过1Panel）
# 网站 → 日志管理

# 系统日志
journalctl -u docker
```

---

**详细文档请参考**: [DEPLOYMENT.md](./DEPLOYMENT.md)