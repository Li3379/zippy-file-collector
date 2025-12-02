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

// 腾讯云运行环境适配 - 使用内存存储避免文件系统问题
const UPLOAD_DIR = process.env.NODE_ENV === 'production' 
    ? '/tmp/uploads' 
    : path.join(process.cwd(), 'data', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (减少文件大小限制)

const allowedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];

// 内存存储方案 (更适合腾讯云临时环境)
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    try {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(originalName).toLowerCase();
        
        console.log('文件检查:', { originalName, ext });
        
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

const upload = multer({
    storage: memoryStorage, // 使用内存存储
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: fileFilter
});

// 元数据文件路径
const METADATA_FILE = process.env.NODE_ENV === 'production'
    ? '/tmp/file_metadata.json'
    : path.join(__dirname, 'data', 'file_metadata.json');

async function ensureUploadDir() {
    if (process.env.NODE_ENV === 'production') {
        // 生产环境使用内存，不需要物理目录
        return true;
    }
    
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
            // 创建默认学生列表
            const defaultStudents = ['张三', '李四', '王五', '赵六', '钱七'];
            await fs.writeFile('/tmp/classmate.txt', defaultStudents.join('\n'), 'utf8');
            console.log('初始化生产环境学生数据');
        } catch (error) {
            console.error('初始化生产数据失败:', error);
        }
    }
}

async function loadMetadata() {
    try {
        const data = await fs.readFile(METADATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function loadStudents() {
    try {
        const dataPath = process.env.NODE_ENV === 'production'
            ? '/tmp/classmate.txt'
            : path.join(__dirname, 'data', 'classmate.txt');
        const data = await fs.readFile(dataPath, 'utf8');
        return data.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    } catch (error) {
        // 如果没有学生文件，返回默认列表
        return ['张三', '李四', '王五', '赵六', '钱七'];
    }
}

async function saveMetadata(metadata) {
    try {
        await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存元数据失败:', error);
        return false;
    }
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
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        uploadDir: UPLOAD_DIR
    });
});

// 获取学生列表
app.get('/students', async (req, res) => {
    try {
        const students = await loadStudents();
        res.json({ success: true, students });
    } catch (error) {
        console.error('Error loading students:', error);
        res.status(500).json({ success: false, message: '加载学生列表失败' });
    }
});

// 文件上传接口 - 简化版本
app.post('/upload', upload.single('file'), async (req, res) => {
    console.log('上传请求开始:', {
        hasFile: !!req.file,
        student: req.body?.student,
        contentType: req.get('Content-Type')
    });

    try {
        // 基本验证
        if (!req.file) {
            return res.status(400).json({ success: false, message: '没有选择文件' });
        }

        if (!req.body || !req.body.student) {
            return res.status(400).json({ success: false, message: '请选择学生姓名' });
        }

        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const extension = path.extname(originalName).toLowerCase();
        const student = req.body.student.trim();
        
        console.log('处理文件:', { originalName, extension, student, size: req.file.size });
        
        // 加载现有数据
        const metadata = await loadMetadata();
        
        // 检查该学生是否已经上传过文件
        const existingFile = metadata.find(file => file.student === student);
        
        if (existingFile && !req.body.isUpdate) {
            return res.status(400).json({ 
                success: false, 
                message: '你已经上传过文件，如需修改请选择更新文件',
                hasExistingFile: true,
                existingFile: existingFile
            });
        }
        
        // 创建文件记录 (不保存实际文件，只保存元数据)
        const fileRecord = {
            id: Date.now(),
            fileName: req.file.originalname, // 使用原始文件名
            originalName: originalName,
            student: student,
            description: req.body.description || '',
            size: req.file.size,
            extension: extension,
            uploadDate: new Date().toISOString(),
            // 不保存文件路径，使用base64编码存储文件内容
            data: req.file.buffer.toString('base64')
        };

        // 如果是更新，删除旧记录
        if (existingFile && req.body.isUpdate) {
            const index = metadata.findIndex(file => file.id === existingFile.id);
            if (index !== -1) {
                metadata[index] = fileRecord;
            }
        } else {
            metadata.push(fileRecord);
        }
        
        // 保存元数据
        const saved = await saveMetadata(metadata);
        if (!saved) {
            return res.status(500).json({ success: false, message: '保存文件信息失败' });
        }

        console.log('文件上传成功:', { 
            id: fileRecord.id, 
            name: fileRecord.originalName, 
            student: fileRecord.student 
        });

        res.json({ 
            success: true, 
            message: req.body.isUpdate ? '文件更新成功' : '文件上传成功',
            file: fileRecord,
            isUpdate: !!req.body.isUpdate
        });

    } catch (error) {
        console.error('上传错误详情:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: '文件大小超过限制 (最大50MB)' });
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
        
        metadata.splice(fileIndex, 1);
        await saveMetadata(metadata);
        
        res.json({ success: true, message: '文件删除成功' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: '文件删除失败' });
    }
});

// 下载文件 (从base64恢复)
app.get('/download/:id', async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const metadata = await loadMetadata();
        const fileRecord = metadata.find(file => file.id === fileId);
        
        if (!fileRecord) {
            return res.status(404).json({ success: false, message: '文件不存在' });
        }
        
        if (!fileRecord.data) {
            return res.status(404).json({ success: false, message: '文件数据不存在' });
        }
        
        // 从base64恢复文件
        const fileBuffer = Buffer.from(fileRecord.data, 'base64');
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('Download error:', error);
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
        console.log('正在启动服务器...');
        
        await ensureUploadDir();
        await initProductionData();
        
        console.log(`✅ 文件上传系统已启动`);
        console.log(`🌐 端口: ${PORT}`);
        console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📁 上传方式: ${process.env.NODE_ENV === 'production' ? '内存存储' : '文件系统'}`);
        console.log(`📄 最大文件大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
        
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
});