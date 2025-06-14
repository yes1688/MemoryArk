#!/bin/bash
# MemoryArk 統一部署腳本
# 適用於本地開發和生產環境

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 MemoryArk 部署腳本${NC}"
echo ""

# 檢測運行環境
if command -v podman &> /dev/null; then
    COMPOSE_CMD="podman-compose"
    echo -e "${YELLOW}檢測到 Podman 環境${NC}"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo -e "${YELLOW}檢測到 Docker Compose 環境${NC}"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo -e "${YELLOW}檢測到 Docker Compose V2 環境${NC}"
else
    echo -e "${RED}錯誤：未找到 Docker 或 Podman${NC}"
    exit 1
fi

# 解析參數
ACTION=${1:-"up"}
ENVIRONMENT=${2:-"production"}

case $ACTION in
    "up"|"start")
        echo -e "${GREEN}啟動服務...${NC}"
        
        # 創建必要目錄
        mkdir -p data logs/nginx uploads
        
        # 載入 .env 檔案 (如果存在)
        if [ -f ".env" ]; then
            echo -e "${GREEN}載入 .env 配置檔案${NC}"
            set -a
            source .env
            set +a
        else
            echo -e "${YELLOW}未找到 .env 檔案，使用預設配置${NC}"
            echo -e "${YELLOW}提示：執行 'cp .env.example .env' 建立配置檔案${NC}"
        fi
        
        # 設置環境變量
        if [ "$ENVIRONMENT" = "dev" ]; then
            export DEVELOPMENT_MODE=true
            export DEV_AUTO_LOGIN_EMAIL="${DEV_AUTO_LOGIN_EMAIL:-94work.net@gmail.com}"
            export DEV_BYPASS_AUTH=true
            export DEV_CORS_ENABLED=true
            echo -e "${YELLOW}使用開發環境配置${NC}"
        fi
        
        # 構建並啟動
        $COMPOSE_CMD build
        $COMPOSE_CMD up -d
        
        # 等待服務啟動
        echo -e "${YELLOW}等待服務啟動...${NC}"
        sleep 10
        
        # 檢查健康狀態
        echo -e "${GREEN}檢查服務狀態...${NC}"
        $COMPOSE_CMD ps
        ;;
        
    "down"|"stop")
        echo -e "${RED}停止服務...${NC}"
        $COMPOSE_CMD down
        ;;
        
    "restart")
        echo -e "${YELLOW}重啟服務...${NC}"
        $COMPOSE_CMD restart
        ;;
        
    "logs")
        echo -e "${GREEN}查看日誌...${NC}"
        $COMPOSE_CMD logs -f
        ;;
        
    "status")
        echo -e "${GREEN}服務狀態：${NC}"
        $COMPOSE_CMD ps
        echo ""
        echo -e "${GREEN}健康檢查：${NC}"
        curl -f http://localhost:7001/api/health 2>/dev/null && echo -e "${GREEN}✓ API 正常${NC}" || echo -e "${RED}✗ API 異常${NC}"
        ;;
        
    "diagnose")
        echo -e "${YELLOW}診斷問題...${NC}"
        echo ""
        
        # 檢查容器狀態
        echo "容器狀態："
        $COMPOSE_CMD ps
        echo ""
        
        # 檢查後端日誌
        echo "後端日誌（最後 20 行）："
        $COMPOSE_CMD logs backend --tail 20
        echo ""
        
        # 檢查 Nginx 日誌
        echo "Nginx 日誌（最後 20 行）："
        $COMPOSE_CMD logs nginx --tail 20
        echo ""
        
        # 測試網絡連接
        echo "測試容器間連接："
        $COMPOSE_CMD exec nginx wget -qO- http://memoryark-backend:8081/api/health || echo -e "${RED}無法連接到後端${NC}"
        ;;
        
    *)
        echo "用法: $0 [up|down|restart|logs|status|diagnose] [production|dev]"
        echo ""
        echo "命令："
        echo "  up/start   - 啟動服務"
        echo "  down/stop  - 停止服務"
        echo "  restart    - 重啟服務"
        echo "  logs       - 查看日誌"
        echo "  status     - 檢查狀態"
        echo "  diagnose   - 診斷問題"
        echo ""
        echo "環境："
        echo "  production - 生產環境（默認）"
        echo "  dev        - 開發環境"
        exit 1
        ;;
esac