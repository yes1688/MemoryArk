#!/bin/bash

# MemoryArk 2.0 Podman 開發環境啟動腳本

set -e

echo "🚀 啟動 MemoryArk 2.0 開發環境..."

# 檢查 Podman 是否已安裝
if ! command -v podman &> /dev/null; then
    echo "❌ 錯誤: 請先安裝 Podman"
    exit 1
fi

# 設置變量
CONTAINER_NAME="memoryark-dev"
IMAGE_NAME="memoryark-dev:latest"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📂 項目目錄: $PROJECT_DIR"

# 停止並移除現有容器（如果存在）
if podman ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "🔄 停止現有容器..."
    podman stop $CONTAINER_NAME || true
    podman rm $CONTAINER_NAME || true
fi

# 構建開發鏡像
echo "🔨 構建開發鏡像..."
podman build -f "$PROJECT_DIR/Dockerfile.dev" -t $IMAGE_NAME "$PROJECT_DIR"

# 創建並啟動開發容器
echo "🚀 啟動開發容器..."
podman run -d \
    --name $CONTAINER_NAME \
    -p 7001:7001 \
    -p 5173:5173 \
    -v "$PROJECT_DIR:/app:Z" \
    -v memoryark-go-modules:/go/pkg/mod \
    -v memoryark-node-modules:/app/frontend/node_modules \
    -e GO111MODULE=on \
    -e GOPROXY=https://goproxy.cn,direct \
    -w /app \
    --interactive \
    --tty \
    $IMAGE_NAME

echo "✅ 開發容器已啟動！"
echo ""
echo "📋 常用命令:"
echo "  進入容器: ./scripts/dev-shell.sh"
echo "  查看日誌: podman logs -f $CONTAINER_NAME"
echo "  停止容器: ./scripts/dev-stop.sh"
echo ""
echo "🌐 開發端口:"
echo "  後端 API: http://localhost:7001"
echo "  前端開發: http://localhost:5173"
