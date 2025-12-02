const fs = require('fs').promises;
const path = require('path');

// 文件管理工具脚本
class FileManager {
    constructor() {
        this.metadataFile = process.env.NODE_ENV === 'production' 
            ? '/tmp/file_metadata.json'
            : path.join(__dirname, '..', 'data', 'file_metadata.json');
    }

    // 读取所有文件元数据
    async getAllFiles() {
        try {
            const data = await fs.readFile(this.metadataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    // 导出文件到本地
    async exportFile(fileId, outputPath) {
        const files = await this.getAllFiles();
        const file = files.find(f => f.id === fileId);
        
        if (!file) {
            throw new Error('文件不存在');
        }

        const fileBuffer = Buffer.from(file.data, 'base64');
        const exportPath = path.join(outputPath, file.originalName);
        
        await fs.writeFile(exportPath, fileBuffer);
        console.log(`✅ 文件已导出: ${exportPath}`);
        
        return exportPath;
    }

    // 导出所有文件
    async exportAllFiles(outputDir) {
        const files = await this.getAllFiles();
        
        if (files.length === 0) {
            console.log('📂 没有找到文件');
            return;
        }

        // 创建导出目录
        await fs.mkdir(outputDir, { recursive: true });
        
        console.log(`📦 开始导出 ${files.length} 个文件...`);
        
        for (const file of files) {
            const studentDir = path.join(outputDir, file.student);
            await fs.mkdir(studentDir, { recursive: true });
            
            const fileBuffer = Buffer.from(file.data, 'base64');
            const filePath = path.join(studentDir, file.originalName);
            
            await fs.writeFile(filePath, fileBuffer);
            console.log(`✅ ${file.student}/${file.originalName}`);
        }
        
        console.log(`🎉 所有文件已导出到: ${outputDir}`);
    }

    // 列出所有文件
    async listFiles() {
        const files = await this.getAllFiles();
        
        if (files.length === 0) {
            console.log('📂 没有找到文件');
            return;
        }

        console.log(`📋 文件列表 (${files.length} 个文件):`);
        console.log('─'.repeat(80));
        
        files.forEach((file, index) => {
            const sizeKB = (file.size / 1024).toFixed(2);
            const date = new Date(file.uploadDate).toLocaleString('zh-CN');
            console.log(`${index + 1}. ${file.student} - ${file.originalName}`);
            console.log(`   📁 ${sizeKB}KB | 📅 ${date} | 🗂️ ${file.extension}`);
            if (file.description) {
                console.log(`   💬 ${file.description}`);
            }
            console.log('');
        });
    }

    // 统计信息
    async getStats() {
        const files = await this.getAllFiles();
        
        if (files.length === 0) {
            console.log('📊 暂无数据');
            return;
        }

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const students = [...new Set(files.map(file => file.student))];
        
        console.log('📊 文件统计:');
        console.log(`─`.repeat(40));
        console.log(`📁 文件总数: ${files.length}`);
        console.log(`👥 学生人数: ${students.length}`);
        console.log(`💾 总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📊 平均大小: ${(totalSize / files.length / 1024).toFixed(2)} KB`);
        
        // 文件类型统计
        const types = {};
        files.forEach(file => {
            types[file.extension] = (types[file.extension] || 0) + 1;
        });
        
        console.log(`🗂️ 文件类型:`);
        Object.entries(types).forEach(([ext, count]) => {
            console.log(`   ${ext}: ${count} 个`);
        });
    }
}

// 命令行工具
async function main() {
    const command = process.argv[2];
    const fileManager = new FileManager();
    
    switch (command) {
        case 'list':
            await fileManager.listFiles();
            break;
        case 'stats':
            await fileManager.getStats();
            break;
        case 'export':
            const fileId = parseInt(process.argv[3]);
            const outputPath = process.argv[4] || './exports';
            
            if (fileId) {
                await fileManager.exportFile(fileId, outputPath);
            } else {
                await fileManager.exportAllFiles(outputPath);
            }
            break;
        default:
            console.log('🔧 文件管理工具');
            console.log('');
            console.log('使用方法:');
            console.log('  node file-manager.js list                    # 列出所有文件');
            console.log('  node file-manager.js stats                   # 显示统计信息');
            console.log('  node file-manager.js export <outputDir>      # 导出所有文件');
            console.log('  node file-manager.js export <fileId> <dir>   # 导出指定文件');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FileManager;