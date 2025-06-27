#!/bin/bash
# LINE 圖片上傳監控腳本

echo "📸 LINE 圖片上傳監控已啟動..."
echo "🔍 等待圖片上傳事件..."
echo "💡 提示：在 LINE 中傳送圖片給 Bot 進行測試"
echo "----------------------------------------"

# 監控上傳相關日誌
podman logs -f memoryark-line-service 2>&1 | grep -E --line-buffered "image|photo|upload|Image|Photo|Upload" | while read line; do
    if echo "$line" | grep -q "error"; then
        echo "❌ $(date '+%H:%M:%S') $line"
    elif echo "$line" | grep -q "successful"; then
        echo "✅ $(date '+%H:%M:%S') $line"
    elif echo "$line" | grep -q "Starting"; then
        echo "🚀 $(date '+%H:%M:%S') $line"
    else
        echo "📝 $(date '+%H:%M:%S') $line"
    fi
done