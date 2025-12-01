const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const allowedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];

async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
    } catch (error) {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
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

const METADATA_FILE = path.join(__dirname, 'file_metadata.json');

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
        const data = await fs.readFile(path.join(__dirname, 'classmate.txt'), 'utf8');
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

        res.status(500).json({ success: false, message: '服务器错误：' + error.message });
    }
});

app.get('/files', async (req, res) => {
    try {
        const metadata = await loadMetadata();
        const students = await loadStudents();
        
        const validFiles = [];
        
        for (const fileRecord of metadata) {
            const fileInfo = await getFileInfo(fileRecord.path);
            if (fileInfo) {
                validFiles.push({
                    ...fileRecord,
                    uploadDate: fileRecord.uploadDate
                });
            }
        }

        const sortedFiles = validFiles.sort((a, b) => 
            new Date(b.uploadDate) - new Date(a.uploadDate)
        );
        
        // 找出未上传的学生
        const uploadedStudents = new Set(validFiles.map(file => file.student));
        const unuploadedStudents = students.filter(student => !uploadedStudents.has(student));

        res.json({
            files: sortedFiles,
            unuploadedStudents: unuploadedStudents,
            totalStudents: students.length,
            uploadedCount: uploadedStudents.size,
            unuploadedCount: unuploadedStudents.length
        });
    } catch (error) {
        console.error('Error loading files:', error);
        res.status(500).json({ error: '加载文件列表失败' });
    }
});

app.get('/student/:name', async (req, res) => {
    try {
        const studentName = decodeURIComponent(req.params.name);
        const metadata = await loadMetadata();
        
        const studentFile = metadata.find(file => file.student === studentName);
        
        if (studentFile) {
            const fileInfo = await getFileInfo(studentFile.path);
            if (fileInfo) {
                res.json({
                    hasFile: true,
                    file: {
                        ...studentFile,
                        uploadDate: studentFile.uploadDate
                    }
                });
            } else {
                res.json({ hasFile: false });
            }
        } else {
            res.json({ hasFile: false });
        }
    } catch (error) {
        console.error('Error getting student file:', error);
        res.status(500).json({ error: '获取学生文件信息失败' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, async () => {
    await ensureUploadDir();
    console.log(`文件上传系统已启动`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`上传目录: ${UPLOAD_DIR}`);
    console.log(`支持文件类型: ${allowedExtensions.join(', ')}`);
    console.log(`最大文件大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
});