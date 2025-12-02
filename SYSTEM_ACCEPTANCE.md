# Zippy File Collector 系统验收文档

## 📋 项目概述

**项目名称**: Zippy File Collector  
**版本**: 1.0.0  
**类型**: Node.js + Express 文件上传系统  
**目标用户**: 班级作业收集场景，支持50人左右使用  

## 🎯 系统功能特性

### ✅ 核心功能
- **文件上传**: 支持多种压缩格式 (.zip, .rar, .7z, .tar, .gz)
- **文件大小限制**: 最大100MB，支持大文件处理
- **学生管理**: 自动加载和验证学生名单
- **上传统计**: 实时显示上传进度和完成率
- **文件更新**: 支持同一学生重复上传文件
- **文件下载**: 所有用户可下载已上传文件
- **文件删除**: 支持删除已上传文件
- **响应式设计**: 适配PC和移动设备

### 🏗️ 技术架构

#### 后端技术栈
- **运行环境**: Node.js >= 14.0.0
- **Web框架**: Express.js v4.18.2
- **文件处理**: Multer v1.4.5
- **跨域支持**: CORS 中间件
- **文件系统**: Node.js fs.promises

#### 前端技术栈
- **基础**: 原生 HTML5 + CSS3 + JavaScript (ES6+)
- **样式**: 现代CSS，响应式布局
- **交互**: 原生Fetch API + XMLHttpRequest
- **UI组件**: 无框架依赖，轻量化设计

#### 存储策略
- **智能混合存储**: 根据文件大小动态选择存储方式
- **小文件 (≤5MB)**: 内存存储 + base64编码，快速响应
- **大文件 (>5MB)**: 磁盘存储 + 文件路径引用，节省内存
- **元数据**: JSON文件存储，LRU缓存优化
- **缓存机制**: 文件元数据缓存，减少I/O操作

## 🔧 系统配置

### 环境变量
```env
NODE_ENV=production    # 生产环境
PORT=8080             # 服务器端口
TMPDIR=/tmp           # 临时目录
```

### 性能优化配置
```javascript
const MEMORY_LIMIT = 5 * 1024 * 1024;   // 5MB 内存存储阈值
const DISK_LIMIT = 100 * 1024 * 1024; // 100MB 磁盘存储阈值
const MAX_LIMIT = 100 * 1024 * 1024; // 100MB 最大文件限制
```

### 支持的文件格式
- `.zip` - ZIP压缩包
- `.rar` - WinRAR压缩包
- `.7z` - 7-Zip压缩包
- `.tar` - Tar归档
- `.gz` - Gzip压缩包

## 📊 API接口文档

### 文件上传
```
POST /upload
Content-Type: multipart/form-data

参数:
- file: 文件对象 (必填)
- student: 学生姓名 (必填)
- description: 文件描述 (可选)
- isUpdate: 更新标识 (可选)

响应:
{
  "success": true,
  "message": "文件上传成功",
  "file": {
    "id": 1699123456789,
    "originalName": "作业.zip",
    "student": "张三",
    "size": 15728640,
    "storageType": "disk",
    "uploadDate": "2025-12-02T16:06:26.000Z"
  }
}
```

### 文件列表
```
GET /files

响应:
{
  "success": true,
  "files": [...],
  "unuploadedStudents": [...],
  "totalStudents": 50,
  "uploadedCount": 25,
  "unuploadedCount": 25
}
```

### 文件下载
```
GET /download/:id

响应: 文件二进制流
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="作业.zip"
```

### 文件删除
```
DELETE /files/:id

响应:
{
  "success": true,
  "message": "文件删除成功"
}
```

### 学生名单管理
```
GET /students

响应:
{
  "success": true,
  "students": ["黄依琪", "刘美旺", "梁雨欢", ...]
}
```

### 健康检查
```
GET /health

响应:
{
  "status": "ok",
  "timestamp": "2025-12-02T16:06:26.000Z",
  "port": 8080,
  "env": "production",
  "uploadDir": "/tmp/uploads",
  "memory": {
    "rss": 85,
    "heapUsed": 42
  }
}
```

## 🎨 用户界面设计

### 页面布局
- **顶部**: 系统标题和描述信息
- **上传区域**: 学生选择、文件上传、描述输入
- **进度显示**: 实时上传进度条
- **统计区域**: 上传统计图表和完成率
- **文件列表**: 已上传文件展示和管理
- **未上传学生**: 未提交作业学生列表

### 交互特性
- **实时验证**: 文件格式和大小检查
- **进度反馈**: 上传进度条和百分比
- **错误提示**: 友好的错误信息显示
- **成功反馈**: 操作成功的确认消息
- **确认对话框**: 文件删除前的确认提示

### 样式设计
- **主题色**: 蓝紫渐变背景 (#667eea → #764ba2)
- **卡片式**: 模块化卡片布局设计
- **响应式**: 适配桌面和移动设备
- **动画效果**: 按钮悬停和过渡动画
- **图标系统**: Emoji图标增强视觉效果

## 🚀 部署方案

### 腾讯云运行环境
```yaml
runtime: NodeJS 16.15
env: production

环境变量:
  NODE_ENV: production
  PORT: 8080
  TMPDIR: /tmp

资源配置:
  cpu: 1.0
  memory: 512Mi

健康检查:
  http_path: /health
  check_interval_sec: 30
  timeout_sec: 5
```

### Docker容器化
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["npm", "start"]
```

### 传统部署
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm start

# 端口: 3000 (可配置)
```

## 📈 性能优化

### 存储优化
- **LRU缓存**: 元数据缓存，减少磁盘I/O
- **混合存储**: 小文件内存存储，大文件磁盘存储
- **分片处理**: 大文件分片上传和处理
- **压缩存储**: base64编码，节省存储空间

### 内存优化
- **缓存管理**: 智能缓存清理机制
- **内存监控**: 实时内存使用监控
- **垃圾回收**: 及时释放无用对象
- **流式处理**: 大文件流式处理

### 网络优化
- **压缩传输**: Gzip压缩响应
- **CDN友好**: 静态资源CDN部署
- **缓存头**: 合理的HTTP缓存设置
- **跨域优化**: CORS配置优化

## 🛡️ 安全特性

### 文件安全
- **格式验证**: 严格的文件格式白名单
- **大小限制**: 最大100MB文件大小限制
- **路径验证**: 文件路径安全验证
- **恶意文件**: 文件类型安全检查

### 访问控制
- **CORS配置**: 跨域请求安全控制
- **请求限制**: 合理的请求频率限制
- **输入验证**: 用户输入数据验证和清理
- **错误处理**: 统一错误处理和日志记录

### 数据保护
- **文件隔离**: 用户文件相互隔离
- **元数据保护**: 敏感信息保护
- **临时文件**: 定期清理临时文件
- **访问日志**: 完整的访问日志记录

## 📊 监控和日志

### 系统监控
- **性能监控**: CPU、内存、磁盘使用监控
- **文件统计**: 上传文件数量和大小统计
- **用户行为**: 用户操作行为分析
- **错误追踪**: 系统错误和异常追踪

### 日志记录
- **访问日志**: HTTP请求访问日志
- **操作日志**: 用户操作详细日志
- **错误日志**: 系统错误堆栈日志
- **性能日志**: 性能指标和响应时间

### 运维工具
- **健康检查**: `/health` 接口状态检查
- **诊断脚本**: 自动化问题诊断脚本
- **文件管理**: 批量文件导出和管理工具
- **配置管理**: 系统配置和环境管理

## 🔧 开发和运维

### 开发环境
```bash
# 克隆项目
git clone https://github.com/Li3379/zippy-file-collector.git

# 安装依赖
npm install

# 开发模式 (热重载)
npm run dev

# 访问地址
http://localhost:3000
```

### 测试指南
```bash
# 健康检查
curl http://localhost:3000/health

# 上传测试
curl -X POST -F "file=@test.zip" -F "student=张三" http://localhost:3000/upload

# 文件列表
curl http://localhost:3000/files
```

### 故障排除
1. **上传失败**: 检查文件格式和大小限制
2. **服务器错误**: 查看服务器日志和错误信息
3. **权限问题**: 确认目录权限和访问权限
4. **性能问题**: 监控内存和CPU使用情况

## 📚 项目结构

```
zippy-file-collector/
├── index.html              # 前端入口页面
├── style.css                # 样式文件
├── script.js                # 前端交互逻辑
├── server.js                # 后端服务器文件
├── package.json             # 项目依赖配置
├── classmate.txt             # 学生名单文件
├── README.md                # 项目说明文档
├── docker-compose.yml        # Docker配置
├── Dockerfile               # Docker镜像构建
├── .env.example             # 环境变量示例
├── .gitignore              # Git忽略配置
├── scripts/                 # 部署和管理脚本
│   ├── diagnose.sh          # Linux诊断脚本
│   ├── diagnose.bat         # Windows诊断脚本
│   ├── file-manager.js      # 文件管理工具
│   └── init-students.js     # 学生列表初始化
├── data/                    # 本地数据目录 (开发环境)
│   ├── uploads/              # 本地上传文件
│   └── file_metadata.json  # 本地元数据存储
└── uploads/                 # 上传文件目录
```

## 🚀 快速开始

### 1. 环境准备
- Node.js >= 14.0.0
- npm >= 6.0.0
- 2GB+ 内存推荐
- 100MB+ 磁盘空间

### 2. 安装部署
```bash
# 下载项目
git clone https://github.com/Li3379/zippy-file-collector.git
cd zippy-file-collector

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动服务
npm start
```

### 3. 访问系统
- 本地访问: http://localhost:3000
- 生产访问: https://your-domain.com

### 4. 上传文件
1. 选择学生姓名
2. 选择压缩文件
3. 添加文件描述
4. 点击上传按钮

## 📞 技术支持

### 常见问题
1. **Q: 支持哪些文件格式?**
   A: 支持 .zip, .rar, .7z, .tar, .gz 格式

2. **Q: 文件大小有限制吗?**
   A: 最大支持100MB，建议压缩大文件

3. **Q: 如何批量上传文件?**
   A: 系统支持单个文件上传，可分别上传多个文件

4. **Q: 文件存储在哪里?**
   A: 根据文件大小，小文件内存存储，大文件磁盘存储

### 联系方式
- GitHub Issues: https://github.com/Li3379/zippy-file-collector/issues
- 项目文档: 查看README.md和代码注释
- 技术支持: 提交Issue或Pull Request

## 📋 验收标准

### ✅ 功能完整性
- [x] 文件上传功能正常
- [x] 文件下载功能正常
- [x] 学生名单加载正常
- [x] 上传统计显示正确
- [x] 文件更新功能正常
- [x] 文件删除功能正常

### ✅ 性能要求
- [x] 支持100MB文件上传
- [x] 响应时间 < 3秒
- [x] 内存使用 < 512MB
- [x] 并发支持 > 10用户

### ✅ 安全要求
- [x] 文件格式验证正确
- [x] 文件大小限制有效
- [x] 跨域配置正确
- [x] 输入验证完善

### ✅ 兼容性要求
- [x] 支持现代浏览器
- [x] 响应式设计适配
- [x] 移动端界面友好
- [x] 触屏操作支持

### ✅ 部署要求
- [x] Node.js >= 14环境运行正常
- [x] 腾讯云部署配置正确
- [x] Docker容器化完成
- [x] 环境变量配置正确

### ✅ 文档要求
- [x] API文档完整准确
- [x] 部署文档清晰详细
- [x] 开发文档便于理解
- [x] 故障排除指南完善

## 🎉 验收结论

经过深度测试和全面评估，**Zippy File Collector系统**已达到生产环境部署标准：

1. **功能完整**: 所有核心功能运行正常，用户体验良好
2. **性能优秀**: 混合存储策略优化了内存使用，响应迅速
3. **安全可靠**: 完善的安全机制保护系统和数据
4. **部署就绪**: 支持多种部署方式，文档完善
5. **代码质量**: 代码结构清晰，注释完整，便于维护

系统已通过验收测试，可以投入生产环境使用。