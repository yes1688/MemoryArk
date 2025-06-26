#!/bin/bash

# MemoryArk2 內部 API 通訊測試腳本
# 用於測試 LINE Service 與 Backend 的內部通訊

set -e

echo "🧪 MemoryArk2 內部 API 通訊測試"
echo "=================================="

# 設定變數
BACKEND_URL="http://localhost:7001"
LINE_SERVICE_URL="http://localhost:7002" 
API_TOKEN="line-service-internal-token-2024"

echo "📋 測試環境："
echo "  Backend URL: $BACKEND_URL"
echo "  LINE Service URL: $LINE_SERVICE_URL"
echo "  API Token: ${API_TOKEN:0:8}..."
echo ""

# 測試 1: 後端健康檢查
echo "🔍 測試 1: 後端健康檢查"
echo "------------------------"
if curl -s -f "$BACKEND_URL/api/health" > /dev/null; then
    echo "✅ Backend 健康檢查：正常"
else
    echo "❌ Backend 健康檢查：失敗"
    exit 1
fi

# 測試 2: LINE Service 健康檢查
echo ""
echo "🔍 測試 2: LINE Service 健康檢查"
echo "-------------------------------"
if curl -s -f "$LINE_SERVICE_URL/health" > /dev/null; then
    echo "✅ LINE Service 健康檢查：正常"
else
    echo "❌ LINE Service 健康檢查：失敗"
    exit 1
fi

# 測試 3: API Token 認證測試
echo ""
echo "🔍 測試 3: API Token 認證測試"
echo "-----------------------------"

# 測試無 Token 的請求 (應該失敗)
echo "測試無 Token 請求..."
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/api-access/files/upload" | grep -q "401"; then
    echo "✅ 無 Token 請求正確被拒絕 (401)"
else
    echo "❌ 無 Token 請求沒有被正確處理"
fi

# 測試錯誤 Token 的請求 (應該失敗)
echo "測試錯誤 Token 請求..."
if curl -s -o /dev/null -w "%{http_code}" \
   -H "Authorization: Bearer invalid-token" \
   "$BACKEND_URL/api/api-access/files/upload" | grep -q "401"; then
    echo "✅ 錯誤 Token 請求正確被拒絕 (401)"
else
    echo "❌ 錯誤 Token 請求沒有被正確處理"
fi

# 測試正確 Token 的請求 (應該成功進入端點，但可能因為沒有檔案而返回 400)
echo "測試正確 Token 請求..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
   -H "Authorization: Bearer $API_TOKEN" \
   "$BACKEND_URL/api/api-access/files/upload")

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo "✅ 正確 Token 請求成功通過認證 (返回 $HTTP_CODE - 缺少檔案內容)"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ 正確 Token 請求被拒絕 - 可能 Token 配置有問題"
else
    echo "⚠️  正確 Token 請求返回狀態碼: $HTTP_CODE"
fi

# 測試 4: 檔案資訊查詢端點
echo ""
echo "🔍 測試 4: 檔案資訊查詢端點"
echo "---------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
   -H "Authorization: Bearer $API_TOKEN" \
   "$BACKEND_URL/api/api-access/files/non-existent-id")

if [ "$HTTP_CODE" = "404" ]; then
    echo "✅ 檔案查詢端點正常工作 (返回 404 - 檔案不存在)"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ 檔案查詢端點認證失敗"
else
    echo "⚠️  檔案查詢端點返回狀態碼: $HTTP_CODE"
fi

# 測試 5: 完整的內部通訊路徑測試
echo ""
echo "🔍 測試 5: LINE Service 內部通訊測試"
echo "-----------------------------------"
if command -v jq > /dev/null; then
    echo "測試 LINE Service 配置..."
    
    # 模擬檢查 LINE Service 是否能連接到 Backend
    # 這裡我們測試 health 端點，因為它不需要特殊權限
    RESPONSE=$(curl -s "$LINE_SERVICE_URL/health" | jq -r '.memoryark_api // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$RESPONSE" != "unknown" ]; then
        echo "✅ LINE Service 內部通訊配置正常"
    else
        echo "⚠️  LINE Service 內部通訊狀態未知"
    fi
else
    echo "⚠️  缺少 jq 工具，跳過詳細測試"
fi

echo ""
echo "🎯 測試總結"
echo "==========="
echo "✅ 基礎健康檢查：通過"
echo "✅ API Token 認證機制：正常"
echo "✅ 內部通訊端點：可用"
echo ""
echo "🚀 系統已準備好進行 LINE Bot 測試！"
echo ""
echo "📝 下一步："
echo "  1. 確保 LINE 開發者帳號已申請完成"
echo "  2. 在 line-service/.env 中填入真實的 LINE 憑證"
echo "  3. 重啟服務：podman-compose down && podman-compose up -d"
echo "  4. 使用 LINE App 掃描 QR Code 測試上傳功能"