# MemoryArk 2.0 開發環境設置指南

本文檔說明如何在本地設置 MemoryArk 2.0 開發環境。

## 目錄

- [系統需求](#系統需求)
- [安裝前置軟體](#安裝前置軟體)
- [專案設置](#專案設置)
- [後端開發環境](#後端開發環境)
- [前端開發環境](#前端開發環境)
- [開發工具配置](#開發工具配置)
- [常用開發命令](#常用開發命令)
- [故障排除](#故障排除)

## 系統需求

### 硬體需求
- **RAM**: 8GB 或以上
- **CPU**: 多核心處理器
- **儲存**: 至少 10GB 可用空間
- **網路**: 穩定的網際網路連接

### 支援的作業系統
- **Windows**: Windows 10/11
- **macOS**: macOS 12 或以上
- **Linux**: Ubuntu 20.04+, CentOS 8+, Fedora 35+

## 安裝前置軟體

### 1. Go 語言環境

#### Windows
1. 下載 [Go 1.21+](https://golang.org/dl/)
2. 執行安裝程序
3. 驗證安裝：
   ```cmd
   go version
   ```

#### macOS
```bash
# 使用 Homebrew
brew install go

# 或下載安裝包
# https://golang.org/dl/
```

#### Linux (Ubuntu/Debian)
```bash
# 方法 1: 使用包管理器
sudo apt update
sudo apt install golang-go

# 方法 2: 下載最新版本
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### 2. Node.js 和 npm

#### Windows
1. 下載 [Node.js 18+](https://nodejs.org/)
2. 執行安裝程序（包含 npm）

#### macOS
```bash
# 使用 Homebrew
brew install node@18

# 或下載安裝包
# https://nodejs.org/
```

#### Linux
```bash
# 使用 NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
node --version
npm --version
```

### 3. Git

#### Windows
下載 [Git for Windows](https://git-scm.com/download/win)

#### macOS
```bash
# 使用 Homebrew
brew install git

# 或使用 Xcode Command Line Tools
xcode-select --install
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt install git

# CentOS/RHEL
sudo yum install git
```

### 4. 開發工具

#### Visual Studio Code（推薦）

1. 下載 [VS Code](https://code.visualstudio.com/)
2. 安裝推薦的擴展：

```json
{
  "recommendations": [
    "golang.go",
    "vue.volar",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.rest-client",
    "humao.rest-client"
  ]
}
```

#### 其他工具
- **Postman**: API 測試
- **SQLite Browser**: 數據庫管理
- **Docker Desktop**: 容器開發（可選）

## 專案設置

### 1. 克隆專案

```bash
# 克隆專案
git clone <repository-url>
cd MemoryArk2

# 查看專案結構
tree -L 2
```

### 2. 創建開發分支

```bash
# 創建並切換到開發分支
git checkout -b feature/development-setup

# 或切換到現有的開發分支
git checkout develop
```

## 後端開發環境

### 1. 初始化 Go 模組

```bash
cd backend

# 初始化模組（如果尚未初始化）
go mod init memoryark2

# 下載依賴
go mod download

# 整理依賴
go mod tidy
```

### 2. 設置環境變量

```bash
# 複製環境變量範本
cp .env.example .env

# 編輯配置文件
nano .env
```

開發環境配置示例：
```env
APP_ENV=development
PORT=7001
DB_PATH=./data/memoryark_dev.db
UPLOAD_PATH=./uploads
JWT_SECRET=development-jwt-secret-key
LOG_LEVEL=debug

# Cloudflare Access（開發環境可以留空或使用測試值）
CLOUDFLARE_DOMAIN=localhost
CLOUDFLARE_AUD=development-aud
CLOUDFLARE_CERT_URL=
```

### 3. 創建必要目錄

```bash
mkdir -p data uploads logs backups

# 設置權限（Linux/macOS）
chmod 755 data uploads logs backups
```

### 4. 安裝 Go 工具

```bash
# 安裝開發工具
go install github.com/air-verse/air@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
go install github.com/swaggo/swag/cmd/swag@latest

# 驗證安裝
air -v
golangci-lint version
swag -v
```

### 5. 初始化數據庫

```bash
# 運行數據庫遷移（當實現後）
go run cmd/migrate/main.go

# 或手動創建開發數據
go run cmd/seed/main.go
```

### 6. 運行後端服務

```bash
# 方法 1: 直接運行
go run cmd/main.go

# 方法 2: 使用 Air 熱重載（推薦）
air

# 方法 3: 構建後運行
go build -o bin/memoryark2 cmd/main.go
./bin/memoryark2
```

### 7. 驗證後端運行

```bash
# 檢查健康狀態
curl http://localhost:7001/health

# 查看 API 文檔（如果已實現）
open http://localhost:7001/swagger/
```

## 前端開發環境

### 1. 安裝依賴

```bash
cd frontend

# 安裝 npm 依賴
npm install

# 或使用 yarn
yarn install
```

### 2. 設置環境變量

```bash
# 複製環境變量範本
cp .env.example .env

# 編輯配置
nano .env
```

開發環境配置：
```env
VITE_API_BASE_URL=http://localhost:7001/api
VITE_APP_TITLE=MemoryArk 2.0 (Dev)
VITE_APP_VERSION=0.1.0-dev

# 開發模式設置
VITE_ENABLE_MOCK=true
VITE_ENABLE_DEVTOOLS=true
VITE_CLOUDFLARE_DOMAIN=localhost
```

### 3. 運行開發服務器

```bash
# 啟動開發服務器
npm run dev

# 或使用 yarn
yarn dev

# 指定端口（可選）
npm run dev -- --port 3000
```

### 4. 構建前端（測試）

```bash
# 構建生產版本
npm run build

# 預覽構建結果
npm run preview
```

## 開發工具配置

### 1. VS Code 設置

創建 `.vscode/settings.json`：

```json
{
  "go.toolsManagement.checkForUpdates": "local",
  "go.useLanguageServer": true,
  "go.gopath": "",
  "go.goroot": "",
  "go.lintTool": "golangci-lint",
  "go.lintFlags": ["--fast"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "vue.server.hybridMode": true,
  "files.associations": {
    "*.env": "properties"
  }
}
```

創建 `.vscode/launch.json`（調試配置）：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Go Backend",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/backend/cmd/main.go",
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "APP_ENV": "development"
      }
    }
  ]
}
```

### 2. Git Hooks

設置 pre-commit hook：

```bash
# 創建 .githooks 目錄
mkdir -p .githooks

# 創建 pre-commit hook
cat > .githooks/pre-commit << 'EOF'
#!/bin/sh

echo "Running pre-commit checks..."

# Go 代碼檢查
cd backend
echo "Running Go linter..."
golangci-lint run
if [ $? -ne 0 ]; then
    echo "Go linting failed"
    exit 1
fi

echo "Running Go tests..."
go test ./...
if [ $? -ne 0 ]; then
    echo "Go tests failed"
    exit 1
fi

cd ../frontend
echo "Running frontend linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "Frontend linting failed"
    exit 1
fi

echo "All checks passed!"
EOF

# 設置可執行權限
chmod +x .githooks/pre-commit

# 配置 Git 使用自定義 hooks 目錄
git config core.hooksPath .githooks
```

### 3. 開發腳本

創建 `scripts/dev.sh`：

```bash
#!/bin/bash

# 開發環境啟動腳本
echo "Starting MemoryArk 2.0 development environment..."

# 檢查依賴
command -v go >/dev/null 2>&1 || { echo "Go is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }

# 創建必要目錄
mkdir -p backend/data backend/uploads backend/logs
mkdir -p frontend/dist

# 啟動後端（背景執行）
echo "Starting backend..."
cd backend && air &
BACKEND_PID=$!

# 等待後端啟動
sleep 3

# 啟動前端
echo "Starting frontend..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# 等待用戶中斷
echo "Development environment is running..."
echo "Backend: http://localhost:7001"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop all services"

# 捕獲中斷信號
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# 等待
wait
```

## 常用開發命令

### 後端命令

```bash
# 運行服務
go run cmd/main.go

# 熱重載開發
air

# 代碼檢查
golangci-lint run

# 運行測試
go test ./...
go test -v -cover ./...

# 生成 API 文檔
swag init -g cmd/main.go

# 格式化代碼
go fmt ./...

# 更新依賴
go get -u all
go mod tidy

# 構建
go build -o bin/memoryark2 cmd/main.go
```

### 前端命令

```bash
# 開發服務器
npm run dev

# 構建
npm run build

# 預覽構建
npm run preview

# 代碼檢查
npm run lint
npm run lint:fix

# 類型檢查
npm run type-check

# 格式化
npm run format

# 測試
npm run test
npm run test:watch

# 更新依賴
npm update
```

### 數據庫命令

```bash
# 連接 SQLite 數據庫
sqlite3 backend/data/memoryark_dev.db

# 查看表結構
.schema

# 導出數據
.dump > backup.sql

# 執行 SQL 文件
.read migration.sql
```

## 故障排除

### 常見問題

#### 1. Go 模組問題

```bash
# 清理模組緩存
go clean -modcache

# 重新下載依賴
go mod download

# 驗證依賴
go mod verify
```

#### 2. Node.js 依賴問題

```bash
# 清理 node_modules
rm -rf node_modules package-lock.json

# 重新安裝
npm install

# 清理 npm 緩存
npm cache clean --force
```

#### 3. 端口佔用

```bash
# 查找佔用端口的進程
lsof -i :7001  # 後端端口
lsof -i :5173  # 前端端口

# 終止進程
kill -9 <PID>
```

#### 4. 權限問題

```bash
# Linux/macOS
chmod +x scripts/*
sudo chown -R $USER:$USER .

# Windows (PowerShell as Administrator)
Set-ExecutionPolicy RemoteSigned
```

### 調試技巧

#### 1. Go 後端調試

```bash
# 使用 Delve 調試器
go install github.com/go-delve/delve/cmd/dlv@latest

# 啟動調試
dlv debug cmd/main.go

# 在 VS Code 中設置斷點並按 F5
```

#### 2. 前端調試

- 使用瀏覽器開發者工具
- Vue DevTools 擴展
- VS Code 內建調試器

#### 3. 日誌查看

```bash
# 後端日誌
tail -f backend/logs/app.log

# 開發模式控制台輸出
# 直接在終端查看
```

### 性能優化

#### 1. Go 效能分析

```bash
# 啟用 pprof
go run cmd/main.go -cpuprofile=cpu.prof -memprofile=mem.prof

# 分析性能
go tool pprof cpu.prof
go tool pprof mem.prof
```

#### 2. 前端效能分析

```bash
# Vite 建置分析
npm run build -- --mode analyze

# Lighthouse 性能測試
# 在瀏覽器開發者工具中使用
```

## 團隊協作

### 1. 分支管理

```bash
# 創建功能分支
git checkout -b feature/new-feature

# 提交變更
git add .
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/new-feature
```

### 2. 代碼審查

- 創建 Pull Request
- 運行自動化測試
- 團隊成員審查
- 合併到主分支

### 3. 同步開發環境

```bash
# 獲取最新變更
git pull origin develop

# 更新後端依賴
cd backend && go mod download

# 更新前端依賴
cd frontend && npm install
```

## 下一步

完成開發環境設置後，您可以：

1. 查看 [API 設計文檔](api-design.md)
2. 閱讀 [代碼風格指南](../CONTRIBUTING.md)
3. 開始實現具體功能
4. 運行測試確保一切正常

如需更多幫助，請查看專案文檔或聯繫開發團隊。
