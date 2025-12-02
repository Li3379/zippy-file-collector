# 文件存储位置说明

## 当前存储方式

用户上传的文件目前采用 **内存存储 + base64编码** 的方式：

### 生产环境 (腾讯云)
- **存储位置**: 服务器内存中的 `/tmp/file_metadata.json`
- **存储格式**: 文件内容以base64字符串形式存储在JSON元数据中
- **特点**: 
  - 重启后数据会丢失
  - 不占用磁盘空间
  - 适合腾讯云临时环境

### 开发环境
- **存储位置**: `data/file_metadata.json`
- **存储格式**: 同样使用base64编码存储在JSON中

## 文件结构

```json
[
  {
    "id": 1703123456789,
    "fileName": "homework.zip",
    "originalName": "homework.zip",
    "student": "张三",
    "description": "第一次作业",
    "size": 1024000,
    "extension": ".zip",
    "uploadDate": "2025-12-02T16:06:26.000Z",
    "data": "UEsDBBQAAAAIAC..."
  }
]
```

## 问题

**文件不是以二进制文件存储**，而是：
- 转换为base64字符串存储
- 保存在JSON元数据文件中
- 通过 `/download/:id` 接口解码后下载

## 访问方式

1. **下载**: 通过Web界面的下载按钮或访问 `/download/:id`
2. **管理**: 通过Web界面的文件列表
3. **直接访问**: 不能直接访问文件，需要通过API