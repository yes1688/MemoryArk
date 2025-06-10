#!/bin/bash

# 串流匯出負載測試腳本
# 用於測試 MemoryArk 2.0 串流匯出功能在高負載下的效能表現

set -e

echo "🚀 MemoryArk 2.0 串流匯出負載測試套件"
echo "======================================"

# 設置測試環境變數
export GO_ENV=test
export CGO_ENABLED=1
export GOMAXPROCS=$(nproc)

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 記錄開始時間
START_TIME=$(date +%s)

echo -e "${BLUE}📅 測試開始時間: $(date)${NC}"
echo -e "${BLUE}🖥️  系統資源:${NC}"
echo "   CPU 核心數: $(nproc)"
echo "   記憶體: $(free -h | grep Mem | awk '{print $2}')"
echo "   磁碟空間: $(df -h . | tail -1 | awk '{print $4}') 可用"
echo ""

# 檢查 Go 環境
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go 未安裝或不在 PATH 中${NC}"
    echo "💡 請確保在 Go 開發環境中執行此腳本"
    exit 1
fi

# 移動到後端目錄
cd "$(dirname "$0")/../backend" || exit 1
echo -e "${BLUE}📂 當前目錄: $(pwd)${NC}"
echo ""

# 確保依賴項更新
echo -e "${YELLOW}🔧 檢查 Go 模組依賴...${NC}"
go mod tidy
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Go 模組檢查失敗${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Go 模組依賴檢查完成${NC}"
echo ""

# 創建測試結果目錄
RESULT_DIR="../logs/load_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULT_DIR"
echo -e "${BLUE}📁 測試結果將保存到: $RESULT_DIR${NC}"
echo ""

# 函數：執行測試並記錄結果
run_test() {
    local test_name="$1"
    local test_pattern="$2"
    local timeout="${3:-10m}"
    
    echo -e "${YELLOW}🧪 執行 $test_name...${NC}"
    echo "測試模式: $test_pattern"
    echo "超時設定: $timeout"
    echo "---"
    
    local log_file="$RESULT_DIR/${test_name,,}.log"
    local result_file="$RESULT_DIR/${test_name,,}_result.json"
    
    # 記錄系統資源狀況（測試前）
    echo "=== 測試前系統狀況 ===" > "$log_file"
    echo "時間: $(date)" >> "$log_file"
    echo "記憶體使用:" >> "$log_file"
    free -h >> "$log_file"
    echo "CPU 負載:" >> "$log_file"
    uptime >> "$log_file"
    echo "" >> "$log_file"
    
    # 執行測試
    local start_test_time=$(date +%s)
    timeout $timeout go test -v -timeout=$timeout ./internal/... -run "$test_pattern" \
        -json >> "$result_file" 2>&1 | tee -a "$log_file"
    local test_exit_code=$?
    local end_test_time=$(date +%s)
    local test_duration=$((end_test_time - start_test_time))
    
    # 記錄系統資源狀況（測試後）
    echo "" >> "$log_file"
    echo "=== 測試後系統狀況 ===" >> "$log_file"
    echo "時間: $(date)" >> "$log_file"
    echo "測試耗時: ${test_duration}秒" >> "$log_file"
    echo "記憶體使用:" >> "$log_file"
    free -h >> "$log_file"
    echo "CPU 負載:" >> "$log_file"
    uptime >> "$log_file"
    
    if [ $test_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name 測試通過${NC}"
    else
        echo -e "${RED}❌ $test_name 測試失敗 (退出碼: $test_exit_code)${NC}"
        if [ $test_exit_code -eq 124 ]; then
            echo -e "${YELLOW}⏰ 測試超時 ($timeout)${NC}"
        fi
    fi
    
    echo "📊 測試時間: ${test_duration}秒"
    echo "📄 詳細日誌: $log_file"
    echo "📋 結果文件: $result_file"
    echo ""
    
    return $test_exit_code
}

# 測試套件列表
TESTS=(
    "小檔案匯出負載測試:TestSmallFileExport:5m"
    "大檔案匯出負載測試:TestLargeFileExport:15m"
    "混合檔案匯出負載測試:TestMixedFileExport:10m"
    "並發匯出負載測試:TestConcurrentExports:15m"
    "匯出超時處理測試:TestExportTimeout:2m"
    "記憶體使用測試:TestMemoryUsage:8m"
    "HTTP匯出創建負載測試:TestCreateStreamExportLoad:10m"
    "匯出狀態查詢負載測試:TestExportJobStatusLoad:5m"
    "並發匯出操作測試:TestConcurrentExportOperations:12m"
    "壓力測試:TestStressExportAPI:20m"
)

# 執行所有測試
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=${#TESTS[@]}

echo -e "${BLUE}🎯 開始執行 $TOTAL_TESTS 個負載測試...${NC}"
echo ""

for test_info in "${TESTS[@]}"; do
    IFS=':' read -r test_name test_pattern timeout <<< "$test_info"
    
    if run_test "$test_name" "$test_pattern" "$timeout"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
    
    # 測試間隔，讓系統恢復
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${BLUE}😴 等待 30 秒讓系統恢復...${NC}"
        sleep 30
    fi
    echo ""
done

# 執行效能基準測試
echo -e "${YELLOW}🏃‍♂️ 執行效能基準測試...${NC}"
echo "---"

BENCH_LOG="$RESULT_DIR/benchmark.log"
echo "=== 效能基準測試開始 ===" > "$BENCH_LOG"
echo "時間: $(date)" >> "$BENCH_LOG"

# 執行基準測試
go test -bench=BenchmarkExport -benchmem -benchtime=30s ./internal/... >> "$BENCH_LOG" 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 效能基準測試完成${NC}"
else
    echo -e "${YELLOW}⚠️  效能基準測試部分失敗，請檢查日誌${NC}"
fi

echo "📄 基準測試結果: $BENCH_LOG"
echo ""

# 生成負載測試報告
echo -e "${BLUE}📊 生成負載測試報告...${NC}"

REPORT_FILE="$RESULT_DIR/load_test_report.html"

cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MemoryArk 2.0 串流匯出負載測試報告</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #3498db; }
        .metric-label { font-size: 0.9em; color: #7f8c8d; }
        .pass { color: #27ae60; }
        .fail { color: #e74c3c; }
        .warn { color: #f39c12; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #3498db; color: white; }
        tr:hover { background-color: #f5f5f5; }
        .status-pass { background-color: #d5f4e6; }
        .status-fail { background-color: #f8d7da; }
        .status-warn { background-color: #fff3cd; }
        pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 MemoryArk 2.0 串流匯出負載測試報告</h1>
        
        <div class="summary">
            <h2>📊 測試摘要</h2>
            <div class="metric">
                <div class="metric-value pass">$PASSED_TESTS</div>
                <div class="metric-label">通過測試</div>
            </div>
            <div class="metric">
                <div class="metric-value fail">$FAILED_TESTS</div>
                <div class="metric-label">失敗測試</div>
            </div>
            <div class="metric">
                <div class="metric-value">$TOTAL_TESTS</div>
                <div class="metric-label">總測試數</div>
            </div>
            <div class="metric">
                <div class="metric-value">$((100 * PASSED_TESTS / TOTAL_TESTS))%</div>
                <div class="metric-label">通過率</div>
            </div>
        </div>

        <h2>🧪 測試結果詳情</h2>
        <table>
            <thead>
                <tr>
                    <th>測試名稱</th>
                    <th>狀態</th>
                    <th>日誌文件</th>
                    <th>結果文件</th>
                </tr>
            </thead>
            <tbody>
EOF

# 添加測試結果到報告
for test_info in "${TESTS[@]}"; do
    IFS=':' read -r test_name test_pattern timeout <<< "$test_info"
    log_file="${test_name,,}.log"
    result_file="${test_name,,}_result.json"
    
    if [ -f "$RESULT_DIR/$log_file" ]; then
        if grep -q "PASS" "$RESULT_DIR/$result_file" 2>/dev/null; then
            status="<span class='pass'>✅ 通過</span>"
            row_class="status-pass"
        else
            status="<span class='fail'>❌ 失敗</span>"
            row_class="status-fail"
        fi
    else
        status="<span class='warn'>⚠️ 未執行</span>"
        row_class="status-warn"
    fi
    
    cat >> "$REPORT_FILE" << EOF
                <tr class="$row_class">
                    <td>$test_name</td>
                    <td>$status</td>
                    <td><a href="$log_file">查看日誌</a></td>
                    <td><a href="$result_file">查看結果</a></td>
                </tr>
EOF
done

cat >> "$REPORT_FILE" << EOF
            </tbody>
        </table>

        <h2>🏃‍♂️ 效能基準測試</h2>
        <pre>$(tail -20 "$BENCH_LOG" 2>/dev/null || echo "基準測試結果不可用")</pre>

        <h2>🖥️ 系統環境</h2>
        <ul>
            <li><strong>CPU 核心數:</strong> $(nproc)</li>
            <li><strong>記憶體:</strong> $(free -h | grep Mem | awk '{print $2}')</li>
            <li><strong>Go 版本:</strong> $(go version 2>/dev/null || echo "未檢測到")</li>
            <li><strong>作業系統:</strong> $(uname -sr)</li>
            <li><strong>測試時間:</strong> $(date)</li>
        </ul>

        <h2>📝 建議</h2>
        <div style="background: #e8f6f3; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>效能優化建議：</h3>
            <ul>
                <li>如果並發測試失敗，考慮增加資料庫連接池大小</li>
                <li>如果記憶體使用過高，檢查檔案處理緩衝區大小</li>
                <li>如果響應時間過長，考慮實施檔案分塊處理</li>
                <li>監控磁碟 I/O 效能，必要時使用 SSD 儲存</li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF

echo -e "${GREEN}📄 負載測試報告已生成: $REPORT_FILE${NC}"

# 計算總測試時間
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
HOURS=$((TOTAL_DURATION / 3600))
MINUTES=$(((TOTAL_DURATION % 3600) / 60))
SECONDS=$((TOTAL_DURATION % 60))

echo ""
echo -e "${BLUE}🎉 負載測試完成！${NC}"
echo "================================"
echo ""
echo -e "${GREEN}📊 最終結果：${NC}"
echo "✅ 通過測試: $PASSED_TESTS"
echo "❌ 失敗測試: $FAILED_TESTS"
echo "📈 通過率: $((100 * PASSED_TESTS / TOTAL_TESTS))%"
echo "⏱️  總耗時: ${HOURS}小時 ${MINUTES}分鐘 ${SECONDS}秒"
echo ""
echo -e "${BLUE}📁 測試文件：${NC}"
echo "📊 報告: $REPORT_FILE"
echo "📂 結果目錄: $RESULT_DIR"
echo ""

# 根據結果提供建議
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🚀 所有測試通過！系統已準備好處理高負載的匯出請求。${NC}"
    echo ""
    echo -e "${BLUE}💡 建議：${NC}"
    echo "• 在生產環境中配置適當的負載均衡"
    echo "• 監控匯出任務的執行時間和資源使用"
    echo "• 設置合理的並發限制以保護系統穩定性"
elif [ $FAILED_TESTS -lt $((TOTAL_TESTS / 2)) ]; then
    echo -e "${YELLOW}⚠️  部分測試失敗，建議在部署前解決以下問題：${NC}"
    echo "• 檢查失敗測試的日誌文件"
    echo "• 調整系統配置或增加硬體資源"
    echo "• 考慮實施更保守的並發限制"
else
    echo -e "${RED}🚨 多項測試失敗，系統可能無法處理高負載。${NC}"
    echo ""
    echo -e "${YELLOW}建議行動：${NC}"
    echo "• 仔細檢查所有失敗測試的原因"
    echo "• 考慮重新設計匯出架構"
    echo "• 增加系統資源或優化算法"
    echo "• 實施更嚴格的請求限流"
fi

echo ""
echo -e "${BLUE}📞 需要協助？請檢查文檔或聯繫開發團隊。${NC}"

exit $FAILED_TESTS