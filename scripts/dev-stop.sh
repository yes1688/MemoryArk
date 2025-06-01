#!/bin/bash

# 停止 MemoryArk 2.0 開發容器

set -e

CONTAINER_NAME="memoryark-dev"

echo "🛑 停止開發容器..."

# 停止並移除容器
if podman ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    podman stop $CONTAINER_NAME || true
    podman rm $CONTAINER_NAME || true
    echo "✅ 開發容器已停止並移除"
else
    echo "ℹ️  開發容器未運行"
fi
