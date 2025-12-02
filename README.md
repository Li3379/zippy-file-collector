# Zippy File Collector

一个基于Node.js的文件上传系统，专为班级作业收集设计，支持50人左右的压缩文件上传。

## 🚀 功能特性

- ✅ 支持多种压缩格式：`.zip`, `.rar`, `.7z`, `.tar`, `.gz`
- ✅ 文件大小限制：最大100MB
- ✅ 学生姓名管理
- ✅ 上传统计和进度显示
- ✅ 文件更新功能
- ✅ 响应式设计

## 🏗️ 技术栈

- **后端**: Node.js + Express
- **文件处理**: Multer
- **前端**: 原生HTML/CSS/JavaScript
- **部署**: 腾讯云运行环境

## 📦 快速部署到腾讯云

### 方法一：GitHub一键部署
1. Fork 此仓库到你的GitHub
2. 访问腾讯云开发者平台
3. 选择"从GitHub导入"
4. 输入你的仓库地址：`https://github.com/你的用户名/zippy-file-collector`

### 方法二：手动部署
```bash
# 1. 克隆项目
git clone https://github.com/Li3379/zippy-file-collector.git
cd zippy-file-collector

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.production .env

# 4. 部署到腾讯云
# 使用腾讯云CLI或控制台部署
```

## ⚙️ 环境配置

### 生产环境变量 (.env.production)
```env
NODE_ENV=production
PORT=8080
TMPDIR=/tmp
LOG_LEVEL=info
```

## 📁 项目结构

```
zippy-file-collector/
├── server.js              # 主服务器文件
├── index.html             # 前端页面
├── script.js              # 前端交互逻辑
├── style.css              # 样式文件
├── package.json           # 依赖配置
├── cloudbaserc.json       # 腾讯云配置
├── serverless.yml         # Serverless配置
├── .gitignore             # Git忽略文件
├── data/                  # 本地数据目录（开发用）
│   ├── classmate.txt      # 学生名单
│   └── uploads/           # 上传文件
└── scripts/               # 部署脚本
    ├── diagnose.sh        # Linux诊断脚本
    └── diagnose.bat       # Windows诊断脚本
```

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产模式运行
npm start
```

访问地址：http://localhost:3000

## 📝 使用说明

1. **添加学生名单**：编辑 `data/classmate.txt` 文件，每行一个学生姓名
2. **上传文件**：学生选择姓名后上传压缩文件
3. **查看统计**：实时显示上传统计和未上传学生名单
4. **文件更新**：支持重新上传覆盖已有文件

## 🚨 注意事项

- **腾讯云限制**：文件存储在临时目录，重启后可能丢失
- **文件大小**：单个文件最大100MB
- **支持格式**：仅支持压缩文件格式
- **并发限制**：建议同时上传人数不超过20人

## 🐛 故障排除

### 502错误
- 检查端口配置是否为8080
- 确认环境变量设置正确
- 查看腾讯云部署日志

### 文件上传失败
- 检查文件格式是否支持
- 确认文件大小未超限
- 查看浏览器控制台错误信息

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📞 联系

如有问题，请提交Issue或联系项目维护者。