# 部署指南

本文檔說明如何在生產環境中部署 MemoryArk 2.0。

## 🎯 部署概述

MemoryArk 2.0 採用容器化架構，支援 Docker 和 Podman 部署：

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   用戶請求       │───▶│    Nginx     │───▶│   後端服務       │
│  (port 7001)    │    │   (反向代理)  │    │  (Go + SQLite)  │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## 📋 系統需求

### 最低需求
- **作業系統**：Linux (推薦 Ubuntu 20.04+, CentOS 8+)
- **容器引擎**：Docker 20.0+ 或 Podman 4.0+
- **記憶體**：2GB RAM
- **儲存空間**：10GB（依使用量調整）
- **網路**：開放 7001 端口

### 推薦配置
- **記憶體**：4GB+ RAM
- **CPU**：2+ 核心
- **儲存空間**：50GB+ SSD

## 🚀 快速部署

### 1. 準備環境

```bash
# 克隆專案
git clone <repository-url>
cd MemoryArk2

# 確認容器引擎可用
docker --version
# 或
podman --version
```

### 2. 配置環境變數

```bash
# 複製環境變數範例
cp .env.example .env

# 編輯配置
nano .env
```

**重要配置項目**：

```bash
# JWT 認證密鑰（必須設定）
JWT_SECRET=$(openssl rand -hex 32)

# 根管理員設定
ROOT_ADMIN_EMAIL=admin@yourchurch.org
ROOT_ADMIN_NAME=系統管理員

# Cloudflare Access（可選）
CLOUDFLARE_ENABLED=false
```

### 3. 啟動服務

```bash
# 使用 Docker
docker-compose up -d

# 或使用 Podman
podman-compose up -d
```

### 4. 驗證部署

```bash
# 檢查容器狀態
docker-compose ps
# 或
podman-compose ps

# 檢查服務健康狀態
curl http://localhost:7001/api/health
```

## 🔧 詳細配置

### 環境變數說明

| 變數名稱 | 說明 | 預設值 | 必須 |
|---------|------|--------|------|
| `JWT_SECRET` | JWT 認證密鑰 | - | ✅ |
| `ROOT_ADMIN_EMAIL` | 根管理員信箱 | - | ✅ |
| `ROOT_ADMIN_NAME` | 根管理員名稱 | 系統管理員 | ❌ |
| `CLOUDFLARE_ENABLED` | Cloudflare Access | false | ❌ |

### 容器配置

#### 後端容器
- **映像**：基於 Go 1.22 Alpine
- **端口**：8080（內部）
- **資料持久化**：
  - `./data` → `/app/data`（資料庫）
  - `./uploads` → `/app/uploads`（檔案）
  - `./logs` → `/app/logs`（日誌）

#### Nginx 容器
- **映像**：nginx:alpine
- **端口**：7001（對外）→ 80（內部）
- **功能**：
  - 靜態檔案服務
  - API 請求代理
  - 檔案上傳處理

### 目錄結構

```
MemoryArk2/
├── data/                    # 資料庫檔案（持久化）
│   └── memoryark.db
├── uploads/                 # 上傳檔案（持久化）
├── logs/                    # 應用程式日誌（持久化）
├── frontend/dist/           # 前端靜態檔案
├── docker-compose.yml       # 容器編排配置
├── Dockerfile              # 後端容器建構
├── nginx.conf              # Nginx 配置
└── .env                    # 環境變數配置
```

## 🔒 安全考量

### 檔案權限

```bash
# 設定適當的目錄權限
chmod 755 data uploads logs
chown -R 1000:1000 data uploads logs
```

### 防火牆設定

```bash
# Ubuntu/Debian
sudo ufw allow 7001/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=7001/tcp
sudo firewall-cmd --reload
```

### SSL/TLS 配置

如需 HTTPS，建議使用反向代理（如 Cloudflare）或更新 Nginx 配置：

```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 其他配置...
}
```

## 📊 監控和維護

### 日誌查看

```bash
# 查看容器日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 資料備份

```bash
# 備份資料庫
cp data/memoryark.db backup/memoryark_$(date +%Y%m%d).db

# 備份上傳檔案
tar -czf backup/uploads_$(date +%Y%m%d).tar.gz uploads/
```

### 更新部署

```bash
# 拉取最新代碼
git pull

# 重建並重啟服務
docker-compose down
docker-compose build
docker-compose up -d
```

## 🐛 故障排除

### 常見問題

1. **端口被占用**
   ```bash
   # 檢查端口使用情況
   sudo netstat -tlnp | grep 7001
   
   # 或使用其他端口
   sed -i 's/7001:80/8001:80/' docker-compose.yml
   ```

2. **權限問題**
   ```bash
   # 修復目錄權限
   sudo chown -R $(id -u):$(id -g) data uploads logs
   ```

3. **容器無法啟動**
   ```bash
   # 檢查容器日誌
   docker-compose logs backend
   
   # 檢查環境變數
   docker-compose config
   ```

### 效能調優

1. **增加檔案上傳限制**
   ```nginx
   # 在 nginx.conf 中增加
   client_max_body_size 500M;
   ```

2. **資料庫優化**
   ```bash
   # SQLite 效能調優（在後端配置中）
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=NORMAL;
   ```

## 📞 支援

如遇到部署問題：

1. 檢查 [故障排除](#-故障排除) 章節
2. 查看容器日誌
3. 提交 [Issue](../../issues/new) 並附上：
   - 系統環境資訊
   - 錯誤日誌
   - 部署步驟

---

*確保在生產環境中定期備份資料 🔒*