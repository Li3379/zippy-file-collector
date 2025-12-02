# 部署指南

## 🚀 快速部署

### 腾讯云一键部署
1. 访问腾讯云开发者平台
2. 选择"从GitHub导入"
3. 输入仓库地址: `https://github.com/Li3379/zippy-file-collector`
4. 设置环境变量:
   - `NODE_ENV=production`
   - `PORT=8080`
5. 点击部署

### Docker容器化
```bash
# 构建镜像
docker build -t zippy-file-collector .

# 运行容器
docker run -d -p 8080:8080 \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  zippy-file-collector

# 使用docker-compose
docker-compose up -d --build
```

### 传统服务器部署
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm start

# 环境变量
export NODE_ENV=production
export PORT=8080
```

## ⚙️ 环境配置

### 生产环境
```env
NODE_ENV=production
PORT=8080
TMPDIR=/tmp
LOG_LEVEL=info
```

### 开发环境
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

## 🔧 系统配置

### 文件大小限制
- 默认最大: 100MB
- 内存存储: ≤5MB
- 磁盘存储: >5MB

### 支持的文件格式
- `.zip` - ZIP压缩包
- `.rar` - WinRAR压缩包  
- `.7z` - 7-Zip压缩包
- `.tar` - Tar归档
- `.gz` - Gzip压缩包

### 存储配置
- 小文件: 内存存储 + Base64编码
- 大文件: 磁盘存储 + 文件路径引用
- 元数据: JSON文件存储

## 📊 性能优化

### 内存管理
- LRU缓存机制
- 自动内存清理
- 实时性能监控

### 存储优化
- 智能存储策略
- 缓存命中率优化
- 磁盘I/O减少

### 网络优化
- 压缩传输支持
- CORS配置优化
- 响应头优化

## 🛠️ 安全配置

### 文件安全
- 文件格式白名单验证
- 文件大小限制检查
- 文件路径安全验证

### 访问控制
- CORS跨域配置
- 请求频率限制
- 输入数据验证

## 📋 监控和日志

### 系统监控
- 内存使用监控
- CPU使用监控
- 磁盘空间监控
- 响应时间监控

### 日志记录
- 访问日志记录
- 错误日志记录
- 操作日志记录
- 性能日志记录

## 🚨 故障排除

### 常见问题

#### 上传失败
1. 检查文件格式是否支持
2. 确认文件大小是否超限
3. 验证网络连接是否正常
4. 查看服务器日志错误信息

#### 服务器错误
1. 检查环境变量配置
2. 确认依赖包是否正确安装
3. 验证端口是否被占用
4. 查看系统资源使用情况

#### 下载失败
1. 确认文件是否存在
2. 检查存储类型是否正确
3. 验证文件路径是否有效
4. 查看磁盘空间是否充足

### 诊断工具
```bash
# 运行诊断脚本
./scripts/diagnose.sh  # Linux
./scripts/diagnose.bat # Windows

# 查看系统日志
tail -f logs/error.log

# 检查系统资源
df -h
free -m
```

## 📈 扩展开发

### API文档
参考 [API接口文档](API_DOCUMENTATION.md)

### 数据库集成
系统设计支持数据库扩展，可替换JSON文件存储：
- MongoDB
- MySQL
- PostgreSQL
- SQLite

### 云存储集成
支持集成第三方云存储：
- 阿里云OSS
- 腾讯云COS
- AWS S3
- 七牛云

### 认证集成
支持集成第三方认证：
- 微信认证
- QQ认证
- 企业微信
- 自定义OAuth

## 🔧 维护指南

### 定期维护
- 清理过期文件
- 备份重要数据
- 更新依赖包
- 监控系统健康

### 性能调优
- 定期性能测试
- 数据库查询优化
- 缓存策略调整
- 负载均衡配置

### 安全维护
- 定期安全扫描
- 更新安全补丁
- 审查访问日志
- 权限管理

## 📞 用户支持

### 帮见问题
- 如何批量上传文件？
- 如何修改文件大小限制？
- 如何备份数据？
- 如何迁移到新服务器？

### 技术支持
- GitHub Issues
- 邮件支持
- 在线文档
- 视频教程

### 社区支持
- 开发者论坛
- 用户交流群
- 贡献指南
- 反馈渠道

---

如有其他问题，请查看 [GitHub Issues](https://github.com/Li3379/zippy-file-collector/issues) 或提交新的Issue。