# MemoryArk 2.0

> 真耶穌教會的現代化媒體檔案管理系統

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-green.svg)](./CHANGELOG.md)

## 🎯 專案概述

MemoryArk 2.0 是為真耶穌教會設計的現代化媒體檔案管理系統，提供安全、高效的檔案存儲、管理和分享功能，特別針對教會的安息日資料、共享資源等需求進行優化。

### ✨ 主要特色

- 🔐 **安全認證** - 基於 JWT 的用戶認證和權限管理
- 📁 **檔案管理** - 支援多種檔案格式的上傳、分類和管理
- 🔍 **智能搜尋** - 強大的檔案搜尋和篩選功能
- 🏷️ **標籤系統** - 靈活的標籤分類和管理
- ❤️ **收藏功能** - 個人化的檔案收藏和整理
- 🔗 **分享連結** - 安全的檔案分享和權限控制
- 📊 **存儲統計** - 詳細的存儲使用情況分析
- 🎨 **現代 UI** - 基於 Windows 11 設計語言的美觀界面

### 🎯 教會特色功能

- 📖 **安息日資料專區** - 專門的安息日資料管理和分享
- 🤝 **共享資源中心** - 教會內部資源共享平台
- 👥 **用戶權限管理** - 靈活的角色和權限控制
- 📱 **響應式設計** - 支援桌面和行動裝置

## 🛠️ 技術架構

### 後端技術
- **Go 1.22** - 高效能的後端服務
- **Gin Framework** - 輕量級 Web 框架
- **SQLite** - 輕量級關聯式資料庫
- **GORM** - Go ORM 框架
- **JWT** - 安全的用戶認證

### 前端技術
- **Vue 3** - 現代化前端框架
- **TypeScript** - 類型安全的 JavaScript
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Pinia** - Vue 狀態管理
- **Vite** - 快速的建構工具

### 基礎設施
- **Docker/Podman** - 容器化部署
- **Nginx** - 反向代理和靜態檔案服務
- **Alpine Linux** - 輕量級容器基礎映像

## 🚀 快速開始

### 系統需求

- **Docker/Podman** 4.0+
- **端口** 7001（對外服務）

### 部署步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd MemoryArk2
   ```

2. **配置環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 設定你的配置
   ```

3. **啟動服務**
   ```bash
   # 使用 Docker
   docker-compose up -d
   
   # 或使用 Podman
   podman-compose up -d
   ```

4. **訪問系統**
   - 開啟瀏覽器前往：http://localhost:7001
   - 使用設定的根管理員信箱登入

### 環境變數配置

創建 `.env` 檔案並設定以下變數：

```bash
# JWT 認證密鑰（建議使用 openssl rand -hex 32 生成）
JWT_SECRET=your-64-character-hex-secret-key

# 根管理員設定（首次啟動自動創建）
ROOT_ADMIN_EMAIL=admin@yourchurch.org
ROOT_ADMIN_NAME=系統管理員

# Cloudflare Access（可選）
CLOUDFLARE_ENABLED=false
```

## 📖 開發指南

### 本地開發

1. **後端開發**
   ```bash
   cd backend
   go run ./cmd/server
   ```

2. **前端開發**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **使用開發腳本**
   ```bash
   # 啟動開發環境
   ./scripts/dev.sh start
   
   # 停止開發環境
   ./scripts/dev.sh stop
   ```

### 專案結構

```
MemoryArk2/
├── backend/                 # Go 後端服務
│   ├── cmd/server/         # 主程式入口
│   ├── internal/           # 內部包
│   └── pkg/               # 公用包
├── frontend/               # Vue 前端應用
│   ├── src/               # 源代碼
│   └── dist/              # 建構輸出
├── docs/                   # 專案文檔
├── scripts/               # 開發腳本
├── docker-compose.yml     # 容器編排
├── Dockerfile            # 容器建構
└── nginx.conf            # Nginx 配置
```

## 📚 文檔

- [API 設計文檔](./docs/API_DESIGN.md)
- [部署指南](./docs/DEPLOYMENT.md)
- [開發環境設置](./docs/DEVELOPMENT.md)
- [專案結構說明](./docs/PROJECT_STRUCTURE.md)
- [貢獻指南](./CONTRIBUTING.md)
- [技術規格](./SPECIFICATION.md)

## 🔄 更新記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！請先閱讀 [貢獻指南](./CONTRIBUTING.md)。

## 📄 授權

本專案採用 [MIT 授權](./LICENSE)。

## 📞 支援

如有問題或建議，請：
1. 查閱 [文檔](./docs/)
2. 搜尋現有的 [Issues](../../issues)
3. 提交新的 [Issue](../../issues/new)

---

*為真耶穌教會的數位化服務而設計 💙*