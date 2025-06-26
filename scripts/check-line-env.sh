#!/bin/bash

# 檢查 LINE 環境變數設定

echo "========================================="
echo "LINE 環境變數檢查工具"
echo "========================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查函數
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env 2>/dev/null | cut -d'=' -f2-)
    
    if [ -z "$var_value" ] || [ "$var_value" = "your_channel_access_token_here" ] || 
       [ "$var_value" = "your_channel_secret_here" ] || 
       [ "$var_value" = "your_channel_id_here" ] ||
       [ "$var_value" = "@your_line_id" ]; then
        echo -e "${RED}❌ $var_name: 未設定或仍為範本值${NC}"
        return 1
    else
        # 遮蔽敏感資訊
        if [ "$var_name" = "LINE_CHANNEL_ACCESS_TOKEN" ] || [ "$var_name" = "LINE_CHANNEL_SECRET" ]; then
            masked_value="${var_value:0:10}...${var_value: -10}"
            echo -e "${GREEN}✅ $var_name: 已設定 (${masked_value})${NC}"
        else
            echo -e "${GREEN}✅ $var_name: $var_value${NC}"
        fi
        return 0
    fi
}

# 檢查 .env 檔案是否存在
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 錯誤: 找不到 .env 檔案${NC}"
    echo ""
    echo "請執行以下命令設定環境變數："
    echo "  ./scripts/setup-line-env.sh"
    exit 1
fi

echo "檢查 LINE API 憑證設定："
echo ""

# 檢查必要的環境變數
required_vars=(
    "LINE_CHANNEL_ACCESS_TOKEN"
    "LINE_CHANNEL_SECRET"
    "LINE_CHANNEL_ID"
    "LINE_OFFICIAL_ACCOUNT_ID"
    "LINE_WEBHOOK_URL"
)

all_set=true
for var in "${required_vars[@]}"; do
    if ! check_env_var "$var"; then
        all_set=false
    fi
done

echo ""
echo "檢查其他相關設定："
echo ""

# 檢查選擇性環境變數
optional_vars=(
    "MEMORYARK_API_URL"
    "REDIS_URL"
    "NODE_ENV"
    "PORT"
)

for var in "${optional_vars[@]}"; do
    check_env_var "$var" || true
done

echo ""
echo "========================================="

if $all_set; then
    echo -e "${GREEN}✅ 所有必要的 LINE API 環境變數都已正確設定！${NC}"
    echo ""
    echo "下一步："
    echo "1. 重啟 Docker 容器："
    echo "   docker-compose down && docker-compose up -d"
    echo ""
    echo "2. 檢查服務狀態："
    echo "   docker-compose ps"
    echo "   docker-compose logs line-service"
else
    echo -e "${YELLOW}⚠️  部分環境變數尚未設定${NC}"
    echo ""
    echo "請執行以下命令設定環境變數："
    echo "  ./scripts/setup-line-env.sh"
fi

echo ""

# 檢查 Docker 服務狀態
if command -v docker-compose &> /dev/null; then
    echo "檢查 Docker 服務狀態："
    line_service_status=$(docker-compose ps line-service 2>/dev/null | grep -c "Up" || echo "0")
    if [ "$line_service_status" = "1" ]; then
        echo -e "${GREEN}✅ LINE Service 容器正在運行${NC}"
    else
        echo -e "${YELLOW}⚠️  LINE Service 容器未運行${NC}"
    fi
fi