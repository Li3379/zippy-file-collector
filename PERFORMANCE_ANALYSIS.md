# 性能分析和优化方案

## **当前存储机制分析**

### **📊 性能影响评估**

**1. Base64编码开销**
- 文件大小增加约 **33%** (4 bytes per 3 bytes)
- 50MB文件 → 约66.6MB存储空间
- 内存使用翻倍：原始数据 + base64字符串

**2. 内存占用问题**
- 所有文件常驻内存
- 每次请求重新编码/解码
- 垃圾回收压力增大

**3. I/O 性能影响**
- 每次读写JSON文件加载所有数据
- 单个文件更新需要重写整个文件
- 无索引结构，查找效率低

### **⚠️ 潜在风险**

**高并发场景**
- 内存爆炸风险
- CPU编码/解码瓶颈
- 文件锁竞争

**大文件场景**
- 内存不足错误
- 上传超时
- 服务器崩溃

## **🔧 优化方案**

### **方案一：混合存储 (推荐)**
```javascript
// 小文件 (<5MB) - 内存存储
// 大文件 (≥5MB) - 磁盘存储
const storageType = file.size < 5 * 1024 * 1024 ? 'memory' : 'disk';

if (storageType === 'memory') {
    fileRecord.data = req.file.buffer.toString('base64');
} else {
    // 保存到磁盘，只存路径
    const filePath = path.join(UPLOAD_DIR, fileRecord.fileName);
    await fs.writeFile(filePath, req.file.buffer);
    fileRecord.filePath = filePath;
}
```

### **方案二：分片存储**
```javascript
// 将大文件分片存储
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const chunks = [];
for (let i = 0; i < req.file.buffer.length; i += CHUNK_SIZE) {
    const chunk = req.file.buffer.slice(i, i + CHUNK_SIZE);
    chunks.push(chunk.toString('base64'));
}
fileRecord.chunks = chunks;
```

### **方案三：专业存储**
```javascript
// 使用云存储服务
const cloudStorage = {
    upload: async (buffer, fileName) => {
        // 上传到OSS/COS/S3
        return cloudUrl;
    }
};

fileRecord.cloudUrl = await cloudStorage.upload(req.file.buffer, fileName);
```

## **💡 立即可实施的优化**

### **1. 添加文件大小限制分级**
```javascript
const MEMORY_LIMIT = 5 * 1024 * 1024; // 5MB
const DISK_LIMIT = 20 * 1024 * 1024; // 20MB
const MAX_LIMIT = 50 * 1024 * 1024;  // 50MB

if (file.size <= MEMORY_LIMIT) {
    // 使用内存存储
} else if (file.size <= DISK_LIMIT) {
    // 使用磁盘存储
} else {
    // 拒绝上传
}
```

### **2. 实现LRU缓存**
```javascript
class FileCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    get(id) {
        if (this.cache.has(id)) {
            // 移到最后 (LRU)
            const value = this.cache.get(id);
            this.cache.delete(id);
            this.cache.set(id, value);
            return value;
        }
        return null;
    }
    
    set(id, value) {
        if (this.cache.size >= this.maxSize) {
            // 删除最久未使用的
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(id, value);
    }
}
```

### **3. 数据库优化**
```javascript
// 使用SQLite替代JSON文件
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('files.db');

// 创建索引
db.run('CREATE INDEX IF NOT EXISTS idx_student ON files(student)');
db.run('CREATE INDEX IF NOT EXISTS idx_upload_date ON files(uploadDate)');
```

## **📈 性能监控**

### **关键指标**
```javascript
// 内存使用监控
const memoryUsage = process.memoryUsage();
console.log('Memory Usage:', {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
});

// 文件操作性能
const startTime = Date.now();
await saveMetadata(metadata);
const duration = Date.now() - startTime;
console.log(`Save duration: ${duration}ms`);
```

### **告警阈值**
- 内存使用 > 80%
- 响应时间 > 5秒
- 并发请求 > 50个

## **🎯 推荐实施顺序**

1. **立即实施** (1小时)
   - 添加文件大小分级限制
   - 优化内存清理

2. **短期优化** (1天)
   - 实现混合存储
   - 添加LRU缓存

3. **长期方案** (1周)
   - 迁移到数据库
   - 集成云存储

## **⚡ 预期性能提升**

- **内存使用**: 减少60-70%
- **响应时间**: 提升40-50%
- **并发能力**: 提升3-5倍
- **存储效率**: 节省30-40%空间

建议立即实施第一级优化，避免性能问题影响用户体验。