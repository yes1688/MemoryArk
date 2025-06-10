#!/bin/bash

# MemoryArk 2.0 完整測試執行腳本
# 執行所有類型的測試：API 整合測試、E2E 測試、效能測試

set -e  # 遇到錯誤立即退出

# 配置變數
API_BASE_URL=${API_BASE_URL:-"http://localhost:7001"}
TEST_RESULTS_DIR="./test-results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 函數定義
print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${PURPLE}🔍 $1${NC}"
}

# 檢查依賴
check_dependencies() {
    print_header "檢查測試依賴"
    
    # 檢查 Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 未安裝"
        exit 1
    fi
    print_success "Python 3 已安裝"
    
    # 檢查 Node.js (for Playwright)
    if ! command -v node &> /dev/null; then
        print_warning "Node.js 未安裝，將跳過 E2E 測試"
        SKIP_E2E=true
    else
        print_success "Node.js 已安裝"
    fi
    
    # 檢查容器運行時
    if command -v podman &> /dev/null; then
        CONTAINER_CMD="podman"
        print_success "Podman 已安裝"
    elif command -v docker &> /dev/null; then
        CONTAINER_CMD="docker"
        print_success "Docker 已安裝"
    else
        print_error "未找到容器運行時 (Podman/Docker)"
        exit 1
    fi
    
    # 檢查目標伺服器
    print_info "檢查目標伺服器: $API_BASE_URL"
    if curl -s "$API_BASE_URL/api/health" > /dev/null; then
        print_success "目標伺服器可訪問"
    else
        print_error "目標伺服器無法訪問，請確保 MemoryArk 2.0 正在運行"
        exit 1
    fi
}

# 準備測試環境
prepare_test_environment() {
    print_header "準備測試環境"
    
    # 建立結果目錄
    mkdir -p "$TEST_RESULTS_DIR"
    print_success "測試結果目錄已建立: $TEST_RESULTS_DIR"
    
    # 安裝 Python 依賴
    print_info "安裝 Python 測試依賴..."
    pip3 install --quiet requests colorama tabulate jinja2 > /dev/null 2>&1
    print_success "Python 依賴已安裝"
    
    # 檢查並安裝 Playwright (如果需要)
    if [ "$SKIP_E2E" != "true" ]; then
        print_info "檢查 Playwright 安裝..."
        if [ -d "../frontend/node_modules" ]; then
            print_success "前端依賴已安裝"
        else
            print_warning "前端依賴未安裝，將跳過 E2E 測試"
            SKIP_E2E=true
        fi
    fi
}

# 執行 API 整合測試
run_api_tests() {
    print_header "執行 API 整合測試"
    
    local test_start_time=$(date +%s)
    local failed=false
    
    # 基本 API 測試
    print_info "執行基本 API 測試..."
    if python3 run-integration-tests.py > "$TEST_RESULTS_DIR/api-basic-tests-$TIMESTAMP.log" 2>&1; then
        print_success "基本 API 測試通過"
    else
        print_error "基本 API 測試失敗"
        failed=true
    fi
    
    # 檔案上傳測試
    print_info "執行檔案上傳測試..."
    if python3 file-upload-tests.py > "$TEST_RESULTS_DIR/file-upload-tests-$TIMESTAMP.log" 2>&1; then
        print_success "檔案上傳測試通過"
    else
        print_error "檔案上傳測試失敗"
        failed=true
    fi
    
    # 認證權限測試
    print_info "執行認證權限測試..."
    if python3 auth-permission-tests.py > "$TEST_RESULTS_DIR/auth-tests-$TIMESTAMP.log" 2>&1; then
        print_success "認證權限測試通過"
    else
        print_error "認證權限測試失敗"
        failed=true
    fi
    
    # 錯誤處理測試
    print_info "執行錯誤處理測試..."
    if python3 error-edge-case-tests.py > "$TEST_RESULTS_DIR/error-tests-$TIMESTAMP.log" 2>&1; then
        print_success "錯誤處理測試通過"
    else
        print_error "錯誤處理測試失敗"
        failed=true
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    if [ "$failed" = "true" ]; then
        print_error "API 測試執行時間: ${test_duration}s (有失敗)"
        return 1
    else
        print_success "API 測試執行時間: ${test_duration}s (全部通過)"
        return 0
    fi
}

# 執行 E2E 測試
run_e2e_tests() {
    if [ "$SKIP_E2E" = "true" ]; then
        print_warning "跳過 E2E 測試 (環境不支援)"
        return 0
    fi
    
    print_header "執行 E2E 測試"
    
    local test_start_time=$(date +%s)
    
    cd ..
    
    # 檢查前端是否可訪問
    if ! curl -s "$API_BASE_URL" > /dev/null; then
        print_error "前端無法訪問，跳過 E2E 測試"
        cd testing
        return 1
    fi
    
    # 執行 Playwright 測試
    print_info "執行 Playwright E2E 測試..."
    
    export E2E_BASE_URL="$API_BASE_URL"
    
    if cd testing && npx playwright test --config=playwright.config.ts > "$TEST_RESULTS_DIR/e2e-tests-$TIMESTAMP.log" 2>&1; then
        print_success "E2E 測試通過"
        local test_result=0
    else
        print_error "E2E 測試失敗"
        local test_result=1
    fi
    
    # 產生 HTML 報告
    if [ -f "playwright-report/index.html" ]; then
        cp -r playwright-report "$TEST_RESULTS_DIR/e2e-report-$TIMESTAMP"
        print_success "E2E 測試報告已複製到結果目錄"
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    if [ $test_result -eq 0 ]; then
        print_success "E2E 測試執行時間: ${test_duration}s (全部通過)"
    else
        print_error "E2E 測試執行時間: ${test_duration}s (有失敗)"
    fi
    
    cd testing
    return $test_result
}

# 執行容器測試
run_container_tests() {
    print_header "執行容器整合測試"
    
    local test_start_time=$(date +%s)
    
    print_info "使用 $CONTAINER_CMD 執行容器測試..."
    
    # 執行整合測試容器
    if $CONTAINER_CMD-compose -f ../docker-compose.integration-test.yml up --abort-on-container-exit > "$TEST_RESULTS_DIR/container-tests-$TIMESTAMP.log" 2>&1; then
        print_success "容器整合測試通過"
        local test_result=0
    else
        print_error "容器整合測試失敗"
        local test_result=1
    fi
    
    # 清理容器
    $CONTAINER_CMD-compose -f ../docker-compose.integration-test.yml down > /dev/null 2>&1 || true
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    if [ $test_result -eq 0 ]; then
        print_success "容器測試執行時間: ${test_duration}s (成功)"
    else
        print_error "容器測試執行時間: ${test_duration}s (失敗)"
    fi
    
    return $test_result
}

# 產生測試報告
generate_test_report() {
    print_header "產生測試報告"
    
    local report_file="$TEST_RESULTS_DIR/final-test-report-$TIMESTAMP.html"
    
    # 產生 HTML 報告
    python3 generate-test-report.py > /dev/null 2>&1 || true
    
    # 建立綜合報告
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>MemoryArk 2.0 測試報告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #1e3a8a; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .success { border-left: 4px solid #10b981; }
        .error { border-left: 4px solid #ef4444; }
        .warning { border-left: 4px solid #f59e0b; }
        .timestamp { color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 MemoryArk 2.0 測試報告</h1>
        <p>測試時間: $(date)</p>
        <p>目標伺服器: $API_BASE_URL</p>
    </div>
    
    <div class="section">
        <h2>測試執行摘要</h2>
        <p>測試結果檔案已儲存在: $TEST_RESULTS_DIR</p>
        <p>詳細日誌請查看各個 .log 檔案</p>
    </div>
    
    <div class="section">
        <h2>測試類型</h2>
        <ul>
            <li>✅ API 整合測試 - Python 測試腳本</li>
            <li>✅ 檔案上傳/下載測試</li>
            <li>✅ 認證和權限測試</li>
            <li>✅ 錯誤處理和邊界條件測試</li>
            $([ "$SKIP_E2E" = "true" ] && echo "<li>⚠️ E2E 測試 - 已跳過</li>" || echo "<li>✅ E2E 測試 - Playwright</li>")
            <li>✅ 容器整合測試</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>如何查看詳細結果</h2>
        <ul>
            <li>API 測試結果: 查看 *-tests-*.log 檔案</li>
            <li>E2E 測試報告: 開啟 e2e-report-*/index.html</li>
            <li>系統狀態: 查看 system-state.json</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    print_success "測試報告已產生: $report_file"
}

# 主執行函數
main() {
    local overall_start_time=$(date +%s)
    local exit_code=0
    
    print_header "MemoryArk 2.0 完整測試套件"
    echo -e "${PURPLE}開始執行完整測試流程...${NC}"
    echo -e "${PURPLE}目標伺服器: $API_BASE_URL${NC}"
    echo ""
    
    # 執行測試步驟
    check_dependencies || exit 1
    prepare_test_environment || exit 1
    
    # API 測試
    if ! run_api_tests; then
        exit_code=1
    fi
    
    # E2E 測試
    if ! run_e2e_tests; then
        exit_code=1
    fi
    
    # 容器測試
    if ! run_container_tests; then
        exit_code=1
    fi
    
    # 產生報告
    generate_test_report
    
    # 總結
    local overall_end_time=$(date +%s)
    local total_duration=$((overall_end_time - overall_start_time))
    
    print_header "測試執行完成"
    
    if [ $exit_code -eq 0 ]; then
        print_success "所有測試通過！總執行時間: ${total_duration}s"
        echo -e "${GREEN}🎉 MemoryArk 2.0 系統測試全部通過！${NC}"
    else
        print_error "有測試失敗。總執行時間: ${total_duration}s"
        echo -e "${RED}💥 請檢查失敗的測試項目並修復問題。${NC}"
    fi
    
    echo -e "${BLUE}測試結果已儲存在: $TEST_RESULTS_DIR${NC}"
    
    exit $exit_code
}

# 執行主函數
main "$@"