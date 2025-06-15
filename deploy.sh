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
            echo -e "${YELLOW}未找到 .env 檔案${NC}"
            echo -e "${YELLOW}是否要建立 .env 配置檔案？(y/n)${NC}"
            read -p "選擇: " create_env
            
            if [ "$create_env" = "y" ] || [ "$create_env" = "Y" ]; then
                echo -e "${GREEN}建立 .env 配置檔案...${NC}"
                echo ""
                
                # 提示輸入管理員資訊
                echo -e "${YELLOW}請設定系統管理員資訊：${NC}"
                read -p "管理員信箱 (必填): " admin_email
                read -p "管理員姓名 (選填，預設'系統管理員'): " admin_name
                
                # 如果是開發環境，詢問是否要設定開發模式
                if [ "$ENVIRONMENT" = "dev" ]; then
                    echo ""
                    echo -e "${YELLOW}檢測到開發環境，是否要啟用開發模式？(y/n)${NC}"
                    echo -e "${YELLOW}開發模式會自動登入並跳過認證${NC}"
                    read -p "選擇: " enable_dev_mode
                    
                    if [ "$enable_dev_mode" = "y" ] || [ "$enable_dev_mode" = "Y" ]; then
                        dev_mode="true"
                        dev_auto_login="$admin_email"
                        dev_bypass_auth="true"
                        dev_cors="true"
                        echo -e "${GREEN}✅ 開發模式已啟用${NC}"
                    else
                        dev_mode="false"
                        dev_auto_login=""
                        dev_bypass_auth="false"
                        dev_cors="false"
                        echo -e "${GREEN}✅ 開發模式已停用${NC}"
                    fi
                else
                    # 生產環境，強制關閉開發模式
                    dev_mode="false"
                    dev_auto_login=""
                    dev_bypass_auth="false"
                    dev_cors="false"
                fi
                
                # 檢查管理員信箱是否為空
                if [ -z "$admin_email" ]; then
                    echo -e "${RED}錯誤：管理員信箱不能為空${NC}"
                    echo -e "${YELLOW}請手動執行 'cp .env.example .env' 建立配置檔案${NC}"
                    exit 1
                fi
                
                # 設定預設值
                if [ -z "$admin_name" ]; then
                    admin_name="系統管理員"
                fi
                
                # 複製範例檔案並替換配置
                cp .env.example .env
                sed -i "s/ROOT_ADMIN_EMAIL=your-admin@example.com/ROOT_ADMIN_EMAIL=$admin_email/" .env
                sed -i "s/ROOT_ADMIN_NAME=系統管理員/ROOT_ADMIN_NAME=$admin_name/" .env
                sed -i "s/DEVELOPMENT_MODE=false/DEVELOPMENT_MODE=$dev_mode/" .env
                sed -i "s/DEV_AUTO_LOGIN_EMAIL=/DEV_AUTO_LOGIN_EMAIL=$dev_auto_login/" .env
                sed -i "s/DEV_BYPASS_AUTH=false/DEV_BYPASS_AUTH=$dev_bypass_auth/" .env
                sed -i "s/DEV_CORS_ENABLED=false/DEV_CORS_ENABLED=$dev_cors/" .env
                
                echo -e "${GREEN}✅ .env 檔案已建立${NC}"
                echo -e "${GREEN}📧 管理員信箱: $admin_email${NC}"
                echo -e "${GREEN}👤 管理員姓名: $admin_name${NC}"
                if [ "$dev_mode" = "true" ]; then
                    echo -e "${GREEN}🚧 開發模式: 已啟用${NC}"
                    echo -e "${GREEN}🔓 自動登入: $dev_auto_login${NC}"
                else
                    echo -e "${GREEN}🔒 生產模式: 安全配置${NC}"
                fi
                echo ""
                echo -e "${YELLOW}💡 您可以編輯 .env 檔案來調整其他設定${NC}"
                echo ""
                
                # 載入新建立的 .env
                set -a
                source .env
                set +a
            else
                echo -e "${YELLOW}跳過建立 .env 檔案，使用預設配置${NC}"
                echo -e "${RED}⚠️  警告：沒有管理員設定，系統將無法正常使用${NC}"
                echo -e "${YELLOW}提示：稍後可執行 'cp .env.example .env' 建立配置檔案${NC}"
            fi
        fi
        
        # 檢查並生成 JWT 密鑰
        if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
            echo -e "${YELLOW}生成隨機 JWT 密鑰...${NC}"
            export JWT_SECRET=$(openssl rand -hex 32)
            echo -e "${GREEN}已生成安全的 JWT 密鑰${NC}"
        fi
        
        # 設置環境變量
        if [ "$ENVIRONMENT" = "dev" ]; then
            export DEVELOPMENT_MODE=true
            # 開發模式下使用 ROOT_ADMIN_EMAIL 作為自動登入信箱
            export DEV_AUTO_LOGIN_EMAIL="${DEV_AUTO_LOGIN_EMAIL:-$ROOT_ADMIN_EMAIL}"
            export DEV_BYPASS_AUTH=true
            export DEV_CORS_ENABLED=true
            echo -e "${YELLOW}使用開發環境配置${NC}"
            if [ -n "$DEV_AUTO_LOGIN_EMAIL" ]; then
                echo -e "${YELLOW}開發模式自動登入: $DEV_AUTO_LOGIN_EMAIL${NC}"
            else
                echo -e "${RED}警告：沒有設定開發模式登入信箱${NC}"
            fi
        fi
        
        # 檢查並建構前端
        if [ ! -f "frontend/dist/index.html" ]; then
            echo -e "${YELLOW}建構前端...${NC}"
            if command -v npm &> /dev/null; then
                # 本地有 npm，直接使用
                cd frontend && npm install && npm audit fix && npm run build && cd ..
            else
                # 使用 Docker 建構前端
                docker run --rm -v $(pwd):/app -w /app/frontend node:18-alpine sh -c "npm install && npm audit fix && npm run build"
            fi
            echo -e "${GREEN}前端建構完成${NC}"
        else
            echo -e "${GREEN}前端已建構，跳過建構步驟${NC}"
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
        
    "generate-jwt")
        echo -e "${GREEN}生成新的 JWT 密鑰...${NC}"
        NEW_JWT=$(openssl rand -hex 32)
        echo "JWT_SECRET=$NEW_JWT"
        echo ""
        echo -e "${YELLOW}請將上述密鑰加入到 .env 檔案中${NC}"
        ;;
        
    "update-frontend")
        echo -e "${YELLOW}更新前端依賴並修復安全漏洞...${NC}"
        if command -v npm &> /dev/null; then
            cd frontend && npm update && npm audit fix && npm run build && cd ..
        else
            docker run --rm -v $(pwd):/app -w /app/frontend node:18-alpine sh -c "npm update && npm audit fix && npm run build"
        fi
        echo -e "${GREEN}前端更新完成${NC}"
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
        echo "用法: $0 [up|down|restart|logs|status|diagnose|generate-jwt|update-frontend] [production|dev]"
        echo ""
        echo "命令："
        echo "  up/start        - 啟動服務"
        echo "  down/stop       - 停止服務"
        echo "  restart         - 重啟服務"
        echo "  logs            - 查看日誌"
        echo "  status          - 檢查狀態"
        echo "  diagnose        - 診斷問題"
        echo "  generate-jwt    - 生成 JWT 密鑰"
        echo "  update-frontend - 更新前端依賴並修復安全漏洞"
        echo ""
        echo "環境："
        echo "  production - 生產環境（默認）"
        echo "  dev        - 開發環境"
        exit 1
        ;;
esac