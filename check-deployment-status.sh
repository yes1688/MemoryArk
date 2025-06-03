#!/bin/bash

# MemoryArk 2.0 部署狀態檢查腳本
# 檢查容器和服務是否準備好進行 Cloudflare Tunnels 部署

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 MemoryArk 2.0 部署狀態檢查${NC}"
echo "========================================"
echo ""

# 1. 檢查容器狀態
echo -e "${BLUE}📦 檢查容器狀態...${NC}"
CONTAINER_STATUS=$(podman ps --filter "name=memoryark-dev" --format "{{.Status}}")
if [ -n "$CONTAINER_STATUS" ]; then
    echo -e "${GREEN}✅ 容器 memoryark-dev 正在運行: $CONTAINER_STATUS${NC}"
else
    echo -e "${RED}❌ 容器 memoryark-dev 未運行${NC}"
    exit 1
fi
echo ""

# 2. 檢查端口監聽
echo -e "${BLUE}🔌 檢查端口監聽狀態...${NC}"

# 前端端口 5173
if ss -tlnp | grep -q ":5173.*LISTEN"; then
    echo -e "${GREEN}✅ 前端服務 (端口 5173) 正在監聽${NC}"
else
    echo -e "${RED}❌ 前端服務 (端口 5173) 未監聽${NC}"
fi

# 後端端口 7001
if ss -tlnp | grep -q ":7001.*LISTEN"; then
    echo -e "${GREEN}✅ 後端服務 (端口 7001) 正在監聽${NC}"
else
    echo -e "${RED}❌ 後端服務 (端口 7001) 未監聽${NC}"
fi
echo ""

# 3. 測試服務響應
echo -e "${BLUE}🌐 測試服務響應...${NC}"

# 測試前端
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 前端服務響應正常 (HTTP $FRONTEND_RESPONSE)${NC}"
else
    echo -e "${RED}❌ 前端服務響應異常 (HTTP $FRONTEND_RESPONSE)${NC}"
fi

# 測試後端 API
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7001/api/health || echo "000")
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 後端 API 響應正常 (HTTP $BACKEND_RESPONSE)${NC}"
else
    echo -e "${RED}❌ 後端 API 響應異常 (HTTP $BACKEND_RESPONSE)${NC}"
fi
echo ""

# 4. 檢查 API 健康狀態
echo -e "${BLUE}💊 檢查 API 健康狀態...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:7001/api/health 2>/dev/null || echo "{}")
if echo "$HEALTH_CHECK" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ API 健康檢查通過${NC}"
    echo "   $HEALTH_CHECK"
else
    echo -e "${RED}❌ API 健康檢查失敗${NC}"
    echo "   $HEALTH_CHECK"
fi
echo ""

# 5. 檢查 Cloudflare Tunnels 配置
echo -e "${BLUE}☁️  檢查 Cloudflare Tunnels 配置...${NC}"

if [ -f "cloudflare-tunnel-config.yml" ]; then
    echo -e "${GREEN}✅ Cloudflare Tunnel 配置文件存在${NC}"
else
    echo -e "${YELLOW}⚠️  Cloudflare Tunnel 配置文件不存在${NC}"
fi

if [ -f "scripts/deploy-tunnel.sh" ]; then
    echo -e "${GREEN}✅ 部署腳本存在${NC}"
else
    echo -e "${YELLOW}⚠️  部署腳本不存在${NC}"
fi

if command -v cloudflared &> /dev/null; then
    CLOUDFLARED_VERSION=$(cloudflared --version | head -1)
    echo -e "${GREEN}✅ cloudflared 已安裝: $CLOUDFLARED_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  cloudflared 未安裝${NC}"
fi
echo ""

# 總結
echo -e "${BLUE}📋 部署準備狀態總結${NC}"
echo "========================================"

ALL_READY=true

# 檢查必要條件
if ! podman ps --filter "name=memoryark-dev" --format "{{.Status}}" | grep -q "Up"; then
    echo -e "${RED}❌ 容器未運行${NC}"
    ALL_READY=false
fi

if ! ss -tlnp | grep -q ":5173.*LISTEN"; then
    echo -e "${RED}❌ 前端服務未就緒${NC}"
    ALL_READY=false
fi

if ! ss -tlnp | grep -q ":7001.*LISTEN"; then
    echo -e "${RED}❌ 後端服務未就緒${NC}"
    ALL_READY=false
fi

if [ "$BACKEND_RESPONSE" != "200" ]; then
    echo -e "${RED}❌ 後端 API 未就緒${NC}"
    ALL_READY=false
fi

if [ "$ALL_READY" = true ]; then
    echo -e "${GREEN}🎉 所有服務已準備就緒，可以進行 Cloudflare Tunnels 部署！${NC}"
    echo ""
    echo -e "${BLUE}📝 下一步:${NC}"
    echo "1. 確保您已經創建了 Cloudflare Tunnel"
    echo "2. 更新 cloudflare-tunnel-config.yml 中的配置"
    echo "3. 執行: ./scripts/deploy-tunnel.sh"
    echo ""
else
    echo -e "${RED}❌ 有些服務尚未準備就緒，請修復上述問題後重試${NC}"
    exit 1
fi
