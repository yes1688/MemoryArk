#!/bin/bash

# 進入 MemoryArk 2.0 開發容器的 Shell

set -e

CONTAINER_NAME="memoryark-dev"

# 檢查容器是否運行
if ! podman ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ 開發容器未運行"
    echo "請先執行: ./scripts/dev-start.sh"
    exit 1
fi

echo "🐳 進入開發容器 Shell..."
podman exec -it $CONTAINER_NAME /bin/bash
