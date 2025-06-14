# MemoryArk 2.0 部署指南

## 🚀 快速部署

### 本地開發環境
```bash
# 使用開發模式（自動登錄，CORS支持）
./deploy.sh up dev
```

### 生產環境（Synology NAS / 服務器）
```bash
# 使用生產模式
./deploy.sh up production
```

## 📋 常用命令

### 服務管理
```bash
./deploy.sh up          # 啟動服務（生產模式）
./deploy.sh down         # 停止服務
./deploy.sh restart      # 重啟服務
./deploy.sh status       # 檢查狀態
```

### 故障排除
```bash
./deploy.sh diagnose     # 診斷問題
./deploy.sh logs         # 查看實時日誌
```

## 🔧 手動部署

### Docker Compose
```bash
# 構建並啟動
docker-compose up -d

# 停止服務
docker-compose down

# 查看日誌
docker-compose logs -f
```

### Podman Compose
```bash
# 構建並啟動
podman-compose up -d

# 停止服務
podman-compose down
```

## 🌐 訪問地址

- **本地開發**: http://localhost:7001
- **生產環境**: https://files.kaiyuan100.app

## 🛠️ 故障排除

### 502 Bad Gateway 錯誤

1. **檢查容器狀態**
   ```bash
   ./deploy.sh status
   ```

2. **查看日誌**
   ```bash
   ./deploy.sh logs
   ```

3. **診斷網絡問題**
   ```bash
   ./deploy.sh diagnose
   ```

4. **重啟服務**
   ```bash
   ./deploy.sh restart
   ```

### 常見問題

**Q: 容器無法啟動？**
A: 檢查 Docker/Podman 是否正在運行，確保端口 7001 沒有被占用

**Q: 無法連接到後端？**
A: 確保容器在同一網絡中，檢查 nginx.conf 中的後端地址

**Q: 文件上傳失敗？**
A: 檢查 uploads 目錄權限，確保 nginx 配置支持大文件上傳

## 📁 目錄結構

```
MemoryArk2/
├── docker-compose.yml    # 統一部署配置
├── nginx.conf           # Nginx 配置
├── deploy.sh            # 部署腳本
├── data/               # 數據庫文件
├── uploads/            # 上傳文件
├── logs/               # 日誌文件
└── frontend/dist/      # 前端構建文件
```

## 🔐 環境變量

### 生產環境設置
```bash
export ROOT_ADMIN_EMAIL="your-email@domain.com"
export ROOT_ADMIN_NAME="Your Name"
export JWT_SECRET="your-secure-jwt-secret"
```

### 開發環境設置
```bash
export DEVELOPMENT_MODE=true
export DEV_AUTO_LOGIN_EMAIL="your-email@domain.com"
export DEV_BYPASS_AUTH=true
```