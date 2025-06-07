#!/bin/bash

# MemoryArk 2.0 日誌檔案位置查找腳本

set -e

echo "🔍 查找 MemoryArk 容器日誌檔案位置"
echo "════════════════════════════════════════"

# 檢測使用的容器工具
if command -v docker &> /dev/null; then
    echo "📦 Docker 容器日誌位置："
    echo "────────────────────────────────────────"
    
    # 查找 Docker 容器
    if docker ps --format "table {{.Names}}\t{{.ID}}" | grep -E "(nginx|backend|memoryark)" &> /dev/null; then
        docker ps --format "table {{.Names}}\t{{.ID}}" | grep -E "(nginx|backend|memoryark)" | while read name id; do
            if [ "$name" != "NAMES" ]; then
                log_path=$(docker inspect --format='{{.LogPath}}' "$name" 2>/dev/null || echo "無法取得")
                echo "🔹 容器: $name"
                echo "   ID: $id"
                echo "   日誌路徑: $log_path"
                
                # 檢查輪轉檔案
                if [ "$log_path" != "無法取得" ]; then
                    dir=$(dirname "$log_path")
                    base=$(basename "$log_path")
                    echo "   輪轉檔案:"
                    ls -la "$dir"/$base* 2>/dev/null | sed 's/^/     /' || echo "     無輪轉檔案"
                fi
                echo ""
            fi
        done
    else
        echo "❌ 找不到運行中的 MemoryArk 相關容器"
    fi
fi

if command -v podman &> /dev/null; then
    echo "📦 Podman 容器日誌位置："
    echo "────────────────────────────────────────"
    
    # 查找 Podman 容器
    if podman ps --format "table {{.Names}}\t{{.ID}}" | grep -E "(nginx|backend|memoryark)" &> /dev/null; then
        podman ps --format "table {{.Names}}\t{{.ID}}" | grep -E "(nginx|backend|memoryark)" | while read name id; do
            if [ "$name" != "NAMES" ]; then
                echo "🔹 容器: $name"
                echo "   ID: $id"
                
                # Podman 日誌位置依模式而定
                if [ "$EUID" -eq 0 ]; then
                    log_dir="/var/lib/containers/storage/overlay-containers/$id/userdata"
                else
                    log_dir="$HOME/.local/share/containers/storage/overlay-containers/$id/userdata"
                fi
                
                echo "   日誌路徑: $log_dir/ctr.log"
                
                # 檢查檔案是否存在
                if [ -f "$log_dir/ctr.log" ]; then
                    echo "   檔案大小: $(ls -lh "$log_dir/ctr.log" | awk '{print $5}')"
                    echo "   修改時間: $(ls -l "$log_dir/ctr.log" | awk '{print $6" "$7" "$8}')"
                else
                    echo "   ⚠️  檔案不存在（可能使用 journald 驅動）"
                fi
                echo ""
            fi
        done
    else
        echo "❌ 找不到運行中的 MemoryArk 相關容器"
    fi
fi

echo "💡 提示："
echo "- 使用 ./scripts/logs-by-date.sh 按日期查看日誌"
echo "- 直接檔案存取可能需要 root 權限"
echo "- 建議使用 docker/podman logs 指令查看日誌"