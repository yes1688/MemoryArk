# MemoryArk 2.0 專案結構總覽

本文檔說明 MemoryArk 2.0 專案的完整結構和各文件的用途。

## 專案目錄結構

```
MemoryArk2/
├── .github/                    # GitHub 配置
│   └── copilot-instructions.md # AI 助手行為指南
├── backend/                    # Go 後端應用
│   ├── .env.example           # 後端環境變量範本
│   ├── cmd/                   # 應用程序入口
│   ├── internal/              # 內部包
│   │   ├── api/              # API 路由和處理器
│   │   ├── auth/             # 認證相關
│   │   ├── config/           # 配置管理
│   │   ├── database/         # 數據庫相關
│   │   ├── middleware/       # 中間件
│   │   ├── models/           # 數據模型
│   │   └── services/         # 業務邏輯
│   ├── pkg/                  # 公共包
│   ├── data/                 # SQLite 數據庫文件
│   ├── uploads/              # 上傳文件存儲
│   ├── logs/                 # 日誌文件
│   ├── go.mod                # Go 模組配置
│   └── go.sum                # Go 依賴鎖定文件
├── frontend/                  # Vue 3 前端應用
│   ├── .env.example          # 前端環境變量範本
│   ├── src/
│   │   ├── components/       # Vue 組件
│   │   ├── views/            # 頁面視圖
│   │   ├── stores/           # Pinia 狀態管理
│   │   ├── router/           # 路由配置
│   │   ├── api/              # API 調用
│   │   ├── utils/            # 工具函數
│   │   ├── assets/           # 靜態資源
│   │   └── styles/           # 樣式文件
│   ├── public/               # 公共靜態資源
│   ├── package.json          # npm 配置
│   ├── package-lock.json     # npm 依賴鎖定文件
│   ├── vite.config.ts        # Vite 配置
│   ├── tsconfig.json         # TypeScript 配置
│   └── tailwind.config.js    # Tailwind CSS 配置
├── docs/                      # 專案文檔
│   ├── API_DESIGN.md         # API 設計文檔
│   ├── CLOUDFLARE_SETUP.md   # Cloudflare Access 設置指南
│   ├── DEPLOYMENT.md         # 部署指南
│   ├── DEVELOPMENT.md        # 開發環境設置
│   ├── ARCHITECTURE.md       # 系統架構文檔
│   ├── USER_MANUAL.md        # 用戶手冊
│   └── TROUBLESHOOTING.md    # 故障排除指南
├── deploy/                    # 部署配置
│   ├── docker-compose.yml    # Docker Compose 配置
│   ├── nginx.conf            # Nginx 配置
│   ├── systemd/              # Systemd 服務文件
│   └── scripts/              # 部署腳本
├── scripts/                   # 實用腳本
│   ├── dev.sh               # 開發環境啟動腳本
│   ├── build.sh             # 構建腳本
│   ├── backup.sh            # 備份腳本
│   └── migrate.sh           # 數據庫遷移腳本
├── tests/                     # 測試文件
│   ├── backend/             # 後端測試
│   ├── frontend/            # 前端測試
│   └── e2e/                 # 端到端測試
├── .gitignore                # Git 忽略文件
├── .dockerignore             # Docker 忽略文件
├── Dockerfile                # Docker 容器配置
├── README.md                 # 專案說明文件
├── CHANGELOG.md              # 變更記錄
├── CONTRIBUTING.md           # 貢獻指南
├── LICENSE                   # 開源許可證
└── SPECIFICATION.md          # 技術規格文檔
```

## 核心文檔說明

### 根目錄文件

| 文件 | 說明 |
|------|------|
| `README.md` | 專案概述、快速開始指南和基本介紹 |
| `SPECIFICATION.md` | 完整的技術規格文檔，包含系統設計和架構 |
| `CHANGELOG.md` | 版本變更記錄和發布歷史 |
| `CONTRIBUTING.md` | 開發者貢獻指南和代碼規範 |
| `LICENSE` | MIT 開源許可證 |
| `Dockerfile` | 容器化部署配置 |

### 文檔目錄 (`docs/`)

| 文件 | 說明 |
|------|------|
| `API_DESIGN.md` | REST API 設計規範和端點定義 |
| `CLOUDFLARE_SETUP.md` | Cloudflare Access 配置指南 |
| `DEPLOYMENT.md` | 生產環境部署完整指南 |
| `DEVELOPMENT.md` | 本地開發環境設置指南 |

### 配置文件

| 文件 | 說明 |
|------|------|
| `backend/.env.example` | 後端環境變量配置範本 |
| `frontend/.env.example` | 前端環境變量配置範本 |
| `.github/copilot-instructions.md` | AI 助手行為規範 |

## 專案特色

### 🔐 雙層認證系統
- **第一層**: Cloudflare Access (Google OAuth)
- **第二層**: 內部用戶註冊審核機制

### 📁 智能文件管理
- 多媒體文件支持 (音頻、視頻、圖片、文檔)
- 自動縮圖生成
- 智能分類和搜索功能

### ⚡ 現代化技術堆疊
- **前端**: Vue 3 + TypeScript + Vite + Element Plus
- **後端**: Go + Gin + SQLite
- **部署**: Podman 容器化

### 🎵 媒體處理能力
- 音頻格式轉換
- 視頻處理
- 自動元數據提取

## 開發工作流程

### 1. 環境設置
```bash
# 克隆專案
git clone <repository-url>
cd MemoryArk2

# 後端設置
cd backend
cp .env.example .env
go mod download

# 前端設置
cd ../frontend
cp .env.example .env
npm install
```

### 2. 本地開發
```bash
# 啟動後端 (熱重載)
cd backend && air

# 啟動前端
cd frontend && npm run dev
```

### 3. 構建部署
```bash
# 構建容器
podman build -t memoryark2 .

# 運行容器
podman run -d -p 7001:7001 memoryark2
```

## 安全特性

### 認證與授權
- Cloudflare Access 整合
- JWT 令牌管理
- 角色型權限控制 (RBAC)

### 文件安全
- 文件類型驗證
- 大小限制
- 自動病毒掃描 (計劃中)

### 網路安全
- HTTPS 強制加密
- CORS 防護
- 速率限制
- SQL 注入防護

## 性能優化

### 後端優化
- Go 協程併發處理
- 數據庫查詢優化
- 響應緩存機制

### 前端優化
- Vue 3 組合式 API
- 懶加載路由
- 圖片壓縮和優化
- PWA 支持 (計劃中)

### 部署優化
- 容器化部署
- Nginx 反向代理
- 靜態資源 CDN (計劃中)

## 開發規範

### 代碼風格
- **Go**: 遵循官方 Go 代碼規範
- **TypeScript/Vue**: ESLint + Prettier
- **提交訊息**: Conventional Commits 格式

### 測試策略
- **單元測試**: Go 和 TypeScript
- **整合測試**: API 端點測試
- **E2E 測試**: Cypress (計劃中)

### 文檔維護
- API 變更必須更新文檔
- 重要決策記錄在 ADR 中
- 定期更新 CHANGELOG.md

## 部署策略

### 開發環境
- 本地開發服務器
- 熱重載支持
- 開發工具整合

### 測試環境
- Docker 容器部署
- 自動化測試運行
- 模擬生產環境

### 生產環境
- Podman 容器部署
- Nginx 反向代理
- SSL/TLS 加密
- 自動備份機制

## 監控與維護

### 日誌管理
- 結構化日誌記錄
- 日誌輪轉配置
- 錯誤追蹤

### 效能監控
- 系統資源監控
- API 響應時間
- 數據庫效能

### 備份策略
- 數據庫自動備份
- 文件存儲備份
- 配置文件備份

## 專案里程碑

### 第一階段 (MVP)
- [x] 專案結構建立
- [x] 技術規格制定
- [x] 基礎文檔撰寫
- [ ] 後端 API 開發
- [ ] 前端界面開發

### 第二階段 (基礎功能)
- [ ] 用戶認證系統
- [ ] 文件上傳管理
- [ ] 基礎媒體處理
- [ ] 管理員界面

### 第三階段 (進階功能)
- [ ] 高級媒體處理
- [ ] 搜索和分類優化
- [ ] 行動端適配
- [ ] 效能優化

### 第四階段 (企業功能)
- [ ] 詳細權限管理
- [ ] 審計日誌
- [ ] 高可用部署
- [ ] 災難恢復

## 貢獻指南

想要參與專案開發嗎？請查看：

1. [CONTRIBUTING.md](../CONTRIBUTING.md) - 詳細的貢獻指南
2. [DEVELOPMENT.md](DEVELOPMENT.md) - 開發環境設置
3. [API_DESIGN.md](API_DESIGN.md) - API 設計規範

## 技術支援

如需技術支援或有任何問題：

1. 查看 [文檔目錄](.)
2. 搜索 [Issues](../../issues)
3. 創建新 [Issue](../../issues/new)
4. 聯繫開發團隊

---

MemoryArk 2.0 致力於為真耶穌教會提供現代化、安全、高效的媒體管理解決方案。感謝您的關注和支持！
