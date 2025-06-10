#!/bin/bash

# MemoryArk 2.0 系統監控腳本

check_service_health() {
    local service_status=$(systemctl --user is-active memoryark)
    echo "服務狀態: $service_status"
    
    if [ "$service_status" != "active" ]; then
        echo "警告: MemoryArk 服務未運行"
        return 1
    fi
}

check_container_health() {
    local backend_status=$(podman healthcheck run memoryark_backend_1 2>/dev/null || echo "unhealthy")
    echo "後端健康狀態: $backend_status"
    
    local nginx_running=$(podman ps --filter "name=memoryark_nginx" --format "{{.Status}}" | grep -c "Up")
    echo "Nginx 運行狀態: $([ $nginx_running -eq 1 ] && echo "running" || echo "stopped")"
}

check_disk_space() {
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    echo "磁碟使用率: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 85 ]; then
        echo "警告: 磁碟空間不足 (${disk_usage}%)"
        return 1
    fi
}

check_memory_usage() {
    local mem_usage=$(free | awk '/^Mem:/ {printf "%.1f", ($3/$2)*100}')
    echo "記憶體使用率: ${mem_usage}%"
    
    if [ "$(echo "$mem_usage > 90" | bc)" -eq 1 ]; then
        echo "警告: 記憶體使用率過高 (${mem_usage}%)"
        return 1
    fi
}

# 執行檢查
echo "=== MemoryArk 系統監控 $(date) ==="
check_service_health
check_container_health
check_disk_space
check_memory_usage
echo "========================================="
