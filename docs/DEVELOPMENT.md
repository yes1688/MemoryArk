# 開發環境設置

本文檔說明如何設置 MemoryArk 2.0 的本地開發環境。

## 🎯 開發環境概述

開發環境採用前後端分離架構：

```
前端開發服務器 (5173) ←─────→ 後端開發服務器 (8080)
     ↓                           ↓
Vue 3 + Vite                Go + Gin Framework
```

## 📋 開發需求

### 必要工具
- **Node.js** 18.0+
- **npm** 8.0+
- **Go** 1.22+
- **Git** 2.30+

### 可選工具
- **VS Code** - 推薦的編輯器
- **SQLite Browser** - 資料庫查看工具
- **Postman** - API 測試工具

## 🚀 快速開始

### 1. 克隆專案

```bash
git clone <repository-url>
cd MemoryArk2
```

### 2. 後端設置

```bash
# 進入後端目錄
cd backend

# 安裝依賴
go mod download

# 初始化資料庫目錄
mkdir -p data uploads logs

# 啟動後端服務
go run ./cmd/server
```

後端將在 `http://localhost:8080` 啟動。

### 3. 前端設置

```bash
# 開新終端，進入前端目錄
cd frontend

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev
```

前端將在 `http://localhost:5173` 啟動。

### 4. 使用開發腳本（推薦）

```bash
# 同時啟動前後端
./scripts/dev.sh start

# 停止開發環境
./scripts/dev.sh stop
```

## 🔧 詳細配置

### 後端開發配置

#### 環境變數
創建 `backend/.env`（可選，主要用於本地調試）：

```bash
# 服務器配置
PORT=8080
GIN_MODE=debug

# 資料庫配置
DATABASE_PATH=./data/memoryark.db

# JWT 配置
JWT_SECRET=dev-secret-key-change-in-production

# 檔案上傳配置
UPLOAD_PATH=./uploads

# 管理員配置（開發環境）
ROOT_ADMIN_EMAIL=dev@localhost
ROOT_ADMIN_NAME=開發管理員
```

#### 常用開發命令

```bash
# 啟動開發服務器
go run ./cmd/server

# 運行測試
go test ./...

# 格式化代碼
go fmt ./...

# 檢查代碼
go vet ./...

# 建構執行檔
go build -o server ./cmd/server
```

### 前端開發配置

#### 環境變數
編輯 `frontend/.env`：

```bash
# API 基礎 URL
VITE_API_BASE_URL=http://localhost:8080/api

# 應用程式標題
VITE_APP_TITLE=MemoryArk 2.0 (開發)

# 開發環境
VITE_APP_ENV=development

# 檔案上傳配置
VITE_MAX_FILE_SIZE=100MB
VITE_ALLOWED_FILE_TYPES=image/*,video/*,audio/*,.pdf,.doc,.docx,.txt

# UI 配置
VITE_ITEMS_PER_PAGE=20

# 功能開關
VITE_ENABLE_REGISTRATION=true
```

#### 常用開發命令

```bash
# 啟動開發服務器
npm run dev

# 建構生產版本
npm run build

# 預覽建構結果
npm run preview

# 類型檢查
npm run type-check

# 代碼檢查
npm run lint

# 執行測試
npm run test
```

## 🛠️ 開發工具配置

### VS Code 推薦擴展

#### Go 開發
- **Go** - Go 語言支援
- **Go Outliner** - Go 代碼結構
- **GitLens** - Git 整合

#### Vue/前端開發
- **Vue - Official** - Vue 3 官方支援
- **TypeScript Vue Plugin (Volar)** - Vue TypeScript 支援
- **Tailwind CSS IntelliSense** - Tailwind CSS 智能提示
- **Auto Rename Tag** - HTML 標籤自動重命名
- **Bracket Pair Colorizer** - 括號配對著色

#### 通用工具
- **Prettier** - 代碼格式化
- **ESLint** - JavaScript/TypeScript 檢查
- **GitLens** - Git 歷史查看
- **REST Client** - API 測試

### VS Code 設定

創建 `.vscode/settings.json`：

```json
{
  "go.useLanguageServer": true,
  "go.alternateTools": {
    "go": "go"
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "vue.codeActions.enabled": true,
  "tailwindCSS.includeLanguages": {
    "vue": "html"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 🔍 調試指南

### 後端調試

#### 使用 VS Code 調試
創建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "./backend/cmd/server",
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "GIN_MODE": "debug"
      }
    }
  ]
}
```

#### 使用 delve 調試

```bash
# 安裝 delve
go install github.com/go-delve/delve/cmd/dlv@latest

# 啟動調試
cd backend
dlv debug ./cmd/server
```

#### 日誌調試

```go
import "log"

// 在代碼中添加日誌
log.Printf("Debug: %+v", data)
```

### 前端調試

#### 瀏覽器開發者工具
- **F12** 開啟開發者工具
- **Vue DevTools** 擴展（推薦安裝）

#### VS Code 調試
安裝 **Debugger for Chrome** 擴展，配置：

```json
{
  "name": "Debug Frontend",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

## 🧪 測試

### 後端測試

```bash
# 運行所有測試
go test ./...

# 運行特定包的測試
go test ./internal/api/handlers

# 運行測試並顯示覆蓋率
go test -cover ./...

# 生成覆蓋率報告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### 前端測試

```bash
# 運行單元測試
npm run test

# 運行測試並監視變更
npm run test:watch

# 運行覆蓋率測試
npm run test:coverage
```

## 📊 效能分析

### 後端效能

```bash
# CPU 效能分析
go test -cpuprofile cpu.prof -bench .

# 記憶體效能分析
go test -memprofile mem.prof -bench .

# 查看效能報告
go tool pprof cpu.prof
```

### 前端效能

```bash
# 分析建構大小
npm run build
npm run analyze

# 開發服務器效能
npm run dev -- --open --profile
```

## 🐛 常見問題

### 後端問題

1. **端口被占用**
   ```bash
   # 查找占用端口的進程
   lsof -i :8080
   
   # 終止進程
   kill -9 <PID>
   ```

2. **依賴問題**
   ```bash
   # 清理模組快取
   go clean -modcache
   
   # 重新下載依賴
   go mod download
   ```

3. **資料庫問題**
   ```bash
   # 刪除並重建資料庫
   rm data/memoryark.db
   go run ./cmd/server
   ```

### 前端問題

1. **依賴安裝失敗**
   ```bash
   # 清理 node_modules
   rm -rf node_modules package-lock.json
   
   # 重新安裝
   npm install
   ```

2. **建構失敗**
   ```bash
   # 檢查 TypeScript 錯誤
   npm run type-check
   
   # 檢查 ESLint 錯誤
   npm run lint
   ```

3. **熱更新失敗**
   ```bash
   # 重啟開發服務器
   npm run dev
   ```

## 📝 開發最佳實踐

### 代碼風格

1. **Go 代碼**
   - 使用 `go fmt` 格式化
   - 遵循 Go 命名慣例
   - 適當添加註解

2. **Vue/TypeScript 代碼**
   - 使用 Prettier 格式化
   - 遵循 Vue 3 Composition API
   - 使用 TypeScript 類型定義

### Git 工作流程

```bash
# 創建功能分支
git checkout -b feature/new-feature

# 提交變更
git add .
git commit -m "feat: add new feature"

# 推送到遠端
git push origin feature/new-feature

# 建立 Pull Request
```

### 提交訊息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 新功能
fix: 錯誤修復
docs: 文檔更新
style: 代碼格式化
refactor: 代碼重構
test: 測試相關
chore: 建構工具或輔助工具的變動
```

## 📞 支援

如遇到開發問題：

1. 檢查 [常見問題](#-常見問題) 章節
2. 查看相關日誌和錯誤訊息
3. 搜尋現有的 [Issues](../../issues)
4. 提交新的 [Issue](../../issues/new) 並提供：
   - 開發環境資訊
   - 錯誤訊息
   - 重現步驟

---

*保持代碼整潔，享受開發過程 ✨*