#!/bin/bash

# MemoryArk 2.0 後端開發腳本（在容器內執行）

set -e

echo "🔧 初始化 Go 後端開發環境..."

# 檢查是否在容器內
if [ ! -f /.dockerenv ] && [ "$container" != "podman" ]; then
    echo "❌ 此腳本應在開發容器內執行"
    echo "請先執行: ./scripts/dev-shell.sh"
    exit 1
fi

# 進入後端目錄
cd /app/backend

# 檢查是否已初始化 Go 模組
if [ ! -f "go.mod" ]; then
    echo "📦 初始化 Go 模組..."
    go mod init memoryark
    echo "✅ Go 模組已初始化"
fi

# 創建基本目錄結構
echo "📁 創建項目結構..."
mkdir -p {cmd/server,internal/{api,auth,config,database,middleware,models,services},pkg/{utils,logger},data,uploads,logs}

# 安裝基本依賴
echo "📥 安裝基本依賴..."
go get github.com/gin-gonic/gin
go get github.com/gin-contrib/cors
go get github.com/gin-contrib/sessions
go get github.com/gin-contrib/sessions/cookie
go get gorm.io/gorm
go get gorm.io/driver/sqlite
go get github.com/joho/godotenv
go get golang.org/x/crypto/bcrypt
go get github.com/golang-jwt/jwt/v5
go get github.com/go-playground/validator/v10

echo "✅ 後端依賴安裝完成！"
echo ""
echo "🚀 開發命令："
echo "  啟動開發服務器: air"
echo "  運行測試: go test ./..."
echo "  代碼檢查: golangci-lint run"
