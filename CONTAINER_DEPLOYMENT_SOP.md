# MemoryArk 容器部署標準作業程序 (SOP)

## 🎯 目標
確保容器部署一致性，避免映像更新、網路通訊等常見問題。

## 📋 完整重新部署流程

### 1️⃣ **徹底清理 (Clean Slate)**
```bash
# 停止所有服務
podman-compose down

# 移除所有容器（保留資料）
podman rm -f $(podman ps -aq --filter="label=com.docker.compose.project=memoryark2") 2>/dev/null || true

# 清理無用映像（可選）
podman image prune -f
```

### 2️⃣ **重建映像 (強制更新)**
```bash
# LINE Service (重要：每次程式碼修改後必須執行)
cd /home/davidliou/MyProject/MemoryArk2/line-service
podman build --no-cache -t memoryark-line-service:latest .

# Backend (如有修改)
cd /home/davidliou/MyProject/MemoryArk2
podman build --no-cache -t memoryark-backend:latest .
```

### 3️⃣ **確認映像更新**
```bash
# 檢查映像建立時間
podman images | grep -E "(memoryark-line-service|memoryark-backend)"

# 映像應該顯示 "seconds ago" 或 "minutes ago"
```

### 4️⃣ **重新部署服務**
```bash
cd /home/davidliou/MyProject/MemoryArk2

# 依序啟動（避免依賴問題）
podman-compose up -d redis backend
sleep 10

podman-compose up -d line-service
sleep 10

podman-compose up -d nginx line-nginx
```

### 5️⃣ **驗證部署**
```bash
# 檢查所有容器狀態
podman ps

# 檢查健康狀態
curl http://localhost:7001/api/health
curl http://localhost:7002/health
curl https://line.94work.net/health

# 檢查容器內部版本
podman exec memoryark-line-service cat /app/package.json | grep version
```

## 🔧 快速修復常見問題

### **問題1: nginx 502 錯誤**
```bash
# 解決方案：重啟 nginx（DNS 快取問題）
podman restart memoryark-nginx memoryark-line-nginx
```

### **問題2: 容器使用舊映像**
```bash
# 確認目前容器映像 ID
podman inspect memoryark-line-service | jq -r '.[0].Image'

# 確認最新映像 ID  
podman images | grep memoryark-line-service

# 如果 ID 不同，執行完整重新部署流程
```

### **問題3: 網路通訊問題**
```bash
# 檢查容器網路
podman network ls
podman network inspect memoryark2_memoryark

# 檢查服務間通訊
podman exec memoryark-line-service curl http://memoryark-backend:8081/api/health
```

## 🚨 LINE Service 專用 SOP

### **程式碼修改後必須執行**
```bash
# 1. 編譯檢查（在 line-service 目錄）
cd /home/davidliou/MyProject/MemoryArk2/line-service
npm run build

# 2. 強制重建映像
podman build --no-cache -t memoryark-line-service:latest .

# 3. 完全移除舊容器
podman stop memoryark-line-service memoryark-line-nginx
podman rm memoryark-line-service memoryark-line-nginx

# 4. 重新部署
cd /home/davidliou/MyProject/MemoryArk2
podman-compose up -d line-service line-nginx

# 5. 驗證新版本生效
sleep 10
podman exec memoryark-line-service grep -A 3 "Invalid LINE signature" /app/dist/middleware/lineWebhook.js
```

## 📊 部署檢查清單

### ✅ 部署前檢查
- [ ] 程式碼已編譯 (`npm run build`)
- [ ] 資料庫檔案權限正確
- [ ] 日誌目錄權限正確 (`chmod 777 line-service/logs/`)
- [ ] 環境變數檔案存在 (`.env`)

### ✅ 部署後驗證
- [ ] 所有容器狀態為 `Up` 且 `healthy`
- [ ] 主系統健康檢查: `curl http://localhost:7001/api/health`
- [ ] LINE 系統健康檢查: `curl https://line.94work.net/health`
- [ ] 容器網路通訊: 內部 API 調用成功
- [ ] 日誌無異常錯誤

## 🎯 最佳實踐

1. **每次程式碼修改**：一律執行完整重新部署流程
2. **網路問題**：先重啟 nginx，再檢查容器 IP
3. **映像更新**：使用 `--no-cache` 確保徹底重建
4. **容器命名**：保持一致的命名規範
5. **日誌監控**：部署後持續監控 5-10 分鐘

## 📝 故障排除日誌

### 記錄範本
```
日期: 2025-06-26
問題: LINE Service 簽名驗證修改未生效
原因: 容器使用舊映像，編譯版本未更新
解決: 執行完整重新部署流程
時間: 15 分鐘
```

---

**遵循此 SOP 可避免 95% 的容器部署問題！**