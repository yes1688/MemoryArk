# MemoryArk 2.0 部署指南

本文檔詳細說明如何在生產環境中部署 MemoryArk 2.0。

## 目錄

- [系統需求](#系統需求)
- [Podman 部署](#podman-部署)
- [Nginx 配置](#nginx-配置)
- [Cloudflare Access 設置](#cloudflare-access-設置)
- [SSL 證書配置](#ssl-證書配置)
- [備份策略](#備份策略)
- [監控和日誌](#監控和日誌)
- [故障排除](#故障排除)

## 系統需求

### 硬體需求
- **CPU**: 2 核心或以上
- **RAM**: 4GB 或以上
- **儲存**: 50GB 或以上（根據媒體文件需求調整）
- **網路**: 穩定的網際網路連接

### 軟體需求
- **作業系統**: Linux (Ubuntu 20.04+ / CentOS 8+ / RHEL 8+)
- **Podman**: 4.0 或以上
- **Nginx**: 1.18 或以上
- **Git**: 2.25 或以上

## Podman 部署

### 1. 準備部署文件

```bash
# 克隆專案
git clone <repository-url>
cd MemoryArk2

# 創建必要的目錄
sudo mkdir -p /opt/memoryark2/{data,uploads,logs,backups}
sudo chown -R $USER:$USER /opt/memoryark2
```

### 2. 配置環境變量

```bash
# 複製並編輯環境配置
cp backend/.env.example /opt/memoryark2/.env
nano /opt/memoryark2/.env
```

重要配置項：
```env
APP_ENV=production
PORT=7001
DB_PATH=/app/data/memoryark.db
UPLOAD_PATH=/app/uploads
JWT_SECRET=your-production-jwt-secret-here
CLOUDFLARE_DOMAIN=your-domain.com
CLOUDFLARE_AUD=your-cloudflare-audience-tag
```

### 3. 構建容器映像

```bash
# 構建映像
podman build -t memoryark2:latest .

# 或使用預構建映像（如果可用）
# podman pull ghcr.io/your-org/memoryark2:latest
```

### 4. 運行容器

```bash
# 創建 Podman 網路（可選）
podman network create memoryark-network

# 運行容器
podman run -d \
  --name memoryark2 \
  --network memoryark-network \
  -p 127.0.0.1:7001:7001 \
  -v /opt/memoryark2/data:/app/data \
  -v /opt/memoryark2/uploads:/app/uploads \
  -v /opt/memoryark2/logs:/app/logs \
  -v /opt/memoryark2/.env:/app/.env:ro \
  --restart unless-stopped \
  memoryark2:latest
```

### 5. 設置系統服務

創建 systemd 服務文件：

```bash
sudo nano /etc/systemd/system/memoryark2.service
```

```ini
[Unit]
Description=MemoryArk 2.0 Container
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
ExecStart=/usr/bin/podman start memoryark2
ExecStop=/usr/bin/podman stop memoryark2
PIDFile=/run/containers/storage/overlay-containers/%i/userdata/conmon.pid
KillMode=none
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

啟用服務：
```bash
sudo systemctl daemon-reload
sudo systemctl enable memoryark2
sudo systemctl start memoryark2
```

## Nginx 配置

### 1. 安裝 Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
# 或
sudo dnf install nginx
```

### 2. 配置虛擬主機

創建配置文件：
```bash
sudo nano /etc/nginx/sites-available/memoryark2
```

```nginx
# /etc/nginx/sites-available/memoryark2

upstream memoryark2_backend {
    server 127.0.0.1:7001;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全標頭
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 文件上傳大小限制
    client_max_body_size 100M;
    
    # 靜態文件處理
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri $uri/ @proxy;
    }
    
    # API 路由
    location /api/ {
        proxy_pass http://memoryark2_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # 文件上傳路由
    location /uploads/ {
        proxy_pass http://memoryark2_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # 默認路由（SPA 支持）
    location / {
        proxy_pass http://memoryark2_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SPA 回退
        try_files $uri $uri/ @proxy;
    }
    
    location @proxy {
        proxy_pass http://memoryark2_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康檢查
    location /health {
        access_log off;
        proxy_pass http://memoryark2_backend;
    }
}
```

### 3. 啟用配置

```bash
# 啟用網站配置
sudo ln -s /etc/nginx/sites-available/memoryark2 /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重載 Nginx
sudo systemctl reload nginx
```

## Cloudflare Access 設置

### 1. 創建 Cloudflare Access 應用程序

1. 登入 Cloudflare Dashboard
2. 選擇您的域名
3. 轉到 **Access** > **Applications**
4. 點擊 **Add an application**
5. 選擇 **Self-hosted**

### 2. 配置應用程序設置

**Application Configuration:**
- Application name: `MemoryArk 2.0`
- Application domain: `your-domain.com`
- Session duration: `24 hours`

**Authentication:**
- Add identity provider: **Google**
- Configure allowed users/groups

### 3. 創建訪問策略

```json
{
  "name": "MemoryArk Users",
  "decision": "allow",
  "rules": [
    {
      "emails": ["user1@church.org", "user2@church.org"],
      "groups": ["church-members"]
    }
  ]
}
```

### 4. 獲取配置信息

從 Cloudflare Access 獲取以下信息並更新 `.env` 文件：
- `CLOUDFLARE_DOMAIN`
- `CLOUDFLARE_AUD`
- `CLOUDFLARE_CERT_URL`

## SSL 證書配置

### 使用 Let's Encrypt

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 獲取證書
sudo certbot --nginx -d your-domain.com

# 設置自動更新
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## 備份策略

### 1. 數據庫備份

```bash
#!/bin/bash
# /opt/memoryark2/scripts/backup-db.sh

BACKUP_DIR="/opt/memoryark2/backups"
DB_PATH="/opt/memoryark2/data/memoryark.db"
DATE=$(date +%Y%m%d_%H%M%S)

# 創建備份
sqlite3 $DB_PATH ".backup $BACKUP_DIR/memoryark_$DATE.db"

# 壓縮備份
gzip "$BACKUP_DIR/memoryark_$DATE.db"

# 清理舊備份（保留 30 天）
find $BACKUP_DIR -name "memoryark_*.db.gz" -mtime +30 -delete
```

### 2. 文件備份

```bash
#!/bin/bash
# /opt/memoryark2/scripts/backup-files.sh

BACKUP_DIR="/opt/memoryark2/backups"
UPLOAD_DIR="/opt/memoryark2/uploads"
DATE=$(date +%Y%m%d_%H%M%S)

# 創建上傳文件備份
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$UPLOAD_DIR" .

# 清理舊備份
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete
```

### 3. 自動備份 Cron 作業

```bash
sudo crontab -e
```

```cron
# 每日凌晨 2 點備份數據庫
0 2 * * * /opt/memoryark2/scripts/backup-db.sh

# 每週日凌晨 3 點備份文件
0 3 * * 0 /opt/memoryark2/scripts/backup-files.sh
```

## 監控和日誌

### 1. 應用程序日誌

```bash
# 查看容器日誌
podman logs memoryark2

# 持續監控日誌
podman logs -f memoryark2

# 查看應用日誌文件
tail -f /opt/memoryark2/logs/app.log
```

### 2. 系統監控

安裝監控工具：
```bash
# 安裝 htop 和 iotop
sudo apt install htop iotop

# 安裝 disk usage analyzer
sudo apt install ncdu
```

### 3. 日誌輪轉

創建日誌輪轉配置：
```bash
sudo nano /etc/logrotate.d/memoryark2
```

```
/opt/memoryark2/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        podman kill -s USR1 memoryark2 || true
    endscript
}
```

## 故障排除

### 常見問題

1. **容器無法啟動**
   ```bash
   # 檢查容器狀態
   podman ps -a
   
   # 檢查日誌
   podman logs memoryark2
   
   # 檢查磁碟空間
   df -h
   ```

2. **Nginx 502 錯誤**
   ```bash
   # 檢查後端服務
   curl http://localhost:7001/health
   
   # 檢查 Nginx 配置
   sudo nginx -t
   
   # 檢查 Nginx 日誌
   sudo tail -f /var/log/nginx/error.log
   ```

3. **文件上傳失敗**
   ```bash
   # 檢查磁碟空間
   df -h /opt/memoryark2/uploads
   
   # 檢查權限
   ls -la /opt/memoryark2/uploads
   
   # 檢查 Nginx 配置中的文件大小限制
   ```

### 性能優化

1. **數據庫優化**
   ```sql
   -- 定期執行 VACUUM
   VACUUM;
   
   -- 分析查詢計劃
   EXPLAIN QUERY PLAN SELECT ...;
   ```

2. **Nginx 緩存**
   ```nginx
   # 在 http 區塊添加
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=memoryark_cache:10m max_size=1g inactive=60m use_temp_path=off;
   
   # 在 server 區塊添加
   location /api/ {
       proxy_cache memoryark_cache;
       proxy_cache_valid 200 5m;
       proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;
       # ... 其他配置
   }
   ```

3. **容器資源限制**
   ```bash
   # 運行容器時添加資源限制
   podman run -d \
     --name memoryark2 \
     --memory=2g \
     --cpus=2 \
     # ... 其他參數
   ```

## 更新部署

```bash
# 拉取最新代碼
git pull origin main

# 重新構建映像
podman build -t memoryark2:latest .

# 停止並移除舊容器
podman stop memoryark2
podman rm memoryark2

# 運行新容器
podman run -d \
  --name memoryark2 \
  # ... 相同的參數
```

## 安全考慮

1. **防火牆配置**
   ```bash
   # 僅允許必要端口
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **定期安全更新**
   ```bash
   # 系統更新
   sudo apt update && sudo apt upgrade

   # 容器映像更新
   podman pull memoryark2:latest
   ```

3. **監控異常活動**
   ```bash
   # 檢查失敗的登入嘗試
   sudo grep "Failed password" /var/log/auth.log

   # 監控網路連接
   sudo netstat -tulpn
   ```

如需更多幫助，請參考 [故障排除指南](troubleshooting.md) 或聯繫技術支援團隊。
