# MemoryArk 2.0 - 真耶穌教會媒體管理系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://golang.org)
[![Vue Version](https://img.shields.io/badge/Vue.js-3.x-green.svg)](https://vuejs.org)

## 專案概述

MemoryArk 2.0 是專為真耶穌教會設計的現代化媒體管理系統，提供高效的文件管理、媒體處理和用戶協作功能。系統採用現代化技術堆疊，具備企業級安全性和性能優化。

### 主要特性

- 🔐 **雙層身份驗證** - Cloudflare Access + 內部用戶審核機制
- 📁 **智能文件管理** - 支持多種媒體格式，智能分類和搜索
- 🎵 **音頻處理** - 自動轉換和優化音頻文件
- 📱 **響應式設計** - 完美適配桌面和移動設備
- ⚡ **高性能** - Go 後端 + Vue 3 前端，快速響應
- 🐳 **容器化部署** - 使用 Podman 容器，易於部署和維護

## 技術堆疊

### 前端
- **框架**: Vue 3 + TypeScript
- **UI庫**: Element Plus
- **構建工具**: Vite
- **狀態管理**: Pinia

### 後端
- **語言**: Go 1.21+
- **框架**: Gin
- **數據庫**: SQLite
- **認證**: JWT + Cloudflare Access

### 部署
- **容器**: Podman
- **反向代理**: Nginx
- **端口**: 7001

## 快速開始

### 前置需求

- Go 1.21 或更高版本
- Node.js 18 或更高版本
- Podman 或 Docker
- Git

### 本地開發環境設置

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd MemoryArk2
   ```

2. **後端設置**
   ```bash
   cd backend
   go mod download
   cp .env.example .env
   # 編輯 .env 文件配置必要參數
   go run main.go
   ```

3. **前端設置**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # 編輯 .env 文件配置 API 端點
   npm run dev
   ```

4. **訪問應用**
   - 前端: http://localhost:5173
   - 後端 API: http://localhost:7001

### 使用 Podman 部署

1. **構建容器**
   ```bash
   podman build -t memoryark2 .
   ```

2. **運行容器**
   ```bash
   podman run -d -p 7001:7001 --name memoryark2 \
     -v ./data:/app/data \
     -v ./uploads:/app/uploads \
     memoryark2
   ```

## 專案結構

```
MemoryArk2/
├── backend/                 # Go 後端應用
│   ├── cmd/                # 應用程序入口
│   ├── internal/           # 內部包
│   │   ├── api/           # API 路由和處理器
│   │   ├── auth/          # 認證相關
│   │   ├── config/        # 配置管理
│   │   ├── database/      # 數據庫相關
│   │   ├── middleware/    # 中間件
│   │   ├── models/        # 數據模型
│   │   └── services/      # 業務邏輯
│   ├── pkg/               # 公共包
│   └── go.mod
├── frontend/               # Vue 3 前端應用
│   ├── src/
│   │   ├── components/    # Vue 組件
│   │   ├── views/         # 頁面視圖
│   │   ├── stores/        # Pinia 狀態管理
│   │   ├── router/        # 路由配置
│   │   ├── api/           # API 調用
│   │   └── utils/         # 工具函數
│   ├── public/            # 靜態資源
│   └── package.json
├── docs/                   # 文檔
├── deploy/                 # 部署配置
├── .github/               # GitHub 配置
└── README.md
```

## 認證流程

MemoryArk 2.0 採用雙層認證機制：

1. **第一層**: Cloudflare Access 進行 Google 帳號驗證
2. **第二層**: 內部用戶註冊申請和管理員審核

### 用戶註冊流程

1. 用戶通過 Cloudflare Access 驗證
2. 填寫註冊申請表（姓名、電話、所屬教會等）
3. 管理員審核申請
4. 審核通過後用戶可正常使用系統

## API 文檔

API 文檔將在開發完成後通過 Swagger UI 提供，通常可以在以下地址訪問：
- 開發環境: http://localhost:7001/swagger/
- 生產環境: https://your-domain.com/api/swagger/

## 配置說明

### 環境變量

| 變量名 | 說明 | 默認值 |
|--------|------|--------|
| `PORT` | 服務端口 | 7001 |
| `DB_PATH` | SQLite 數據庫路徑 | ./data/memoryark.db |
| `UPLOAD_PATH` | 文件上傳路徑 | ./uploads |
| `JWT_SECRET` | JWT 密鑰 | - |
| `CLOUDFLARE_DOMAIN` | Cloudflare Access 域名 | - |

### Cloudflare Access 配置

請參考 `docs/cloudflare-setup.md` 了解如何配置 Cloudflare Access。

## 貢獻指南

請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何參與專案貢獻。

## 版本歷史

請查看 [CHANGELOG.md](CHANGELOG.md) 了解版本變更記錄。

## 許可證

本專案採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 支持

如有問題或建議，請：

1. 查看 [文檔](docs/)
2. 搜索 [Issues](../../issues)
3. 創建新的 [Issue](../../issues/new)

## 作者

- **開發團隊** - 真耶穌教會 IT 部門

## 致謝

感謝所有為 MemoryArk 2.0 專案做出貢獻的開發者和用戶。
