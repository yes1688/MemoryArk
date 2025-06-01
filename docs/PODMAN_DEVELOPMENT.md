# MemoryArk 2.0 Podman 容器化開發指南

本指南説明如何使用 Podman 容器進行 MemoryArk 2.0 的開發工作。

## 🐳 環境需求

### 系統需求
- **Podman**: 4.0+ 
- **podman-compose**: 1.0+ (可選)
- **Make**: 用於簡化命令操作

### Podman 安裝

#### Fedora/RHEL/CentOS
```bash
sudo dnf install podman podman-compose
```

#### Ubuntu/Debian  
```bash
sudo apt update
sudo apt install podman podman-compose
```

#### macOS
```bash
brew install podman podman-compose
```

## 🚀 快速開始

### 1. 啟動開發環境
```bash
# 方法 1: 使用 Makefile (推薦)
make dev-start

# 方法 2: 使用腳本
./scripts/dev-start.sh

# 方法 3: 使用 podman-compose
podman-compose -f docker-compose.dev.yml up -d
```

### 2. 進入開發容器
```bash
# 方法 1: 使用 Makefile
make dev-shell

# 方法 2: 使用腳本
./scripts/dev-shell.sh

# 方法 3: 直接使用 podman
podman exec -it memoryark-dev /bin/bash
```

### 3. 初始化開發環境
```bash
# 在容器內執行，或從宿主機執行:
make init-all

# 或分別初始化:
make init-backend    # 初始化 Go 後端
make init-frontend   # 初始化 Vue 3 前端
```

## 📁 容器內開發流程

### 後端開發 (Go + Gin)

#### 項目結構初始化
```bash
# 在容器內 /app/backend 目錄
go mod init memoryark
go mod tidy
```

#### 開發服務器 (熱重載)
```bash
# 在容器內啟動 Air 熱重載
cd /app/backend
air
```

#### 常用命令
```bash
# 添加依賴
go get github.com/gin-gonic/gin

# 運行測試
go test ./...

# 代碼檢查
golangci-lint run

# 生成 API 文檔
swag init -g cmd/server/main.go
```

### 前端開發 (Vue 3 + TypeScript)

#### 開發服務器
```bash
# 在容器內 /app/frontend 目錄
npm run dev
```

#### 常用命令
```bash
# 安裝依賴
npm install

# 構建項目
npm run build

# 代碼檢查
npm run lint

# 類型檢查
npm run type-check
```

## 🔧 開發工具配置

### VS Code 容器開發

創建 `.vscode/devcontainer.json`:
```json
{
  "name": "MemoryArk Dev",
  "dockerComposeFile": "../docker-compose.dev.yml",
  "service": "memoryark-dev",
  "workspaceFolder": "/app",
  "extensions": [
    "golang.go",
    "Vue.volar",
    "ms-vscode.vscode-typescript-next"
  ],
  "settings": {
    "go.gopath": "/go",
    "go.goroot": "/usr/local/go"
  }
}
```

### Git 掛載配置
容器會自動掛載項目目錄，Git 操作在宿主機或容器內都可以：

```bash
# 在宿主機操作 Git
git add .
git commit -m "feat: 新增功能"

# 或在容器內操作 (需要配置 Git 用戶)
podman exec -it memoryark-dev git config --global user.name "Your Name"
podman exec -it memoryark-dev git config --global user.email "your.email@example.com"
```

## 📊 開發服務端口

- **後端 API**: http://localhost:7001
- **前端開發**: http://localhost:5173
- **API 文檔**: http://localhost:7001/swagger/index.html (開發時)

## 🛠️ 常用開發命令

```bash
# 查看容器狀態
make dev-logs

# 重啟開發環境
make dev-stop && make dev-start

# 完全重建環境  
make rebuild

# 清理所有資源
make clean
```

## 🐛 故障排除

### 端口衝突
```bash
# 檢查端口佔用
sudo netstat -tlnp | grep :7001

# 或使用 ss
ss -tlnp | grep :7001
```

### 權限問題 (SELinux)
```bash
# 如果遇到檔案權限問題
sudo setsebool -P container_manage_cgroup true
```

### 容器無法啟動
```bash
# 檢查容器狀態
podman ps -a

# 查看詳細錯誤
podman logs memoryark-dev

# 重建鏡像
make rebuild
```

### 依賴安裝失敗
```bash
# 清除 Go 模組快取
podman exec -it memoryark-dev go clean -modcache

# 清除 npm 快取
podman exec -it memoryark-dev npm cache clean --force
```

## 🔄 開發工作流程

1. **啟動環境**: `make dev-start`
2. **進入容器**: `make dev-shell`  
3. **初始化項目**: `make init-all`
4. **開始開發**: 在容器內使用 `air` (後端) 和 `npm run dev` (前端)
5. **測試**: `go test ./...` 和 `npm test`
6. **提交代碼**: 在宿主機使用 Git
7. **停止環境**: `make dev-stop`

## 📚 相關文檔

- [項目規格說明](../SPECIFICATION.md)
- [API 設計文檔](../docs/API_DESIGN.md)
- [貢獻指南](../CONTRIBUTING.md)
- [部署指南](../docs/DEPLOYMENT.md)
