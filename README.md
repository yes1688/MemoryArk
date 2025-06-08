# MemoryArk 2.0

> 真耶穌教會的現代化媒體檔案管理系統

## 系統概述

MemoryArk 2.0 是專為真耶穌教會設計的檔案管理系統，提供安全的檔案存儲、管理和分享功能，特別優化教會的安息日資料和共享資源需求。

### 主要功能
- 🔐 **安全認證** - JWT 用戶認證和權限管理
- 📁 **檔案管理** - 支援多種檔案格式的上傳和管理
- 🔍 **智能搜尋** - 檔案搜尋和篩選功能
- 🏷️ **標籤系統** - 靈活的檔案分類管理
- ❤️ **收藏功能** - 個人化檔案整理
- 🔗 **分享連結** - 安全的檔案分享
- 📖 **安息日資料專區** - 教會專屬功能
- 🤝 **共享資源中心** - 內部資源共享
- 📊 **真實數據統計** - 所有統計基於真實 API 數據，無假數據

## 快速部署

### 系統需求
- Docker/Podman 4.0+
- 端口 7001

### 部署步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd MemoryArk2
   ```

2. **配置環境**
   ```bash
   cp .env.example .env
   # 編輯 .env 設定配置
   ```

3. **啟動服務**
   ```bash
   # Docker
   docker-compose up -d
   
   # Podman  
   podman-compose up -d
   ```

4. **訪問系統**
   開啟瀏覽器：http://localhost:7001

### 環境變數配置
```bash
# JWT 密鑰（使用 openssl rand -hex 32 生成）
JWT_SECRET=your-64-character-hex-secret-key

# 根管理員設定
ROOT_ADMIN_EMAIL=admin@yourchurch.org
ROOT_ADMIN_NAME=系統管理員

# Cloudflare Access（可選）
CLOUDFLARE_ENABLED=false
```

## 本地開發

**後端開發**
```bash
cd backend && go run ./cmd/server
```

**前端開發**
```bash
cd frontend && npm install && npm run dev
```

**開發腳本**
```bash
./scripts/dev.sh start  # 啟動開發環境
./scripts/dev.sh stop   # 停止開發環境
```

## 技術架構

**前端**: Vue 3 + TypeScript + Tailwind CSS + Pinia  
**後端**: Go + Gin + SQLite  
**部署**: Docker/Podman + Nginx  
**設計**: Windows 11 Fluent Design + Apple Human Interface Guidelines

## 系統訪問

**正式環境**: https://files.94work.net/

## 授權

本專案採用 [MIT 授權](./LICENSE)。

---

*為真耶穌教會的數位化服務而設計*