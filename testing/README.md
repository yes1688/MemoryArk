# MemoryArk 2.0 測試系統 🧪

完整的教會影音回憶錄系統測試套件，包含 API 整合測試、前端 E2E 測試和容器化測試。

## 🚀 快速開始

### 1. 確保系統運行
```bash
# 啟動 MemoryArk 2.0 系統
podman-compose up -d

# 驗證系統狀態
curl http://localhost:7001/api/health
```

### 2. 執行完整測試
```bash
# 進入測試目錄
cd testing

# 執行所有測試
./run-all-tests.sh
```

### 3. 查看測試報告
```bash
# 開啟測試結果目錄
ls test-results/

# 查看 HTML 報告
open test-results/final-test-report-*.html
```

## 📋 測試類型

### 🔌 API 整合測試
**位置**: Python 腳本  
**目標**: 測試後端 API 功能

```bash
# 基本 API 測試
python3 run-integration-tests.py

# 檔案上傳測試
python3 file-upload-tests.py

# 認證權限測試
python3 auth-permission-tests.py

# 錯誤處理測試
python3 error-edge-case-tests.py
```

**測試覆蓋**:
- ✅ 健康檢查和系統狀態
- ✅ 檔案上傳/下載/管理
- ✅ 認證和權限控制
- ✅ 錯誤處理和邊界條件
- ✅ 安全性測試 (SQL注入、路徑遍歷)
- ✅ 效能和並發測試

### 🎭 前端 E2E 測試
**位置**: `e2e-tests/`  
**技術**: Playwright + TypeScript

```bash
# 執行所有 E2E 測試
npx playwright test

# 執行特定測試
npx playwright test auth/authentication.spec.ts

# 開啟測試報告
npx playwright show-report
```

**測試覆蓋**:
- ✅ 用戶認證流程
- ✅ 檔案管理操作
- ✅ 管理員功能
- ✅ 響應式設計
- ✅ 無障礙功能
- ✅ 錯誤處理

### 🐳 容器整合測試
**位置**: `docker-compose.integration-test.yml`  
**目標**: 容器化環境測試

```bash
# 執行容器測試
podman-compose -f docker-compose.integration-test.yml up

# 查看測試報告
podman-compose -f docker-compose.integration-test.yml --profile report up test-report-viewer
```

## 📁 目錄結構

```
testing/
├── 📄 README.md                    # 本文件
├── 🔧 run-all-tests.sh            # 完整測試執行腳本
├── 🐍 run-integration-tests.py    # 主要 API 測試
├── 📂 file-upload-tests.py        # 檔案上傳測試
├── 🔐 auth-permission-tests.py    # 認證權限測試
├── ⚠️ error-edge-case-tests.py     # 錯誤處理測試
├── 📊 generate-test-report.py     # 測試報告產生器
├── ⚙️ playwright.config.ts        # Playwright 配置
├── 📂 e2e-tests/                   # E2E 測試案例
│   ├── auth/                      # 認證測試
│   ├── core/                      # 核心功能測試
│   ├── admin/                     # 管理員測試
│   └── accessibility/             # 無障礙測試
├── 📂 test-setup/                  # 測試環境設定
├── 📂 test-fixtures/               # 測試資料
├── 📂 test-results/                # 測試結果輸出
└── 📂 docs/                        # 測試文檔
    ├── testing-progress.md        # 測試進度記錄
    ├── api-analysis.md            # API 分析報告
    ├── frontend-e2e-analysis.md   # 前端 E2E 分析
    ├── setup-guide.md             # 環境設定指南
    └── test-architecture.md       # 測試架構說明
```

## 🎯 測試場景

### 認證流程測試
- 未認證用戶重定向
- Cloudflare 認證驗證
- 用戶註冊流程
- 管理員審核機制
- 權限控制測試

### 檔案管理測試
- 檔案上傳 (包含大檔案)
- 檔案去重機制
- 檔案下載和預覽
- 檔案搜尋和篩選
- 批量檔案操作
- 檔案分享連結

### 管理員功能測試
- 用戶管理和審核
- 系統統計查看
- 檔案管理權限
- 系統日誌查看

### 安全性測試
- SQL 注入防護
- 路徑遍歷攻擊防護
- 認證繞過測試
- 權限提升測試
- 速率限制測試

### 效能測試
- 大量檔案處理
- 並發請求處理
- 記憶體使用監控
- 回應時間測試

## 🛠️ 環境要求

### 基本需求
- **作業系統**: Linux/macOS/Windows
- **容器**: Podman 或 Docker
- **Python**: 3.7+
- **Node.js**: 18+ (E2E 測試)

### Python 依賴
```bash
pip install requests colorama tabulate jinja2
```

### 前端依賴
```bash
cd ../frontend
npm install
npx playwright install
```

## 📊 測試報告

### HTML 報告
執行測試後會自動產生 HTML 報告：
- `test-results/final-test-report-*.html` - 綜合測試報告
- `test-results/e2e-report-*/index.html` - E2E 測試詳細報告

### JSON 報告
- `test-results/test-results-*.json` - API 測試結果
- `test-results/results.json` - Playwright 測試結果

### 日誌檔案
- `test-results/*-tests-*.log` - 各類測試的詳細日誌
- `test-results/system-state.json` - 系統狀態快照

## 🔧 進階用法

### 自訂測試目標
```bash
# 測試不同環境
API_BASE_URL=https://staging.94work.net ./run-all-tests.sh

# 只執行 API 測試
python3 run-integration-tests.py

# 只執行特定 E2E 測試
npx playwright test --grep "檔案上傳"
```

### 開發模式測試
```bash
# 有頭模式執行 E2E 測試
npx playwright test --headed

# 除錯模式
npx playwright test --debug

# 特定瀏覽器測試
npx playwright test --project=chromium
```

### CI/CD 整合
```bash
# 在 CI 環境中執行
CI=true KEEP_TEST_RESULTS=true ./run-all-tests.sh

# 產生 JUnit 報告
npx playwright test --reporter=junit
```

## 🚨 疑難排解

### 常見問題

#### 1. 容器連線失敗
```bash
# 檢查容器狀態
podman-compose ps

# 檢查網路連線
curl http://localhost:7001/api/health

# 重啟系統
podman-compose down && podman-compose up -d
```

#### 2. 認證測試失敗
```bash
# 檢查 Cloudflare 設定
echo $CF_ACCESS_AUTHENTICATED_USER_EMAIL

# 檢查管理員用戶
sqlite3 data/memoryark.db "SELECT * FROM users WHERE role='admin';"
```

#### 3. E2E 測試失敗
```bash
# 檢查瀏覽器安裝
npx playwright install

# 檢查前端服務
curl http://localhost:7001

# 查看測試截圖
ls test-results/test-results-*/
```

#### 4. 檔案上傳測試失敗
```bash
# 檢查上傳目錄權限
ls -la uploads/

# 檢查磁碟空間
df -h

# 檢查檔案大小限制
grep -r "MAX_FILE_SIZE" ../backend/
```

### 日誌分析
```bash
# 查看系統日誌
tail -f logs/memoryark.log

# 查看測試日誌
tail -f test-results/api-basic-tests-*.log

# 搜尋錯誤
grep -r "ERROR" test-results/
```

## 📈 效能基準

### API 回應時間
- **健康檢查**: < 100ms
- **檔案列表**: < 500ms
- **檔案上傳**: < 5s (1MB)
- **檔案下載**: < 2s (1MB)

### E2E 測試時間
- **認證流程**: < 30s
- **檔案管理**: < 60s
- **管理員功能**: < 45s
- **完整測試套件**: < 5分鐘

## 🤝 貢獻指南

### 新增測試案例
1. 在適當的目錄建立測試檔案
2. 遵循現有的命名慣例
3. 加入適當的文檔說明
4. 更新測試報告範本

### 測試最佳實踐
- ✅ 每個測試應該獨立執行
- ✅ 使用描述性的測試名稱
- ✅ 包含正面和負面測試案例
- ✅ 測試後清理資料
- ✅ 加入適當的斷言和錯誤訊息

## 📞 支援

### 文檔資源
- `docs/testing-progress.md` - 測試進度和狀態
- `docs/api-analysis.md` - API 端點完整分析
- `docs/frontend-e2e-analysis.md` - 前端功能分析
- `docs/test-architecture.md` - 測試架構深度說明

### 聯絡資訊
- **專案**: MemoryArk 2.0 - 真耶穌教會影音回憶錄系統
- **管理員**: 94work.net@gmail.com
- **系統**: https://files.94work.net/

---

🎉 **測試愉快！確保 MemoryArk 2.0 系統穩定可靠！** 🎉