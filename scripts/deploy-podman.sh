#!/bin/bash

# MemoryArk 2.0 Podman 生產環境部署腳本
# 優化記憶體使用和檔案 I/O 效能

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查 Podman 是否已安裝
check_podman() {
    log_info "檢查 Podman 環境..."
    if ! command -v podman &> /dev/null; then
        log_error "Podman 未安裝，請先安裝 Podman"
        exit 1
    fi
    
    local podman_version=$(podman --version | awk '{print $3}')
    log_success "Podman 版本: $podman_version"
}

# 檢查系統資源
check_system_resources() {
    log_info "檢查系統資源..."
    
    local total_mem=$(free -h | awk '/^Mem:/ {print $2}')
    local available_mem=$(free -h | awk '/^Mem:/ {print $7}')
    local disk_space=$(df -h . | awk 'NR==2 {print $4}')
    
    log_info "總記憶體: $total_mem"
    log_info "可用記憶體: $available_mem"
    log_info "可用磁碟空間: $disk_space"
    
    # 檢查最低需求
    local mem_gb=$(free -g | awk '/^Mem:/ {print $2}')
    if [ "$mem_gb" -lt 2 ]; then
        log_warning "建議至少 2GB 記憶體以獲得最佳效能"
    fi
}

# 優化 Podman 配置
optimize_podman_config() {
    log_info "優化 Podman 配置..."
    
    # 建立 Podman 配置目錄
    mkdir -p ~/.config/containers
    
    # 優化 storage.conf
    cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"
runroot = "/run/user/1000/containers"
graphroot = "/home/davidliou/.local/share/containers/storage"

[storage.options]
additionalimagestores = []

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
size = "20G"
skip_mount_home = false
mount_program = "/usr/bin/fuse-overlayfs"

[storage.options.thinpool]
size = "20G"
use_deferred_removal = true
use_deferred_deletion = true
EOF

    # 優化 containers.conf
    cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
default_ulimits = [
    "nofile=65536:65536",
    "nproc=4096:4096"
]
pids_limit = 4096
log_size_max = 52428800
events_logger = "file"
netns = "bridge"

[engine]
cgroup_manager = "systemd"
events_logger = "file"
image_default_transport = "docker://"
runtime = "crun"
stop_timeout = 30

[network]
network_backend = "netavark"
EOF

    log_success "Podman 配置已優化"
}

# 建立生產環境變數檔案
create_production_env() {
    log_info "建立生產環境配置..."
    
    cat > .env.production << 'EOF'
# MemoryArk 2.0 生產環境配置

# 基本配置
GIN_MODE=release
PORT=8080
DATABASE_PATH=/app/data/memoryark.db

# 安全配置
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production
ROOT_ADMIN_EMAIL=admin@your-church.org
ROOT_ADMIN_NAME=系統管理員

# 檔案處理配置
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=104857600
MAX_UPLOAD_MEMORY=33554432
DEDUPLICATION_ENABLED=true
STREAMING_EXPORT_ENABLED=true
EXPORT_CLEANUP_INTERVAL=24h
VIRTUAL_PATH_ENABLED=true

# Go 運行時優化
GOMEMLIMIT=512MiB
GOGC=100
GOMAXPROCS=2

# 資料庫優化
SQLITE_CACHE_SIZE=2000
SQLITE_JOURNAL_MODE=WAL
SQLITE_SYNCHRONOUS=NORMAL

# 效能監控
ENABLE_METRICS=true
METRICS_PORT=9090
EOF

    log_warning "請編輯 .env.production 檔案，更新 JWT_SECRET 和其他敏感配置"
    log_success "生產環境配置檔案已建立"
}

# 建立 systemd 服務檔案
create_systemd_service() {
    log_info "建立 systemd 服務檔案..."
    
    local service_file="$HOME/.config/systemd/user/memoryark.service"
    mkdir -p "$(dirname "$service_file")"
    
    cat > "$service_file" << EOF
[Unit]
Description=MemoryArk 2.0 Church File Management System
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
ExecStartPre=/usr/bin/podman-compose --env-file .env.production down
ExecStart=/usr/bin/podman-compose --env-file .env.production up
ExecStop=/usr/bin/podman-compose --env-file .env.production down
Restart=always
RestartSec=30
TimeoutStartSec=300
TimeoutStopSec=60

# 資源限制
MemoryLimit=1.5G
CPUQuota=150%

# 安全設置
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$(pwd)

[Install]
WantedBy=default.target
EOF

    # 啟用用戶 systemd 服務
    systemctl --user daemon-reload
    systemctl --user enable memoryark.service
    
    log_success "systemd 服務已建立並啟用"
    log_info "使用以下命令管理服務:"
    log_info "  啟動: systemctl --user start memoryark"
    log_info "  停止: systemctl --user stop memoryark"
    log_info "  狀態: systemctl --user status memoryark"
    log_info "  日誌: journalctl --user -u memoryark -f"
}

# 建立備份腳本
create_backup_script() {
    log_info "建立自動備份腳本..."
    
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# MemoryArk 2.0 自動備份腳本

BACKUP_DIR="/backup/memoryark"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="memoryark_backup_$DATE"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

# 停止服務
systemctl --user stop memoryark

# 備份資料庫
cp data/memoryark.db "$BACKUP_DIR/${BACKUP_NAME}.db"

# 備份上傳檔案（使用 rsync 增量備份）
rsync -av --delete uploads/ "$BACKUP_DIR/uploads_$DATE/"

# 壓縮備份
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}.db" "uploads_$DATE/"

# 清理超過 30 天的備份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# 重啟服務
systemctl --user start memoryark

echo "備份完成: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
EOF

    chmod +x scripts/backup.sh
    
    # 建立 crontab 條目建議
    log_success "備份腳本已建立"
    log_info "建議的 crontab 設定（每日凌晨 2 點備份）:"
    log_info "  0 2 * * * $(pwd)/scripts/backup.sh >> $(pwd)/logs/backup.log 2>&1"
}

# 效能優化配置
optimize_performance() {
    log_info "應用效能優化配置..."
    
    # 建立優化的 docker-compose override
    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'
    # 使用 tmpfs 提升效能
    tmpfs:
      - /tmp:size=100M,noexec,nosuid,nodev
    # 優化 ulimits
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc:
        soft: 4096
        hard: 4096
    # I/O 優化
    blkio_config:
      weight: 500
    # 安全配置
    read_only: false
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
      - CHOWN
      - DAC_OVERRIDE

  nginx:
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
        reservations:
          memory: 64M
          cpus: '0.1'
    # Nginx 效能優化
    tmpfs:
      - /var/cache/nginx:size=50M,noexec,nosuid,nodev
      - /var/run:size=10M,noexec,nosuid,nodev
    ulimits:
      nofile:
        soft: 32768
        hard: 32768
EOF

    log_success "效能優化配置已建立"
}

# 建立監控腳本
create_monitoring() {
    log_info "建立監控腳本..."
    
    cat > scripts/monitor.sh << 'EOF'
#!/bin/bash

# MemoryArk 2.0 系統監控腳本

check_service_health() {
    local service_status=$(systemctl --user is-active memoryark)
    echo "服務狀態: $service_status"
    
    if [ "$service_status" != "active" ]; then
        echo "警告: MemoryArk 服務未運行"
        return 1
    fi
}

check_container_health() {
    local backend_status=$(podman healthcheck run memoryark_backend_1 2>/dev/null || echo "unhealthy")
    echo "後端健康狀態: $backend_status"
    
    local nginx_running=$(podman ps --filter "name=memoryark_nginx" --format "{{.Status}}" | grep -c "Up")
    echo "Nginx 運行狀態: $([ $nginx_running -eq 1 ] && echo "running" || echo "stopped")"
}

check_disk_space() {
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    echo "磁碟使用率: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 85 ]; then
        echo "警告: 磁碟空間不足 (${disk_usage}%)"
        return 1
    fi
}

check_memory_usage() {
    local mem_usage=$(free | awk '/^Mem:/ {printf "%.1f", ($3/$2)*100}')
    echo "記憶體使用率: ${mem_usage}%"
    
    if [ "$(echo "$mem_usage > 90" | bc)" -eq 1 ]; then
        echo "警告: 記憶體使用率過高 (${mem_usage}%)"
        return 1
    fi
}

# 執行檢查
echo "=== MemoryArk 系統監控 $(date) ==="
check_service_health
check_container_health
check_disk_space
check_memory_usage
echo "========================================="
EOF

    chmod +x scripts/monitor.sh
    
    log_success "監控腳本已建立"
    log_info "建議的監控 crontab 設定（每 5 分鐘檢查）:"
    log_info "  */5 * * * * $(pwd)/scripts/monitor.sh >> $(pwd)/logs/monitor.log 2>&1"
}

# 部署應用
deploy_application() {
    log_info "部署 MemoryArk 2.0 應用..."
    
    # 確保所需目錄存在
    mkdir -p data uploads logs
    
    # 建構映像
    log_info "建構應用映像..."
    podman build -t memoryark-backend:latest .
    
    # 使用生產環境配置啟動
    log_info "啟動生產環境..."
    podman-compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    # 等待服務啟動
    log_info "等待服務啟動..."
    sleep 30
    
    # 檢查服務狀態
    if podman ps | grep -q memoryark; then
        log_success "MemoryArk 2.0 部署成功！"
        log_info "服務已在 http://localhost:7001 運行"
    else
        log_error "部署失敗，請檢查日誌"
        exit 1
    fi
}

# 主函數
main() {
    echo "========================================="
    echo "    MemoryArk 2.0 Podman 生產環境部署"
    echo "========================================="
    
    check_podman
    check_system_resources
    optimize_podman_config
    create_production_env
    create_systemd_service
    create_backup_script
    optimize_performance
    create_monitoring
    deploy_application
    
    echo
    log_success "MemoryArk 2.0 生產環境部署完成！"
    echo
    log_info "後續步驟:"
    log_info "1. 編輯 .env.production 檔案，更新敏感配置"
    log_info "2. 設定備份 crontab: crontab -e"
    log_info "3. 設定監控 crontab: crontab -e"
    log_info "4. 檢查服務狀態: systemctl --user status memoryark"
    log_info "5. 查看日誌: journalctl --user -u memoryark -f"
    echo
}

# 執行主函數
main "$@"