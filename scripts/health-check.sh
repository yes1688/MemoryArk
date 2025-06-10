#!/bin/bash

# MemoryArk 2.0 健康檢查腳本
# 用於監控系統健康狀況和自動恢復

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEFAULT_CHECK_INTERVAL=30
DEFAULT_MAX_FAILURES=3

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 預設配置
CHECK_INTERVAL="$DEFAULT_CHECK_INTERVAL"
MAX_FAILURES="$DEFAULT_MAX_FAILURES"
ENVIRONMENT="production"
AUTO_RECOVERY=false
SLACK_WEBHOOK=""
EMAIL_ALERTS=""

# 解析命令行參數
usage() {
    echo "MemoryArk 2.0 健康檢查腳本"
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -i, --interval SECONDS   檢查間隔 (秒) [預設: $DEFAULT_CHECK_INTERVAL]"
    echo "  -f, --max-failures NUM   最大失敗次數 [預設: $DEFAULT_MAX_FAILURES]"
    echo "  -e, --environment ENV    環境 (production/staging) [預設: production]"
    echo "  -r, --auto-recovery      啟用自動恢復"
    echo "  -s, --slack-webhook URL  Slack 通知 webhook"
    echo "  -m, --email EMAIL        郵件通知地址"
    echo "  -o, --once               執行一次檢查後退出"
    echo "  -h, --help               顯示此幫助訊息"
    echo ""
}

RUN_ONCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        -f|--max-failures)
            MAX_FAILURES="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--auto-recovery)
            AUTO_RECOVERY=true
            shift
            ;;
        -s|--slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        -m|--email)
            EMAIL_ALERTS="$2"
            shift 2
            ;;
        -o|--once)
            RUN_ONCE=true
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

# 發送通知
send_notification() {
    local severity="$1"
    local message="$2"
    local timestamp=$(date -Iseconds)
    
    # Slack 通知
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color=""
        case $severity in
            "critical") color="#FF0000" ;;
            "warning") color="#FFA500" ;;
            "info") color="#00FF00" ;;
        esac
        
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"MemoryArk 2.0 健康檢查\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"環境\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"時間\", \"value\": \"$timestamp\", \"short\": true}
                    ]
                }]
            }" &
    fi
    
    # 郵件通知
    if [ -n "$EMAIL_ALERTS" ] && command -v mail &> /dev/null; then
        {
            echo "MemoryArk 2.0 健康檢查通知"
            echo ""
            echo "嚴重程度: $severity"
            echo "環境: $ENVIRONMENT"
            echo "時間: $timestamp"
            echo ""
            echo "訊息: $message"
        } | mail -s "[$severity] MemoryArk 健康檢查" "$EMAIL_ALERTS" &
    fi
}

# 檢查容器狀態
check_container_status() {
    local container_name="$1"
    local failure_count_var="$2"
    
    if ! podman ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        log_error "容器 $container_name 未運行"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    # 檢查容器健康狀態
    local container_status
    container_status=$(podman inspect "$container_name" --format "{{.State.Status}}")
    
    if [ "$container_status" != "running" ]; then
        log_error "容器 $container_name 狀態異常: $container_status"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    return 0
}

# 檢查 HTTP 服務
check_http_service() {
    local service_name="$1"
    local url="$2"
    local failure_count_var="$3"
    local timeout="${4:-10}"
    
    if ! curl -s -f --max-time "$timeout" "$url" > /dev/null; then
        log_error "$service_name HTTP 檢查失敗: $url"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    return 0
}

# 檢查資料庫連接
check_database() {
    local failure_count_var="$1"
    
    # 載入環境配置
    local env_config="$PROJECT_ROOT/deploy/$ENVIRONMENT.env"
    if [ -f "$env_config" ]; then
        source "$env_config"
    fi
    
    if [ ! -f "$DATABASE_PATH" ]; then
        log_error "資料庫文件不存在: $DATABASE_PATH"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    # 簡單的資料庫連接測試
    if ! timeout 5 sqlite3 "$DATABASE_PATH" "SELECT COUNT(*) FROM sqlite_master;" > /dev/null 2>&1; then
        log_error "資料庫連接測試失敗"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    return 0
}

# 檢查磁碟空間
check_disk_space() {
    local failure_count_var="$1"
    local min_free_percent=10
    
    # 檢查根目錄
    local root_usage
    root_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$root_usage" -gt $((100 - min_free_percent)) ]; then
        log_error "根目錄磁碟空間不足: ${root_usage}% 已使用"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    # 檢查上傳目錄
    if [ -n "$UPLOADS_PATH" ] && [ -d "$UPLOADS_PATH" ]; then
        local uploads_usage
        uploads_usage=$(df "$UPLOADS_PATH" | tail -1 | awk '{print $5}' | sed 's/%//')
        
        if [ "$uploads_usage" -gt $((100 - min_free_percent)) ]; then
            log_error "上傳目錄磁碟空間不足: ${uploads_usage}% 已使用"
            eval "${failure_count_var}=$((${!failure_count_var} + 1))"
            return 1
        fi
    fi
    
    return 0
}

# 檢查記憶體使用
check_memory_usage() {
    local failure_count_var="$1"
    local max_memory_percent=90
    
    local memory_usage
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$memory_usage" -gt "$max_memory_percent" ]; then
        log_warning "記憶體使用過高: ${memory_usage}%"
        eval "${failure_count_var}=$((${!failure_count_var} + 1))"
        return 1
    fi
    
    return 0
}

# 自動恢復函數
auto_recovery() {
    local container_name="$1"
    local action="$2"
    
    if [ "$AUTO_RECOVERY" != true ]; then
        return
    fi
    
    case $action in
        "restart_container")
            log_info "嘗試重啟容器: $container_name"
            if podman restart "$container_name"; then
                log_success "容器 $container_name 重啟成功"
                send_notification "info" "容器 $container_name 已自動重啟"
            else
                log_error "容器 $container_name 重啟失敗"
                send_notification "critical" "容器 $container_name 自動重啟失敗"
            fi
            ;;
        "recreate_container")
            log_info "嘗試重新創建容器: $container_name"
            # 這裡可以調用滾動升級腳本
            if "$SCRIPT_DIR/rolling-upgrade.sh" --environment "$ENVIRONMENT"; then
                log_success "服務重新部署成功"
                send_notification "info" "服務已自動重新部署"
            else
                log_error "服務重新部署失敗"
                send_notification "critical" "服務自動重新部署失敗，需要人工介入"
            fi
            ;;
    esac
}

# 執行健康檢查
perform_health_check() {
    local check_time=$(date '+%Y-%m-%d %H:%M:%S')
    log_info "開始健康檢查 ($check_time)"
    
    # 失敗計數器
    local backend_failures=0
    local frontend_failures=0
    local database_failures=0
    local system_failures=0
    
    # 檢查容器狀態
    check_container_status "memoryark-backend" backend_failures
    check_container_status "memoryark-nginx" frontend_failures
    
    # 檢查 HTTP 服務
    check_http_service "後端 API" "http://localhost:8080/api/health" backend_failures
    check_http_service "前端服務" "http://localhost:7001/health" frontend_failures
    
    # 檢查資料庫
    check_database database_failures
    
    # 檢查系統資源
    check_disk_space system_failures
    check_memory_usage system_failures
    
    # 統計結果
    local total_failures=$((backend_failures + frontend_failures + database_failures + system_failures))
    
    if [ $total_failures -eq 0 ]; then
        log_success "所有健康檢查通過"
        # 重置失敗計數器文件
        echo "0" > "$PROJECT_ROOT/.health_check_failures" 2>/dev/null || true
        return 0
    else
        # 讀取累積失敗次數
        local accumulated_failures=0
        if [ -f "$PROJECT_ROOT/.health_check_failures" ]; then
            accumulated_failures=$(cat "$PROJECT_ROOT/.health_check_failures")
        fi
        
        accumulated_failures=$((accumulated_failures + 1))
        echo "$accumulated_failures" > "$PROJECT_ROOT/.health_check_failures"
        
        log_error "健康檢查失敗 (失敗次數: $accumulated_failures/$MAX_FAILURES)"
        
        # 發送警告通知
        if [ $accumulated_failures -eq 1 ]; then
            send_notification "warning" "健康檢查首次失敗，將繼續監控"
        elif [ $accumulated_failures -ge $MAX_FAILURES ]; then
            send_notification "critical" "健康檢查連續失敗 $accumulated_failures 次，觸發自動恢復"
            
            # 觸發自動恢復
            if [ $backend_failures -gt 0 ]; then
                auto_recovery "memoryark-backend" "restart_container"
            fi
            
            if [ $frontend_failures -gt 0 ]; then
                auto_recovery "memoryark-nginx" "restart_container"
            fi
            
            if [ $database_failures -gt 0 ] || [ $system_failures -gt 0 ]; then
                auto_recovery "all" "recreate_container"
            fi
            
            # 重置失敗計數器
            echo "0" > "$PROJECT_ROOT/.health_check_failures"
        fi
        
        return 1
    fi
}

# 主程序
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  MemoryArk 2.0 健康檢查                     ║"
    echo "║                   系統監控與自動恢復                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    log_info "健康檢查服務啟動"
    log_info "環境: $ENVIRONMENT"
    log_info "檢查間隔: ${CHECK_INTERVAL}秒"
    log_info "最大失敗次數: $MAX_FAILURES"
    log_info "自動恢復: $([ "$AUTO_RECOVERY" = true ] && echo "啟用" || echo "停用")"
    echo ""
    
    # 單次執行模式
    if [ "$RUN_ONCE" = true ]; then
        perform_health_check
        exit $?
    fi
    
    # 持續監控模式
    while true; do
        perform_health_check
        
        if [ $? -eq 0 ]; then
            log_info "等待 ${CHECK_INTERVAL} 秒後進行下次檢查..."
        else
            log_info "檢查失敗，等待 ${CHECK_INTERVAL} 秒後重試..."
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# 信號處理
cleanup() {
    log_info "收到終止信號，正在停止健康檢查服務..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# 執行主程序
main "$@"