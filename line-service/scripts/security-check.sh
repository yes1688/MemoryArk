#!/bin/bash
# LINE Service 安全檢查腳本
# 檢查容器安全配置和網路隔離

set -e

echo "=== LINE Service 安全檢查 ==="

# 檢查容器是否以非 root 用戶運行
echo "1. 檢查容器用戶權限..."
if docker exec memoryark-line-service whoami | grep -q "lineservice"; then
    echo "✅ 容器以非 root 用戶 (lineservice) 運行"
else
    echo "❌ 容器未以非 root 用戶運行"
    exit 1
fi

# 檢查網路隔離
echo "2. 檢查網路隔離..."
NETWORK_NAME=$(docker inspect memoryark-line-service --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
if [ "$NETWORK_NAME" = "memoryark_memoryark" ]; then
    echo "✅ LINE Service 正確加入 memoryark 網路"
else
    echo "❌ LINE Service 網路配置異常: $NETWORK_NAME"
    exit 1
fi

# 檢查 Redis 連接
echo "3. 檢查 Redis 連接..."
if docker exec memoryark-line-service curl -s http://redis:6379 > /dev/null 2>&1; then
    echo "✅ 可以連接到 Redis"
else
    echo "⚠️  無法連接到 Redis (可能是正常的，如果 Redis 未啟動)"
fi

# 檢查 MemoryArk Backend 連接
echo "4. 檢查 MemoryArk Backend 連接..."
if docker exec memoryark-line-service curl -s http://backend:8081/api/health > /dev/null 2>&1; then
    echo "✅ 可以連接到 MemoryArk Backend"
else
    echo "⚠️  無法連接到 MemoryArk Backend"
fi

# 檢查 LINE Service 健康狀態
echo "5. 檢查 LINE Service 健康狀態..."
if curl -s http://localhost:7002/health | grep -q "ok"; then
    echo "✅ LINE Service 健康檢查通過"
else
    echo "❌ LINE Service 健康檢查失敗"
    exit 1
fi

# 檢查敏感檔案權限
echo "6. 檢查檔案權限..."
docker exec memoryark-line-service ls -la /app/logs 2>/dev/null || echo "⚠️  logs 目錄不存在"
docker exec memoryark-line-service ls -la /app/uploads 2>/dev/null || echo "⚠️  uploads 目錄不存在"

# 檢查環境變數安全性
echo "7. 檢查環境變數..."
if docker exec memoryark-line-service env | grep -q "LINE_CHANNEL_SECRET=your-line"; then
    echo "❌ 發現預設的 LINE 憑證，請修改 .env 檔案"
    exit 1
else
    echo "✅ LINE 憑證已設定"
fi

echo ""
echo "=== 安全檢查完成 ==="
echo "建議："
echo "- 定期更新容器映像檔"
echo "- 監控容器日誌異常活動"
echo "- 確保 .env 檔案權限正確 (600)"
echo "- 定期備份重要資料"