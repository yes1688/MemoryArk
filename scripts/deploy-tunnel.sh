#!/bin/bash

# MemoryArk 2.0 Cloudflare Tunnels 部署腳本
# 使用方法: ./scripts/deploy-tunnel.sh [dev|prod]

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 環境參數
ENVIRONMENT=${1:-dev}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUNNEL_CONFIG="$PROJECT_ROOT/cloudflare-tunnel-config.yml"

echo -e "${BLUE}🚀 MemoryArk 2.0 Cloudflare Tunnels 部署${NC}"
echo -e "${YELLOW}📝 環境: $ENVIRONMENT${NC}"
echo ""

# 檢查必要工具
check_dependencies() {
    echo -e "${BLUE}🔍 檢查系統依賴...${NC}"
    
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${RED}❌ cloudflared 未安裝${NC}"
        echo -e "${YELLOW}💡 請先安裝 cloudflared:${NC}"
        echo "   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
        echo "   sudo dpkg -i cloudflared.deb"
        exit 1
    fi
    
    echo -e "${GREEN}✅ cloudflared 已安裝${NC}"
}

# 檢查服務狀態
check_services() {
    echo -e "${BLUE}🔍 檢查服務狀態...${NC}"
    
    # 檢查端口占用
    if ss -tulpn | grep -q ":5173.*LISTEN"; then
        echo -e "${GREEN}✅ 前端開發服務器運行中 (Port 5173)${NC}"
    else
        echo -e "${YELLOW}⚠️  前端開發服務器未運行，正在啟動...${NC}"
        cd "$PROJECT_ROOT" && make dev-start &
        sleep 10
    fi
    
    if ss -tulpn | grep -q ":8080.*LISTEN"; then
        echo -e "${GREEN}✅ 後端服務器運行中 (Port 8080)${NC}"
    else
        echo -e "${YELLOW}⚠️  後端服務器未運行${NC}"
        echo -e "${YELLOW}💡 請手動啟動後端服務器後重新運行此腳本${NC}"
        exit 1
    fi
}

# 驗證 Cloudflare 配置
verify_cloudflare_config() {
    echo -e "${BLUE}🔍 驗證 Cloudflare 配置...${NC}"
    
    if [ ! -f "$TUNNEL_CONFIG" ]; then
        echo -e "${RED}❌ Tunnel 配置文件不存在: $TUNNEL_CONFIG${NC}"
        echo -e "${YELLOW}💡 請先創建 Cloudflare Tunnel 並配置文件${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Tunnel 配置文件存在${NC}"
}

# 環境特定配置
configure_environment() {
    echo -e "${BLUE}🔧 配置 $ENVIRONMENT 環境...${NC}"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo -e "${YELLOW}📋 開發環境配置:${NC}"
        echo "   - 前端: http://localhost:5173 → dev.your-domain.com"
        echo "   - 後端: http://localhost:8080 → api-dev.your-domain.com"
    elif [ "$ENVIRONMENT" = "prod" ]; then
        echo -e "${YELLOW}📋 生產環境配置:${NC}"
        echo "   - 應用: http://localhost:7001 → your-domain.com"
        
        # 檢查生產端口
        if ! ss -tulpn | grep -q ":7001.*LISTEN"; then
            echo -e "${YELLOW}⚠️  生產端口 7001 未運行，請先構建並啟動生產容器${NC}"
            echo "   cd $PROJECT_ROOT && make build && make start"
            exit 1
        fi
    fi
}

# 啟動 Cloudflare Tunnel
start_tunnel() {
    echo -e "${BLUE}🚀 啟動 Cloudflare Tunnel...${NC}"
    
    echo -e "${YELLOW}📋 使用配置文件: $TUNNEL_CONFIG${NC}"
    echo -e "${YELLOW}⏳ 正在啟動 tunnel... (按 Ctrl+C 停止)${NC}"
    echo ""
    
    # 啟動 cloudflared
    cloudflared tunnel --config "$TUNNEL_CONFIG" run
}

# 顯示狀態信息
show_status() {
    echo -e "${GREEN}🎉 Cloudflare Tunnel 部署完成！${NC}"
    echo ""
    echo -e "${BLUE}📊 服務狀態:${NC}"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo -e "${GREEN}✅ 前端開發環境: https://dev.your-domain.com${NC}"
        echo -e "${GREEN}✅ 後端 API: https://api-dev.your-domain.com${NC}"
    else
        echo -e "${GREEN}✅ 生產環境: https://your-domain.com${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 提示:${NC}"
    echo "   - 請確保 Cloudflare Access 已正確配置"
    echo "   - 首次訪問需要通過 Google 認證"
    echo "   - 用戶需要在系統內註冊並等待管理員審核"
}

# 主執行流程
main() {
    check_dependencies
    check_services
    verify_cloudflare_config
    configure_environment
    
    echo ""
    echo -e "${YELLOW}🚀 即將啟動 Cloudflare Tunnel...${NC}"
    echo -e "${YELLOW}📝 按 Enter 繼續，或 Ctrl+C 取消${NC}"
    read -r
    
    start_tunnel
}

# 錯誤處理
trap 'echo -e "\n${YELLOW}🛑 Tunnel 已停止${NC}"; exit 0' INT

# 執行主函數
main "$@"
