#!/bin/bash

# MemoryArk 2.0 with NGINX Proxy Startup Script
# 帶有 NGINX 代理的啟動腳本

set -e

echo "🚀 Starting MemoryArk 2.0 with NGINX Proxy..."

# 創建必要的日誌目錄
mkdir -p /var/log/supervisor
mkdir -p /var/log/nginx

# 檢查 NGINX 配置
echo "🔍 Checking NGINX configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ NGINX configuration test failed!"
    exit 1
fi

echo "✅ NGINX configuration is valid"

# 初始化前端依賴（如果需要）
if [ ! -d "/app/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd /app/frontend && npm install
fi

# 初始化後端依賴
echo "📦 Installing backend dependencies..."
cd /app/backend && go mod download

# 設置後端環境變量
export PORT=8080

# 複製 supervisor 配置
cp /app/supervisord.conf /etc/supervisor/conf.d/memoryark.conf

echo "🎯 Starting all services via supervisor..."

# 啟動 supervisor 來管理所有服務
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
