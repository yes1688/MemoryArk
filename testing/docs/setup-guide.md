# MemoryArk 2.0 測試環境設定指南

## 環境需求

### 後端測試環境
- Go 1.19+ 
- SQLite3
- 測試框架：httptest + testify
- Mock 工具：gomock

### 前端測試環境
- Node.js 18+
- Playwright
- TypeScript

## 後端測試設定

### 1. 安裝測試依賴

```bash
cd backend
# 安裝 testify 測試框架
go get -u github.com/stretchr/testify

# 安裝 mock 工具
go get -u github.com/golang/mock/mockgen

# 安裝資料庫驅動
go get -u github.com/mattn/go-sqlite3
```

### 2. 測試資料庫設定

建立測試專用的資料庫配置：

```bash
# 在 testing 目錄建立測試資料庫
mkdir -p testing/test-data
touch testing/test-data/test.db
```

### 3. 測試環境變數

建立 `testing/.env.test` 檔案：

```env
# 測試環境配置
ENVIRONMENT=test
DATABASE_PATH=../testing/test-data/test.db
UPLOAD_PATH=../testing/test-data/uploads
LOG_PATH=../testing/test-data/logs

# 測試用管理員
ROOT_ADMIN_EMAIL=test-admin@example.com

# 關閉 Cloudflare 認證
CLOUDFLARE_AUTH_ENABLED=false

# 測試 JWT 密鑰
JWT_SECRET=test-secret-key-for-testing-only

# 測試伺服器設定
PORT=7002
HOST=localhost
```

### 4. 測試檔案結構

```
testing/
├── backend-tests/
│   ├── api/              # API 端點測試
│   │   ├── auth_test.go
│   │   ├── file_test.go
│   │   ├── admin_test.go
│   │   └── category_test.go
│   ├── integration/      # 整合測試
│   │   └── workflow_test.go
│   ├── helpers/          # 測試輔助函數
│   │   ├── setup.go
│   │   ├── fixtures.go
│   │   └── assertions.go
│   └── mocks/           # Mock 物件
│       └── database_mock.go
├── test-data/           # 測試資料
│   ├── test.db
│   ├── uploads/
│   └── sample-files/
└── docs/               # 測試文檔
```

## 執行測試

### 使用容器執行測試（推薦）

```bash
# 使用 Podman 執行所有測試
podman-compose -f docker-compose.test.yml up --abort-on-container-exit

# 或使用 Docker
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# 只執行後端測試
podman-compose -f docker-compose.test.yml up backend-test

# 查看測試覆蓋率報告
podman-compose -f docker-compose.test.yml --profile report up test-report
# 然後訪問 http://localhost:8080/coverage.html
```

### 本地執行測試（需要 Go 環境）

```bash
# 執行所有測試
cd backend
go test ./testing/backend-tests/... -v

# 執行特定測試
go test ./testing/backend-tests/api/auth_test.go -v

# 產生測試覆蓋率報告
go test ./testing/backend-tests/... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html

# 執行基準測試
go test ./testing/backend-tests/... -bench=. -benchmem
```

### 測試資料清理

```bash
# 清理測試資料
rm -rf testing/test-data/*
# 重新初始化
./scripts/init-test-env.sh
```

## 前端 E2E 測試設定

### 1. 安裝 Playwright

```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

### 2. Playwright 配置

建立 `playwright.config.ts`：

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../testing/frontend-tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:7001',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### 3. E2E 測試執行

```bash
# 執行所有 E2E 測試
npx playwright test

# 執行特定測試
npx playwright test login.spec.ts

# 開啟測試報告
npx playwright show-report
```

## Docker 測試環境

### 使用 Docker Compose 執行測試

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  backend-test:
    build: ./backend
    environment:
      - ENVIRONMENT=test
      - DATABASE_PATH=/app/test-data/test.db
    volumes:
      - ./testing/test-data:/app/test-data
    command: go test ./testing/backend-tests/... -v

  frontend-test:
    build: ./frontend
    depends_on:
      - backend-test
    command: npm run test:e2e
```

執行：
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## CI/CD 整合

### GitHub Actions 範例

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.19'
      - name: Run Backend Tests
        run: |
          cd backend
          go test ./testing/backend-tests/... -v

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install
      - name: Run E2E Tests
        run: |
          cd frontend
          npm run test:e2e
```

## 測試最佳實踐

### 1. 測試隔離
- 每個測試應該獨立執行
- 使用獨立的測試資料庫
- 測試後清理資料

### 2. 測試命名
- 使用描述性的測試名稱
- 遵循 `Test_功能_情境_預期結果` 格式

### 3. 測試資料
- 使用 fixtures 產生一致的測試資料
- 避免使用生產資料
- 建立資料產生器函數

### 4. 斷言
- 使用 testify 的斷言函數
- 檢查所有重要的回應欄位
- 包含錯誤情況的測試

## 疑難排解

### 常見問題

1. **資料庫鎖定錯誤**
   ```bash
   # 解決方案：確保沒有其他程序使用測試資料庫
   lsof testing/test-data/test.db
   ```

2. **權限錯誤**
   ```bash
   # 解決方案：設定正確的檔案權限
   chmod -R 755 testing/test-data
   ```

3. **連接埠衝突**
   ```bash
   # 解決方案：使用不同的測試連接埠
   export TEST_PORT=7002
   ```

## 下一步

1. 實作基礎測試輔助函數
2. 建立第一個 API 測試
3. 逐步增加測試覆蓋率
4. 整合到 CI/CD 流程