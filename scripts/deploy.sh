#!/bin/bash

# Zippy File Collector 一键部署脚本
# 适用于腾讯云轻量级应用服务器 + 1Panel 环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

print_success() {
    print_message "$GREEN" "$1"
}

print_warning() {
    print_message "$YELLOW" "$1"
}

print_error() {
    print_message "$RED" "$1"
}

print_info() {
    print_message "$BLUE" "$1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "此脚本需要root权限运行"
        echo "请使用: sudo $0"
        exit 1
    fi
}

# 检查系统
check_system() {
    print_info "检查系统环境..."
    
    # 检查操作系统
    if ! grep -q "Ubuntu" /etc/os-release; then
        print_warning "此脚本主要为Ubuntu系统设计，其他系统可能需要手动调整"
    fi
    
    # 检查网络连接
    if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        print_error "网络连接失败，请检查网络设置"
        exit 1
    fi
    
    print_success "系统检查通过"
}

# 安装系统依赖
install_dependencies() {
    print_info "安装系统依赖..."
    
    apt update
    apt upgrade -y
    
    # 安装基础工具
    apt install -y curl wget git unzip htop tree net-tools \
                   software-properties-common apt-transport-https \
                   ca-certificates gnupg lsb-release
    
    print_success "系统依赖安装完成"
}

# 安装Docker
install_docker() {
    if command -v docker >/dev/null 2>&1; then
        print_success "Docker已安装"
        return
    fi
    
    print_info "安装Docker..."
    
    # 添加Docker官方GPG密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加Docker仓库
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 启动Docker服务
    systemctl enable docker
    systemctl start docker
    
    # 添加当前用户到docker组
    if [ "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        print_warning "请重新登录以使docker组权限生效"
    fi
    
    print_success "Docker安装完成"
}

# 安装1Panel
install_1panel() {
    if command -v 1panel >/dev/null 2>&1; then
        print_success "1Panel已安装"
        return
    fi
    
    print_info "安装1Panel..."
    
    # 下载安装脚本
    curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh
    
    # 执行安装
    bash quick_start.sh
    
    # 清理安装脚本
    rm -f quick_start.sh
    
    print_success "1Panel安装完成"
}

# 创建项目目录
create_project_structure() {
    print_info "创建项目目录结构..."
    
    PROJECT_DIR="/opt/zippy-file-collector"
    mkdir -p "$PROJECT_DIR"/{data,logs,backups,scripts}
    
    # 设置权限
    chown -R root:root "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    print_success "项目目录创建完成: $PROJECT_DIR"
}

# 下载项目文件
download_project() {
    print_info "下载项目文件..."
    
    PROJECT_DIR="/opt/zippy-file-collector"
    
    # 这里应该是实际的下载方式
    # 可以是Git克隆，或者从本地复制文件
    # 示例使用Git（需要替换为实际的仓库地址）
    read -p "请输入项目Git仓库地址（留空跳过）: " GIT_REPO
    
    if [ -n "$GIT_REPO" ]; then
        cd "$PROJECT_DIR"
        git clone "$GIT_REPO" .
        print_success "项目文件下载完成"
    else
        print_warning "跳过项目文件下载，请手动上传文件到 $PROJECT_DIR"
        print_info "需要的文件包括："
        print_info "  - package.json"
        print_info "  - server.js"
        print_info "  - index.html"
        print_info "  - style.css"
        print_info "  - script.js"
        print_info "  - Dockerfile"
        print_info "  - docker-compose.yml"
    fi
}

# 创建默认配置文件
create_default_config() {
    print_info "创建默认配置文件..."
    
    PROJECT_DIR="/opt/zippy-file-collector"
    
    # 创建学生名单文件
    if [ ! -f "$PROJECT_DIR/data/classmate.txt" ]; then
        cat > "$PROJECT_DIR/data/classmate.txt" << EOF
张三
李四
王五
赵六
钱七
孙八
周九
吴十
EOF
        print_success "创建默认学生名单文件"
    fi
    
    # 创建环境配置文件
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        else
            cat > "$PROJECT_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai
EOF
        fi
        print_success "创建环境配置文件"
    fi
}

# 部署应用
deploy_application() {
    print_info "部署应用..."
    
    PROJECT_DIR="/opt/zippy-file-collector"
    cd "$PROJECT_DIR"
    
    # 检查必要文件
    if [ ! -f "docker-compose.yml" ]; then
        print_error "未找到docker-compose.yml文件"
        exit 1
    fi
    
    if [ ! -f "Dockerfile" ]; then
        print_error "未找到Dockerfile文件"
        exit 1
    fi
    
    # 构建并启动容器
    print_info "构建Docker镜像..."
    docker-compose build
    
    print_info "启动应用服务..."
    docker-compose up -d
    
    # 等待服务启动
    print_info "等待服务启动..."
    sleep 15
    
    # 检查服务状态
    if docker ps | grep -q "zippy-file-collector"; then
        print_success "应用服务启动成功"
    else
        print_error "应用服务启动失败"
        print_error "请检查日志: docker-compose logs"
        exit 1
    fi
    
    # 健康检查
    print_info "进行健康检查..."
    for i in {1..10}; do
        if curl -s -f http://localhost:3000/health >/dev/null 2>&1; then
            print_success "应用健康检查通过"
            break
        fi
        
        if [ $i -eq 10 ]; then
            print_error "应用健康检查失败"
            print_error "请检查应用日志: docker-compose logs file-collector"
            exit 1
        fi
        
        print_info "等待应用启动... ($i/10)"
        sleep 5
    done
}

# 配置防火墙
configure_firewall() {
    print_info "配置防火墙..."
    
    # 安装ufw（如果未安装）
    if ! command -v ufw >/dev/null 2>&1; then
        apt install -y ufw
    fi
    
    # 重置防火墙规则
    ufw --force reset
    
    # 默认策略
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许SSH
    ufw allow ssh
    
    # 允许HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 允许1Panel管理端口
    ufw allow 8888/tcp
    
    # 启用防火墙
    ufw --force enable
    
    print_success "防火墙配置完成"
}

# 显示部署信息
show_deployment_info() {
    print_success "部署完成！"
    echo
    print_info "==================================="
    print_info "部署信息"
    print_info "==================================="
    print_info "项目目录: /opt/zippy-file-collector"
    print_info "应用地址: http://your-server-ip"
    print_info "健康检查: http://your-server-ip/health"
    print_info "1Panel管理: http://your-server-ip:8888"
    print_info "==================================="
    echo
    print_warning "后续步骤："
    print_warning "1. 配置域名解析（如果使用域名）"
    print_warning "2. 在1Panel中配置反向代理"
    print_warning "3. 申请SSL证书（可选）"
    print_warning "4. 配置备份策略"
    print_warning "5. 设置监控告警"
    echo
    print_info "常用命令："
    print_info "查看应用状态: docker-compose ps"
    print_info "查看应用日志: docker-compose logs -f"
    print_info "重启应用: docker-compose restart"
    print_info "停止应用: docker-compose down"
}

# 主函数
main() {
    print_info "开始部署 Zippy File Collector..."
    
    check_root
    check_system
    
    read -p "是否安装系统依赖和Docker？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_dependencies
        install_docker
    fi
    
    read -p "是否安装1Panel？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_1panel
    fi
    
    create_project_structure
    download_project
    create_default_config
    deploy_application
    configure_firewall
    show_deployment_info
}

# 执行主函数
main "$@"