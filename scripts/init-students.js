# 腾讯云学生名单初始化脚本
# 这个脚本会在部署时将真实的classmate.txt内容复制到临时目录

const fs = require('fs').promises;
const path = require('path');

async function copyStudentList() {
    try {
        // 读取真实的classmate.txt
        const sourcePath = path.join(__dirname, 'classmate.txt');
        const targetPath = '/tmp/classmate.txt';
        
        console.log('📖 读取学生名单:', sourcePath);
        const data = await fs.readFile(sourcePath, 'utf8');
        
        // 处理换行符，统一为\n
        const processedData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const students = processedData.split('\n').map(name => name.trim()).filter(name => name.length > 0);
        
        console.log(`👥 找到 ${students.length} 名学生`);
        console.log('📋 学生列表:', students.slice(0, 5), '...');
        
        // 写入到临时目录
        await fs.writeFile(targetPath, processedData, 'utf8');
        console.log('✅ 学生名单已复制到:', targetPath);
        
        return students;
    } catch (error) {
        console.error('❌ 复制学生名单失败:', error);
        throw error;
    }
}

module.exports = { copyStudentList };