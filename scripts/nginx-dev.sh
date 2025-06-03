#!/bin/bash

# MemoryArk 2.0 NGINX 代理開發環境管理腳本

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="memoryark-nginx"
COMPOSE_FILE="docker-compose.nginx.yml"

# 顯示幫助信息
show_help() {
    echo -e "${BLUE}MemoryArk 2.0 NGINX 代理開發環境管理${NC}"
    echo "========================================"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令："
    echo "  start     - 啟動 NGINX 代理開發環境"
    echo "  stop      - 停止開發環境"
    echo "  restart   - 重啟開發環境"
    echo "  logs      - 查看所有服務日誌"
    echo "  logs-nginx - 查看 NGINX 日誌"
    echo "  logs-backend - 查看後端日誌"
    echo "  logs-frontend - 查看前端日誌"
    echo "  shell     - 進入容器 shell"
    echo "  status    - 查看服務狀態"
    echo "  build     - 重新構建容器"
    echo "  clean     - 清理容器和數據卷"
    echo "  test      - 測試服務響應"
    echo "  help      - 顯示此幫助信息"
    echo ""
    echo "配置："
    echo "  - 外部訪問端口: 7001 (NGINX 代理)"
    echo "  - 內部前端端口: 5173"
    echo "  - 內部後端端口: 8080"
    echo ""
}

# 檢查 Docker/Podman
check_container_engine() {
    if command -v podman &> /dev/null; then
        CONTAINER_ENGINE="podman"
        COMPOSE_CMD="podman-compose"
    elif command -v docker &> /dev/null; then
        CONTAINER_ENGINE="docker"
        COMPOSE_CMD="docker compose"
    else
        echo -e "${RED}❌ 未找到 Docker 或 Podman${NC}"
        exit 1
    fi
}

# 啟動服務
start_services() {
    echo -e "${BLUE}🚀 啟動 MemoryArk 2.0 NGINX 代理開發環境...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # 確保配置文件存在
    if [ ! -f "nginx.conf" ]; then
        echo -e "${RED}❌ nginx.conf 不存在${NC}"
        exit 1
    fi
    
    if [ ! -f "backend/.env.nginx" ]; then
        echo -e "${YELLOW}⚠️  複製 .env.nginx 為 .env${NC}"
        cp backend/.env.nginx backend/.env
    fi
    
    $COMPOSE_CMD -f $COMPOSE_FILE up -d --build
    
    echo -e "${GREEN}✅ 服務啟動中...${NC}"
    echo -e "${BLUE}📋 服務信息:${NC}"
    echo "  - NGINX 代理: http://localhost:7001"
    echo "  - 前端: http://localhost:7001 (代理到內部 5173)"
    echo "  - 後端 API: http://localhost:7001/api (代理到內部 8080)"
    echo "  - NGINX 健康檢查: http://localhost:7001/nginx-health"
    
    echo ""
    echo -e "${YELLOW}⏳ 等待服務就緒...${NC}"
    wait_for_services
}

# 停止服務
stop_services() {
    echo -e "${BLUE}🛑 停止開發環境...${NC}"
    cd "$PROJECT_ROOT"
    $COMPOSE_CMD -f $COMPOSE_FILE down
    echo -e "${GREEN}✅ 服務已停止${NC}"
}

# 重啟服務
restart_services() {
    echo -e "${BLUE}🔄 重啟開發環境...${NC}"
    stop_services
    start_services
}

# 查看日誌
show_logs() {
    cd "$PROJECT_ROOT"
    case "$1" in
        nginx)
            $COMPOSE_CMD -f $COMPOSE_FILE exec $CONTAINER_NAME tail -f /var/log/supervisor/nginx.log
            ;;
        backend)
            $COMPOSE_CMD -f $COMPOSE_FILE exec $CONTAINER_NAME tail -f /var/log/supervisor/backend.log
            ;;
        frontend)
            $COMPOSE_CMD -f $COMPOSE_FILE exec $CONTAINER_NAME tail -f /var/log/supervisor/frontend.log
            ;;
        *)
            $COMPOSE_CMD -f $COMPOSE_FILE logs -f
            ;;
    esac
}

# 進入容器 shell
enter_shell() {
    echo -e "${BLUE}🐚 進入容器 shell...${NC}"
    cd "$PROJECT_ROOT"
    $COMPOSE_CMD -f $COMPOSE_FILE exec $CONTAINER_NAME /bin/bash
}

# 查看狀態
show_status() {
    echo -e "${BLUE}📊 服務狀態${NC}"
    echo "========================================"
    cd "$PROJECT_ROOT"
    $COMPOSE_CMD -f $COMPOSE_FILE ps
    
    echo ""
    echo -e "${BLUE}🔍 端口狀態${NC}"
    echo "========================================"
    if $CONTAINER_ENGINE ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q $CONTAINER_NAME; then
        $CONTAINER_ENGINE ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "容器未運行"
    fi
}

# 重新構建
rebuild() {
    echo -e "${BLUE}🔨 重新構建容器...${NC}"
    cd "$PROJECT_ROOT"
    $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache
    echo -e "${GREEN}✅ 構建完成${NC}"
}

# 清理
clean_all() {
    echo -e "${YELLOW}⚠️  這將刪除所有容器和數據卷${NC}"
    read -p "確定要繼續嗎？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🧹 清理容器和數據卷...${NC}"
        cd "$PROJECT_ROOT"
        $COMPOSE_CMD -f $COMPOSE_FILE down -v --remove-orphans
        echo -e "${GREEN}✅ 清理完成${NC}"
    else
        echo -e "${BLUE}ℹ️  操作已取消${NC}"
    fi
}

# 等待服務就緒
wait_for_services() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:7001/nginx-health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ NGINX 代理服務就緒${NC}"
            break
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ 服務啟動超時${NC}"
        show_logs
        exit 1
    fi
}

# 測試服務
test_services() {
    echo -e "${BLUE}🧪 測試服務響應...${NC}"
    echo "========================================"
    
    # 測試 NGINX 健康檢查
    echo -n "NGINX 健康檢查: "
    if response=$(curl -s http://localhost:7001/nginx-health 2>/dev/null); then
        echo -e "${GREEN}✅ $response${NC}"
    else
        echo -e "${RED}❌ 失敗${NC}"
    fi
    
    # 測試前端
    echo -n "前端服務: "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:7001 | grep -q "200"; then
        echo -e "${GREEN}✅ 響應正常${NC}"
    else
        echo -e "${RED}❌ 響應異常${NC}"
    fi
    
    # 測試後端 API
    echo -n "後端 API: "
    if response=$(curl -s http://localhost:7001/api/health 2>/dev/null); then
        if echo "$response" | grep -q '"status":"healthy"'; then
            echo -e "${GREEN}✅ 響應正常${NC}"
            echo "  $response"
        else
            echo -e "${RED}❌ 響應異常${NC}"
        fi
    else
        echo -e "${RED}❌ 無法連接${NC}"
    fi
}

# 主邏輯
main() {
    check_container_engine
    
    case "${1:-help}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        logs-nginx)
            show_logs nginx
            ;;
        logs-backend)
            show_logs backend
            ;;
        logs-frontend)
            show_logs frontend
            ;;
        shell)
            enter_shell
            ;;
        status)
            show_status
            ;;
        build)
            rebuild
            ;;
        clean)
            clean_all
            ;;
        test)
            test_services
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
