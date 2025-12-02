const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 8080;

// 腾讯云运行环境需要
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());
app.use(express.static('.'));

// 性能优化配置
const MEMORY_LIMIT = 5 * 1024 * 1024;   // 5MB - 内存存储
const DISK_LIMIT = 100 * 1024 * 1024;  // 100MB - 磁盘存储
const MAX_LIMIT = 100 * 1024 * 1024;   // 100MB - 最大限制

const UPLOAD_DIR = process.env.NODE_ENV === 'production' 
    ? '/tmp/uploads' 
    : path.join(process.cwd(), 'data', 'uploads');

const allowedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];

// 磁盘存储方案
const diskStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await ensureUploadDir();
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const fileName = `${timestamp}_${originalName}`;
        cb(null, fileName);
    }
});

// 内存存储方案
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    try {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(originalName).toLowerCase();
        
        console.log('文件检查:', { originalName, ext, size: file.size });
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件格式: ${ext}。支持的格式: ${allowedExtensions.join(', ')}`), false);
        }
    } catch (error) {
        console.error('文件检查错误:', error);
        cb(error, false);
    }
};

// 动态存储选择中间件
const dynamicStorage = {
    _handleFile: null,
    _storageType: 'unknown',
    
    _getStorage: function(fileSize) {
        if (fileSize <= MEMORY_LIMIT) {
            this._storageType = 'memory';
            console.log(`🧠 使用内存存储 (${Math.round(fileSize / 1024 / 1024)}MB)`);
            return memoryStorage;
        } else if (fileSize <= DISK_LIMIT) {
            this._storageType = 'disk';
            console.log(`💾 使用磁盘存储 (${Math.round(fileSize / 1024 / 1024)}MB)`);
            return diskStorage;
        } else {
            throw new Error(`文件大小超过限制 (最大${MAX_LIMIT / 1024 / 1024}MB)`);
        }
    },
    
    _processFile: function(req, file, cb) {
        const fileSize = file.size || (req.file && req.file.size);
        const storage = this._getStorage(fileSize);
        storage._handleFile(req, file, cb);
    },
    
    _removeFile: function(req, file, cb) {
        if (this._storageType === 'disk' && diskStorage._removeFile) {
            diskStorage._removeFile(req, file, cb);
        } else {
            cb(null);
        }
    }
};

// 创建multer实例
const upload = multer({
    storage: {
        _handleFile: function(req, file, cb) {
            dynamicStorage._processFile(req, file, cb);
        },
        _removeFile: function(req, file, cb) {
            dynamicStorage._removeFile(req, file, cb);
        }
    },
    limits: {
        fileSize: MAX_LIMIT,
        files: 1
    },
    fileFilter: fileFilter
});

// 元数据文件路径
const METADATA_FILE = process.env.NODE_ENV === 'production'
    ? '/tmp/file_metadata.json'
    : path.join(__dirname, 'data', 'file_metadata.json');

// 简单的LRU缓存
class LRUCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }
    
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    clear() {
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
}

// 全局缓存实例
const fileCache = new LRUCache(50); // 缓存50个文件
const metadataCache = new LRUCache(10); // 缓存10次元数据查询

// 确保目录存在
async function ensureDirectories() {
    if (process.env.NODE_ENV === 'production') {
        try {
            await fs.mkdir('/tmp', { recursive: true });
            console.log('✅ /tmp 目录检查完成');
        } catch (error) {
            console.error('❌ 创建/tmp目录失败:', error);
        }
    } else {
        try {
            await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
            console.log('✅ data目录检查完成');
        } catch (error) {
            console.error('❌ 创建data目录失败:', error);
        }
    }
}

async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
        await fs.chmod(UPLOAD_DIR, 0o755);
        return true;
    } catch (error) {
        try {
            await fs.mkdir(UPLOAD_DIR, { recursive: true });
            await fs.chmod(UPLOAD_DIR, 0o755);
            console.log(`创建上传目录: ${UPLOAD_DIR}`);
            return true;
        } catch (mkdirError) {
            console.error('Failed to create upload directory:', mkdirError);
            return false;
        }
    }
}

// 初始化生产环境数据
async function initProductionData() {
    if (process.env.NODE_ENV === 'production') {
        try {
            const classmatePath = path.join(__dirname, 'classmate.txt');
            console.log('检查学生名单文件:', classmatePath);
            
            try {
                const realData = await fs.readFile(classmatePath, 'utf8');
                const realStudents = realData.split(/[\r\n]+/).map(name => name.trim()).filter(name => name.length > 0);
                
                if (realStudents.length > 0) {
                    console.log(`✅ 读取到真实学生名单: ${realStudents.length} 人`);
                    await fs.writeFile('/tmp/classmate.txt', realStudents.join('\n'), 'utf8');
                    console.log('✅ 学生名单已同步到生产环境');
                } else {
                    console.log('⚠️ 学生名单文件为空，使用默认名单');
                    const defaultStudents = ['张三', '李四', '王五', '赵六', '钱七'];
                    await fs.writeFile('/tmp/classmate.txt', defaultStudents.join('\n'), 'utf8');
                }
            } catch (readError) {
                console.warn('⚠️ 无法读取真实学生名单文件，使用默认名单:', readError.message);
                const defaultStudents = ['张三', '李四', '王五', '赵六', '钱七'];
                await fs.writeFile('/tmp/classmate.txt', defaultStudents.join('\n'), 'utf8');
            }
        } catch (error) {
            console.error('初始化生产数据失败:', error);
        }
    }
}

async function loadMetadata() {
    try {
        // 检查缓存
        const cacheKey = 'metadata';
        if (metadataCache.has(cacheKey)) {
            console.log('🎯 从缓存读取元数据');
            return metadataCache.get(cacheKey);
        }
        
        console.log('📖 读取元数据文件:', METADATA_FILE);
        const startTime = Date.now();
        const data = await fs.readFile(METADATA_FILE, 'utf8');
        const metadata = JSON.parse(data);
        const duration = Date.now() - startTime;
        
        // 缓存结果
        metadataCache.set(cacheKey, metadata);
        console.log(`✅ 成功读取 ${metadata.length} 条文件记录 (${duration}ms)`);
        
        return metadata;
    } catch (error) {
        console.warn('⚠️ 元数据文件不存在或损坏，返回空列表:', error.message);
        return [];
    }
}

async function loadStudents() {
    try {
        let dataPath;
        if (process.env.NODE_ENV === 'production') {
            dataPath = '/tmp/classmate.txt';
            try {
                const data = await fs.readFile(dataPath, 'utf8');
                const students = data.split(/[\r\n]+/).map(name => name.trim()).filter(name => name.length > 0);
                if (students.length > 0) {
                    console.log(`✅ 从临时目录加载 ${students.length} 名学生`);
                    return students;
                }
            } catch (tmpError) {
                console.warn('⚠️ 临时目录学生名单不存在，尝试从项目文件读取:', tmpError.message);
            }
            
            dataPath = path.join(__dirname, 'classmate.txt');
            try {
                const data = await fs.readFile(dataPath, 'utf8');
                const students = data.split(/[\r\n]+/).map(name => name.trim()).filter(name => name.length > 0);
                if (students.length > 0) {
                    console.log(`✅ 从项目文件加载 ${students.length} 名学生`);
                    await fs.writeFile('/tmp/classmate.txt', students.join('\n'), 'utf8');
                    return students;
                }
            } catch (projectError) {
                console.warn('⚠️ 项目文件读取失败，使用默认名单:', projectError.message);
            }
        } else {
            dataPath = path.join(__dirname, 'classmate.txt');
        }
        
        const data = await fs.readFile(dataPath, 'utf8');
        const students = data.split(/[\r\n]+/).map(name => name.trim()).filter(name => name.length > 0);
        console.log(`📚 学生名单加载完成，共 ${students.length} 人`);
        return students;
        
    } catch (error) {
        console.warn('⚠️ 学生名单加载失败，使用默认名单:', error.message);
        return ['张三', '李四', '王五', '赵六', '钱七'];
    }
}

async function saveMetadata(metadata) {
    try {
        console.log(`💾 保存元数据到: ${METADATA_FILE}`);
        const startTime = Date.now();
        await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
        const duration = Date.now() - startTime;
        console.log(`✅ 成功保存 ${metadata.length} 条文件记录 (${duration}ms)`);
        
        // 清除缓存
        metadataCache.clear();
        fileCache.clear();
        
        return true;
    } catch (error) {
        console.error('❌ 保存元数据失败:', error);
        return false;
    }
}

// 性能监控
function logPerformance() {
    const memoryUsage = process.memoryUsage();
    console.log('📊 性能监控:', {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        cacheSize: fileCache.size()
    });
}

// 腾讯云运行环境健康检查
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        console.error('首页错误:', error);
        res.status(500).send('服务器错误');
    }
});

app.get('/health', (req, res) => {
    logPerformance();
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        uploadDir: UPLOAD_DIR,
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        }
    });
});

app.get('/student/:studentName', async (req, res) => {
    try {
        const studentName = decodeURIComponent(req.params.studentName);
        const metadata = await loadMetadata();
        const file = metadata.find(file => file.student === studentName);
        
        res.json({
            success: true,
            hasFile: !!file,
            file: file || null
        });
    } catch (error) {
        console.error('检查学生文件失败:', error);
        res.status(500).json({ success: false, message: '检查失败' });
    }
});

app.get('/students', async (req, res) => {
    try {
        console.log('🔍 开始加载学生列表...');
        const students = await loadStudents();
        console.log('✅ 学生列表加载成功:', { count: students.length, names: students.slice(0, 5) });
        res.json({ success: true, students });
    } catch (error) {
        console.error('❌ 加载学生列表失败:', error);
        res.status(500).json({ success: false, message: '加载学生列表失败' });
    }
});

// 文件上传接口 - 真正的动态存储
app.post('/upload', upload.single('file'), async (req, res) => {
    console.log('📤 上传请求开始:', {
        hasFile: !!req.file,
        student: req.body?.student,
        fileSize: req.file?.size
    });

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '没有选择文件' });
        }

        if (!req.body || !req.body.student) {
            return res.status(400).json({ success: false, message: '请选择学生姓名' });
        }

        const fileSize = req.file.size;
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const extension = path.extname(originalName).toLowerCase();
        const student = req.body.student.trim();
        
        console.log('📄 处理文件:', { originalName, extension, student, size: fileSize });
        
        // 检查文件大小限制
        if (fileSize > MAX_LIMIT) {
            return res.status(400).json({ 
                success: false, 
                message: `文件过大，超过${MAX_LIMIT / 1024 / 1024}MB限制。请压缩后重试。` 
            });
        }
        
        // 根据文件大小决定存储方式并处理
        let fileRecord;
        const startTime = Date.now();
        
        if (fileSize <= MEMORY_LIMIT) {
            // 小文件：内存存储
            console.log(`🧠 使用内存存储 (${Math.round(fileSize / 1024 / 1024)}MB)`);
            
            fileRecord = {
                id: Date.now(),
                fileName: req.file.originalname,
                originalName: originalName,
                student: student,
                description: req.body.description || '',
                size: fileSize,
                extension: extension,
                uploadDate: new Date().toISOString(),
                storageType: 'memory',
                data: req.file.buffer.toString('base64')
            };
        } else if (fileSize <= DISK_LIMIT) {
            // 大文件：磁盘存储
            console.log(`💾 使用磁盘存储 (${Math.round(fileSize / 1024 / 1024)}MB)`);
            
            await ensureUploadDir();
            const timestamp = Date.now();
            const diskFileName = `${timestamp}_${originalName}`;
            const filePath = path.join(UPLOAD_DIR, diskFileName);
            
            await fs.writeFile(filePath, req.file.buffer);
            console.log(`💾 文件已保存到: ${filePath}`);
            
            fileRecord = {
                id: Date.now(),
                fileName: diskFileName,
                originalName: originalName,
                student: student,
                description: req.body.description || '',
                size: fileSize,
                extension: extension,
                uploadDate: new Date().toISOString(),
                storageType: 'disk',
                filePath: filePath
            };
        } else {
            return res.status(400).json({ 
                success: false, 
                message: `文件过大，超过${MAX_LIMIT / 1024 / 1024}MB限制。请压缩后重试。` 
            });
        }
        
        // 加载现有数据
        const metadata = await loadMetadata();
        console.log(`📖 当前有 ${metadata.length} 条文件记录`);
        
        // 检查重复上传
        const existingFile = metadata.find(file => file.student === student);
        
        if (existingFile && !req.body.isUpdate) {
            console.log('⚠️ 学生已上传过文件:', existingFile.originalName);
            return res.status(400).json({ 
                success: false, 
                message: '你已经上传过文件，如需修改请选择更新文件',
                hasExistingFile: true,
                existingFile: existingFile
            });
        }
        
        // 如果是更新，先删除旧文件
        if (existingFile && req.body.isUpdate) {
            if (existingFile.storageType === 'disk' && existingFile.filePath) {
                try {
                    await fs.unlink(existingFile.filePath);
                    console.log('🗑️ 删除旧磁盘文件:', existingFile.filePath);
                } catch (deleteError) {
                    console.warn('⚠️ 删除旧文件失败:', deleteError.message);
                }
            }
            
            const index = metadata.findIndex(file => file.id === existingFile.id);
            if (index !== -1) {
                metadata[index] = fileRecord;
                console.log(`🔄 更新文件记录: ${existingFile.id}`);
            }
        } else {
            metadata.push(fileRecord);
            console.log(`➕ 添加新文件记录: ${fileRecord.id}`);
        }
        
        // 保存元数据
        const saved = await saveMetadata(metadata);
        if (!saved) {
            return res.status(500).json({ success: false, message: '保存文件信息失败' });
        }

        const duration = Date.now() - startTime;
        console.log(`✅ 文件上传成功 (${duration}ms):`, { 
            id: fileRecord.id, 
            name: fileRecord.originalName, 
            student: fileRecord.student,
            storage: fileRecord.storageType
        });

        logPerformance();
        
        res.json({ 
            success: true, 
            message: req.body.isUpdate ? '文件更新成功' : '文件上传成功',
            file: fileRecord,
            isUpdate: !!req.body.isUpdate
        });

    } catch (error) {
        console.error('❌ 上传错误详情:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: '文件过大，超过100MB限制。请压缩后重试。' });
        }
        
        if (error.message && error.message.includes('不支持的文件格式')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ 
            success: false, 
            message: '文件上传失败: ' + error.message 
        });
    }
});

app.get('/files', async (req, res) => {
    try {
        const metadata = await loadMetadata();
        const students = await loadStudents();
        
        const uploadedStudents = new Set(metadata.map(file => file.student));
        const unuploadedStudents = students.filter(student => !uploadedStudents.has(student));
        
        res.json({
            success: true,
            files: metadata,
            unuploadedStudents,
            totalStudents: students.length,
            uploadedCount: uploadedStudents.size,
            unuploadedCount: unuploadedStudents.length
        });
    } catch (error) {
        console.error('Error loading files:', error);
        res.status(500).json({ success: false, message: '加载文件列表失败' });
    }
});

app.delete('/files/:id', async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const metadata = await loadMetadata();
        const fileIndex = metadata.findIndex(file => file.id === fileId);
        
        if (fileIndex === -1) {
            return res.status(404).json({ success: false, message: '文件不存在' });
        }
        
        const file = metadata[fileIndex];
        
        // 删除磁盘文件
        if (file.storageType === 'disk' && file.filePath) {
            try {
                await fs.unlink(file.filePath);
                console.log('🗑️ 删除磁盘文件:', file.filePath);
            } catch (deleteError) {
                console.warn('⚠️ 删除磁盘文件失败:', deleteError.message);
            }
        }
        
        metadata.splice(fileIndex, 1);
        await saveMetadata(metadata);
        
        console.log(`🗑️ 删除文件记录: ${file.originalName} (${file.student})`);
        res.json({ success: true, message: '文件删除成功' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: '文件删除失败' });
    }
});

// 下载文件 - 支持所有存储方式
app.get('/download/:id', async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const metadata = await loadMetadata();
        const fileRecord = metadata.find(file => file.id === fileId);
        
        if (!fileRecord) {
            return res.status(404).json({ success: false, message: '文件不存在' });
        }
        
        let fileBuffer;
        
        if (fileRecord.storageType === 'memory') {
            // 从base64恢复
            if (!fileRecord.data) {
                return res.status(404).json({ success: false, message: '文件数据不存在' });
            }
            console.log(`🧠 从内存恢复文件: ${fileRecord.originalName}`);
            fileBuffer = Buffer.from(fileRecord.data, 'base64');
        } else if (fileRecord.storageType === 'disk') {
            // 从磁盘读取
            if (!fileRecord.filePath) {
                return res.status(404).json({ success: false, message: '磁盘文件路径不存在' });
            }
            
            try {
                console.log(`💾 从磁盘读取文件: ${fileRecord.filePath}`);
                fileBuffer = await fs.readFile(fileRecord.filePath);
            } catch (readError) {
                console.error('❌ 读取磁盘文件失败:', readError);
                return res.status(404).json({ success: false, message: '磁盘文件不存在或损坏' });
            }
        } else {
            return res.status(400).json({ success: false, message: '不支持的文件存储类型' });
        }
        
        // 设置下载头
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        
        console.log(`📥 开始下载文件: ${fileRecord.originalName} (${fileRecord.storageType})`);
        res.send(fileBuffer);
        console.log(`✅ 文件下载完成: ${fileRecord.originalName}`);
        
    } catch (error) {
        console.error('❌ 下载错误:', error);
        res.status(500).json({ success: false, message: '文件下载失败' });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误: ' + err.message });
});

// 启动服务器
app.listen(PORT, async () => {
    try {
        console.log('🚀 正在启动服务器...');
        
        await ensureDirectories();
        await ensureUploadDir();
        await initProductionData();
        
        console.log(`✅ 文件上传系统已启动`);
        console.log(`🌐 端口: ${PORT}`);
        console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`💾 存储策略: 智能混合存储 (≤5MB内存, >5MB磁盘)`);
        console.log(`📄 最大文件大小: ${MAX_LIMIT / 1024 / 1024}MB`);
        console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
        
        // 定期性能监控
        setInterval(logPerformance, 60000); // 每分钟记录一次
        
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
});