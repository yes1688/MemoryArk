#!/bin/bash
# LINE Service 自動部署腳本
# 用於快速部署和更新 LINE Service

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
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

# 檢查前置需求
check_requirements() {
    log_info "檢查部署環境..."
    
    # 檢查 Docker/Podman
    if command -v docker &> /dev/null; then
        CONTAINER_CMD="docker"
        COMPOSE_CMD="docker-compose"
    elif command -v podman &> /dev/null; then
        CONTAINER_CMD="podman"
        COMPOSE_CMD="podman-compose"
    else
        log_error "未找到 Docker 或 Podman"
        exit 1
    fi
    
    log_info "使用容器引擎: $CONTAINER_CMD"
    
    # 檢查 Docker Compose
    if ! command -v $COMPOSE_CMD &> /dev/null; then
        log_error "未找到 $COMPOSE_CMD"
        exit 1
    fi
    
    # 檢查 .env 檔案
    if [ ! -f .env ]; then
        log_warning ".env 檔案不存在，將使用預設值"
        if [ -f .env.example ]; then
            cp .env.example .env
            log_info "已從 .env.example 創建 .env 檔案"
            log_warning "請編輯 .env 檔案並設定必要的變數"
        fi
    fi
}

# 備份現有資料
backup_data() {
    if [ "$1" = "--backup" ]; then
        log_info "備份現有資料..."
        
        BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # 備份資料庫
        if [ -f "data/memoryark.db" ]; then
            cp data/memoryark.db "$BACKUP_DIR/"
            log_success "資料庫已備份至 $BACKUP_DIR/"
        fi
        
        # 備份上傳檔案 (只備份最近修改的)
        if [ -d "uploads" ]; then
            find uploads -type f -mtime -7 | tar -czf "$BACKUP_DIR/recent-uploads.tar.gz" -T -
            log_success "近期上傳檔案已備份"
        fi
        
        # 備份配置檔
        if [ -f ".env" ]; then
            cp .env "$BACKUP_DIR/"
        fi
        if [ -f "nginx.conf" ]; then
            cp nginx.conf "$BACKUP_DIR/"
        fi
        if [ -f "line-nginx.conf" ]; then
            cp line-nginx.conf "$BACKUP_DIR/"
        fi
        
        log_success "備份完成: $BACKUP_DIR"
    fi
}

# 建構前端
build_frontend() {
    if [ "$1" = "--build-frontend" ]; then
        log_info "建構前端資源..."
        $COMPOSE_CMD --profile build up frontend-builder
        log_success "前端建構完成"
    fi
}

# 部署服務
deploy_services() {
    log_info "部署 LINE Service..."
    
    # 停止現有服務
    $COMPOSE_CMD down
    
    # 建構 LINE Service
    log_info "建構 LINE Service 映像檔..."
    $COMPOSE_CMD build line-service
    
    # 啟動所有服務
    log_info "啟動所有服務..."
    $COMPOSE_CMD up -d
    
    # 等待服務啟動
    log_info "等待服務啟動..."
    sleep 10
    
    # 檢查服務狀態
    if $COMPOSE_CMD ps | grep -q "Up"; then
        log_success "服務部署成功"
    else
        log_error "服務部署失敗"
        $COMPOSE_CMD logs
        exit 1
    fi
}

# 驗證部署
verify_deployment() {
    log_info "驗證部署..."
    
    # 檢查服務健康狀態
    local services=("backend" "line-service" "nginx" "line-nginx" "redis")
    
    for service in "${services[@]}"; do
        if $COMPOSE_CMD ps | grep "$service" | grep -q "Up"; then
            log_success "$service 服務運行正常"
        else
            log_error "$service 服務狀態異常"
        fi
    done
    
    # 測試 HTTP 端點
    log_info "測試 HTTP 端點..."
    
    # 等待服務完全啟動
    sleep 5
    
    if curl -s http://localhost:7001/api/health > /dev/null; then
        log_success "MemoryArk 主服務可存取 (port 7001)"
    else
        log_warning "MemoryArk 主服務無法存取"
    fi
    
    if curl -s http://localhost:7002/health > /dev/null; then
        log_success "LINE Service 可存取 (port 7002)"
    else
        log_warning "LINE Service 無法存取"
    fi
}

# 顯示部署資訊
show_deployment_info() {
    log_info "部署資訊："
    echo ""
    echo "服務端點："
    echo "  - MemoryArk 前端: http://localhost:7001"
    echo "  - LINE Webhook:   http://localhost:7002/webhook/line"
    echo "  - 健康檢查:"
    echo "    - MemoryArk:    http://localhost:7001/api/health"
    echo "    - LINE Service: http://localhost:7002/health"
    echo ""
    echo "管理指令："
    echo "  - 查看服務狀態: $COMPOSE_CMD ps"
    echo "  - 查看日誌:     $COMPOSE_CMD logs -f line-service"
    echo "  - 停止服務:     $COMPOSE_CMD down"
    echo "  - 重啟服務:     $COMPOSE_CMD restart line-service"
    echo ""
    echo "重要檔案："
    echo "  - 環境變數:     .env"
    echo "  - 部署日誌:     deploy.log"
    echo "  - 服務日誌:     logs/"
    echo ""
}

# 主函數
main() {
    echo "========================================"
    echo "      LINE Service 自動部署工具"
    echo "========================================"
    echo ""
    
    # 記錄部署日誌
    exec > >(tee -a deploy.log)
    exec 2>&1
    
    log_info "開始部署 - $(date)"
    
    # 檢查前置需求
    check_requirements
    
    # 備份資料 (如果指定)
    backup_data "$1"
    
    # 建構前端 (如果指定)
    build_frontend "$2"
    
    # 部署服務
    deploy_services
    
    # 驗證部署
    verify_deployment
    
    # 顯示部署資訊
    show_deployment_info
    
    log_success "部署完成 - $(date)"
    echo ""
    log_info "查看即時日誌: $COMPOSE_CMD logs -f line-service"
    log_info "執行安全檢查: ./line-service/scripts/security-check.sh"
}

# 顯示使用說明
show_usage() {
    echo "使用方法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  --backup          部署前備份現有資料"
    echo "  --build-frontend  重新建構前端資源"
    echo "  --help            顯示此說明"
    echo ""
    echo "範例:"
    echo "  $0                    # 基本部署"
    echo "  $0 --backup          # 部署前備份"
    echo "  $0 --backup --build-frontend  # 完整部署"
}

# 解析命令列參數
case "$1" in
    --help|-h)
        show_usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac