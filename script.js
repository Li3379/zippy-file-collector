class FileUploadSystem {
    constructor() {
        this.students = [];
        this.currentStudentFile = null;
        this.isUpdateMode = false;
        this.MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
        this.init();
    }

    async init() {
        await this.loadStudents();
        this.setupEventListeners();
        this.loadFiles();
    }

    async loadStudents() {
        try {
            // 优先从API加载学生列表，如果失败则从文件加载
            let response;
            try {
                response = await fetch('/students');
                const data = await response.json();
                if (data.success) {
                    this.students = data.students;
                    console.log(`✅ 从API加载学生名单: ${this.students.length} 人`);
                } else {
                    throw new Error('API返回失败');
                }
            } catch (apiError) {
                console.warn('⚠️ API加载失败，尝试从文件加载:', apiError.message);
                response = await fetch('classmate.txt');
                const text = await response.text();
                this.students = text.split('\n')
                    .map(name => name.trim())
                    .filter(name => name.length > 0);
            }
            
            const select = document.getElementById('studentSelect');
            // 清空现有选项
            select.innerHTML = '<option value="">-- 请选择姓名 --</option>';
            
            this.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student;
                option.textContent = student;
                select.appendChild(option);
            });
            
            console.log(`📚 学生名单初始化完成: ${this.students.length} 人`);
        } catch (error) {
            console.error('❌ 加载学生名单失败:', error);
            this.showMessage('加载学生名单失败', 'error');
        }
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const studentSelect = document.getElementById('studentSelect');
        const uploadBtn = document.getElementById('uploadBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');

        fileInput.addEventListener('change', () => this.validateForm());
        studentSelect.addEventListener('change', () => this.handleStudentChange());
        
        uploadBtn.addEventListener('click', () => this.uploadFile());
        refreshBtn.addEventListener('click', () => this.loadFiles());
        
        if (cancelUpdateBtn) {
            cancelUpdateBtn.addEventListener('click', () => this.cancelUpdate());
        }
    }

    async handleStudentChange() {
        const studentSelect = document.getElementById('studentSelect');
        const selectedStudent = studentSelect.value;
        
        if (!selectedStudent) {
            this.resetForm();
            return;
        }
        
        try {
            const response = await fetch(`/student/${encodeURIComponent(selectedStudent)}`);
            const data = await response.json();
            
            if (data.success && data.hasFile) {
                this.currentStudentFile = data.file;
                this.enableUpdateMode();
            } else {
                this.currentStudentFile = null;
                this.disableUpdateMode();
            }
            
            this.validateForm();
        } catch (error) {
            console.error('Error checking student file:', error);
            this.currentStudentFile = null;
            this.disableUpdateMode();
        }
    }

    enableUpdateMode() {
        this.isUpdateMode = true;
        const uploadBtn = document.getElementById('uploadBtn');
        const description = document.getElementById('description');
        
        uploadBtn.textContent = '更新文件';
        uploadBtn.style.background = 'linear-gradient(135deg, #e67e22, #d35400)';
        
        if (this.currentStudentFile.description) {
            description.value = this.currentStudentFile.description;
        }
        
        this.showExistingFileInfo();
    }

    disableUpdateMode() {
        this.isUpdateMode = false;
        const uploadBtn = document.getElementById('uploadBtn');
        
        uploadBtn.textContent = '上传文件';
        uploadBtn.style.background = '';
        this.hideExistingFileInfo();
    }

    showExistingFileInfo() {
        const existingFileInfo = document.getElementById('existingFileInfo');
        if (!existingFileInfo) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'existingFileInfo';
            infoDiv.className = 'existing-file-info';
            
            const uploadSection = document.querySelector('.upload-section');
            const fileInputGroup = document.querySelector('input[type="file"]').closest('.form-group');
            uploadSection.insertBefore(infoDiv, fileInputGroup);
        }
        
        existingFileInfo.innerHTML = `
            <h3>当前已上传文件</h3>
            <div class="current-file-details">
                <p><strong>文件名：</strong>${this.currentStudentFile.originalName}</p>
                <p><strong>大小：</strong>${this.formatFileSize(this.currentStudentFile.size)}</p>
                <p><strong>上传时间：</strong>${new Date(this.currentStudentFile.uploadDate).toLocaleString('zh-CN')}</p>
                ${this.currentStudentFile.description ? `<p><strong>描述：</strong>${this.currentStudentFile.description}</p>` : ''}
            </div>
            <button type="button" id="cancelUpdateBtn" class="cancel-btn">取消更新</button>
        `;
        
        // 重新绑定取消按钮事件
        document.getElementById('cancelUpdateBtn').addEventListener('click', () => this.cancelUpdate());
    }

    hideExistingFileInfo() {
        const existingFileInfo = document.getElementById('existingFileInfo');
        if (existingFileInfo) {
            existingFileInfo.remove();
        }
    }

    cancelUpdate() {
        const fileInput = document.getElementById('fileInput');
        const description = document.getElementById('description');
        
        fileInput.value = '';
        description.value = '';
        this.disableUpdateMode();
        this.validateForm();
    }

    validateForm() {
        const studentSelect = document.getElementById('studentSelect');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        const isValid = studentSelect.value && fileInput.files.length > 0;
        uploadBtn.disabled = !isValid;

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const validTypes = ['.zip', '.rar', '.7z', '.tar', '.gz'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!validTypes.includes(fileExtension)) {
                uploadBtn.disabled = true;
                this.showMessage('请选择支持的压缩文件格式 (.zip, .rar, .7z, .tar, .gz)', 'error');
                return;
            }

            // 检查文件大小
            if (file.size > this.MAX_FILE_SIZE) {
                uploadBtn.disabled = true;
                this.showMessage('文件过大，超过100MB限制。请压缩后重试。', 'error');
                return;
            }
        }
    }

    async uploadFile() {
        const studentSelect = document.getElementById('studentSelect');
        const fileInput = document.getElementById('fileInput');
        const description = document.getElementById('description').value;

        if (!studentSelect.value || !fileInput.files.length) {
            this.showMessage('请选择姓名和文件', 'error');
            return;
        }

        const file = fileInput.files[0];
        const validTypes = ['.zip', '.rar', '.7z', '.tar', '.gz'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(fileExtension)) {
            this.showMessage('文件格式不支持，请选择压缩文件', 'error');
            return;
        }

        // 检查文件大小
        if (file.size > this.MAX_FILE_SIZE) {
            this.showMessage('文件过大，超过100MB限制。请压缩后重试。', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('student', studentSelect.value);
        formData.append('description', description);
        
        if (this.isUpdateMode) {
            formData.append('isUpdate', 'true');
        }

        try {
            this.showProgress(true);
            this.showMessage('上传中...', 'success');

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                console.log('上传响应:', xhr.status, xhr.responseText);
                
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const action = this.isUpdateMode ? '更新' : '上传';
                        this.showMessage(`文件${action}成功！`, 'success');
                        this.resetForm();
                        this.loadFiles();
                        // 重新加载学生列表以确保数据同步
                        this.loadStudents();
                    } else {
                        this.showMessage(response.message || '操作失败', 'error');
                    }
                } else if (xhr.status === 400) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.hasExistingFile) {
                        this.currentStudentFile = response.existingFile;
                        this.enableUpdateMode();
                        this.showMessage(response.message, 'error');
                    } else {
                        this.showMessage(response.message || '操作失败', 'error');
                    }
                } else {
                    this.showMessage('操作失败，请重试', 'error');
                }
                this.showProgress(false);
            });

            xhr.addEventListener('error', () => {
                console.error('上传网络错误');
                this.showMessage('网络错误，操作失败', 'error');
                this.showProgress(false);
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);

        } catch (error) {
            console.error('上传异常:', error);
            this.showMessage('操作失败：' + error.message, 'error');
            this.showProgress(false);
        }
    }

    showProgress(show) {
        const progressContainer = document.getElementById('progressContainer');
        progressContainer.style.display = show ? 'block' : 'none';
        if (!show) {
            this.updateProgress(0);
        }
    }

    updateProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = percent + '%';
        progressText.textContent = Math.round(percent) + '%';
        
        // 确保进度条到达100%后能够继续处理
        if (percent >= 100) {
            console.log('⏳ 上传完成，等待服务器响应...');
        }
    }

    async loadFiles() {
        try {
            console.log('🔄 开始加载文件列表...');
            const response = await fetch('/files');
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ 文件列表加载成功: ${data.files.length} 个文件`);
                this.displayFiles(data.files);
                this.displayUnuploadedStudents(data.unuploadedStudents, data.totalStudents, data.uploadedCount, data.unuploadedCount);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ 加载文件列表失败:', error);
            this.showMessage('加载文件列表失败', 'error');
        }
    }

    // 下载文件功能
    async downloadFile(fileId, fileName) {
        try {
            this.showMessage('开始下载...', 'success');
            
            const response = await fetch(`/download/${fileId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                this.showMessage(errorData.message || '下载失败', 'error');
                return;
            }
            
            // 获取文件blob
            const blob = await response.blob();
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`文件 "${fileName}" 下载完成`, 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showMessage('下载失败: ' + error.message, 'error');
        }
    }

    // 删除文件功能
    async deleteFile(fileId, fileName) {
        if (!confirm(`确定要删除文件 "${fileName}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        try {
            const response = await fetch(`/files/${fileId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage(`文件 "${fileName}" 删除成功`, 'success');
                this.loadFiles(); // 重新加载文件列表
                this.loadStudents(); // 重新加载学生列表
            } else {
                this.showMessage(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }

    displayFiles(files) {
        const filesList = document.getElementById('filesList');
        
        if (files.length === 0) {
            filesList.innerHTML = '<div class="no-files">暂无上传文件</div>';
            return;
        }

        const filesHTML = files.map(file => {
            const uploadDate = new Date(file.uploadDate).toLocaleString('zh-CN');
            const fileSize = this.formatFileSize(file.size);
            const lastUpdated = file.lastUpdated ? new Date(file.lastUpdated).toLocaleString('zh-CN') : '';
            
            return `
                <div class="file-item">
                    <div class="file-header">
                        <span class="file-name">${file.originalName}</span>
                        <span style="color: #3498db; font-weight: 600;">${file.student}</span>
                    </div>
                    <div class="file-info">
                        <span>📁 ${fileSize}</span>
                        <span>📅 ${uploadDate}</span>
                        ${lastUpdated ? `<span>🔄 更新于: ${lastUpdated}</span>` : ''}
                        <span>🗂️ ${file.extension}</span>
                    </div>
                    ${file.description ? `<div class="file-description">"${file.description}"</div>` : ''}
                    <div class="file-actions">
                        <button class="download-btn" onclick="fileSystem.downloadFile(${file.id}, '${file.originalName}')">
                            📥 下载
                        </button>
                        <button class="delete-btn" onclick="fileSystem.deleteFile(${file.id}, '${file.originalName}')">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        filesList.innerHTML = filesHTML;
    }

    displayUnuploadedStudents(unuploadedStudents, totalStudents, uploadedCount, unuploadedCount) {
        const statsSection = document.getElementById('uploadStats');
        const unuploadedSection = document.getElementById('unuploadedStudents');
        
        // 显示统计信息
        const percentage = Math.round((uploadedCount / totalStudents) * 100);
        statsSection.innerHTML = `
            <h3>上传统计</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${uploadedCount}</span>
                    <span class="stat-label">已上传</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${unuploadedCount}</span>
                    <span class="stat-label">未上传</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${percentage}%</span>
                    <span class="stat-label">完成率</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        
        // 显示未上传学生列表
        if (unuploadedStudents.length === 0) {
            unuploadedSection.innerHTML = '<div class="all-uploaded">🎉 所有学生都已上传文件！</div>';
        } else {
            const studentsHTML = unuploadedStudents.map(student => 
                `<span class="student-tag">${student}</span>`
            ).join('');
            
            unuploadedSection.innerHTML = `
                <h3>未上传学生 (${unuploadedCount}人)</h3>
                <div class="students-grid">
                    ${studentsHTML}
                </div>
            `;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = type;
        messageDiv.style.display = message ? 'block' : 'none';
        
        if (message && type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }

    resetForm() {
        document.getElementById('studentSelect').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('description').value = '';
        document.getElementById('uploadBtn').disabled = true;
        
        this.currentStudentFile = null;
        this.isUpdateMode = false;
        this.disableUpdateMode();
        this.hideExistingFileInfo();
    }
}

// 创建全局实例以便事件处理
let fileSystem;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 初始化文件上传系统...');
    fileSystem = new FileUploadSystem();
});