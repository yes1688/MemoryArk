#!/bin/bash

# MemoryArk 2.0 部署自動化腳本
# 整合構建、測試、部署和監控的完整自動化流程

set -e

# 腳本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 默認配置
DEFAULT_ENVIRONMENT="production"
DEFAULT_BUILD_TYPE="release"
DEFAULT_TEST_SUITE="all"

# 解析命令行參數
usage() {
    echo "MemoryArk 2.0 部署自動化腳本"
    echo ""
    echo "用法: $0 [選項] [動作]"
    echo ""
    echo "動作:"
    echo "  build                構建應用程式"
    echo "  test                 執行測試套件"
    echo "  deploy               部署到指定環境"
    echo "  rollback             回滾到前一版本"
    echo "  status               顯示部署狀態"
    echo "  monitor              啟動監控服務"
    echo "  full                 執行完整流程 (構建+測試+部署)"
    echo ""
    echo "選項:"
    echo "  -e, --environment ENV     目標環境 (production/staging) [預設: $DEFAULT_ENVIRONMENT]"
    echo "  -t, --tag TAG            映像標籤"
    echo "  -b, --build-type TYPE    構建類型 (release/debug) [預設: $DEFAULT_BUILD_TYPE]"
    echo "  -s, --test-suite SUITE   測試套件 (unit/integration/load/all) [預設: $DEFAULT_TEST_SUITE]"
    echo "  -f, --force              強制執行，跳過確認"
    echo "  -v, --verbose            詳細輸出"
    echo "  -d, --dry-run            模擬執行，不實際操作"
    echo "  -h, --help               顯示此幫助訊息"
    echo ""
    echo "範例:"
    echo "  $0 full --environment production --tag v2.0.1"
    echo "  $0 deploy --environment staging"
    echo "  $0 test --test-suite load"
    echo "  $0 rollback --environment production"
    echo ""
}

# 預設值
ENVIRONMENT="$DEFAULT_ENVIRONMENT"
BUILD_TYPE="$DEFAULT_BUILD_TYPE"
TEST_SUITE="$DEFAULT_TEST_SUITE"
ACTION=""
IMAGE_TAG=""
FORCE=false
VERBOSE=false
DRY_RUN=false

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        build|test|deploy|rollback|status|monitor|full)
            ACTION="$1"
            shift
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -b|--build-type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        -s|--test-suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
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

# 驗證動作
if [ -z "$ACTION" ]; then
    echo -e "${RED}❌ 必須指定動作${NC}"
    usage
    exit 1
fi

# 日誌函數
log_info() {
    echo -e "${BLUE}ℹ️  [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    if [ "$VERBOSE" = true ]; then
        logger -t "memoryark-deploy" "INFO: $1"
    fi
}

log_success() {
    echo -e "${GREEN}✅ [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    if [ "$VERBOSE" = true ]; then
        logger -t "memoryark-deploy" "SUCCESS: $1"
    fi
}

log_warning() {
    echo -e "${YELLOW}⚠️  [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    if [ "$VERBOSE" = true ]; then
        logger -t "memoryark-deploy" "WARNING: $1"
    fi
}

log_error() {
    echo -e "${RED}❌ [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    if [ "$VERBOSE" = true ]; then
        logger -t "memoryark-deploy" "ERROR: $1"
    fi
}

log_step() {
    echo -e "${PURPLE}🔄 [$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    if [ "$VERBOSE" = true ]; then
        logger -t "memoryark-deploy" "STEP: $1"
    fi
}

# 執行命令（支援 dry-run 模式）
execute_command() {
    local cmd="$1"
    local description="$2"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] $description"
        log_info "[DRY-RUN] 命令: $cmd"
        return 0
    fi
    
    log_step "$description"
    if [ "$VERBOSE" = true ]; then
        log_info "執行命令: $cmd"
    fi
    
    if eval "$cmd"; then
        log_success "$description 完成"
        return 0
    else
        log_error "$description 失敗"
        return 1
    fi
}

# 確認操作
confirm_action() {
    local action="$1"
    local environment="$2"
    
    if [ "$FORCE" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  確認執行以下操作：${NC}"
    echo "   動作: $action"
    echo "   環境: $environment"
    if [ -n "$IMAGE_TAG" ]; then
        echo "   版本: $IMAGE_TAG"
    fi
    echo ""
    
    read -p "繼續執行? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
}

# 檢查先決條件
check_prerequisites() {
    log_step "檢查先決條件..."
    
    # 檢查必要工具
    local required_tools=("podman" "git" "curl" "jq")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        exit 1
    fi
    
    # 檢查 Git 狀態
    if [ "$ACTION" = "build" ] || [ "$ACTION" = "full" ]; then
        if ! git diff --quiet; then
            log_warning "工作目錄有未提交的變更"
            if [ "$FORCE" != true ]; then
                echo "建議先提交變更後再執行構建"
                exit 1
            fi
        fi
    fi
    
    log_success "先決條件檢查通過"
}

# 生成映像標籤
generate_image_tag() {
    if [ -n "$IMAGE_TAG" ]; then
        return
    fi
    
    local git_hash
    git_hash=$(git rev-parse --short HEAD)
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    
    case $ENVIRONMENT in
        "production")
            IMAGE_TAG="v2.0.1-${git_hash}"
            ;;
        "staging")
            IMAGE_TAG="staging-${timestamp}-${git_hash}"
            ;;
        *)
            IMAGE_TAG="dev-${timestamp}-${git_hash}"
            ;;
    esac
    
    log_info "生成映像標籤: $IMAGE_TAG"
}

# 構建應用程式
build_application() {
    log_step "開始構建應用程式..."
    
    # 進入專案根目錄
    cd "$PROJECT_ROOT"
    
    # 構建後端
    log_info "構建後端服務..."
    execute_command "cd backend && podman build -t memoryark/backend:$IMAGE_TAG -f Dockerfile ." "構建後端容器映像"
    
    # 構建前端
    log_info "構建前端應用..."
    execute_command "cd frontend && npm ci" "安裝前端依賴"
    execute_command "cd frontend && npm run build" "構建前端資產"
    execute_command "cd frontend && podman build -t memoryark/frontend:$IMAGE_TAG -f Dockerfile ." "構建前端容器映像"
    
    # 標記 latest 標籤
    if [ "$ENVIRONMENT" = "production" ]; then
        execute_command "podman tag memoryark/backend:$IMAGE_TAG memoryark/backend:latest" "標記後端 latest 標籤"
        execute_command "podman tag memoryark/frontend:$IMAGE_TAG memoryark/frontend:latest" "標記前端 latest 標籤"
    fi
    
    log_success "應用程式構建完成"
}

# 執行測試套件
run_tests() {
    log_step "開始執行測試套件: $TEST_SUITE"
    
    cd "$PROJECT_ROOT"
    
    case $TEST_SUITE in
        "unit")
            execute_command "cd backend && go test ./..." "執行後端單元測試"
            execute_command "cd frontend && npm run test:unit" "執行前端單元測試"
            ;;
        "integration")
            execute_command "./scripts/test-deduplication.sh" "執行去重功能測試"
            ;;
        "load")
            execute_command "./scripts/load-test-export.sh" "執行負載測試"
            ;;
        "all")
            execute_command "cd backend && go test ./..." "執行後端單元測試"
            execute_command "cd frontend && npm run test:unit" "執行前端單元測試"
            execute_command "./scripts/test-deduplication.sh" "執行去重功能測試"
            # 負載測試在生產環境中跳過
            if [ "$ENVIRONMENT" != "production" ]; then
                execute_command "./scripts/load-test-export.sh" "執行負載測試"
            fi
            ;;
        *)
            log_error "未知的測試套件: $TEST_SUITE"
            exit 1
            ;;
    esac
    
    log_success "測試套件執行完成"
}

# 部署應用程式
deploy_application() {
    log_step "開始部署到 $ENVIRONMENT 環境..."
    
    # 執行滾動升級
    local deploy_cmd="$SCRIPT_DIR/rolling-upgrade.sh --environment $ENVIRONMENT"
    
    if [ -n "$IMAGE_TAG" ]; then
        deploy_cmd="$deploy_cmd --tag $IMAGE_TAG"
    fi
    
    execute_command "$deploy_cmd" "執行滾動升級部署"
    
    # 部署後驗證
    sleep 30
    execute_command "$SCRIPT_DIR/health-check.sh --environment $ENVIRONMENT --once" "部署後健康檢查"
    
    log_success "部署完成"
}

# 回滾部署
rollback_deployment() {
    log_step "開始回滾 $ENVIRONMENT 環境..."
    
    execute_command "$SCRIPT_DIR/rolling-upgrade.sh --environment $ENVIRONMENT --rollback" "執行回滾操作"
    
    # 回滾後驗證
    sleep 30
    execute_command "$SCRIPT_DIR/health-check.sh --environment $ENVIRONMENT --once" "回滾後健康檢查"
    
    log_success "回滾完成"
}

# 顯示部署狀態
show_deployment_status() {
    log_step "查詢部署狀態..."
    
    execute_command "$SCRIPT_DIR/rolling-upgrade.sh --environment $ENVIRONMENT --status" "顯示部署狀態"
}

# 啟動監控服務
start_monitoring() {
    log_step "啟動監控服務..."
    
    # 檢查是否已有監控服務運行
    if pgrep -f "health-check.sh.*$ENVIRONMENT" > /dev/null; then
        log_warning "監控服務已在運行"
        return
    fi
    
    # 啟動健康檢查服務
    local monitor_cmd="$SCRIPT_DIR/health-check.sh --environment $ENVIRONMENT --auto-recovery"
    
    execute_command "nohup $monitor_cmd > /tmp/memoryark-monitor-$ENVIRONMENT.log 2>&1 &" "啟動健康檢查監控"
    
    log_success "監控服務已啟動"
    log_info "監控日誌: /tmp/memoryark-monitor-$ENVIRONMENT.log"
}

# 執行完整流程
execute_full_pipeline() {
    log_step "開始執行完整部署流程..."
    
    # 1. 構建
    build_application
    
    # 2. 測試
    run_tests
    
    # 3. 部署
    deploy_application
    
    # 4. 啟動監控
    start_monitoring
    
    log_success "完整部署流程執行完成"
}

# 創建部署報告
create_deployment_report() {
    local report_file="$PROJECT_ROOT/logs/deployment_$(date +%Y%m%d_%H%M%S).json"
    
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
    "deployment": {
        "timestamp": "$(date -Iseconds)",
        "action": "$ACTION",
        "environment": "$ENVIRONMENT",
        "image_tag": "$IMAGE_TAG",
        "build_type": "$BUILD_TYPE",
        "test_suite": "$TEST_SUITE",
        "git_commit": "$(git rev-parse HEAD)",
        "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
        "deployed_by": "$(whoami)",
        "dry_run": $DRY_RUN
    },
    "system_info": {
        "hostname": "$(hostname)",
        "os": "$(uname -sr)",
        "podman_version": "$(podman --version)"
    }
}
EOF
    
    log_info "部署報告已創建: $report_file"
}

# 主程序
main() {
    # 顯示標題
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                MemoryArk 2.0 部署自動化                     ║"
    echo "║               完整 CI/CD 流程自動化工具                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 顯示配置
    log_info "部署配置:"
    echo "   動作: $ACTION"
    echo "   環境: $ENVIRONMENT"
    echo "   構建類型: $BUILD_TYPE"
    echo "   測試套件: $TEST_SUITE"
    echo "   模擬執行: $([ "$DRY_RUN" = true ] && echo "是" || echo "否")"
    if [ -n "$IMAGE_TAG" ]; then
        echo "   映像標籤: $IMAGE_TAG"
    fi
    echo ""
    
    # 檢查先決條件
    check_prerequisites
    
    # 生成映像標籤
    generate_image_tag
    
    # 確認操作
    confirm_action "$ACTION" "$ENVIRONMENT"
    
    # 創建部署報告
    create_deployment_report
    
    # 執行對應動作
    case $ACTION in
        "build")
            build_application
            ;;
        "test")
            run_tests
            ;;
        "deploy")
            deploy_application
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            show_deployment_status
            ;;
        "monitor")
            start_monitoring
            ;;
        "full")
            execute_full_pipeline
            ;;
        *)
            log_error "未知動作: $ACTION"
            exit 1
            ;;
    esac
    
    log_success "操作 '$ACTION' 執行完成！"
}

# 錯誤處理
trap 'log_error "部署過程中發生錯誤"; exit 1' ERR

# 執行主程序
main "$@"