# MemoryArk 2.0 測試架構說明

## 測試架構概述

我們採用**分離式測試架構**：

```
┌─────────────────┐           ┌─────────────────┐
│   生產容器      │           │   測試容器      │
│ (localhost:7001)│  <──API──  │ (Python Tests)  │
│   運行中...     │           │   發送請求...   │
└─────────────────┘           └─────────────────┘
```

## 為什麼這樣設計？

### 1. **真實環境測試**
- 測試實際運行的系統，而非模擬環境
- 發現真實的配置問題和環境問題
- 確保部署後的系統真的能正常運作

### 2. **隔離性**
- 測試程式碼與生產程式碼完全分離
- 測試失敗不會影響生產系統
- 可以使用不同的語言/框架進行測試

### 3. **靈活性**
- 可以從外部視角測試 API
- 可以模擬真實用戶的操作流程
- 可以測試跨服務的整合

## 測試類型

### 1. **整合測試（Integration Test）**
```bash
# 對運行中的系統進行測試
podman-compose -f docker-compose.integration-test.yml up
```

特點：
- 測試真實的 API 端點
- 驗證系統整體功能
- 檢查服務之間的整合

### 2. **單元測試（Unit Test）**
```bash
# 在獨立環境中測試程式碼
podman-compose -f docker-compose.test.yml up
```

特點：
- 測試個別函數和模組
- 使用 mock 和 stub
- 快速執行，高覆蓋率

## 執行流程

### 整合測試流程：

1. **確保生產容器運行**
   ```bash
   podman-compose up -d
   ```

2. **執行整合測試**
   ```bash
   podman-compose -f docker-compose.integration-test.yml up
   ```

3. **查看測試報告**
   ```bash
   # 啟動報告檢視器
   podman-compose -f docker-compose.integration-test.yml --profile report up test-report-viewer
   
   # 瀏覽器訪問
   http://localhost:8081
   ```

## 測試腳本說明

### `run-integration-tests.py`
主要測試執行器，包含：
- 健康檢查測試
- 認證狀態測試
- API 端點測試
- 回應時間測試
- 錯誤處理測試

### `generate-test-report.py`
報告產生器，輸出：
- HTML 視覺化報告
- JSON 原始資料
- 文字摘要報告

## 優點與限制

### 優點：
✅ 測試真實環境  
✅ 不需要修改生產程式碼  
✅ 可以持續執行（CI/CD）  
✅ 易於擴展新測試  

### 限制：
❌ 需要生產環境運行  
❌ 無法測試內部邏輯  
❌ 受網路延遲影響  
❌ 可能需要測試資料準備  

## 最佳實踐

1. **測試前檢查**
   - 確認目標服務正在運行
   - 檢查網路連通性
   - 準備必要的測試資料

2. **測試隔離**
   - 每個測試應該獨立
   - 避免測試之間的依賴
   - 清理測試產生的資料

3. **錯誤處理**
   - 優雅處理連線錯誤
   - 提供清晰的錯誤訊息
   - 設定合理的超時時間

4. **報告與監控**
   - 保存歷史測試結果
   - 追蹤效能趨勢
   - 設定失敗通知

## 進階用法

### 自訂測試目標：
```bash
# 測試其他環境
API_BASE_URL=https://staging.example.com \
podman-compose -f docker-compose.integration-test.yml up
```

### 並行測試：
```bash
# 啟用並行執行
TEST_PARALLEL=true \
podman-compose -f docker-compose.integration-test.yml up
```

### 持續測試：
```bash
# 每 5 分鐘執行一次
watch -n 300 'podman-compose -f docker-compose.integration-test.yml up'
```

## 結論

這種測試架構適合：
- 驗收測試（Acceptance Testing）
- 冒煙測試（Smoke Testing）
- 監控測試（Monitoring）
- API 合約測試（Contract Testing）

透過分離測試容器和生產容器，我們可以安全地對運行中的系統進行全面測試，同時保持測試的獨立性和可維護性。