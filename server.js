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

// 腾讯云运行环境适配
const UPLOAD_DIR = process.env.NODE_ENV === 'production' 
    ? '/tmp/uploads' 
    : path.join(process.cwd(), 'data', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const allowedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];

async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
        // 确保目录权限正确
        await fs.chmod(UPLOAD_DIR, 0o755);
    } catch (error) {
        try {
            await fs.mkdir(UPLOAD_DIR, { recursive: true });
            await fs.chmod(UPLOAD_DIR, 0o755);
            console.log(`创建上传目录: ${UPLOAD_DIR}`);
        } catch (mkdirError) {
            console.error('Failed to create upload directory:', mkdirError);
            throw mkdirError;
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

const storage = multer.diskStorage({
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

const fileFilter = (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件格式'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: fileFilter
});

const METADATA_FILE = process.env.NODE_ENV === 'production'
    ? '/tmp/file_metadata.json'
    : path.join(__dirname, 'data', 'file_metadata.json');

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
        return [];
    }
}

async function saveMetadata(metadata) {
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
}

async function getFileInfo(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return {
            size: stats.size,
            birthTime: stats.birthtime,
            modifiedTime: stats.mtime
        };
    } catch (error) {
        return null;
    }
}

// 腾讯云运行环境健康检查
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development'
    });
});

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '没有选择文件' });
        }

        if (!req.body.student) {
            return res.status(400).json({ success: false, message: '请选择学生姓名' });
        }

        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const extension = path.extname(originalName).toLowerCase();
        const student = req.body.student;
        
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
        
        let fileRecord;
        
        if (existingFile && req.body.isUpdate) {
            // 更新现有文件：删除旧文件，添加新文件
            try {
                await fs.unlink(existingFile.path);
            } catch (error) {
                console.error('Error deleting old file:', error);
            }
            
            // 更新元数据中的文件信息
            fileRecord = {
                ...existingFile,
                fileName: req.file.filename,
                originalName: originalName,
                description: req.body.description || existingFile.description,
                size: req.file.size,
                extension: extension,
                uploadDate: new Date().toISOString(),
                path: req.file.path,
                lastUpdated: new Date().toISOString()
            };
            
            const index = metadata.findIndex(file => file.id === existingFile.id);
            metadata[index] = fileRecord;
            
        } else {
            // 新上传文件
            fileRecord = {
                id: Date.now(),
                fileName: req.file.filename,
                originalName: originalName,
                student: student,
                description: req.body.description || '',
                size: req.file.size,
                extension: extension,
                uploadDate: new Date().toISOString(),
                path: req.file.path
            };

            metadata.push(fileRecord);
        }
        
        await saveMetadata(metadata);

        res.json({ 
            success: true, 
            message: req.body.isUpdate ? '文件更新成功' : '文件上传成功',
            file: fileRecord,
            isUpdate: !!req.body.isUpdate
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: '文件大小超过限制 (最大100MB)' });
        }
        
        if (error.message.includes('不支持的文件格式')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ success: false, message: '文件上传失败' });
    }
});

app.get('/students', async (req, res) => {
    try {
        const students = await loadStudents();
        res.json({ success: true, students });
    } catch (error) {
        console.error('Error loading students:', error);
        res.status(500).json({ success: false, message: '加载学生列表失败' });
    }
});

app.get('/files', async (req, res) => {
    try {
        const metadata = await loadMetadata();
        const students = await loadStudents();
        
        // 获取已上传的学生列表
        const uploadedStudents = new Set(metadata.map(file => file.student));
        
        // 获取未上传的学生列表
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

app.get('/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const metadata = await loadMetadata();
        const fileRecord = metadata.find(file => file.fileName === filename);
        
        if (!fileRecord) {
            return res.status(404).json({ success: false, message: '文件不存在' });
        }
        
        const filePath = fileRecord.path;
        
        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ success: false, message: '文件已被删除' });
        }
        
        res.download(filePath, fileRecord.originalName);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ success: false, message: '文件下载失败' });
    }
});

app.delete('/files/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const metadata = await loadMetadata();
        const fileIndex = metadata.findIndex(file => file.fileName === filename);
        
        if (fileIndex === -1) {
            return res.status(404).json({ success: false, message: '文件不存在' });
        }
        
        const fileRecord = metadata[fileIndex];
        
        // 删除文件
        try {
            await fs.unlink(fileRecord.path);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
        
        // 从元数据中删除
        metadata.splice(fileIndex, 1);
        await saveMetadata(metadata);
        
        res.json({ success: true, message: '文件删除成功' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: '文件删除失败' });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, async () => {
    try {
        await ensureUploadDir();
        await initProductionData();
        console.log(`文件上传系统已启动`);
        console.log(`端口: ${PORT}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`上传目录: ${UPLOAD_DIR}`);
        console.log(`支持文件类型: ${allowedExtensions.join(', ')}`);
        console.log(`最大文件大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        
        // 测试健康检查
        console.log('健康检查: http://localhost:' + PORT + '/health');
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
});