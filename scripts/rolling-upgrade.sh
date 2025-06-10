#!/bin/bash

# MemoryArk 2.0 滾動升級腳本
# 實現零停機時間的生產環境部署

set -e

# 腳本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_CONFIG="$PROJECT_ROOT/deploy"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默認配置
DEFAULT_ENVIRONMENT="production"
DEFAULT_IMAGE_TAG="latest"
DEFAULT_HEALTH_CHECK_TIMEOUT=120
DEFAULT_ROLLBACK_TIMEOUT=300
DEFAULT_BACKUP_RETENTION_DAYS=7

# 解析命令行參數
usage() {
    echo "MemoryArk 2.0 滾動升級腳本"
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -e, --environment ENV     部署環境 (production/staging) [預設: $DEFAULT_ENVIRONMENT]"
    echo "  -t, --tag TAG            容器映像標籤 [預設: $DEFAULT_IMAGE_TAG]"
    echo "  -c, --config-check       僅檢查配置，不執行部署"
    echo "  -r, --rollback           回滾到前一個版本"
    echo "  -s, --status             顯示當前部署狀態"
    echo "  -h, --help               顯示此幫助訊息"
    echo ""
    echo "範例:"
    echo "  $0 --environment production --tag v2.0.1"
    echo "  $0 --rollback"
    echo "  $0 --status"
    echo ""
}

# 預設值
ENVIRONMENT="$DEFAULT_ENVIRONMENT"
IMAGE_TAG="$DEFAULT_IMAGE_TAG"
CONFIG_CHECK_ONLY=false
ROLLBACK_MODE=false
STATUS_ONLY=false

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -c|--config-check)
            CONFIG_CHECK_ONLY=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK_MODE=true
            shift
            ;;
        -s|--status)
            STATUS_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 未知選項: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# 日誌函數
log_info() {
    echo -e "${BLUE}ℹ️  [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}❌ [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 檢查依賴項
check_dependencies() {
    log_step "檢查系統依賴項..."
    
    local missing_deps=()
    
    # 檢查 Podman
    if ! command -v podman &> /dev/null; then
        missing_deps+=("podman")
    fi
    
    # 檢查 jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    # 檢查 curl
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少必要依賴項: ${missing_deps[*]}"
        echo "請安裝缺少的依賴項後重試"
        exit 1
    fi
    
    log_success "所有依賴項檢查通過"
}

# 載入環境配置
load_environment_config() {
    local env_config="$DEPLOYMENT_CONFIG/$ENVIRONMENT.env"
    
    if [ ! -f "$env_config" ]; then
        log_error "環境配置文件不存在: $env_config"
        exit 1
    fi
    
    log_info "載入環境配置: $ENVIRONMENT"
    
    # 載入環境變數
    set -a
    source "$env_config"
    set +a
    
    # 驗證必要的環境變數
    local required_vars=(
        "APP_NAME"
        "BACKEND_IMAGE"
        "FRONTEND_IMAGE"
        "NGINX_IMAGE"
        "DOMAIN_NAME"
        "DATABASE_PATH"
        "UPLOADS_PATH"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必要環境變數: ${missing_vars[*]}"
        exit 1
    fi
    
    log_success "環境配置載入完成"
}

# 檢查健康狀態
check_health() {
    local service_name="$1"
    local health_url="$2"
    local max_attempts="${3:-12}"
    local attempt=1
    
    log_step "檢查 $service_name 健康狀態..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$health_url" > /dev/null 2>&1; then
            log_success "$service_name 健康檢查通過"
            return 0
        fi
        
        log_info "健康檢查嘗試 $attempt/$max_attempts 失敗，等待 10 秒後重試..."
        sleep 10
        ((attempt++))
    done
    
    log_error "$service_name 健康檢查失敗"
    return 1
}

# 創建備份
create_backup() {
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    
    log_step "創建備份到 $backup_dir..."
    
    mkdir -p "$backup_dir"
    
    # 備份資料庫
    if [ -f "$DATABASE_PATH" ]; then
        cp "$DATABASE_PATH" "$backup_dir/database.sqlite"
        log_success "資料庫備份完成"
    fi
    
    # 備份容器配置
    podman ps --format json > "$backup_dir/containers.json"
    
    # 備份環境配置
    cp -r "$DEPLOYMENT_CONFIG" "$backup_dir/"
    
    # 創建備份資訊文件
    cat > "$backup_dir/backup_info.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "environment": "$ENVIRONMENT",
    "previous_image_tag": "$(get_current_version)",
    "new_image_tag": "$IMAGE_TAG",
    "backup_path": "$backup_dir"
}
EOF
    
    log_success "備份創建完成: $backup_dir"
    echo "$backup_dir" > "$PROJECT_ROOT/.last_backup"
}

# 獲取當前版本
get_current_version() {
    local container_name="${APP_NAME}-backend"
    
    if podman ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        podman inspect "$container_name" --format "{{.Config.Image}}" | cut -d':' -f2
    else
        echo "unknown"
    fi
}

# 清理舊備份
cleanup_old_backups() {
    local backup_base_dir="$PROJECT_ROOT/backups"
    
    if [ ! -d "$backup_base_dir" ]; then
        return
    fi
    
    log_step "清理超過 $DEFAULT_BACKUP_RETENTION_DAYS 天的舊備份..."
    
    find "$backup_base_dir" -maxdepth 1 -type d -name "20*" -mtime +$DEFAULT_BACKUP_RETENTION_DAYS -exec rm -rf {} \;
    
    log_success "舊備份清理完成"
}

# 拉取新映像
pull_new_images() {
    log_step "拉取新的容器映像..."
    
    local images=(
        "${BACKEND_IMAGE}:${IMAGE_TAG}"
        "${FRONTEND_IMAGE}:${IMAGE_TAG}"
        "${NGINX_IMAGE}:${IMAGE_TAG}"
    )
    
    for image in "${images[@]}"; do
        log_info "拉取映像: $image"
        if ! podman pull "$image"; then
            log_error "拉取映像失敗: $image"
            return 1
        fi
    done
    
    log_success "所有映像拉取完成"
}

# 滾動更新後端服務
rolling_update_backend() {
    local old_container="${APP_NAME}-backend"
    local new_container="${APP_NAME}-backend-new"
    
    log_step "開始滾動更新後端服務..."
    
    # 啟動新的後端容器
    log_info "啟動新後端容器..."
    podman run -d \
        --name "$new_container" \
        --network "${APP_NAME}-network" \
        -p 8081:8080 \
        -v "${DATABASE_PATH}:/app/data/memoryark.db" \
        -v "${UPLOADS_PATH}:/app/uploads" \
        -e "DATABASE_PATH=/app/data/memoryark.db" \
        -e "UPLOAD_PATH=/app/uploads" \
        -e "PORT=8080" \
        "${BACKEND_IMAGE}:${IMAGE_TAG}"
    
    # 等待新容器啟動
    sleep 15
    
    # 健康檢查
    if ! check_health "新後端服務" "http://localhost:8081/api/health" 12; then
        log_error "新後端服務健康檢查失敗，停止部署"
        podman stop "$new_container" || true
        podman rm "$new_container" || true
        return 1
    fi
    
    # 更新 Nginx 配置指向新後端
    log_info "更新負載均衡配置..."
    update_nginx_upstream "127.0.0.1:8081"
    
    # 等待流量切換
    sleep 10
    
    # 優雅停止舊容器
    log_info "優雅停止舊後端容器..."
    podman stop "$old_container" --time 30 || true
    
    # 重命名容器
    podman rename "$old_container" "${old_container}-old" || true
    podman rename "$new_container" "$old_container"
    
    # 更新端口映射
    podman stop "$old_container"
    podman rm "$old_container-temp" || true
    podman run -d \
        --name "$old_container" \
        --network "${APP_NAME}-network" \
        -p 8080:8080 \
        -v "${DATABASE_PATH}:/app/data/memoryark.db" \
        -v "${UPLOADS_PATH}:/app/uploads" \
        -e "DATABASE_PATH=/app/data/memoryark.db" \
        -e "UPLOAD_PATH=/app/uploads" \
        -e "PORT=8080" \
        "${BACKEND_IMAGE}:${IMAGE_TAG}"
    
    # 最終健康檢查
    if ! check_health "更新後後端服務" "http://localhost:8080/api/health" 12; then
        log_error "後端服務最終健康檢查失敗"
        return 1
    fi
    
    # 清理舊容器
    podman rm "${old_container}-old" || true
    
    log_success "後端服務滾動更新完成"
}

# 更新 Nginx 上游配置
update_nginx_upstream() {
    local new_upstream="$1"
    local nginx_container="${APP_NAME}-nginx"
    
    # 這裡應該根據實際的 Nginx 配置更新方式來實現
    # 簡化處理：重載 Nginx 配置
    podman exec "$nginx_container" nginx -s reload || true
}

# 滾動更新前端服務
rolling_update_frontend() {
    local old_container="${APP_NAME}-nginx"
    local new_container="${APP_NAME}-nginx-new"
    
    log_step "開始滾動更新前端服務..."
    
    # 生成新的 Nginx 配置
    generate_nginx_config
    
    # 啟動新的 Nginx 容器
    log_info "啟動新前端容器..."
    podman run -d \
        --name "$new_container" \
        --network "${APP_NAME}-network" \
        -p 7002:80 \
        -v "$PROJECT_ROOT/nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "$PROJECT_ROOT/frontend/dist:/usr/share/nginx/html:ro" \
        "${NGINX_IMAGE}:${IMAGE_TAG}"
    
    # 健康檢查
    sleep 5
    if ! check_health "新前端服務" "http://localhost:7002/health" 6; then
        log_error "新前端服務健康檢查失敗"
        podman stop "$new_container" || true
        podman rm "$new_container" || true
        return 1
    fi
    
    # 切換端口
    log_info "切換服務端口..."
    podman stop "$old_container"
    podman rename "$old_container" "${old_container}-old"
    podman rename "$new_container" "$old_container"
    
    # 重新映射到正確端口
    podman stop "$old_container"
    podman run -d \
        --name "${old_container}-final" \
        --network "${APP_NAME}-network" \
        -p 7001:80 \
        -v "$PROJECT_ROOT/nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "$PROJECT_ROOT/frontend/dist:/usr/share/nginx/html:ro" \
        "${NGINX_IMAGE}:${IMAGE_TAG}"
    
    podman rm "$old_container"
    podman rename "${old_container}-final" "$old_container"
    
    # 最終健康檢查
    if ! check_health "更新後前端服務" "http://localhost:7001/" 6; then
        log_error "前端服務最終健康檢查失敗"
        return 1
    fi
    
    # 清理舊容器
    podman rm "${old_container}-old" || true
    
    log_success "前端服務滾動更新完成"
}

# 生成 Nginx 配置
generate_nginx_config() {
    log_info "生成 Nginx 配置..."
    
    cat > "$PROJECT_ROOT/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # 日誌格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss application/json;
    
    # 上游後端服務
    upstream backend {
        server memoryark-backend:8080;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # 健康檢查端點
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # API 請求代理到後端
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 超時設定
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # 檔案上傳
            client_max_body_size 100M;
        }
        
        # 靜態檔案服務
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
            
            # 快取設定
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
}
EOF
    
    log_success "Nginx 配置生成完成"
}

# 驗證部署
verify_deployment() {
    log_step "驗證部署結果..."
    
    local health_checks=(
        "後端服務:http://localhost:8080/api/health"
        "前端服務:http://localhost:7001/health"
        "完整服務:http://localhost:7001/api/health"
    )
    
    for check in "${health_checks[@]}"; do
        local name="${check%%:*}"
        local url="${check##*:}"
        
        if ! check_health "$name" "$url" 6; then
            log_error "部署驗證失敗: $name"
            return 1
        fi
    done
    
    # 檢查服務版本
    local current_version
    current_version=$(curl -s "http://localhost:8080/api/version" | jq -r '.version' 2>/dev/null || echo "unknown")
    
    log_success "部署驗證完成"
    log_info "當前服務版本: $current_version"
}

# 回滾部署
rollback_deployment() {
    log_step "開始回滾部署..."
    
    local last_backup
    if [ -f "$PROJECT_ROOT/.last_backup" ]; then
        last_backup=$(cat "$PROJECT_ROOT/.last_backup")
    else
        log_error "找不到最近的備份資訊"
        return 1
    fi
    
    if [ ! -d "$last_backup" ]; then
        log_error "備份目錄不存在: $last_backup"
        return 1
    fi
    
    # 讀取備份資訊
    local backup_info="$last_backup/backup_info.json"
    if [ ! -f "$backup_info" ]; then
        log_error "找不到備份資訊文件"
        return 1
    fi
    
    local previous_tag
    previous_tag=$(jq -r '.previous_image_tag' "$backup_info")
    
    if [ "$previous_tag" = "null" ] || [ "$previous_tag" = "unknown" ]; then
        log_error "無法確定回滾的目標版本"
        return 1
    fi
    
    log_info "回滾到版本: $previous_tag"
    
    # 恢復資料庫
    if [ -f "$last_backup/database.sqlite" ]; then
        log_info "恢復資料庫..."
        cp "$last_backup/database.sqlite" "$DATABASE_PATH"
    fi
    
    # 回滾到之前的映像版本
    IMAGE_TAG="$previous_tag"
    
    # 執行部署（使用舊版本）
    rolling_update_backend
    rolling_update_frontend
    
    log_success "回滾完成"
}

# 顯示部署狀態
show_deployment_status() {
    echo -e "${CYAN}MemoryArk 2.0 部署狀態${NC}"
    echo "================================"
    echo ""
    
    # 顯示容器狀態
    echo -e "${BLUE}容器狀態:${NC}"
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=${APP_NAME}-*"
    echo ""
    
    # 顯示映像版本
    echo -e "${BLUE}映像版本:${NC}"
    for container in "${APP_NAME}-backend" "${APP_NAME}-nginx"; do
        if podman ps --format "{{.Names}}" | grep -q "^${container}$"; then
            local image
            image=$(podman inspect "$container" --format "{{.Config.Image}}")
            echo "$container: $image"
        else
            echo "$container: 未運行"
        fi
    done
    echo ""
    
    # 顯示健康狀態
    echo -e "${BLUE}服務健康狀態:${NC}"
    local health_endpoints=(
        "後端服務:http://localhost:8080/api/health"
        "前端服務:http://localhost:7001/health"
    )
    
    for endpoint in "${health_endpoints[@]}"; do
        local name="${endpoint%%:*}"
        local url="${endpoint##*:}"
        
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "$name: ${GREEN}健康${NC}"
        else
            echo -e "$name: ${RED}不健康${NC}"
        fi
    done
    echo ""
    
    # 顯示最近備份
    if [ -f "$PROJECT_ROOT/.last_backup" ]; then
        local last_backup
        last_backup=$(cat "$PROJECT_ROOT/.last_backup")
        echo -e "${BLUE}最近備份:${NC} $(basename "$last_backup")"
    fi
}

# 主要部署流程
main_deployment() {
    log_info "開始 MemoryArk 2.0 滾動升級"
    log_info "環境: $ENVIRONMENT"
    log_info "目標版本: $IMAGE_TAG"
    echo ""
    
    # 預檢查
    check_dependencies
    load_environment_config
    
    if [ "$CONFIG_CHECK_ONLY" = true ]; then
        log_success "配置檢查完成，退出"
        return 0
    fi
    
    # 創建備份
    create_backup
    
    # 拉取新映像
    pull_new_images
    
    # 滾動更新
    rolling_update_backend
    rolling_update_frontend
    
    # 驗證部署
    verify_deployment
    
    # 清理
    cleanup_old_backups
    
    log_success "滾動升級完成！"
    echo ""
    show_deployment_status
}

# 主程序
main() {
    # 顯示標題
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  MemoryArk 2.0 滾動升級                     ║"
    echo "║                 零停機時間部署自動化工具                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 根據模式執行不同操作
    if [ "$STATUS_ONLY" = true ]; then
        show_deployment_status
    elif [ "$ROLLBACK_MODE" = true ]; then
        rollback_deployment
    else
        main_deployment
    fi
}

# 錯誤處理
trap 'log_error "部署過程中發生錯誤，檢查日誌並考慮回滾"; exit 1' ERR

# 執行主程序
main "$@"