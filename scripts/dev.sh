#!/bin/bash

# 開發環境啟動腳本

case "$1" in
    start)
        echo "啟動開發環境..."
        
        # 啟動後端
        echo "啟動後端服務..."
        cd backend && go run ./cmd/server &
        BACKEND_PID=$!
        
        # 啟動前端
        echo "啟動前端服務..."
        cd ../frontend && npm run dev &
        FRONTEND_PID=$!
        
        echo "後端 PID: $BACKEND_PID"
        echo "前端 PID: $FRONTEND_PID"
        echo "開發環境已啟動"
        ;;
        
    stop)
        echo "停止開發環境..."
        pkill -f "go run ./cmd/server"
        pkill -f "npm run dev"
        echo "開發環境已停止"
        ;;
        
    *)
        echo "使用方式: $0 {start|stop}"
        exit 1
        ;;
esac