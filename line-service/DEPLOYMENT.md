# LINE Service 容器化部署指南

## 📋 概述

本文檔說明如何部署 LINE Service 到 MemoryArk2 系統中，包含完整的容器化配置和安全設定。

## 🏗️ 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                    MemoryArk2 + LINE 整合架構                │
├─────────────────────────────────────────────────────────────┤
│  外部存取                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Port 7001       │    │ Port 7002       │                │
│  │ MemoryArk 前端   │    │ LINE Webhook    │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ nginx           │    │ line-nginx      │                │
│  │ (主服務)         │    │ (LINE 專用)      │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ backend         │    │ line-service    │                │
│  │ (Go + SQLite)   │    │ (Node.js + TS)  │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           └───────────┬───────────┘                         │
│                       ▼                                     │
│           ┌─────────────────┐    ┌─────────────────┐        │
│           │ 共享儲存         │    │ Redis 隊列       │        │
│           │ - SQLite DB     │    │ (任務處理)       │        │
│           │ - 檔案上傳       │    └─────────────────┘        │
│           └─────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速開始

### 1. 前置需求

- Docker 或 Podman 已安裝
- Docker Compose 或 Podman Compose
- LINE Developer 帳號和 Bot 憑證
- 網域和 SSL 憑證 (生產環境)

### 2. 環境配置

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯環境變數
nano .env
```

**必須設定的變數**：
```bash
# LINE Bot 憑證
LINE_CHANNEL_ACCESS_TOKEN=your-actual-token
LINE_CHANNEL_SECRET=your-actual-secret

# 管理員設定
ROOT_ADMIN_EMAIL=your-admin@email.com

# 安全金鑰 (生產環境請更改)
JWT_SECRET=your-secure-jwt-secret
MEMORYARK_API_KEY=your-internal-api-key
```

### 3. 建構和部署

```bash
# 建構 MemoryArk 前端 (如果有變更)
docker-compose --profile build up frontend-builder

# 建構並啟動所有服務
docker-compose up -d

# 檢查服務狀態
docker-compose ps

# 查看 LINE Service 日誌
docker-compose logs -f line-service
```

### 4. 驗證部署

```bash
# 檢查健康狀態
curl http://localhost:7001/api/health  # MemoryArk 主服務
curl http://localhost:7002/health      # LINE Service

# 執行安全檢查
./line-service/scripts/security-check.sh
```

## 🔧 服務配置詳細說明

### LINE Service

- **映像檔**: `memoryark-line-service:latest`
- **內部端口**: 3000
- **外部存取**: 通過 port 7002 (line-nginx)
- **健康檢查**: `/health` 端點
- **日誌**: `./line-service/logs/`

### LINE Nginx

- **映像檔**: `nginx:alpine`
- **端口**: 7002
- **配置檔**: `./line-nginx.conf`
- **日誌**: `./logs/nginx/`

### Redis

- **映像檔**: `redis:7-alpine`
- **端口**: 6379
- **持久化**: AOF (appendonly)
- **資料**: `redis-data` volume

## 🔒 安全配置

### 網路隔離

- 所有服務運行在專用的 `memoryark` 網路中
- LINE Service 只能被 line-nginx 存取
- 外部無法直接存取內部服務

### 容器安全

- LINE Service 以非 root 用戶 (`lineservice`) 運行
- 檔案系統權限嚴格控制
- 敏感資料透過環境變數管理

### SSL/TLS

生產環境建議配置 SSL：

```bash
# 在 line-nginx.conf 中加入 SSL 配置
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... 其他配置
}
```

## 📊 監控和維護

### 健康檢查

所有服務都配置了健康檢查：

```bash
# 檢查所有服務健康狀態
docker-compose ps

# 檢查特定服務
docker inspect --format='{{.State.Health.Status}}' memoryark-line-service
```

### 日誌管理

```bash
# 查看 LINE Service 日誌
docker-compose logs line-service

# 查看 Nginx 日誌
docker-compose logs line-nginx

# 實時監控
docker-compose logs -f --tail=100 line-service
```

### 資料備份

```bash
# 停止服務
docker-compose stop

# 備份重要資料
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/ logs/

# 重新啟動
docker-compose up -d
```

## 🔄 更新和升級

### 更新 LINE Service

```bash
# 拉取最新程式碼
git pull

# 重新建構 LINE Service
docker-compose build line-service

# 重新啟動服務
docker-compose up -d line-service
```

### 升級整個系統

```bash
# 停止所有服務
docker-compose down

# 備份資料
./scripts/backup.sh

# 拉取更新
git pull

# 重新建構和啟動
docker-compose up -d --build
```

## 🐛 故障排除

### 常見問題

1. **LINE Service 無法啟動**
   ```bash
   # 檢查環境變數
   docker-compose config
   
   # 檢查建構日誌
   docker-compose build line-service
   ```

2. **無法連接到 Redis**
   ```bash
   # 檢查 Redis 狀態
   docker-compose logs redis
   
   # 測試連接
   docker exec memoryark-redis redis-cli ping
   ```

3. **Webhook 接收失敗**
   ```bash
   # 檢查 Nginx 配置
   docker exec memoryark-line-nginx nginx -t
   
   # 檢查 LINE 設定
   curl -X POST http://localhost:7002/webhook/line \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### 除錯模式

```bash
# 啟用除錯日誌
export LINE_LOG_LEVEL=debug
docker-compose up -d line-service

# 進入容器除錯
docker exec -it memoryark-line-service sh
```

## 📞 支援和聯繫

- **GitHub Issues**: 回報問題和功能請求
- **文檔**: 查看 `line_docs/` 目錄
- **日誌分析**: 使用 `scripts/analyze-logs.sh`

---

**最後更新**: 2024-06-24  
**版本**: 1.0  
**適用系統**: MemoryArk2 + LINE Service