# Task 1.3: SSL 憑證與域名設定

## 📋 任務描述

設定 HTTPS 憑證和配置 Webhook URL，確保 LINE 平台可以正確呼叫我們的服務。

**預估時間**：0.5 天  
**難度**：中等  
**責任者**：系統管理員

## 🎯 具體步驟

### Step 1: 域名準備 (0.1 天)

#### 1.1 確認域名配置
```bash
# 使用現有域名：files.94work.net
# 確認 DNS A 記錄指向正確的伺服器 IP

# 測試域名解析
nslookup files.94work.net
dig files.94work.net A
```

#### 1.2 記錄域名資訊
- [ ] **主域名**: 94work.net
- [ ] **子域名**: files.94work.net
- [ ] **伺服器 IP**: [您的伺服器 IP] (Cloudflare)
- [ ] **DNS 提供商**: Cloudflare

✅ **現狀確認**: `files.94work.net` 是 MemoryArk2 的主網站，使用 Cloudflare Tunnel + Access 保護。

**LINE Webhook 解決方案**:
**建立新子域名** - 專門給 LINE Webhook 使用，無需 Cloudflare Access 驗證
- 建議域名: `line.94work.net` 或 `webhook.94work.net`
- 使用 Cloudflare Tunnel 代理到同一台伺服器
- 不啟用 Cloudflare Access (公開訪問 Webhook 端點)

### Step 2: Cloudflare 子域名設定 (0.2 天)

#### 2.1 建立新子域名
在 Cloudflare Dashboard 中：
```
1. 前往 DNS 設定
2. 新增 A 記錄或 CNAME：
   - 名稱: line (變成 line.94work.net)
   - 目標: 指向同一台伺服器或 CNAME 到 files.94work.net
   - Proxy 狀態: 啟用 (橘色雲朵)
```

#### 2.2 Cloudflare Tunnel 設定
在 Cloudflare Zero Trust 中：
```
1. 編輯現有的 Tunnel 設定
2. 新增 Public Hostname：
   - Subdomain: [您選擇的子域名，如: line, webhook, bot 等]
   - Domain: 94work.net
   - Service: http://localhost:7002 (指向 LINE 專用 Nginx)
   - 不啟用 Access Policy (公開訪問)
```

### Step 3: 整合到現有 MemoryArk 架構 (0.2 天)

#### 3.1 更新後的安全架構
新的雙 Nginx 隔離架構：
```
Cloudflare Tunnel
├── files.94work.net → Main Nginx (port 7001) → Frontend + Backend
└── [您的子域名].94work.net → LINE Nginx (port 7002) → LINE Service

容器架構:
┌─────────────────┐    ┌─────────────────┐
│   Main Nginx    │    │   LINE Nginx    │  
│   Port: 7001    │    │   Port: 7002    │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│    Backend      │    │  LINE Service   │
│   Port: 8081    │◄───┤   Port: 3000    │
└─────────────────┘    └─────────────────┘
```

#### 3.2 更新 docker-compose.yml
在現有 docker-compose.yml 中新增 LINE Service 和專用 Nginx：

```yaml
# 在 services 區塊新增
  line-service:
    build: ./line-service
    container_name: memoryark-line-service
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - MEMORYARK_API_URL=http://memoryark-backend:8081
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./logs/line-service:/app/logs
    networks:
      - memoryark
    depends_on:
      - backend
    restart: unless-stopped
    # 不對外暴露端口，只內部訪問

  # LINE 專用 Nginx 代理
  line-nginx:
    image: nginx:alpine
    container_name: memoryark-line-nginx
    depends_on:
      - line-service
    ports:
      - "7002:80"
    volumes:
      - ./line-nginx.conf:/etc/nginx/conf.d/default.conf
      - ./logs/line-nginx:/var/log/nginx
    networks:
      - memoryark
    restart: unless-stopped
    
    # 日誌配置
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "7"
```

#### 3.3 建立 LINE 專用 Nginx 配置
建立 `line-nginx.conf` 檔案：

```nginx
# LINE 服務專用 Nginx 配置
server {
    listen 80;
    server_name _;
    
    # 安全配置
    client_max_body_size 10M;
    client_body_timeout 30s;
    client_header_timeout 30s;
    send_timeout 30s;
    
    # 只允許必要的 HTTP 方法
    if ($request_method !~ ^(GET|POST|HEAD)$ ) {
        return 405;
    }
    
    # LINE Webhook 端點 (主要入口)
    location /webhook/line {
        # 只允許 POST 方法
        if ($request_method != POST) {
            return 405;
        }
        
        proxy_pass http://memoryark-line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # LINE Webhook 特殊配置
        proxy_set_header X-Line-Signature $http_x_line_signature;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        
        # Cloudflare Tunnel 相容性
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header CF-Connecting-IP $remote_addr;
        
        # 安全標頭
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Content-Type-Options nosniff;
        proxy_set_header X-Frame-Options DENY;
    }
    
    # 健康檢查端點
    location /health {
        proxy_pass http://memoryark-line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 管理 API (需要認證，由 LINE Service 處理)
    location /api/line {
        proxy_pass http://memoryark-line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # 拒絕所有其他路徑
    location / {
        return 404;
    }
    
    # 隱藏 Nginx 版本
    server_tokens off;
    
    # 日誌格式 (專門針對 LINE 服務)
    access_log /var/log/nginx/line-access.log combined;
    error_log /var/log/nginx/line-error.log warn;
}
```

**安全優勢**：
1. **完全隔離** - 獨立的 Nginx 實例和端口
2. **最小暴露** - 只暴露必要的端點
3. **嚴格過濾** - 只允許必要的 HTTP 方法
4. **獨立監控** - 專屬的日誌和監控
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # 安全標頭
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # 日誌配置
    access_log /var/log/nginx/line-service.access.log;
    error_log /var/log/nginx/line-service.error.log;
    
    # 健康檢查端點
    location /health {
        proxy_pass http://line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # LINE Webhook 端點
    location /webhook/line {
        proxy_pass http://line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # LINE Webhook 特殊設定
        proxy_set_header X-Line-Signature $http_x_line_signature;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        
        # 只允許 LINE 平台的 IP
        # 可選：實際部署時可以限制來源 IP
        # allow 147.92.0.0/16;
        # deny all;
    }
    
    # 其他 API 端點
    location /api/ {
        proxy_pass http://line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 預設拒絕其他請求
    location / {
        return 404;
    }
}
```

#### 3.2 啟用配置
```bash
# 啟用站點
sudo ln -s /etc/nginx/sites-available/line-service.conf /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重新載入 Nginx
sudo systemctl reload nginx
```

### Step 4: 更新容器配置 (0.1 天)

#### 4.1 更新 docker-compose.yml
```yaml
# 在主要的 docker-compose.yml 中添加
services:
  line-service:
    build: ./line-service
    container_name: memoryark-line-service
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - MEMORYARK_API_URL=http://backend:8081
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./data:/data
      - ./uploads:/uploads
      - ./logs/line-service:/app/logs
    networks:
      - memoryark-network
    depends_on:
      - backend
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  memoryark-network:
    external: true
```

## ✅ 驗收標準

### SSL 憑證驗證
```bash
# 測試子域名 SSL 連接 (請替換為您實際的子域名)
curl -I https://[您的子域名].94work.net/webhook/line

# 測試 Webhook 端點 (建立後)
curl -X POST https://[您的子域名].94work.net/webhook/line \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# 檢查 Cloudflare Tunnel 狀態
# (在 Cloudflare Dashboard 中查看)
```

### 網站可用性測試
- [ ] `https://[您的子域名].94work.net/webhook/line` 可正常訪問
- [ ] HTTP 自動重定向到 HTTPS
- [ ] Cloudflare SSL 憑證正常 (自動管理)
- [ ] Tunnel 連接狀態正常
- [ ] 不受 Cloudflare Access 保護限制

### 安全性檢查
```bash
# 使用 SSL Labs 測試
# https://www.ssllabs.com/ssltest/analyze.html?d=line.memoryark.net

# 檢查安全標頭
curl -I https://line.memoryark.net/health | grep -i "strict-transport-security"
```

### 容器整合測試
- [ ] 容器可以正常啟動
- [ ] Nginx 反向代理正常運作
- [ ] 健康檢查端點可訪問
- [ ] 日誌檔案正常生成

## 🚨 注意事項

### 安全性
- 定期更新 SSL 憑證（Let's Encrypt 90 天有效期）
- 設定自動更新機制
- 限制來源 IP（可選）
- 啟用 HSTS 安全標頭

### 自動更新憑證
```bash
# 設定 crontab 自動更新
sudo crontab -e

# 每月 1 號凌晨 2 點檢查並更新憑證
0 2 1 * * /usr/bin/certbot renew --quiet && /usr/bin/systemctl reload nginx
```

### 監控設定
```bash
# 設定憑證到期監控
# 可以使用 Nagios, Zabbix 或其他監控工具
```

## 📊 測試清單

### 基本功能測試
- [ ] HTTP 重定向到 HTTPS
- [ ] SSL 憑證有效
- [ ] 健康檢查端點正常
- [ ] Webhook 端點可訪問

### 效能測試
- [ ] 回應時間 < 1 秒
- [ ] 同時連接數支援 > 100
- [ ] CPU 使用率 < 50%

### 安全測試
- [ ] SSL 評級 A 級以上
- [ ] 沒有安全漏洞
- [ ] 防火牆設定正確

## 📞 故障排除

### 常見問題
1. **憑證申請失敗**
   ```bash
   # 檢查域名 DNS 設定
   # 確認防火牆開放 80/443 端口
   # 檢查 Nginx 配置語法
   ```

2. **反向代理不通**
   ```bash
   # 檢查容器網路連接
   docker network ls
   docker network inspect memoryark-network
   ```

3. **SSL 憑證過期**
   ```bash
   # 手動更新憑證
   sudo certbot renew --force-renewal
   sudo systemctl reload nginx
   ```

---

**狀態**：⏳ 待開始  
**指派給**：待分配  
**前置任務**：Task 1.2 (開發環境準備)  
**檢查者**：系統管理員