# Zippy File Collector - 项目贡献指南

## 🤝 欢迎贡献

感谢您对 Zippy File Collector 项目的关注！我们欢迎所有形式的贡献，包括但不限于代码贡献、问题报告、文档改进和功能建议。

## 🎯 项目介绍

Zippy File Collector 是一个专为班级作业收集设计的高效文件上传系统，支持50人左右的学生同时上传压缩文件。项目采用智能混合存储策略，根据文件大小动态选择最优存储方式，确保高性能和稳定性。

## 🚀 快速开始

### 环境准备

**必需环境**
- Node.js >= 14.0.0
- npm >= 6.0.0
- Git

**推荐环境**
- 2GB+ 内存
- 100MB+ 磁盘空间
- 现代浏览器 (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

### 克隆项目

```bash
# 1. Fork 项目到你的 GitHub
# 2. 克隆你 Fork 的仓库
git clone https://github.com/YOUR_USERNAME/zippy-file-collector.git
cd zippy-file-collector

# 3. 添加上游仓库
git remote add upstream https://github.com/Li3379/zippy-file-collector.git

# 4. 安装依赖
npm install
```

### 启动开发环境

```bash
# 启动开发服务器
npm run dev

# 访问应用
# 浏览器打开 http://localhost:3000
```

## 🔧 开发工作流

### 分支策略

| 分支名 | 用途 | 保护级别 |
|--------|------|----------|
| `main` | 生产环境 | 保护 |
| `develop` | 开发集成 | 保护 |
| `feature/*` | 功能开发 | 无 |
| `bugfix/*` | 错误修复 | 无 |
| `hotfix/*` | 紧急修复 | 无 |
| `release/*` | 版本发布 | 保护 |

### 提交规范

**提交消息格式**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**提交类型**
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建或辅助工具变动

**示例**
```
feat(upload): 添加文件批量上传功能

支持用户选择多个文件同时上传，提高上传效率

Closes #123
```

### 开发流程

1. **创建功能分支**
```bash
git checkout -b feature/batch-upload develop
```

2. **开发和测试**
```bash
# 编写代码
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint
```

3. **提交代码**
```bash
git add .
git commit -m "feat(upload): 添加文件批量上传功能"
```

4. **推送分支**
```bash
git push origin feature/batch-upload
```

5. **创建 Pull Request**
```bash
# 在 GitHub 上创建 PR
# 目标分支: develop
# 标题: feat: 添加文件批量上传功能
```

## 🏗️ 代码规范

### JavaScript 规范

**ES6+ 语法**
```javascript
// 使用 const/let 块声明变量
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 使用箭头函数
const getFileSize = (file) => file.size;

// 使用模板字符串
const message = `文件大小: ${fileSize}MB`;

// 使用解构赋值
const { originalName, extension } = file;

// 使用默认参数
const createFileRecord = (file, student = '') => {
  return {
    file,
    student,
    uploadDate: new Date().toISOString()
  };
};
```

**异步编程**
```javascript
// 使用 async/await
const uploadFile = async (file, student) => {
  try {
    const result = await saveFile(file);
    return result;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
};

// 使用 Promise.all
const uploadMultipleFiles = async (files) => {
  return Promise.all(files.map(file => uploadFile(file)));
};
```

### 命名规范

```javascript
// 变量名：小驼峰
const fileSize = 100;
const studentName = '张三';

// 常量名：大写
const MAX_FILE_SIZE = 100;
const UPLOAD_DIR = '/tmp/uploads';

// 函数名：小驼峰
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// 类名：大驼峰
class FileUploader {
  constructor() {
    this.files = [];
  }
}
```

### 注释规范

```javascript
/**
 * 文件上传处理器
 * @class
 * @description 处理文件上传、验证和存储
 */
class FileUploadHandler {
  /**
   * 上传单个文件
   * @param {Object} file - 文件对象
   * @param {string} student - 学生姓名
   * @param {string} [description] - 文件描述
   * @returns {Promise<Object>} 上传结果
   * @throws {Error} 当上传失败时抛出错误
   * @example
   * const result = await handler.uploadFile(file, '张三', '作业文件');
   * console.log(result.success);
   */
  async uploadFile(file, student, description = '') {
    // 实现代码...
  }
}
```

## 🧪 项目结构

```
zippy-file-collector/
├── src/                     # 源代码目录
│   ├── controllers/         # 控制器层
│   ├── services/           # 业务逻辑层
│   ├── utils/              # 工具函数
│   └── middleware/          # 中间件
├── public/                  # 静态资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript 文件
│   └── images/             # 图片资源
├── tests/                   # 测试文件
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── fixtures/           # 测试数据
├── docs/                    # 项目文档
├── scripts/                 # 构建和部署脚本
├── config/                  # 配置文件
└── tools/                   # 开发工具
```

## 🧪 测试指南

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行测试覆盖率
npm run test:coverage

# 监听模式
npm run test:watch
```

### 编写测试

```javascript
// 单元测试示例
describe('FileUploadHandler', () => {
  it('应该成功上传有效文件', async () => {
    const mockFile = {
      size: 1024,
      originalname: 'test.zip',
      mimetype: 'application/zip'
    };
    const mockStudent = '张三';
    
    const result = await handler.uploadFile(mockFile, mockStudent);
    
    expect(result.success).toBe(true);
    expect(result.file.student).toBe(mockStudent);
  });

  it('应该拒绝无效文件格式', async () => {
    const mockFile = {
      size: 1024,
      originalname: 'test.exe',
      mimetype: 'application/x-msdownload'
    };
    const mockStudent = '张三';
    
    await expect(handler.uploadFile(mockFile, mockStudent))
      .rejects.toThrow('不支持的文件格式');
  });
});

// 集成测试示例
describe('文件上传 API', () => {
  it('应该成功上传文件', async () => {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test.zip'));
    formData.append('student', '张三');
    
    const response = await request(app)
      .post('/upload')
      .send(formData)
      .expect(200);
      
    expect(response.body.success).toBe(true);
  });
});
```

## 🐛 部署指南

### 开发环境部署

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 访问应用
http://localhost:3000
```

### 生产环境部署

**使用 PM2**
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

**使用 Docker**
```bash
# 构建镜像
docker build -t zippy-file-collector .

# 运行容器
docker run -d -p 8080:8080 \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  zippy-file-collector

# 使用 docker-compose
docker-compose up -d
```

**云平台部署**
- **Heroku**: 支持，已配置 `Procfile`
- **Vercel**: 支持，已配置 `vercel.json`
- **腾讯云**: 支持，已配置 `cloudbaserc.json`

## 🐛 问题排查

### 常见问题

**1. 端口被占用**
```bash
# 查看端口占用
lsof -i :3000

# 修改端口
export PORT=3001
npm start
```

**2. 文件上传失败**
```bash
# 检查文件权限
ls -la uploads/

# 检查磁盘空间
df -h

# 检查日志
npm run logs
```

**3. 内存不足**
```bash
# 检查内存使用
free -m

# 优化内存配置
export NODE_OPTIONS="--max-old-space-size=1024"
```

### 调试技巧

**1. 启用调试日志**
```javascript
// 在开发环境中启用详细日志
process.env.DEBUG = 'zippy:*';
```

**2. 使用 Chrome DevTools**
```javascript
// 在代码中添加断点
const uploadFile = async (file, student) => {
  debugger; // 断点调试
  // ...
};
```

**3. 使用 Node.js 调试器**
```bash
# 启动调试模式
node --inspect-brk server.js

# 或使用 VS Code 调试
code .
```

## 📝 文档贡献

### 文档类型

- **API 文档**: 接口说明和示例
- **用户文档**: 使用指南和功能说明
- **开发文档**: 开发指南和架构说明
- **部署文档**: 部署指南和环境配置

### 文档编写规范

- 使用 Markdown 格式
- 包含代码示例
- 添加目录和锚点
- 保持文档与代码同步

### 文档更新流程

1. 修改相应文档
2. 在提交信息中说明文档变更
3. 在 Pull Request 中标记文档更新
4. 确保 CI 构建通过

## 🤝 社区行为准则

### 行为准则

- **尊重他人**: 友善、专业地与社区成员互动
- **包容性**: 欢迎不同背景和技能水平的贡献者
- **建设性**: 提供建设性的反馈和建议
- **耐心**: 帮助新手解决问题

### 代码审查

- **及时响应**: 尽快回复 Pull Request
- **详细反馈**: 提供具体的改进建议
- **友好语气**: 使用鼓励和积极的语言
- **代码质量**: 确保代码符合项目规范

### 问题报告

- **使用模板**: 使用 issue 报告模板
- **提供复现步骤**: 详细说明如何重现问题
- **包含环境信息**: 提供系统环境信息
- **关注问题**: 及时跟进问题解决进展

## 📧 获取帮助

### 获取帮助

- **GitHub Issues**: [提交问题](https://github.com/Li3379/zippy-file-collector/issues)
- **GitHub Discussions**: [技术讨论](https://github.com/Li3379/zippy-file-collector/discussions)
- **项目文档**: [查看文档](https://github.com/Li3379/zippy-file-collector/blob/main/docs/)
- **Wiki**: [查看 Wiki](https://github.com/Li3379/zippy-file-collector/wiki)

### 联系维护者

- **主要维护者**: [LiShuai](https://github.com/Li3379)
- **邮箱**: 通过 GitHub 联系

## 🏆 致谢

感谢所有为 Zippy File Collector 项目做出贡献的开发者和用户！

### 核心贡献者

- [贡献者1](https://github.com/Contributor1)
- [贡献者2](https://github.com/Contributor2)

### 特别感谢

- 所有提交 Bug 报告的用户
- 所有提出改进建议的开发者
- 所有参与代码审查的贡献者

---

**开始贡献的第一步**: [Fork 项目](https://github.com/Li3379/zippy-file-collector/fork) 并创建你的第一个 Pull Request！

我们期待你的贡献！ 🚀