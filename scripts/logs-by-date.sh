#!/bin/bash

# MemoryArk 2.0 日誌查看腳本
# 支援 Docker 和 Podman

set -e

# 預設值
DATE=${1:-$(date +%Y-%m-%d)}
SERVICE=${2:-nginx}

# 檢測使用 Docker 還是 Podman
if command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ 錯誤：找不到 docker-compose 或 podman-compose"
    exit 1
fi

# 計算下一天日期
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    NEXT_DATE=$(date -j -v+1d -f "%Y-%m-%d" "$DATE" +%Y-%m-%d)
else
    # Linux
    NEXT_DATE=$(date -d "$DATE +1 day" +%Y-%m-%d)
fi

echo "📋 查看 $DATE 的 $SERVICE 日誌"
echo "🔧 使用工具：$COMPOSE_CMD"
echo "⏰ 時間範圍：$DATE 00:00 - $NEXT_DATE 00:00"
echo "────────────────────────────────────────"

# 執行日誌查看
$COMPOSE_CMD logs --since="$DATE" --until="$NEXT_DATE" "$SERVICE"

if [ $? -eq 0 ]; then
    echo "────────────────────────────────────────"
    echo "✅ 日誌查看完成"
else
    echo "❌ 日誌查看失敗"
    exit 1
fi